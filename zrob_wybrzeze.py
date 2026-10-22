import json
import urllib.request

from shapely.geometry import shape, box, mapping

URL = ("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
       "master/geojson/ne_10m_admin_0_countries.geojson")
OBSZAR = box(12.0, 52.5, 22.0, 56.5)  # zachod, poludnie, wschod, polnoc

with urllib.request.urlopen(URL, timeout=180) as r:
    dane = json.load(r)

cechy = []
for ft in dane["features"]:
    geom = shape(ft["geometry"])
    if not geom.is_valid:
        geom = geom.buffer(0)
    if not geom.intersects(OBSZAR):
        continue
    przyciete = geom.intersection(OBSZAR)
    if przyciete.is_empty:
        continue
    p = ft["properties"]
    kraj = p.get("NAME") or p.get("name") or p.get("ADMIN") or p.get("admin") or ""
    cechy.append({
        "type": "Feature",
        "properties": {"kraj": kraj},
        "geometry": mapping(przyciete),
    })

with open("wybrzeze.geojson", "w", encoding="utf-8") as f:
    json.dump({"type": "FeatureCollection", "features": cechy}, f,
              ensure_ascii=False, separators=(",", ":"))
print("Zapisano krajow:", len(cechy))
