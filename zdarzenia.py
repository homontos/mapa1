import json
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

PLIK = "zdarzenia.geojson"
URL = "https://api.gdeltproject.org/api/v2/geo/geo?"
ZAPYTANIA = [
    ("ukraina", "(drone OR missile OR shelling OR explosion OR airstrike OR attack) Ukraine"),
    ("polska", "(drone OR airspace OR explosion OR sabotage OR incident) Poland"),
]
# poludnie, zachod, polnoc, wschod
S, W, N, E = 44.0, 14.0, 55.0, 41.0


def pobierz(zapytanie):
    adres = URL + urllib.parse.urlencode({
        "query": zapytanie, "format": "GeoJSON",
        "timespan": "24h", "maxpoints": "500"})
    zad = urllib.request.Request(adres, headers={
        "User-Agent": "mapa-zdarzen (prywatny projekt niekomercyjny)"})
    with urllib.request.urlopen(zad, timeout=90) as r:
        return json.load(r)


def linki(html):
    wynik = []
    for u, t in re.findall(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', html or "", re.S):
        t = re.sub(r"<[^>]+>", "", t).strip()
        if u.startswith("http") and t:
            wynik.append({"t": t[:140], "u": u})
    return wynik[:6]


teraz = datetime.now(timezone.utc).isoformat(timespec="seconds")
cechy = []
for numer, (kategoria, zapytanie) in enumerate(ZAPYTANIA):
    if numer:
        time.sleep(7)
    try:
        dane = pobierz(zapytanie)
    except Exception as e:
        print("Blad zapytania", kategoria, e)
        continue
    lista = dane.get("features", [])
    print(kategoria, "- punktow z GDELT:", len(lista))
    if lista and numer == 0:
        print("Przyklad:", json.dumps(lista[0], ensure_ascii=False)[:600])
    for ft in lista:
        try:
            lon, lat = ft["geometry"]["coordinates"][:2]
            if not (S <= lat <= N and W <= lon <= E):
                continue
            p = ft.get("properties", {})
            ile = int(float(p.get("count", 1) or 1))
            cechy.append({
                "type": "Feature",
                "properties": {
                    "kategoria": kategoria,
                    "miejsce": str(p.get("name", "")).strip(),
                    "ile": ile,
                    "linki": json.dumps(linki(p.get("html")), ensure_ascii=False),
                    "aktualizacja": teraz,
                },
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
            })
        except Exception:
            continue

if not cechy:
    raise SystemExit("Brak zdarzen - nie zapisuje pliku.")

with open(PLIK, "w", encoding="utf-8") as f:
    json.dump({"type": "FeatureCollection", "features": cechy}, f,
              ensure_ascii=False, separators=(",", ":"))
print("Zapisano zdarzen:", len(cechy))
