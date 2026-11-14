import json
import urllib.request
from datetime import datetime, timedelta, timezone

PLIK = "historia.json"
teraz = datetime.now(timezone.utc)
dzien = teraz.strftime("%Y-%m-%d")


def licz_cechy(sciezka):
    try:
        with open(sciezka, encoding="utf-8") as f:
            return len(json.load(f).get("features", []))
    except Exception:
        return None


def licz_samoloty():
    try:
        with open("samoloty.json", encoding="utf-8") as f:
            return len(json.load(f).get("ac", []))
    except Exception:
        return None


def neptun(sciezka):
    try:
        zad = urllib.request.Request("https://neptun.in.ua/api/v1/" + sciezka, headers={
            "User-Agent": "mapa-historia (prywatny projekt niekomercyjny)"})
        with urllib.request.urlopen(zad, timeout=30) as r:
            return json.load(r)
    except Exception as e:
        print("Blad Neptun", sciezka, e)
        return None


def swieze(x):
    try:
        t = datetime.fromisoformat(str(x.get("since")).replace("Z", "+00:00"))
        return (teraz - t) < timedelta(days=14)
    except Exception:
        return True


def alarmy():
    d = neptun("alerts")
    if d is None:
        return None
    return len([x for x in d.get("oblasts", []) + d.get("raions", []) if swieze(x)])


def zagrozenia():
    d = neptun("threats")
    if d is None:
        return None
    return len([t for t in d.get("threats", [])
                if t.get("status") != "resolved" and not t.get("areaOnly")
                and isinstance(t.get("lat"), (int, float))])


metryki = {
    "g": licz_cechy("statki.geojson"),
    "o": licz_cechy("statki_ormuz.geojson"),
    "b": licz_cechy("statki_bab.geojson"),
    "s": licz_samoloty(),
    "a": alarmy(),
    "d": zagrozenia(),
}
print("Probka:", metryki)

try:
    with open(PLIK, encoding="utf-8") as f:
        hist = json.load(f)
except Exception:
    hist = {}
dni = hist.setdefault("dni", {})
dd = dni.setdefault(dzien, {})
for m, w in metryki.items():
    if w is None:
        continue
    suma = dd.setdefault(m, [0, 0])
    suma[0] += w
    suma[1] += 1

granica = (teraz - timedelta(days=60)).strftime("%Y-%m-%d")
hist["dni"] = {k: v for k, v in dni.items() if k >= granica}
hist["zaktualizowano"] = teraz.isoformat(timespec="seconds")

with open(PLIK, "w", encoding="utf-8") as f:
    json.dump(hist, f, separators=(",", ":"))
print("Zapisano. Dni w historii:", len(hist["dni"]))
