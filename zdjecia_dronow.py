import html
import json
import os
import re
import urllib.parse
import urllib.request

KAT = "drony"
UA = "mapa-zdjecia/1.0 (prywatny projekt niekomercyjny; zdjecia z Wikimedia Commons)"
# (id, zapytanie, slowo musi byc w nazwie pliku)
MODELE = [
    ("shahed", "Shahed 136", "shahed"), ("orlan", "Orlan-10", "orlan"),
    ("lancet", "Lancet drone", "lancet"), ("gerbera", "Gerbera drone", "gerbera"),
    ("iskander", "Iskander missile", "iskander"), ("kalibr", "Kalibr missile", "kalibr"),
    ("kh101", "Kh-101 missile", "kh-101"), ("kinzhal", "Kinzhal missile", "kinzhal"),
    ("zircon", "Zircon missile", "zircon"), ("kh22", "Kh-22 missile", "kh-22"),
    ("kh59", "Kh-59 missile", "kh-59"), ("kh55", "Kh-55 missile", "kh-55"),
    ("mig31", "MiG-31", "mig-31"), ("tu95", "Tu-95", "tu-95"),
    ("tu160", "Tu-160", "tu-160"), ("tu22", "Tu-22M", "tu-22"),
]


def pobierz(url):
    zad = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(zad, timeout=60) as r:
        return r.read()


def wolna(lic):
    l = lic.lower()
    if " nc" in l or "-nc" in l or " nd" in l or "-nd" in l:
        return False
    return l.startswith("cc by") or l.startswith("cc0") or "public domain" in l or l.startswith("pd")


os.makedirs(KAT, exist_ok=True)
wynik = {}
for mid, zapytanie, slowo in MODELE:
    try:
        d = json.loads(pobierz("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
            "action": "query", "format": "json", "generator": "search", "gsrnamespace": "6",
            "gsrlimit": "12", "gsrsearch": zapytanie + " filetype:bitmap", "prop": "imageinfo",
            "iiprop": "url|extmetadata|mime|size", "iiurlwidth": "640"})))
    except Exception as e:
        print(mid, "- blad zapytania:", type(e).__name__, str(e)[:80])
        continue
    strony = sorted((d.get("query") or {}).get("pages", {}).values(), key=lambda p: p.get("index", 99))
    wybrane = None
    for p in strony:
        try:
            ii = p["imageinfo"][0]
            meta = ii.get("extmetadata", {})
            lic = (meta.get("LicenseShortName") or {}).get("value", "")
            if slowo not in p.get("title", "").lower() or not wolna(lic):
                continue
            if ii.get("mime") not in ("image/jpeg", "image/png") or ii.get("width", 0) < 400:
                continue
            wybrane = (p, ii, meta, lic)
            break
        except Exception:
            continue
    if not wybrane:
        print(mid, "- brak pasujacego zdjecia na wolnej licencji")
        continue
    p, ii, meta, lic = wybrane
    try:
        dane = pobierz(ii.get("thumburl") or ii["url"])
    except Exception as e:
        print(mid, "- blad pobierania pliku:", type(e).__name__, str(e)[:80])
        continue
    plik = mid + ".jpg"
    with open(os.path.join(KAT, plik), "wb") as f:
        f.write(dane)
    autor = html.unescape(re.sub(r"<[^>]+>", "", (meta.get("Artist") or {}).get("value", ""))).strip() or "autor nieznany"
    wynik[mid] = {"plik": plik, "autor": autor[:120], "licencja": lic,
                  "licurl": (meta.get("LicenseUrl") or {}).get("value", ""),
                  "zrodlo": ii.get("descriptionurl", ""), "tytul": p.get("title", "")}
    print(mid, "- OK:", p.get("title"), "|", lic)

with open(os.path.join(KAT, "index.json"), "w", encoding="utf-8") as f:
    json.dump({"modele": wynik}, f, ensure_ascii=False, indent=1)
print("Zdjec w bibliotece:", len(wynik), "z", len(MODELE))
