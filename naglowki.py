import json
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

ZRODLA = [
    ("polska", "https://www.polsatnews.pl/rss/polska.xml"),
    ("swiat", "https://www.polsatnews.pl/rss/swiat.xml"),
]
MAKS = 12


def pobierz(adres):
    zad = urllib.request.Request(adres, headers={
        "User-Agent": "Mozilla/5.0 (mapa-naglowkow; prywatny projekt niekomercyjny)"})
    with urllib.request.urlopen(zad, timeout=30) as r:
        return r.read()


try:
    with open("naglowki.json", encoding="utf-8") as f:
        wynik = json.load(f)
except Exception:
    wynik = {}

for klucz, adres in ZRODLA:
    try:
        korzen = ET.fromstring(pobierz(adres))
        lista = []
        for it in korzen.iter("item"):
            t = (it.findtext("title") or "").strip()
            u = (it.findtext("link") or "").strip()
            if t and u.startswith("http"):
                lista.append({"t": t, "u": u})
            if len(lista) >= MAKS:
                break
        if lista:
            wynik[klucz] = lista
        print(klucz, len(lista))
    except Exception as e:
        print("Blad", klucz, e)

if not wynik:
    raise SystemExit("Brak naglowkow")
wynik["czas"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
with open("naglowki.json", "w", encoding="utf-8") as f:
    json.dump(wynik, f, ensure_ascii=False, separators=(",", ":"))
