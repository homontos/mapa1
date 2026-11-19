import csv
import io
import json
import re
import urllib.request
from datetime import datetime, timezone
from urllib.parse import urljoin

PLIK = "rynek_plus.json"
UA = "Mozilla/5.0 (mapa-rynek; prywatny projekt niekomercyjny)"
STRONA_KE = "https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en"


def pobierz(url, bajty=False):
    zad = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(zad, timeout=60) as r:
        d = r.read()
    return d if bajty else d.decode("utf-8", errors="replace")


try:
    with open(PLIK, encoding="utf-8") as f:
        wynik = json.load(f)
except Exception:
    wynik = {}

# ---------- Zloto (NBP) ----------
try:
    d = json.loads(pobierz("https://api.nbp.pl/api/cenyzlota/last/30/?format=json"))
    h = [[x["data"], x["cena"]] for x in d]
    wynik["zloto"] = {"cena": h[-1][1], "data": h[-1][0], "hist": h}
    print("Zloto:", h[-1])
except Exception as e:
    print("Blad zlota:", type(e).__name__, str(e)[:100])

# ---------- WIG20 (Stooq) ----------
try:
    tekst = pobierz("https://stooq.pl/q/d/l/?s=wig20&i=d")
    w = [r for r in csv.DictReader(io.StringIO(tekst)) if r.get("Close")]
    h = [[r["Date"], float(r["Close"])] for r in w[-30:]]
    if not h:
        raise ValueError("pusta odpowiedz: " + tekst[:80].replace("\n", " "))
    wynik["wig20"] = {"cena": h[-1][1], "data": h[-1][0], "hist": h}
    print("WIG20:", h[-1])
except Exception as e:
    print("Blad WIG20:", type(e).__name__, str(e)[:120])


# ---------- Paliwa (Komisja Europejska) ----------
def paliwa():
    import openpyxl
    strona = pobierz(STRONA_KE)
    kandydaci = []
    for href, tekst in re.findall(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', strona, re.S):
        t = re.sub(r"<[^>]+>", " ", tekst).lower()
        if "taxes" in t and "latest" in t and "without" not in t:
            kandydaci.append(urljoin(STRONA_KE, href.replace("&amp;", "&")))
    print("Kandydatow na plik z cenami:", len(kandydaci))
    if not kandydaci:
        raise RuntimeError("nie znaleziono linku do pliku z cenami z podatkami")
    dane = pobierz(kandydaci[0], bajty=True)
    wb = openpyxl.load_workbook(io.BytesIO(dane), data_only=True)
    wiersze = [list(r) for r in wb.worksheets[0].iter_rows(values_only=True)]
    ip = next((i for i, r in enumerate(wiersze)
               if any(str(c).strip().lower() in ("poland", "pl", "polska") for c in r if c)), None)
    if ip is None:
        raise RuntimeError("nie znaleziono wiersza Polski")
    kol = {}
    for r in wiersze[:ip]:
        for j, c in enumerate(r):
            t = str(c or "").lower()
            if "95" in t and "pb95" not in kol:
                kol["pb95"] = j
            elif "diesel" in t and "on" not in kol:
                kol["on"] = j
            elif "lpg" in t and "lpg" not in kol:
                kol["lpg"] = j
    print("Kolumny:", kol, "| wiersz Polski:", wiersze[ip])
    eur = json.loads(pobierz("https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json"))["rates"][-1]["mid"]
    data = None
    for r in wiersze[:ip]:
        for c in r:
            if hasattr(c, "strftime"):
                data = c.strftime("%Y-%m-%d")
                break
        if data:
            break
    out = {"data": data or datetime.now(timezone.utc).strftime("%Y-%m-%d"), "kurs_eur": eur}
    for k, j in kol.items():
        v = wiersze[ip][j]
        if isinstance(v, (int, float)):
            out[k] = round(v / 1000 * eur, 2)       # EUR/1000 l -> PLN/l
    if not any(k in out for k in ("pb95", "on", "lpg")):
        raise RuntimeError("nie udalo sie odczytac cen")
    return out


try:
    wynik["paliwa"] = paliwa()
    print("Paliwa:", wynik["paliwa"])
except Exception as e:
    print("Blad paliw:", type(e).__name__, str(e)[:200])

if not any(k in wynik for k in ("zloto", "wig20", "paliwa")):
    raise SystemExit("Brak danych")
wynik["zaktualizowano"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
with open(PLIK, "w", encoding="utf-8") as f:
    json.dump(wynik, f, ensure_ascii=False, separators=(",", ":"))
print("Zapisano.")
