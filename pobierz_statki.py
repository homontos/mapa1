import asyncio
import json
import os
import time
from datetime import datetime, timezone, timedelta

import websockets

KLUCZ = os.environ["AISSTREAM_API_KEY"]
CZAS_NASLUCHU = 90          # ile sekund nasluchiwac
PLIK = "statki.geojson"
# Polskie wybrzeze i Zatoka Gdanska: [[szer, dl], [szer, dl]]
OBSZAR = [[[53.8, 14.0], [55.2, 20.0]]]
MAX_WIEK = timedelta(hours=3)


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
        p["lon"], p["lat"] = ft["geometry"]["coordinates"]
        statki[str(p["mmsi"])] = p
    return statki


async def nasluchuj(statki):
    async with websockets.connect("wss://stream.aisstream.io/v0/stream") as ws:
        await ws.send(json.dumps({
            "APIKey": KLUCZ,
            "BoundingBoxes": OBSZAR,
            "FilterMessageTypes": ["PositionReport", "ShipStaticData"],
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
            s = statki.setdefault(mmsi, {"mmsi": mmsi})
            nazwa = (meta.get("ShipName") or "").strip()
            if nazwa:
                s["nazwa"] = nazwa
            typ = msg.get("MessageType")
            if typ == "PositionReport":
                p = msg["Message"]["PositionReport"]
                s["lat"] = p.get("Latitude", meta.get("latitude"))
                s["lon"] = p.get("Longitude", meta.get("longitude"))
                s["predkosc"] = p.get("Sog")
                s["kurs"] = p.get("Cog")
                s["aktualizacja"] = datetime.now(timezone.utc).isoformat(
                    timespec="seconds")
            elif typ == "ShipStaticData":
                d = msg["Message"]["ShipStaticData"]
                cel = (d.get("Destination") or "").strip()
                if cel:
                    s["cel"] = cel
                opis = opis_typu(d.get("Type"))
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
    with open(PLIK, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": cechy}, f,
                  ensure_ascii=False)
    print("Zapisano statkow:", len(cechy))


statki = wczytaj_stare()
try:
    asyncio.run(nasluchuj(statki))
except Exception as e:
    print("Blad polaczenia:", e)
zapisz(statki)
