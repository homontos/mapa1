import json
import math
import urllib.request
from datetime import datetime, timedelta, timezone

PLIK = "os_czasu.json"
WIEK_H = 12
POLSKA = [[14.12,53.93],[16.0,54.55],[17.5,54.9],[18.5,54.95],[19.6,54.55],
          [19.9,54.4],[20.4,54.38],[22.8,54.38],[23.5,54.2],[23.55,53.9],[23.95,52.75],
          [23.6,52.1],[23.55,51.55],[24.05,50.85],[23.5,50.4],[22.7,49.6],[22.85,49.05],
          [22.1,49.2],[21.6,49.4],[20.3,49.35],[19.5,49.2],[18.9,49.5],[18.5,49.9],
          [17.7,50.3],[16.9,50.4],[16.2,50.7],[15.0,51.0],[14.75,51.05],[14.7,52.0],
          [14.55,52.6],[14.15,52.9],[14.2,53.5]]


def w_polsce(lon, lat):
    w = False
    j = len(POLSKA) - 1
    for i in range(len(POLSKA)):
        xi, yi = POLSKA[i]
        xj, yj = POLSKA[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            w = not w
        j = i
    return w


def dystans(lon, lat):
    if w_polsce(lon, lat):
        return 0.0
    kx = 111.32 * math.cos(math.radians(lat))
    ky = 110.57
    najmniej = float("inf")
    j = len(POLSKA) - 1
    for i in range(len(POLSKA)):
        ax, ay = (POLSKA[j][0] - lon) * kx, (POLSKA[j][1] - lat) * ky
        bx, by = (POLSKA[i][0] - lon) * kx, (POLSKA[i][1] - lat) * ky
        dx, dy = bx - ax, by - ay
        l2 = dx * dx + dy * dy
        t = max(0.0, min(1.0, -(ax * dx + ay * dy) / l2)) if l2 else 0.0
        najmniej = min(najmniej, math.hypot(ax + t * dx, ay + t * dy))
        j = i
    return najmniej


teraz = datetime.now(timezone.utc)
zad = urllib.request.Request("https://neptun.in.ua/api/v1/threats", headers={
    "User-Agent": "mapa-osi-czasu (prywatny projekt niekomercyjny)"})
with urllib.request.urlopen(zad, timeout=30) as r:
    dane = json.load(r)

try:
    with open(PLIK, encoding="utf-8") as f:
        zd = json.load(f).get("zdarzenia", {})
except Exception:
    zd = {}

for t in dane.get("threats", []):
    if t.get("areaOnly") or t.get("advisory"):
        continue
    lat, lon = t.get("lat"), t.get("lon")
    if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
        continue
    klucz = str(t.get("id") or (str(t.get("type")) + "-" + str(round(lat, 1)) + "-" + str(round(lon, 1))))
    km = round(dystans(lon, lat), 1)
    rec = zd.get(klucz) or {"pierwszy": teraz.isoformat(timespec="seconds"), "min_km": km}
    rec.update({
        "ostatni": teraz.isoformat(timespec="seconds"),
        "typ": t.get("type") or "unknown",
        "miejsce": t.get("locality") or t.get("district") or t.get("region") or "",
        "lat": lat, "lon": lon,
        "kurs": t.get("heading") if isinstance(t.get("heading"), (int, float)) else None,
        "liczba": t.get("count") or 0,
        "min_km": min(rec.get("min_km", km), km),
        "status": t.get("status") or "",
    })
    zd[klucz] = rec

granica = (teraz - timedelta(hours=WIEK_H)).isoformat()
zd = {k: v for k, v in zd.items() if v["ostatni"] >= granica}
with open(PLIK, "w", encoding="utf-8") as f:
    json.dump({"czas": teraz.isoformat(timespec="seconds"), "zdarzenia": zd},
              f, ensure_ascii=False, separators=(",", ":"))
print("Zdarzen w osi czasu:", len(zd))
