import json
import urllib.request
from datetime import datetime, timezone

PLIK = "rynek.json"


def pobierz(url):
    zad = urllib.request.Request(url, headers={
        "User-Agent": "mapa-statkow (prywatny projekt niekomercyjny)"})
    with urllib.request.urlopen(zad, timeout=30) as r:
        return r.read().decode("utf-8")


try:
    with open(PLIK, encoding="utf-8") as f:
        wynik = json.load(f)
except Exception:
    wynik = {}

for kod in ("usd", "eur"):
    try:
        d = json.loads(pobierz(
            "https://api.nbp.pl/api/exchangerates/rates/a/" + kod + "/?format=json"))
        k = d["rates"][-1]
        wynik[kod] = {"kurs": k["mid"], "data": k["effectiveDate"]}
    except Exception as e:
        print("Blad kursu", kod, e)

try:
    wiersze = pobierz("https://stooq.com/q/l/?s=cb.f&f=sd2t2c&h&e=csv").strip().splitlines()
    pola = wiersze[1].split(",")
    wynik["brent"] = {"cena": float(pola[3]), "data": pola[1], "godzina": pola[2]}
except Exception as e:
    print("Blad ropy", e)

wynik["zaktualizowano"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
if not any(k in wynik for k in ("usd", "eur", "brent")):
    raise SystemExit("Brak danych")

with open(PLIK, "w", encoding="utf-8") as f:
    json.dump(wynik, f, ensure_ascii=False)
print(wynik)
