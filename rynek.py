import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone

PLIK = "rynek.json"


def pobierz(url, naglowki=None):
    h = {"User-Agent": "mapa-statkow (prywatny projekt niekomercyjny)",
         "Accept": "application/json"}
    h.update(naglowki or {})
    zad = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(zad, timeout=30) as r:
        return r.read().decode("utf-8")


def brent_eia():
    klucz = os.environ.get("EIA_API_KEY", "").strip()
    if not klucz:
        raise RuntimeError("brak klucza EIA_API_KEY")
    parametry = urllib.parse.urlencode([
        ("api_key", klucz), ("frequency", "daily"), ("data[0]", "value"),
        ("facets[series][]", "RBRTE"), ("sort[0][column]", "period"),
        ("sort[0][direction]", "desc"), ("length", "40")])
    d = json.loads(pobierz("https://api.eia.gov/v2/petroleum/pri/spt/data/?" + parametry))
    hist = [[w["period"], round(float(w["value"]), 2)]
            for w in reversed(d["response"]["data"])
            if w.get("value") not in (None, "")][-30:]
    return {"cena": hist[-1][1], "data": hist[-1][0], "hist": hist}


def brent_ninjas():
    klucz = os.environ.get("API_NINJAS_KEY", "").strip()
    if not klucz:
        raise RuntimeError("brak klucza API_NINJAS_KEY")
    d = json.loads(pobierz("https://api.api-ninjas.com/v1/oilprice?type=brent",
                           {"X-Api-Key": klucz}))
    if isinstance(d, list):
        d = d[0]
    print("API Ninjas odpowiedz:", json.dumps(d)[:300])
    cena = None
    for pole in ("price", "value", "close"):
        if d.get(pole) is not None:
            cena = float(d[pole])
            break
    if cena is None:
        raise ValueError("brak pola z cena w odpowiedzi")
    data = datetime.fromtimestamp(d["updated"], timezone.utc).strftime("%Y-%m-%d")
    return {"cena": round(cena, 2), "data": data}


def brent():
    eia, nin, bledy = None, None, []
    for nazwa, funkcja in (("EIA", brent_eia), ("API Ninjas", brent_ninjas)):
        try:
            wynik_zrodla = funkcja()
            print("Zrodlo ropy:", nazwa, "| cena:", wynik_zrodla["cena"],
                  "| data:", wynik_zrodla["data"])
            if nazwa == "EIA":
                eia = wynik_zrodla
            else:
                nin = wynik_zrodla
        except Exception as e:
            opis = nazwa + ": " + type(e).__name__ + " " + str(e)[:120]
            print("Blad ropy -", opis)
            bledy.append(opis)
    if not eia and not nin:
        raise RuntimeError(" | ".join(bledy))
    if eia:
        hist = eia["hist"]
        wynik_b = {"cena": eia["cena"], "data": eia["data"], "hist": hist}
        zrodlo = "EIA"
    else:
        hist = []
        wynik_b = {"cena": nin["cena"], "data": nin["data"]}
        zrodlo = "API Ninjas"
    if nin and (not eia or nin["data"] > eia["data"]):
        hist = [h for h in hist if h[0] != nin["data"]] + [[nin["data"], nin["cena"]]]
        wynik_b = {"cena": nin["cena"], "data": nin["data"]}
        zrodlo = "API Ninjas"
    wynik_b["hist"] = hist[-30:]
    wynik_b["godzina"] = ""
    wynik_b["data"] = wynik_b["data"] + " (źródło: " + zrodlo + ")"
    return wynik_b


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
    wynik["brent"] = brent()
    wynik.pop("ropa_blad", None)
except Exception as e:
    wynik["ropa_blad"] = [str(e)[:300]]
    print("Ropa: brak danych:", e)

wynik["zaktualizowano"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
if not any(k in wynik for k in ("usd", "eur", "brent")):
    raise SystemExit("Brak danych")

with open(PLIK, "w", encoding="utf-8") as f:
    json.dump(wynik, f, ensure_ascii=False, separators=(",", ":"))
print("Zapisano.")
