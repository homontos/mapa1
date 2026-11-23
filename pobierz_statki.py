import asyncio
import gzip
import json
import os
import time
import urllib.request
from datetime import datetime, timezone, timedelta

import websockets

KLUCZ = os.environ.get("AISSTREAM_API_KEY", "")
CZAS_NASLUCHU = 240
PLIK = os.environ.get("PLIK_WYJSCIOWY", "statki.geojson")
OBSZAR = json.loads(os.environ.get("OBSZAR", "[[[53.8, 14.0], [55.2, 20.0]]]"))
MAX_WIEK = timedelta(hours=6)

POZYCJE = ("PositionReport", "StandardClassBPositionReport",
           "ExtendedClassBPositionReport")
TYPY_KOMUNIKATOW = list(POZYCJE) + ["ShipStaticData", "StaticDataReport"]


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


def wczytaj_stare():
    try:
        with open(PLIK, encoding="utf-8") as f:
            dane = json.load(f)
    except Exception:
        return {}
    statki = {}
    for ft in dane.get("features", []):
        p = dict(ft["properties"])
        coords = ft["geometry"]["coordinates"]
        p["lon"] = coords[0]
        p["lat"] = coords[1]
        statki[str(p["mmsi"])] = p
    return statki


def w_obszarze(lat, lon):
    for box in OBSZAR:
        (lat_min, lon_min), (lat_max, lon_max) = box
        if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
            return True
    return False


def czy_baltyk():
    for box in OBSZAR:
        (lat_min, lon_min), (lat_max, lon_max) = box
        if 53.0 <= lat_max and lat_min <= 66.0 and 9.0 <= lon_max and lon_min <= 31.0:
            return True
    return False


def pobierz_json_url(url):
    req = urllib.request.Request(url, headers={
        "Accept": "application/json;charset=UTF-8",
        "Accept-Encoding": "gzip",
        "Digitraffic-User": "HomontosMapa1/1.0",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
        if resp.headers.get("Content-Encoding") == "gzip" or raw[:2] == b"\x1f\x8b":
            raw = gzip.decompress(raw)
        tekst = raw.decode("utf-8").strip()
        if not tekst:
            raise ValueError(f"Pusta odpowiedz z {url} (status {resp.status})")
        return json.loads(tekst)


def pobierz_digitraffic(statki):
    print("Pobieram dane AIS dla Baltyku z Digitraffic (HELCOM)...")
    lokacje = pobierz_json_url("https://digitraffic.fi")
    metadane = pobierz_json_url("https://digitraffic.fi")

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
        lon = coords[0]
        lat = coords[1]
        if not w_obszarze(lat, lon):
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
            opis = opis_typu(info.get("shipType"))
            if opis:
                s["typ"] = opis
        dodane += 1

    print(f"Digitraffic: zaktualizowano {dodane} statkow w obszarze.")


async def nasluchuj_aisstream(statki):
    if not KLUCZ:
        raise RuntimeError("Brak AISSTREAM_API_KEY")
    async with websockets.connect(
        "wss://stream.aisstream.io/v0/stream",
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
                if typ == "ExtendedClassBPositionReport":
                    opis = opis_typu(tresc.get("Type"))
                    if opis:
                        s["typ"] = opis
            elif typ == "ShipStaticData":
                cel = (tresc.get("Destination") or "").strip()
                if cel:
                    s["cel"] = cel
                opis = opis_typu(tresc.get("Type"))
                if opis:
                    s["typ"] = opis
            elif typ == "StaticDataReport":
                a = tresc.get("ReportA") or {}
                b = tresc.get("ReportB") or {}
                nazwa_a = (a.get("Name") or "").strip()
                if nazwa_a and "nazwa" not in s:
                    s["nazwa"] = nazwa_a
                opis = opis_typu(b.get("ShipType"))
                if opis:
                    s["typ"] = opis


def zapisz(statki):
    teraz = datetime.now(timezone.utc)
    cechy = []
    for s in statki.values():
        if s.get("lat") is None or s.get("lon") is None:
            continue
        akt = s.get("aktualizacja")
        if akt and teraz - datetime.fromisoformat(akt) > MAX_WIEK:
            continue
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
    print("Zapisano statkow:", len(cechy))


statki = wczytaj_stare()
if czy_baltyk():
    try:
        pobierz_digitraffic(statki)
    except Exception as e:
        print("Blad Digitraffic:", e)
else:
    try:
        asyncio.run(nasluchuj_aisstream(statki))
    except Exception as e:
        print("Blad polaczenia AISStream:", e)

zapisz(statki)
