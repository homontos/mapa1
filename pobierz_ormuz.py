import json
import urllib.request
from datetime import datetime, timezone

URL = "https://hormuz.data-tracking.net/api/ships"
PLIK = "statki_ormuz.geojson"


def pierwsza(rekord, nazwy):
    for n in nazwy:
        if n in rekord and rekord[n] not in (None, ""):
            return rekord[n]
    return None


def zbierz(dane, wyniki):
    if isinstance(dane, list):
        if dane and all(isinstance(x, dict) for x in dane):
            wyniki.append(dane)
        else:
            for x in dane:
                zbierz(x, wyniki)
    elif isinstance(dane, dict):
        for w in dane.values():
            zbierz(w, wyniki)


LAT = ["lat", "latitude", "LAT", "Latitude"]
LON = ["lon", "lng", "long", "longitude", "LON", "Longitude"]


def pozycja(r):
    lat = pierwsza(r, LAT)
    lon = pierwsza(r, LON)
    if lat is None or lon is None:
        for k in ("position", "pos", "location"):
            w = r.get(k)
            if isinstance(w, dict):
                lat = pierwsza(w, LAT)
                lon = pierwsza(w, LON)
            elif isinstance(w, (list, tuple)) and len(w) >= 2:
                lat, lon = w[0], w[1]
    try:
        return float(lat), float(lon)
    except (TypeError, ValueError):
        return None


def liczba(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def typ_pl(t):
    if not t:
        return None
    s = str(t).lower()
    if "tanker" in s or "lng" in s or "lpg" in s:
        return "Zbiornikowiec"
    if "passenger" in s or "ferry" in s or "cruise" in s:
        return "Pasazerski"
    if "fishing" in s:
        return "Rybacki"
    if "tug" in s or "towing" in s:
        return "Holownik"
    if "sailing" in s:
        return "Zaglowka"
    if "pleasure" in s or "yacht" in s:
        return "Jacht"
    if "military" in s or "naval" in s or "law enforcement" in s:
        return "Wojskowy"
    if any(x in s for x in ("cargo", "bulk", "container", "general",
                            "carrier", "ro-ro", "vehicle")):
        return "Towarowy"
    return str(t)


def czas(r):
    v = pierwsza(r, ["timestamp", "time", "last_seen", "last_update",
                     "updated", "updated_at", "ts", "last_position_utc"])
    try:
        if isinstance(v, (int, float)):
            if v > 1e11:
                v = v / 1000
            return datetime.fromtimestamp(v, timezone.utc).isoformat(
                timespec="seconds")
        if isinstance(v, str):
            d = datetime.fromisoformat(v.replace("Z", "+00:00").replace(" ", "T"))
            if d.tzinfo is None:
                d = d.replace(tzinfo=timezone.utc)
            return d.astimezone(timezone.utc).isoformat(timespec="seconds")
    except Exception:
        pass
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


zadanie = urllib.request.Request(URL, headers={
    "User-Agent": "mapa-statkow (prywatny projekt niekomercyjny)",
    "Accept": "application/json",
})
with urllib.request.urlopen(zadanie, timeout=60) as r:
    dane = json.load(r)

wyniki = []
zbierz(dane, wyniki)
rekordy = max(wyniki, key=len) if wyniki else []
print("Rekordow w odpowiedzi:", len(rekordy))
if rekordy:
    print("Pola pierwszego rekordu:", sorted(rekordy[0].keys()))
    print("Przyklad:", json.dumps(rekordy[0], ensure_ascii=False)[:500])

cechy = []
for r in rekordy:
    poz = pozycja(r)
    if not poz:
        continue
    lat, lon = poz
    mmsi = pierwsza(r, ["mmsi", "MMSI"])
    wlasc = {
        "mmsi": str(mmsi) if mmsi is not None else "",
        "nazwa": str(pierwsza(r, ["name", "ship_name", "shipname",
                                  "vessel_name"]) or "").strip(),
        "typ": typ_pl(pierwsza(r, ["type", "ship_type", "vessel_type",
                                   "category", "ship_category"])),
        "predkosc": liczba(pierwsza(r, ["speed", "sog"])),
        "kurs": liczba(pierwsza(r, ["course", "cog", "heading"])),
        "cel": str(pierwsza(r, ["destination", "dest"]) or "").strip(),
        "aktualizacja": czas(r),
    }
    wlasc = {k: v for k, v in wlasc.items() if v not in (None, "")}
    cechy.append({
        "type": "Feature",
        "properties": wlasc,
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
    })

if not cechy:
    raise SystemExit("Brak statkow z pozycja - nie zapisuje pliku.")

with open(PLIK, "w", encoding="utf-8") as f:
    json.dump({"type": "FeatureCollection", "features": cechy}, f,
              ensure_ascii=False, separators=(",", ":"))
print("Zapisano statkow:", len(cechy))
