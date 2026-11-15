import json
import urllib.request
from datetime import datetime, timedelta, timezone

PLIK = "statystyki.json"
INNE = "Poza Ukrainą / inne"
MIASTA = {"м. київ", "місто київ", "київ", "kyiv", "kyiv city", "city of kyiv", "kiev", "kiev city"}
OBWODY = [
    ("Winnicki", ["вінницька", "vinnytsia", "vinnytska", "винницкая"]),
    ("Wołyński", ["волинська", "volyn", "волынская"]),
    ("Dniepropetrowski", ["дніпропетровська", "dnipropetrovsk", "днепропетровская", "dnipro"]),
    ("Doniecki", ["донецька", "donetsk", "донецкая"]),
    ("Żytomierski", ["житомирська", "zhytomyr", "житомирская"]),
    ("Zakarpacki", ["закарпатська", "zakarpat", "закарпатская"]),
    ("Zaporoski", ["запорізька", "zaporizh", "запорожская"]),
    ("Iwanofrankiwski", ["івано-франківська", "ivano-frankivsk", "ивано-франковская"]),
    ("Kijowski", ["київська", "kyiv oblast", "kyivska", "kiev oblast", "киевская"]),
    ("Kirowohradzki", ["кіровоградська", "kirovohrad", "кировоградская", "kropyvnytskyi"]),
    ("Ługański", ["луганська", "luhansk", "луганская"]),
    ("Lwowski", ["львівська", "lviv", "львовская"]),
    ("Mikołajowski", ["миколаївська", "mykolaiv", "николаевская"]),
    ("Odeski", ["одеська", "odesa", "odessa", "одесская"]),
    ("Połtawski", ["полтавська", "poltava", "полтавская"]),
    ("Rówieński", ["рівненська", "rivne", "ровенская"]),
    ("Sumski", ["сумська", "sumy", "сумская"]),
    ("Tarnopolski", ["тернопільська", "ternopil", "тернопольская"]),
    ("Charkowski", ["харківська", "kharkiv", "харьковская"]),
    ("Chersoński", ["херсонська", "kherson", "херсонская"]),
    ("Chmielnicki", ["хмельницька", "khmelnytsk", "хмельницкая"]),
    ("Czerkaski", ["черкаська", "cherkas", "черкасская"]),
    ("Czerniowiecki", ["чернівецька", "chernivtsi", "черновицкая"]),
    ("Czernihowski", ["чернігівська", "chernihiv", "черниговская"]),
    ("Krym", ["крим", "crimea", "крым"]),
    ("Sewastopol", ["севастополь", "sevastopol"]),
]
GRUPY = {"uav": "d", "recon": "d", "missile": "r", "ballistic": "r", "mig31k": "r", "kab": "k"}


def obwod(nazwa, nieznane):
    n = (nazwa or "").strip().lower()
    if n in MIASTA:
        return "Kijów"
    for pl, aliasy in OBWODY:
        if any(a in n for a in aliasy):
            return pl
    if n:
        nieznane[nazwa] = nieznane.get(nazwa, 0) + 1
    return INNE


teraz = datetime.now(timezone.utc)
dzis = teraz.strftime("%Y-%m-%d")
wczoraj = (teraz - timedelta(days=1)).strftime("%Y-%m-%d")

try:
    with open(PLIK, encoding="utf-8") as f:
        stare = json.load(f)
except Exception:
    stare = {}
ids = stare.get("ids", {})
dni = stare.get("dni", {})
nieznane = stare.get("nieznane", {})

zad = urllib.request.Request("https://neptun.in.ua/api/v1/threats", headers={
    "User-Agent": "mapa-statystyki (prywatny projekt niekomercyjny)"})
with urllib.request.urlopen(zad, timeout=30) as r:
    dane = json.load(r)

lista = dane.get("threats", [])
print("Przykladowe regiony:", sorted({str(t.get("region")) for t in lista})[:10])

for t in lista:
    if t.get("advisory") or t.get("status") == "resolved":
        continue
    klucz = str(t.get("id") or (str(t.get("type")) + str(t.get("region")) + str(t.get("title"))))
    liczba = t.get("count") if isinstance(t.get("count"), int) and t.get("count") > 0 else 1
    znaleziony = next((d for d in (dzis, wczoraj) if klucz in ids.get(d, {})), None)
    if znaleziony:
        rec = ids[znaleziony][klucz]
        rec[2] = max(rec[2], liczba)
        continue
    ids.setdefault(dzis, {})[klucz] = [obwod(t.get("region"), nieznane),
                                       GRUPY.get(t.get("type"), "d"), liczba]

for d in (dzis, wczoraj):
    if d in ids:
        agg = {}
        for obl, g, c in ids[d].values():
            agg.setdefault(obl, {"d": 0, "r": 0, "k": 0})[g] += c
        dni[d] = agg

ids = {d: v for d, v in ids.items() if d >= wczoraj}
granica = (teraz - timedelta(days=40)).strftime("%Y-%m-%d")
dni = {d: v for d, v in dni.items() if d >= granica}
nieznane = dict(sorted(nieznane.items(), key=lambda x: -x[1])[:30])

with open(PLIK, "w", encoding="utf-8") as f:
    json.dump({"czas": teraz.isoformat(timespec="seconds"), "dni": dni, "ids": ids,
               "nieznane": nieznane}, f, ensure_ascii=False, separators=(",", ":"))
print("Dzis:", sum(sum(v.values()) for v in dni.get(dzis, {}).values()),
      "| nierozpoznane nazwy:", list(nieznane)[:5])
