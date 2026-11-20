import csv
import io
import json
import urllib.request
from datetime import datetime, timedelta, timezone

PLIK = "rynek_plus.json"
UA = "mapa-rynek/1.0 (prywatny projekt niekomercyjny)"
UA_PRZEGLADARKA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")


def pobierz(url, ua=UA):
    zad = urllib.request.Request(url, headers={
        "User-Agent": ua, "Accept": "application/json,text/csv,*/*"})
    with urllib.request.urlopen(zad, timeout=60) as r:
        return r.read().decode("utf-8", errors="replace")


try:
    with open(PLIK, encoding="utf-8") as f:
        wynik = json.load(f)
except Exception:
    wynik = {}
wynik.pop("paliwa", None)      # stary format

# ---------- Zloto (NBP) ----------
try:
    d = json.loads(pobierz("https://api.nbp.pl/api/cenyzlota/last/30/?format=json"))
    h = [[x["data"], x["cena"]] for x in d]
    wynik["zloto"] = {"cena": h[-1][1], "data": h[-1][0], "hist": h}
    print("Zloto:", h[-1])
except Exception as e:
    print("Blad zlota:", type(e).__name__, str(e)[:100])


# ---------- WIG20 (kilka prob) ----------
def wig20():
    for host in ("stooq.pl", "stooq.com"):
        url = "https://" + host + "/q/d/l/?s=wig20&i=d"
        try:
            tekst = pobierz(url, UA_PRZEGLADARKA)
            w = [r for r in csv.DictReader(io.StringIO(tekst)) if r.get("Close")]
            h = [[r["Date"], float(r["Close"])] for r in w[-30:]]
            if not h:
                raise ValueError("pusta odpowiedz: " + tekst[:80].replace("\n", " "))
            return {"cena": h[-1][1], "data": h[-1][0], "hist": h, "zrodlo": "Stooq"}
        except Exception as e:
            print("WIG20 -", url, type(e).__name__, str(e)[:100])
    try:
        d = json.loads(pobierz("https://query2.finance.yahoo.com/v8/finance/chart/WIG20.WA?range=2mo&interval=1d",
                               UA_PRZEGLADARKA))
        r = d["chart"]["result"][0]
        h = [[datetime.fromtimestamp(t, timezone.utc).strftime("%Y-%m-%d"), round(c, 2)]
             for t, c in zip(r["timestamp"], r["indicators"]["quote"][0]["close"]) if c is not None][-30:]
        return {"cena": h[-1][1], "data": h[-1][0], "hist": h, "zrodlo": "Yahoo Finance"}
    except Exception as e:
        print("WIG20 - Yahoo", type(e).__name__, str(e)[:100])
    return None


w = wig20()
if w:
    wynik["wig20"] = w
    print("WIG20:", w["data"], w["cena"], "(", w["zrodlo"], ")")
else:
    wynik.pop("wig20", None)


# ---------- Paliwa: fuel-prices.eu (dane Komisji Europejskiej) ----------
def paliwa():
    d = json.loads(pobierz("https://www.fuel-prices.eu/lang/api/country-history.php?cc=PL"))
    etyk, e95, on = d["labels"], d["e95"], d["diesel"]
    koniec = datetime.now(timezone.utc).date()
    start = koniec - timedelta(days=360)
    kursy = [(r["effectiveDate"], r["mid"]) for r in json.loads(pobierz(
        "https://api.nbp.pl/api/exchangerates/rates/a/eur/" + str(start) + "/" + str(koniec) +
        "/?format=json"))["rates"]]

    def kurs(data):
        k = None
        for dd, v in kursy:
            if dd <= data:
                k = v
            else:
                break
        return k

    seria = {"pb95": [], "on": []}
    for i, dt in enumerate(etyk):
        k = kurs(dt)
        if k is None:
            continue
        if e95[i]:
            seria["pb95"].append([dt, round(e95[i] * k, 3)])
        if on[i]:
            seria["on"].append([dt, round(on[i] * k, 3)])
    out = {"data": etyk[-1], "kurs_eur": kursy[-1][1]}
    for nazwa, h in seria.items():
        h = h[-26:]
        if h:
            out[nazwa] = {"cena": h[-1][1], "data": h[-1][0], "hist": h}
    if "pb95" not in out and "on" not in out:
        raise RuntimeError("brak danych po przeliczeniu")
    return out


try:
    wynik["paliwa"] = paliwa()
    print("Paliwa:", {k: (v["cena"] if isinstance(v, dict) else v) for k, v in wynik["paliwa"].items()})
except Exception as e:
    print("Blad paliw:", type(e).__name__, str(e)[:200])

if not any(k in wynik for k in ("zloto", "wig20", "paliwa")):
    raise SystemExit("Brak danych")
wynik["zaktualizowano"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
with open(PLIK, "w", encoding="utf-8") as f:
    json.dump(wynik, f, ensure_ascii=False, separators=(",", ":"))
print("Zapisano.")
