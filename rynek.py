import csv
import io
import json
import urllib.request
from datetime import datetime, timezone

PLIK = "rynek.json"
PRZEGLADARKA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")


def pobierz(url, agent="mapa-statkow (prywatny projekt niekomercyjny)"):
    zad = urllib.request.Request(url, headers={
        "User-Agent": agent, "Accept": "application/json,text/csv,*/*"})
    with urllib.request.urlopen(zad, timeout=30) as r:
        return r.read().decode("utf-8")


def brent_yahoo(host):
    d = json.loads(pobierz(
        "https://" + host + "/v8/finance/chart/BZ%3DF?range=1mo&interval=1d",
        PRZEGLADARKA))
    w = d["chart"]["result"][0]
    hist = [[datetime.fromtimestamp(t, timezone.utc).strftime("%Y-%m-%d"), round(c, 2)]
            for t, c in zip(w["timestamp"], w["indicators"]["quote"][0]["close"])
            if c is not None][-30:]
    cena = w["meta"].get("regularMarketPrice") or hist[-1][1]
    return {"cena": float(cena), "data": hist[-1][0], "godzina": "", "hist": hist}


def brent_stooq():
    wiersze = pobierz("https://stooq.com/q/l/?s=cb.f&f=sd2t2c&h&e=csv").strip().splitlines()
    pola = wiersze[1].split(",")
    brent = {"cena": float(pola[3]), "data": pola[1], "godzina": pola[2]}
    hist = None
    try:
        tekst = pobierz("https://stooq.com/q/d/l/?s=cb.f&i=d")
        hist = [[w["Date"], float(w["Close"])]
                for w in list(csv.DictReader(io.StringIO(tekst)))[-30:] if w.get("Close")]
    except Exception as e:
        print("Brak historii ropy ze Stooq:", e)
    brent["hist"] = hist or [[brent["data"], brent["cena"]]]
    return brent


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

zrodla = (
    ("Yahoo query1", lambda: brent_yahoo("query1.finance.yahoo.com")),
    ("Yahoo query2", lambda: brent_yahoo("query2.finance.yahoo.com")),
    ("Stooq", brent_stooq),
)
bledy = []
for nazwa, funkcja in zrodla:
    try:
        wynik["brent"] = funkcja()
        print("Zrodlo ropy:", nazwa, "| cena:", wynik["brent"]["cena"])
        wynik.pop("ropa_blad", None)
        break
    except Exception as e:
        opis = nazwa + ": " + type(e).__name__ + " " + str(e)[:120]
        print("Blad ropy -", opis)
        bledy.append(opis)
else:
    wynik["ropa_blad"] = bledy

wynik["zaktualizowano"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
if not any(k in wynik for k in ("usd", "eur", "brent")):
    raise SystemExit("Brak danych")

with open(PLIK, "w", encoding="utf-8") as f:
    json.dump(wynik, f, ensure_ascii=False, separators=(",", ":"))
print("Zapisano.")
