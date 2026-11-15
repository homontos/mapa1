import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

ZRODLA = [
    ("polska", "https://www.polsatnews.pl/rss/polska.xml"),
    ("swiat", "https://www.polsatnews.pl/rss/swiat.xml"),
    ("wszystkie", "https://www.polsatnews.pl/rss/wszystkie.xml"),
]
MAKS = 12            # ile zwyklych naglowkow w kazdej grupie
MAKS_PILNYCH = 6
WIEK_PILNYCH = 6     # godziny

SILNE = [
    r"\bpilne\b", r"poderwan", r"naruszeni\w* (polskiej )?przestrzeni",
    r"przestrzeni powietrznej", r"alert rcb", r"\brcb\b", r"syren", r"zestrzel",
    r"rakiet", r"\bdron", r"alarm bombow", r"ewakuacj", r"eksplozj", r"wybuch",
    r"ostrzał", r"dowództw\w* operacyjn", r"stan wyjątkow", r"mobilizacj",
]
WZORZEC = re.compile("|".join(SILNE), re.IGNORECASE)


def pobierz(adres):
    zad = urllib.request.Request(adres, headers={
        "User-Agent": "Mozilla/5.0 (mapa-naglowkow; prywatny projekt niekomercyjny)"})
    with urllib.request.urlopen(zad, timeout=30) as r:
        return r.read()


def swieze(tekst):
    try:
        d = parsedate_to_datetime(tekst)
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) - d < timedelta(hours=WIEK_PILNYCH)
    except Exception:
        return True


try:
    with open("naglowki.json", encoding="utf-8") as f:
        wynik = json.load(f)
except Exception:
    wynik = {}

zwykle = {"polska": [], "swiat": []}
pilne = []
widziane = set()
pobrano = 0

for klucz, adres in ZRODLA:
    try:
        korzen = ET.fromstring(pobierz(adres))
    except Exception as e:
        print("Blad", klucz, e)
        continue
    pobrano += 1
    ile = 0
    for it in korzen.iter("item"):
        t = (it.findtext("title") or "").strip()
        u = (it.findtext("link") or "").strip()
        if not t or not u.startswith("http"):
            continue
        ile += 1
        if WZORZEC.search(t) and swieze(it.findtext("pubDate") or ""):
            if u not in widziane:
                pilne.append({"t": t, "u": u})
                widziane.add(u)
        elif klucz in zwykle:
            zwykle[klucz].append({"t": t, "u": u})
    print(klucz, "- artykulow:", ile)

if not pobrano:
    raise SystemExit("Brak naglowkow")

for g in ("polska", "swiat"):
    lista = [x for x in zwykle[g] if x["u"] not in widziane][:MAKS]
    if lista:
        wynik[g] = lista
wynik["pilne"] = pilne[:MAKS_PILNYCH]       # pusta lista = zolty pasek znika
print("Pilnych:", len(wynik["pilne"]))
wynik["czas"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
with open("naglowki.json", "w", encoding="utf-8") as f:
    json.dump(wynik, f, ensure_ascii=False, separators=(",", ":"))
