import asyncio
import csv
import gzip
import io
import json
import os
import socket
import time
import urllib.request
from datetime import datetime, timezone, timedelta

import websockets

KLUCZ = os.environ.get("AISSTREAM_API_KEY", "")
CZAS_NASLUCHU = 270
PLIK = os.environ.get("PLIK_WYJSCIOWY", "statki.geojson")
PLIK_TRASY = "flota_cieni_trasy.geojson"
PLIK_SANKCJE = "flota_cieni_lista.json"

OBSZAR = json.loads(os.environ.get("OBSZAR", "[[[53.5, 9.5], [66.0, 30.5]]]"))
MAX_WIEK = timedelta(hours=12)
MAX_WIEK_TRASY = timedelta(hours=72)

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


def pobierz_lista_floty_cieni():
    try:
        if os.path.exists(PLIK_SANKCJE):
            wiek = time.time() - os.path.getmtime(PLIK_SANKCJE)
            if wiek < 86400:
                with open(PLIK_SANKCJE, encoding="utf-8") as f:
                    dane = json.load(f)
                    if len(dane.get("mmsi", {})) > 0 or len(dane.get("imo", {})) > 0:
                        return dane
    except Exception:
        pass

    print("Pobieram aktualna liste sankcyjna statkow z OpenSanctions...")
    host = ".".join(["data", "opensanctions", "org"])
    url = "/".join(["https:", "", host, "datasets", "latest", "sanctions", "entities.ftm.json"])
    sankcje = {"mmsi": {}, "imo": {}}
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            for raw_line in resp:
                if b'"Vessel"' not in raw_line:
                    continue
                obj = json.loads(raw_line.decode("utf-8", errors="replace"))
                if obj.get("schema") != "Vessel":
                    continue
                props = obj.get("properties") or {}
                nazwa = (obj.get("caption") or "").strip()
                zbiory = ", ".join(obj.get("datasets") or ["Sankcje"])
                opis = f"{nazwa} ({zbiory})"
                for m in props.get("mmsi") or []:
                    m_clean = str(m).strip()
                    if m_clean.isdigit():
                        sankcje["mmsi"][m_clean] = opis
                for im in props.get("imoNumber") or []:
                    im_clean = "".join(c for c in str(im) if c.isdigit())
                    if im_clean:
                        sankcje["imo"][im_clean] = opis

        with open(PLIK_SANKCJE, "w", encoding="utf-8") as f:
            json.dump(sankcje, f, ensure_ascii=False)
        print(f"OpenSanctions: zaladowano {len(sankcje['mmsi'])} MMSI i {len(sankcje['imo'])} IMO.")
    except Exception as e:
        print("Info: nie udalo sie pobrac OpenSanctions:", e)
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
def _ais_6bit_str(bits):
    out = []
    for i in range(0, len(bits) - 5, 6):
        v = int(bits[i:i + 6], 2)
        out.append(chr(v + 64) if v < 32 else chr(v))
    return "".join(out).replace("@", " ").strip()


def _s_int(bits):
    v = int(bits, 2)
    return v - (1 << len(bits)) if bits.startswith("1") else v


def pobierz_dma_dania(statki, sekundy=20):
    host = ".".join(["aisdata", "ais", "dk"])
    print(f"Pobieram dane AIS z Dunskiej Administracji Morskiej ({host}:6501)...")
    teraz_iso = datetime.now(timezone.utc).isoformat(timespec="seconds")
    fragmenty = {}
    zaktualizowane = set()

    with socket.create_connection((host, 6501), timeout=12) as sock:
        sock.settimeout(5)
        koniec = time.time() + sekundy
        buf = ""
        while time.time() < koniec:
            try:
                chunk = sock.recv(4096).decode("ascii", errors="ignore")
                if not chunk:
                    break
                buf += chunk
            except socket.timeout:
                break

            while "\n" in buf:
                line, buf = buf.split("\n", 1)
                idx = line.find("!AIVDM")
                if idx == -1:
                    continue
                czesc_glowna = next(iter(line[idx:].split("*")))
                parts = czesc_glowna.split(",")
                if len(parts) < 6:
                    continue
                try:
                    it_p = iter(parts)
                    next(it_p)  # !AIVDM
                    total = int(next(it_p))
                    num = int(next(it_p))
                    seq = next(it_p)
                    next(it_p)  # kanal A/B
                    payload = next(it_p)
                except (ValueError, StopIteration):
                    continue

                if total > 1:
                    key = (seq, total)
                    fragmenty.setdefault(key, {})[num] = payload
                    if len(fragmenty[key]) < total:
                        continue
                    payload = "".join(fragmenty.pop(key)[i] for i in range(1, total + 1))

                bits = "".join(
                    f"{(ord(c) - 48 - (8 if ord(c) - 48 > 40 else 0)):06b}"
                    for c in payload
                )
                if len(bits) < 38:
                    continue
                msg_type = int(bits[0:6], 2)
                mmsi = str(int(bits[8:38], 2))

                if msg_type in (1, 2, 3) and len(bits) >= 128:
                    sog = int(bits[50:60], 2) / 10.0
                    lon = _s_int(bits[61:89]) / 600000.0
                    lat = _s_int(bits[89:116]) / 600000.0
                    cog = int(bits[116:128], 2) / 10.0
                    if 53.5 <= lat <= 60.0 and 9.5 <= lon <= 20.5:
                        s = statki.setdefault(mmsi, {"mmsi": mmsi})
                        s["lat"] = round(lat, 5)
                        s["lon"] = round(lon, 5)
                        if sog < 102.0:
                            s["predkosc"] = sog
                        if cog < 360.0:
                            s["kurs"] = cog
                        s["aktualizacja"] = teraz_iso
                        zaktualizowane.add(mmsi)
                elif msg_type == 18 and len(bits) >= 124:
                    sog = int(bits[46:56], 2) / 10.0
                    lon = _s_int(bits[57:85]) / 600000.0
                    lat = _s_int(bits[85:112]) / 600000.0
                    cog = int(bits[112:124], 2) / 10.0
                    if 53.5 <= lat <= 60.0 and 9.5 <= lon <= 20.5:
                        s = statki.setdefault(mmsi, {"mmsi": mmsi})
                        s["lat"] = round(lat, 5)
                        s["lon"] = round(lon, 5)
                        if sog < 102.0:
                            s["predkosc"] = sog
                        if cog < 360.0:
                            s["kurs"] = cog
                        s["aktualizacja"] = teraz_iso
                        zaktualizowane.add(mmsi)
                elif msg_type == 5 and len(bits) >= 422:
                    s = statki.setdefault(mmsi, {"mmsi": mmsi})
                    imo = int(bits[40:70], 2)
                    if imo > 0:
                        s["imo"] = str(imo)
                    nazwa = _ais_6bit_str(bits[112:232])
                    if nazwa:
                        s["nazwa"] = nazwa
                    opis = opis_typu(int(bits[232:240], 2))
                    if opis and s.get("typ") != "Flota Cieni":
                        s["typ"] = opis
                    cel = _ais_6bit_str(bits[302:422])
                    if cel:
                        s["cel"] = cel

    print(f"DMA (Dania / Bornholm): zaktualizowano {len(zaktualizowane)} statkow.")


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
    print("Pobieram statki z Digitraffic (HELCOM)...")
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

    print(f"Digitraffic: pobrano {dodane} statkow.")
async def nasluchuj_aisstream(statki):
    if not KLUCZ:
        return
    ws_host = ".".join(["stream", "aisstream", "io"])
    ws_url = "/".join(["wss:", "", ws_host, "v0", "stream"])

    for proba in range(1, 3):
        try:
            print(f"AISStream: proba {proba}/2 (nasluch {CZAS_NASLUCHU}s)...")
            async with websockets.connect(
                ws_url,
                open_timeout=60,
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
        nowy_lon = round(float(s["lon"]), 5)
        nowy_lat = round(float(s["lat"]), 5)
        nowy_pt = [nowy_lon, nowy_lat, teraz_iso]

        if not entry["punkty"]:
            entry["punkty"].append(nowy_pt)
        else:
            ostatni = entry["punkty"][-1]
            it = iter(ostatni)
            ost_lon = float(next(it))
            ost_lat = float(next(it))
            if abs(ost_lon - nowy_lon) > 0.0005 or abs(ost_lat - nowy_lat) > 0.0005:
                entry["punkty"].append(nowy_pt)

    features_tras = []
    for mmsi, data in trasy.items():
        swieze = []
        for pt in data["punkty"]:
            try:
                it = iter(pt)
                p_lon = float(next(it))
                p_lat = float(next(it))
                p_ts = str(next(it))
                t_pt = datetime.fromisoformat(p_ts)
                if teraz - t_pt <= MAX_WIEK_TRASY:
                    swieze.append([p_lon, p_lat, p_ts])
            except Exception:
                pass
        if len(swieze) >= 1:
            coords = []
            for p in swieze:
                it = iter(p)
                coords.append([next(it), next(it)])
            props = dict(data["props"])
            props["punkty"] = swieze
            geom = {"type": "LineString", "coordinates": coords} if len(coords) >= 2 else {"type": "Point", "coordinates": next(iter(coords))}
            features_tras.append({
                "type": "Feature",
                "properties": props,
                "geometry": geom
            })

    with open(PLIK_TRASY, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features_tras}, f, ensure_ascii=False)
    ile_linii = sum(1 for f in features_tras if f["geometry"]["type"] == "LineString")
    print(f"Zapisano slady tras: {ile_linii} linii (lacznie sledzonych jednostek: {len(features_tras)}).")


def zapisz(statki, sankcje):
    teraz = datetime.now(timezone.utc)
    features = []
    ile_floty_cieni = 0

    for mmsi, s in statki.items():
        lat = s.get("lat")
        lon = s.get("lon")
        if lat is None or lon is None:
            continue

        akt = s.get("aktualizacja")
        if akt:
            try:
                t_akt = datetime.fromisoformat(akt)
                if t_akt.tzinfo is None:
                    t_akt = t_akt.replace(tzinfo=timezone.utc)
                if teraz - t_akt > MAX_WIEK:
                    continue
            except Exception:
                pass

        if oznacz_flote_cieni(s, sankcje):
            ile_floty_cieni += 1

        props = {k: v for k, v in s.items() if k not in ("lat", "lon")}
        features.append({
            "type": "Feature",
            "properties": props,
            "geometry": {
                "type": "Point",
                "coordinates": [round(float(lon), 5), round(float(lat), 5)]
            }
        })

    geojson = {
        "type": "FeatureCollection",
        "generated_at": teraz.isoformat(timespec="seconds"),
        "features": features
    }

    with open(PLIK, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False)

    print(f"Zapisano {len(features)} statkow do {PLIK} (w tym Flota Cieni: {ile_floty_cieni}).")

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
        pobierz_dma_dania(statki, sekundy=20)
    except Exception as e:
        print("Blad DMA Dania:", e)

try:
    asyncio.run(nasluchuj_aisstream(statki))
except Exception as e:
    print("Blad polaczenia AISStream:", e)

zapisz(statki, sankcje)
