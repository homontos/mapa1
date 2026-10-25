import json
import urllib.request
from datetime import datetime, timezone

ADRESY = [
    "https://opendata.adsb.fi/api/v2/lat/52.0/lon/19.1/dist/250",
    "https://api.adsb.lol/v2/point/52.0/19.1/250",
]
POLSKA = [[14.12, 53.93], [16.0, 54.55], [17.5, 54.9], [18.5, 54.95], [19.6, 54.55],
          [19.9, 54.4], [20.4, 54.38], [22.8, 54.38], [23.5, 54.2], [23.55, 53.9],
          [23.95, 52.75], [23.6, 52.1], [23.55, 51.55], [24.05, 50.85], [23.5, 50.4],
          [22.7, 49.6], [22.85, 49.05], [22.1, 49.2], [21.6, 49.4], [20.3, 49.35],
          [19.5, 49.2], [18.9, 49.5], [18.5, 49.9], [17.7, 50.3], [16.9, 50.4],
          [16.2, 50.7], [15.0, 51.0], [14.75, 51.05], [14.7, 52.0], [14.55, 52.6],
          [14.15, 52.9], [14.2, 53.5]]
POLA = ("hex", "flight", "r", "t", "alt_baro", "gs", "track",
        "squawk", "dbFlags", "lat", "lon")


def w_polsce(lon, lat):
    wewnatrz = False
    j = len(POLSKA) - 1
    for i in range(len(POLSKA)):
        xi, yi = POLSKA[i]
        xj, yj = POLSKA[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            wewnatrz = not wewnatrz
        j = i
    return wewnatrz


def pobierz(adres):
    zad = urllib.request.Request(adres, headers={
        "User-Agent": "mapa-samolotow (prywatny projekt niekomercyjny)"})
    with urllib.request.urlopen(zad, timeout=60) as r:
        return json.load(r)


dane = None
for adres in ADRESY:
    try:
        dane = pobierz(adres)
        print("Zrodlo:", adres)
        break
    except Exception as e:
        print("Blad zrodla", adres, e)
if dane is None:
    raise SystemExit("Zadne zrodlo nie odpowiada")

lista = dane.get("ac") or dane.get("aircraft") or []
wynik = []
for a in lista:
    lat, lon = a.get("lat"), a.get("lon")
    if isinstance(lat, (int, float)) and isinstance(lon, (int, float)) and w_polsce(lon, lat):
        wynik.append({k: a[k] for k in POLA if k in a})

with open("samoloty.json", "w", encoding="utf-8") as f:
    json.dump({"czas": datetime.now(timezone.utc).isoformat(timespec="seconds"),
               "ac": wynik}, f, ensure_ascii=False, separators=(",", ":"))
print("Samolotow w Polsce:", len(wynik), "z", len(lista))
