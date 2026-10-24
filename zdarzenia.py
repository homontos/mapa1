import csv
import io
import json
import re
import urllib.request
import zipfile
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

SUROWE = "zdarzenia_surowe.json"
PLIK = "zdarzenia.geojson"
BAZA = "http://data.gdeltproject.org/gdeltv2/"
KRAJE = {"UP": "ukraina", "PL": "polska"}      # kody GDELT (FIPS)
RODZAJE = {"18": "atak", "19": "walki", "20": "przemoc masowa"}
GODZINY_START = 6     # ile godzin wstecz przy pierwszym uruchomieniu
GODZINY_ZAPIS = 48    # jak dlugo trzymac zdarzenia

csv.field_size_limit(10 ** 7)


def wczytaj():
    try:
        with open(SUROWE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"ostatni": None, "zdarzenia": []}


def pobierz_plik(slot):
    adres = BAZA + slot.strftime("%Y%m%d%H%M%S") + ".export.CSV.zip"
    zad = urllib.request.Request(adres, headers={
        "User-Agent": "mapa-zdarzen (prywatny projekt niekomercyjny)"})
    with urllib.request.urlopen(zad, timeout=120) as r:
        dane = r.read()
    with zipfile.ZipFile(io.BytesIO(dane)) as z:
        return z.read(z.namelist()[0]).decode("utf-8", errors="replace")


def tytul(url):
    host = urlparse(url).netloc.replace("www.", "")
    odcinki = [s for s in urlparse(url).path.split("/") if s]
    if odcinki:
        t = re.sub(r"\.\w{2,5}$", "", odcinki[-1])
        t = re.sub(r"[-_]+", " ", t).strip()
        if len(t) > 15 and not t.replace(" ", "").isdigit():
            return t[:110] + " (" + host + ")"
    return host


magazyn = wczytaj()
teraz = datetime.now(timezone.utc)
if magazyn.get("ostatni"):
    slot = datetime.fromisoformat(magazyn["ostatni"]) + timedelta(minutes=15)
else:
    slot = teraz - timedelta(hours=GODZINY_START)
slot = slot.replace(minute=slot.minute - slot.minute % 15, second=0, microsecond=0)

widziane = {z["id"] for z in magazyn["zdarzenia"]}
pobrane = 0
proby = 0
ostatni = magazyn.get("ostatni")
przyklad_wypisany = False

while slot <= teraz - timedelta(minutes=10) and proby < 40:
    proby += 1
    try:
        tekst = pobierz_plik(slot)
    except Exception as e:
        print("Brak pliku", slot.isoformat(), e)
        slot += timedelta(minutes=15)
        continue
    pobrane += 1
    ostatni = slot.isoformat()
    for w in csv.reader(io.StringIO(tekst), delimiter="\t"):
        if len(w) < 58:
            continue
        kat = KRAJE.get(w[-8])
        rodzaj = RODZAJE.get(w[28])
        if not kat or not rodzaj or w[0] in widziane:
            continue
        try:
            lat, lon = float(w[-5]), float(w[-4])
            wzmianki = int(w[31])
        except ValueError:
            continue
        if not przyklad_wypisany:
            print("Przyklad wiersza:", w[0], w[26], w[28], w[-9], lat, lon, w[-1])
            przyklad_wypisany = True
        widziane.add(w[0])
        magazyn["zdarzenia"].append({
            "id": w[0], "t": slot.isoformat(), "kat": kat, "rodzaj": rodzaj,
            "miejsce": w[-9], "lat": lat, "lon": lon, "m": wzmianki, "url": w[-1]})
    slot += timedelta(minutes=15)

granica = (teraz - timedelta(hours=GODZINY_ZAPIS)).isoformat()
magazyn["zdarzenia"] = [z for z in magazyn["zdarzenia"] if z["t"] > granica]
magazyn["ostatni"] = ostatni

if not pobrane and not magazyn["zdarzenia"]:
    raise SystemExit("Nie pobrano zadnego pliku i nie ma starych danych.")

grupy = {}
for z in magazyn["zdarzenia"]:
    k = (z["kat"], round(z["lat"], 2), round(z["lon"], 2))
    g = grupy.setdefault(k, {"kat": z["kat"], "miejsce": z["miejsce"],
                             "lat": z["lat"], "lon": z["lon"], "ile": 0, "linki": {}})
    g["ile"] += 1
    g["linki"][z["url"]] = max(g["linki"].get(z["url"], 0), z["m"])

cechy = []
for g in grupy.values():
    najlepsze = sorted(g["linki"].items(), key=lambda x: -x[1])[:6]
    linki = [{"t": tytul(u), "u": u} for u, _ in najlepsze if u.startswith("http")]
    cechy.append({
        "type": "Feature",
        "properties": {
            "kategoria": g["kat"], "miejsce": g["miejsce"], "ile": g["ile"],
            "linki": json.dumps(linki, ensure_ascii=False),
            "aktualizacja": teraz.isoformat(timespec="seconds")},
        "geometry": {"type": "Point", "coordinates": [g["lon"], g["lat"]]}})

with open(SUROWE, "w", encoding="utf-8") as f:
    json.dump(magazyn, f, ensure_ascii=False, separators=(",", ":"))
with open(PLIK, "w", encoding="utf-8") as f:
    json.dump({"type": "FeatureCollection", "features": cechy}, f,
              ensure_ascii=False, separators=(",", ":"))
print("Pobrane pliki:", pobrane, "| zdarzenia w magazynie:", len(magazyn["zdarzenia"]),
      "| znaczniki:", len(cechy))
