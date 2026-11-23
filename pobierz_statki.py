import asyncio
import csv
import gzip
import io
import json
import os
import time
import urllib.request
from datetime import datetime, timezone, timedelta

import websockets

KLUCZ = os.environ.get("AISSTREAM_API_KEY", "")
CZAS_NASLUCHU = 180
PLIK = os.environ.get("PLIK_WYJSCIOWY", "statki.geojson")
PLIK_TRASY = "flota_cieni_trasy.geojson"
PLIK_SANKCJE = "flota_cieni_lista.json"

OBSZAR = json.loads(os.environ.get("OBSZAR", "[[[53.8, 14.0], [56.0, 21.5]]]"))
MAX_WIEK = timedelta(hours=6)
MAX_WIEK_TRASY = timedelta(hours=48)

POZYCJE = ("PositionReport", "StandardClassBPositionReport",
           "ExtendedClassBPositionReport")
TYPY_KOMUNIKATOW = list(POZYCJE) + ["ShipStaticData", "StaticDataReport"]

PODEJRZANE_BANDERY = {
    "667": "Sierra Leone", "626": "Gabon", "518": "Wyspy Cooka",
    "613": "Kamerun", "511": "Palau", "314": "Barbados",
    "630": "Gwinea Bissau", "671": "Togo", "341": "St. Kitts & Nevis",
    "572": "Tuvalu", "375": "St. Vincent"
}


def opis_typu(kod):
    if kod is None:
        return None
    if 80 <= kod <= 89:
        return "Zbiornikowiec"
    if 70 <= kod <= 79:
        return "Towarowy"
    if 60 <= kod <= 69:
        return "Pasazerski"
    opisy = {30: "Rybacki", 31: "Holownik", 32: "Holownik", 35: "Wojskowy",
             36: "Zaglowka", 37: "Jacht", 52: "Holownik"}
    return opisy.get(kod, "Inny (kod " + str(kod) + ")")


def czy_baltyk():
    for box in OBSZAR:
        (lat_min, lon_min), (lat_max, lon_max) = box
        if 53.0 <= lat_max and lat_min <= 66.0 and 9.0 <= lon_max and lon_min <= 31.0:
            return True
    return False


def re_split_ids(val):
    return [x.strip() for x in val.replace(",", ";").split(";") if x.strip().isdigit()]


def pobierz_lista_floty_cieni():
    try:
        if os.path.exists(PLIK_SANKCJE):
            wiek = time.time() - os.path.getmtime(PLIK_SANKCJE)
            if wiek < 86400:
                with open(PLIK_SANKCJE, encoding="utf-8") as f:
                    return json.load(f)
    except Exception:
        pass

    print("Pobieram aktualna liste sankcyjna statkow z OpenSanctions...")
    host = ".".join(["data", "opensanctions", "org"])
    url = "/".join(["https:", "", host, "datasets", "latest", "maritime", "targets.simple.csv"])
    sankcje = {"mmsi": {}, "imo": {}}
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            tekst = resp.read().decode("utf-8", errors="replace")
        reader = csv.DictReader(io.StringIO(tekst))
        for row in reader:
            if row.get("schema") != "Vessel":
                continue
            powod = (row.get("dataset") or "Sankcje").strip()
            nazwa = (row.get("name") or "").strip()
            for m in re_split_ids(row.get("mmsi") or ""):
                sankcje["mmsi"][m] = f"{nazwa} ({powod})"
            for im in re_split_ids(row.get("imo_number") or row.get("imo") or ""):
                sankcje["imo"][im] = f"{nazwa} ({powod})"

        with open(PLIK_SANKCJE, "w", encoding="utf-8") as f:
            json.dump(sankcje, f, ensure_ascii=False)
        print(f"OpenSanctions: zaladowano {len(sankcje['mmsi'])} MMSI i {len(sankcje['imo'])} IMO.")
    except Exception as e:
        print("Info: nie udalo sie pobrac OpenSanctions:", e)
        if os.path.exists(PLIK_SANKCJE):
            with open(PLIK_SANKCJE, encoding="utf-8") as f:
                return json.load(f)
    return sankcje


def oznacz_flote_cieni(s, sankcje):
    mmsi = str(s.get("mmsi") or "")
    imo = str(s.get("imo") or "")
    if mmsi in sankcje.get("mmsi", {}):
        s["flota_cieni"] = True
        s["typ"] = "Flota Cieni"
        s["sankcje"] = sankcje["mmsi"][mmsi]
        return True
    if imo and imo in sankcje.get("imo", {}):
        s["flota_cieni"] = True
        s["typ"] = "Flota Cieni"
        s["sankcje"] = sankcje["imo"][imo]
        return True

    if s.get("typ") == "Zbiornikowiec" and mmsi[:3] in PODEJRZANE_BANDERY:
        bandera = PODEJRZANE_BANDERY[mmsi[:3]]
        s["flota_cieni"] = True
        s["typ"] = "Flota Cieni"
        s["sankcje"] = f"Podejrzany zbiornikowiec (bandera: {bandera})"
        return True

    return bool(s.get("flota_cieni"))


def wczytaj_stare():
    try:
        with open(PLIK, encoding="utf-8") as f:
            dane = json.load(f)
    except Exception:
        return {}
    statki = {}
    for ft in dane.get("features", []):
        p = dict(ft["properties"])
        it = iter(ft["geometry"]["coordinates"])
        p["lon"] = next(it)
        p["lat"] = next(it)
        statki[str(p["mmsi"])] = p
    return statki


def pobierz_json_url(url):
    req = urllib.request.Request(url, headers={
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "Digitraffic-User": "HomontosMapa1/1.0",
        "User-Agent": "curl/8.5.0"
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
        if resp.headers.get("Content-Encoding") == "gzip" or raw[:2] == b"\x1f\x8b":
            raw = gzip.decompress(raw)
        tekst = raw.decode("utf-8", errors="replace").strip()
        return json.loads(tekst)


def pobierz_digitraffic_caly_baltyk(statki):
    print("Pobieram WSZYSTKIE statki z Digitraffic (caly Baltyk)...")
    host = ".".join(["meri", "digitraffic", "fi"])
    base = "/".join(["https:", "", host, "api", "ais", "v1"])
    lokacje = pobierz_json_url(base + "/locations")
    metadane = pobierz_json_url(base + "/vessels")

    meta_mapa = {}
    for m in metadane:
        mmsi = str(m.get("mmsi", ""))
        if mmsi:
            meta_mapa[mmsi] = m

    teraz_iso = datetime.now(timezone.utc).isoformat(timespec="seconds")
    dodane = 0
    for ft in lokacje.get("features", []):
        coords = (ft.get("geometry") or {}).get("coordinates") or []
        if len(coords) < 2:
            continue
        it = iter(coords)
        lon = next(it)
        lat = next(it)
        if not (53.5 <= lat <= 66.0 and 9.5 <= lon <= 30.5):
            continue

        props = ft.get("properties") or {}
        mmsi = str(ft.get("mmsi") or props.get("mmsi") or "")
        if not mmsi:
            continue

        s = statki.setdefault(mmsi, {"mmsi": mmsi})
        s["lat"] = lat
        s["lon"] = lon
        s["predkosc"] = props.get("sog")
        s["kurs"] = props.get("cog")
        s["aktualizacja"] = teraz_iso

        info = meta_mapa.get(mmsi)
        if info:
            nazwa = (info.get("name") or "").strip()
            if nazwa:
                s["nazwa"] = nazwa
            cel = (info.get("destination") or "").strip()
            if cel:
                s["cel"] = cel
            if info.get("imo"):
                s["imo"] = str(info["imo"])
            opis = opis_typu(info.get("shipType"))
            if opis and s.get("typ") != "Flota Cieni":
                s["typ"] = opis
        dodane += 1

    print(f"Digitraffic: pobrano {dodane} statkow z calego Baltyku.")
async def nasluchuj_aisstream(statki):
    if not KLUCZ:
        return
    ws_host = ".".join(["stream", "aisstream", "io"])
    ws_url = "/".join(["wss:", "", ws_host, "v0", "stream"])

    for proba in range(1, 3):
        try:
            print(f"AISStream (poludniowy Baltyk): proba {proba}/2...")
            async with websockets.connect(
                ws_url,
                open_timeout=25,
                close_timeout=10
            ) as ws:
                await ws.send(json.dumps({
                    "APIKey": KLUCZ,
                    "BoundingBoxes": OBSZAR,
                    "FilterMessageTypes": TYPY_KOMUNIKATOW,
                }))
                koniec = time.time() + CZAS_NASLUCHU
                while time.time() < koniec:
                    try:
                        surowe = await asyncio.wait_for(
                            ws.recv(), timeout=max(1, koniec - time.time()))
                    except asyncio.TimeoutError:
                        break
                    msg = json.loads(surowe)
                    meta = msg.get("MetaData", {})
                    mmsi = str(meta.get("MMSI", ""))
                    if not mmsi:
                        continue
                    typ = msg.get("MessageType")
                    tresc = (msg.get("Message") or {}).get(typ) or {}
                    s = statki.setdefault(mmsi, {"mmsi": mmsi})
                    nazwa = (meta.get("ShipName") or "").strip()
                    if nazwa:
                        s["nazwa"] = nazwa

                    if typ in POZYCJE:
                        s["lat"] = tresc.get("Latitude", meta.get("latitude"))
                        s["lon"] = tresc.get("Longitude", meta.get("longitude"))
                        s["predkosc"] = tresc.get("Sog")
                        s["kurs"] = tresc.get("Cog")
                        s["aktualizacja"] = datetime.now(timezone.utc).isoformat(
                            timespec="seconds")
                        if typ == "ExtendedClassBPositionReport" and s.get("typ") != "Flota Cieni":
                            opis = opis_typu(tresc.get("Type"))
                            if opis:
                                s["typ"] = opis
                    elif typ == "ShipStaticData":
                        cel = (tresc.get("Destination") or "").strip()
                        if cel:
                            s["cel"] = cel
                        if tresc.get("ImoNumber"):
                            s["imo"] = str(tresc["ImoNumber"])
                        if s.get("typ") != "Flota Cieni":
                            opis = opis_typu(tresc.get("Type"))
                            if opis:
                                s["typ"] = opis
                    elif typ == "StaticDataReport":
                        a = tresc.get("ReportA") or {}
                        b = tresc.get("ReportB") or {}
                        nazwa_a = (a.get("Name") or "").strip()
                        if nazwa_a and "nazwa" not in s:
                            s["nazwa"] = nazwa_a
                        if s.get("typ") != "Flota Cieni":
                            opis = opis_typu(b.get("ShipType"))
                            if opis:
                                s["typ"] = opis
                return
        except Exception as e:
            print(f"AISStream proba {proba} nieudana: {e}")
            await asyncio.sleep(3)


def aktualizuj_historie_tras(statki):
    trasy = {}
    try:
        with open(PLIK_TRASY, encoding="utf-8") as f:
            stare_trasy = json.load(f)
        for ft in stare_trasy.get("features", []):
            props = ft.get("properties") or {}
            mmsi = str(props.get("mmsi") or "")
            punkty = props.get("punkty") or []
            if mmsi and punkty:
                trasy[mmsi] = {"props": props, "punkty": punkty}
    except Exception:
        pass

    teraz = datetime.now(timezone.utc)
    teraz_iso = teraz.isoformat(timespec="seconds")

    for mmsi, s in statki.items():
        if not s.get("flota_cieni"):
            continue
        if s.get("lat") is None or s.get("lon") is None:
            continue
        entry = trasy.setdefault(mmsi, {"props": {}, "punkty": []})
        entry["props"] = {
            "mmsi": mmsi,
            "nazwa": s.get("nazwa", mmsi),
            "sankcje": s.get("sankcje", "Flota Cieni"),
            "cel": s.get("cel", "")
        }
        nowy_lon = round(s["lon"], 5)
        nowy_lat = round(s["lat"], 5)
        nowy_pt = [nowy_lon, nowy_lat, teraz_iso]
        if not entry["punkty"]:
            entry["punkty"].append(nowy_pt)
        else:
            ost_lon, ost_lat, _ = entry["punkty"][-1]
            if abs(ost_lon - nowy_lon) > 0.001 or abs(ost_lat - nowy_lat) > 0.001:
                entry["punkty"].append(nowy_pt)

    features_tras = []
    for mmsi, data in trasy.items():
        swieze = []
        for pt in data["punkty"]:
            try:
                p_lon, p_lat, p_ts = pt
                t_pt = datetime.fromisoformat(p_ts)
                if teraz - t_pt <= MAX_WIEK_TRASY:
                    swieze.append([p_lon, p_lat, p_ts])
            except Exception:
                pass
        if len(swieze) >= 2:
            coords = [[p_lon, p_lat] for p_lon, p_lat, _ in swieze]
            props = dict(data["props"])
            props["punkty"] = swieze
            features_tras.append({
                "type": "Feature",
                "properties": props,
                "geometry": {"type": "LineString", "coordinates": coords}
            })

    with open(PLIK_TRASY, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features_tras}, f, ensure_ascii=False)
    print(f"Zapisano slady tras dla {len(features_tras)} jednostek Floty Cieni.")


def zapisz(statki, sankcje):
    teraz = datetime.now(timezone.utc)
    cechy = []
    ile_cieni = 0

    for s in statki.values():
        if s.get("lat") is None or s.get("lon") is None:
            continue
        akt = s.get("aktualizacja")
        if akt and teraz - datetime.fromisoformat(akt) > MAX_WIEK:
            continue
        if oznacz_flote_cieni(s, sankcje):
            ile_cieni += 1
        wlasc = {k: v for k, v in s.items() if k not in ("lat", "lon")}
        cechy.append({
            "type": "Feature",
            "properties": wlasc,
            "geometry": {"type": "Point", "coordinates": [s["lon"], s["lat"]]},
        })

    if len(cechy) == 0:
        print("Brak nowych statkow (0) – zachowano dotychczasowy plik", PLIK)
        return

    with open(PLIK, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": cechy}, f,
                  ensure_ascii=False)
    print(f"Zapisano lacznie statkow: {len(cechy)} (w tym Flota Cieni: {ile_cieni})")

    if czy_baltyk():
        aktualizuj_historie_tras(statki)


statki = wczytaj_stare()
sankcje = pobierz_lista_floty_cieni()

if czy_baltyk():
    try:
        pobierz_digitraffic_caly_baltyk(statki)
    except Exception as e:
        print("Blad Digitraffic:", e)

try:
    asyncio.run(nasluchuj_aisstream(statki))
except Exception as e:
    print("Blad polaczenia AISStream:", e)

zapisz(statki, sankcje)
