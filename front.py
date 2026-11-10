import gzip
import json
import re
import urllib.request
from datetime import datetime, timezone

from shapely.geometry import mapping, shape
from shapely.ops import unary_union

REPO = "cyterat/deepstate-map-data"


def pobierz(url):
    zad = urllib.request.Request(url, headers={
        "User-Agent": "mapa-frontu (prywatny projekt niekomercyjny)"})
    with urllib.request.urlopen(zad, timeout=120) as r:
        return r.read()


kandydaci = []
try:
    lista = json.loads(pobierz("https://api.github.com/repos/" + REPO + "/contents/data"))
    pliki = sorted([x for x in lista if x.get("name", "").endswith((".geojson", ".geojson.gz"))],
                   key=lambda x: x["name"])
    if pliki:
        kandydaci.append((pliki[-1]["name"], pliki[-1]["download_url"]))
except Exception as e:
    print("Lista plikow w /data niedostepna:", e)
for galaz in ("main", "master"):
    kandydaci.append(("deepstate-map-data.geojson.gz",
                      "https://raw.githubusercontent.com/" + REPO + "/" + galaz +
                      "/deepstate-map-data.geojson.gz"))

dane, nazwa = None, None
for n, url in kandydaci:
    try:
        surowe = pobierz(url)
        if url.endswith(".gz"):
            surowe = gzip.decompress(surowe)
        dane = json.loads(surowe)
        nazwa = n
        print("Zrodlo:", url)
        break
    except Exception as e:
        print("Nie udalo sie:", url, type(e).__name__, str(e)[:100])
if dane is None:
    raise SystemExit("Nie pobrano danych o linii frontu")

obiekty = dane.get("features") or [dane]
poligony = []
for f in obiekty:
    g = f.get("geometry") or f
    if g.get("type") in ("Polygon", "MultiPolygon"):
        s = shape(g)
        poligony.append(s if s.is_valid else s.buffer(0))
print("Obiektow:", len(obiekty), "| wielokatow:", len(poligony))
if not poligony:
    raise SystemExit("W danych nie ma wielokatow")

zlaczone = unary_union(poligony).simplify(0.002, preserve_topology=True)
m = re.search(r"(\d{4})[-_]?(\d{2})[-_]?(\d{2})", nazwa or "")
data = "-".join(m.groups()) if m else datetime.now(timezone.utc).strftime("%Y-%m-%d")

wynik = {
    "type": "FeatureCollection",
    "data": data,
    "pobrano": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "features": [
        {"type": "Feature", "properties": {"rodzaj": "okupowane"}, "geometry": mapping(zlaczone)},
        {"type": "Feature", "properties": {"rodzaj": "granica"}, "geometry": mapping(zlaczone.boundary)},
    ],
}
with open("front.geojson", "w", encoding="utf-8") as f:
    json.dump(wynik, f, separators=(",", ":"))
print("Zapisano front.geojson, data zrodla:", data)
