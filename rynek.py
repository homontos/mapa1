import csv
import io
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
            "https://api.nbp.pl/api/exchangerates/rates/a/" + kod + "/last/30/?format=json"))
        r = d["rates"]
        wynik[kod] = {
            "kurs": r[-1]["mid"], "data": r[-1]["effectiveDate"],
            "hist": [[x["effectiveDate"], x["mid"]] for x in r]}
    except Exception as e:
        print("Blad kursu", kod, e)

try:
    wiersze = pobierz("https://stooq.com/q/l/?s=cb.f&f=sd2t2c&h&e=csv").strip().splitlines()
    pola = wiersze[1].split(",")
    brent = {"cena": float(pola[3]), "data": pola[1], "godzina": pola[2]}
    stare = (wynik.get("brent") or {}).get("hist", [])
    hist = None
    try:
        tekst = pobierz("https://stooq.com/q/d/l/?s=cb.f&i=d")
        hist = [[w["Date"], float(w["Close"])]
                for w in list(csv.DictReader(io.StringIO(tekst)))[-30:] if w.get("Close")]
    except Exception as e:
        print("Brak historii ropy ze zrodla:", e)
    if not hist:
        hist = [h for h in stare if h[0] != brent["data"]] + [[brent["data"], brent["cena"]]]
        hist = hist[-60:]
    brent["hist"] = hist
    wynik["brent"] = brent
except Exception as e:
    print("Blad ropy", e)

wynik["zaktualizowano"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
if not any(k in wynik for k in ("usd", "eur", "brent")):
    raise SystemExit("Brak danych")

with open(PLIK, "w", encoding="utf-8") as f:
    json.dump(wynik, f, ensure_ascii=False, separators=(",", ":"))
print("Zapisano. Historia ropy:", len((wynik.get("brent") or {}).get("hist", [])))
