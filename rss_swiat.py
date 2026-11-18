import hashlib
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

PLIK = "swiat.json"
CACHE = "geokod_cache.json"
KANALY = [
    "https://defence-blog.com/feed/",
    "https://www.navalnews.com/feed/",
    "https://www.aljazeera.com/xml/rss/all.xml",
    "https://www.jpost.com/rss/rssfeedsfrontpage.aspx",
    "https://www.twz.com/feed",
    "http://feeds.bbci.co.uk/news/world/rss.xml",
]
REGIONY = ["Europa Wschodnia", "Bliski Wschód", "Azja i Pacyfik", "Afryka", "Ameryki"]
KATEGORIE = ["rakieta", "dron", "starcie", "marynarka", "alarm", "inne"]
MAKS_NOWYCH = 30
DNI = 7
KLUCZ = os.environ.get("GEMINI_API_KEY", "").strip()
SLOWA = re.compile(
    r"missile|drone|uav|strike|attack|airstrike|military|army|navy|naval|warship|troops|shell|rocket|"
    r"offensive|ceasefire|fighter|submarine|artillery|houthi|hezbollah|hamas|idf|invasion|frigate|"
    r"destroyer|bomb|clash|battle|war\b|killed|soldier|defen[cs]e", re.I)

if not KLUCZ:
    raise SystemExit("Brak sekretu GEMINI_API_KEY")


def pobierz(url, dane=None, naglowki=None):
    h = {"User-Agent": "mapa-swiat (prywatny projekt niekomercyjny)"}
    h.update(naglowki or {})
    zad = urllib.request.Request(url, data=dane, headers=h)
    with urllib.request.urlopen(zad, timeout=60) as r:
        return r.read()


def tag(el):
    return el.tag.split("}")[-1]


def tekst(el, nazwy):
    for c in el:
        if tag(c) in nazwy and (c.text or "").strip():
            return c.text.strip()
    return ""


def czas(s):
    try:
        d = parsedate_to_datetime(s)
    except Exception:
        try:
            d = datetime.fromisoformat(s.replace("Z", "+00:00"))
        except Exception:
            return int(time.time())
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return int(d.timestamp())


def czytaj(url):
    wynik = []
    korzen = ET.fromstring(pobierz(url))
    for el in korzen.iter():
        if tag(el) not in ("item", "entry"):
            continue
        link = tekst(el, ("link",))
        if not link:
            for c in el:
                if tag(c) == "link" and c.get("href"):
                    link = c.get("href")
        opis = re.sub(r"<[^>]+>", " ", tekst(el, ("description", "summary", "content")))
        wynik.append({"tytul": tekst(el, ("title",)), "link": link.strip(), "opis": opis[:300],
                      "t": czas(tekst(el, ("pubDate", "published", "updated", "date"))),
                      "z": urllib.parse.urlparse(url).netloc.replace("www.", "")})
    return wynik


def lista_modeli():
    wymuszony = os.environ.get("GEMINI_MODEL", "").strip()
    if wymuszony:
        return [wymuszony]
    nazwy = []
    try:
        d = json.loads(pobierz("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=" + KLUCZ))
        nazwy = [m["name"].split("/")[-1] for m in d.get("models", [])
                 if "generateContent" in m.get("supportedGenerationMethods", [])]
        print("Dostepnych modeli z generateContent:", len(nazwy))
    except Exception as e:
        print("Nie udalo sie pobrac listy modeli:", type(e).__name__, str(e)[:100])
    zle = ("image", "tts", "audio", "live", "embedding", "vision", "robotics", "computer", "customtools")
    flash = [n for n in nazwy if "flash" in n and not any(z in n for z in zle)]
    pref = [n for n in ("gemini-flash-lite-latest", "gemini-flash-latest") if n in flash]
    reszta = sorted([n for n in flash if n not in pref], reverse=True)
    reszta.sort(key=lambda n: ("preview" in n or "exp" in n))
    wynik = pref + reszta
    if not wynik:
        wynik = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-2.0-flash"]
    print("Modele do proby:", wynik[:5])
    return wynik[:5]


def ai(pozycje):
    lista = [{"i": i, "tytul": p["tytul"], "opis": p["opis"]} for i, p in enumerate(pozycje)]
    prompt = (
        "Dostajesz listę depesz prasowych. Dla każdej oceń, czy dotyczy działań militarnych "
        "(atak, rakiety, drony, starcia, ruchy wojsk lub okrętów, alarmy). Zwróć TYLKO tablicę JSON, "
        "po jednym obiekcie na depeszę: {\"i\": numer, \"wojsk\": true/false, \"region\": jeden z "
        + json.dumps(REGIONY, ensure_ascii=False) + " (wybierz najbliższy), \"kraj\": nazwa kraju po polsku, "
        "\"kat\": jedna z " + json.dumps(KATEGORIE, ensure_ascii=False) + ", \"miejsce\": \"Miasto, Kraj\" po angielsku "
        "(do mapy), \"tekst\": krótkie, zwięzłe streszczenie po polsku w maksymalnie 2 zdaniach, własnymi słowami, "
        "bez cytowania}. Depesze: " + json.dumps(lista, ensure_ascii=False))
    ciało = json.dumps({"contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2}}).encode()
    ostatni = None
    for model in lista_modeli():
        url = ("https://generativelanguage.googleapis.com/v1beta/models/" + model +
               ":generateContent?key=" + KLUCZ)
        try:
            odp = json.loads(pobierz(url, ciało, {"Content-Type": "application/json"}))
            txt = odp["candidates"][0]["content"]["parts"][0]["text"]
            dane = json.loads(txt)
        except urllib.error.HTTPError as e:
            print("Model", model, "- blad HTTP", e.code)
            ostatni = e
            if e.code in (401, 403):
                break
            continue
        except Exception as e:
            print("Model", model, "- blad:", type(e).__name__, str(e)[:100])
            ostatni = e
            continue
        print("Uzyto modelu:", model)
        if isinstance(dane, dict):
            dane = next((v for v in dane.values() if isinstance(v, list)), [])
        return dane
    raise ostatni or RuntimeError("Brak dzialajacego modelu")


def geokoduj(miejsce, cache):
    if miejsce in cache:
        return cache[miejsce]
    time.sleep(1.1)                                      # limit Nominatim: 1 zapytanie na sekunde
    try:
        d = json.loads(pobierz("https://nominatim.openstreetmap.org/search?" +
                               urllib.parse.urlencode({"q": miejsce, "format": "json", "limit": 1})))
        cache[miejsce] = [float(d[0]["lat"]), float(d[0]["lon"])] if d else None
    except Exception as e:
        print("Blad geokodowania", miejsce, str(e)[:80])
        return None
    return cache[miejsce]


def wczytaj(sciezka, domyslnie):
    try:
        with open(sciezka, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return domyslnie


stare = wczytaj(PLIK, {"zdarzenia": []})["zdarzenia"]
znane = {z["id"] for z in stare}
cache = wczytaj(CACHE, {})

kandydaci = []
for url in KANALY:
    try:
        pozycje = czytaj(url)
    except Exception as e:
        print("Blad kanalu", url, type(e).__name__, str(e)[:80])
        continue
    print("Kanal", url.split("/")[2], "- artykulow:", len(pozycje))
    for p in pozycje[:25]:
        pid = hashlib.sha1(p["link"].encode()).hexdigest()[:10]
        if p["link"] and pid not in znane and SLOWA.search(p["tytul"] + " " + p["opis"]):
            p["id"] = pid
            kandydaci.append(p)
            znane.add(pid)
kandydaci = sorted(kandydaci, key=lambda p: -p["t"])[:MAKS_NOWYCH]
print("Kandydatow do tlumaczenia:", len(kandydaci))

nowe = []
if kandydaci:
    try:
        for r in ai(kandydaci):
            i = r.get("i")
            if not isinstance(i, int) or i >= len(kandydaci) or not r.get("wojsk"):
                continue
            if r.get("region") not in REGIONY or not r.get("miejsce") or not r.get("tekst"):
                continue
            wsp = geokoduj(r["miejsce"], cache)
            if not wsp:
                continue
            p = kandydaci[i]
            nowe.append({"id": p["id"], "t": p["t"], "kraj": str(r.get("kraj", ""))[:40],
                         "reg": r["region"], "kat": r["kat"] if r.get("kat") in KATEGORIE else "inne",
                         "tekst": str(r["tekst"])[:300], "u": p["link"], "z": p["z"],
                         "lat": round(wsp[0], 3), "lon": round(wsp[1], 3)})
    except Exception as e:
        print("Blad AI:", type(e).__name__, str(e)[:200])
        if not stare:
            raise SystemExit("Brak danych")

granica = int(time.time()) - DNI * 86400
wszystkie = sorted([z for z in stare + nowe if z["t"] >= granica], key=lambda z: -z["t"])
with open(PLIK, "w", encoding="utf-8") as f:
    json.dump({"czas": int(time.time()), "zdarzenia": wszystkie}, f, ensure_ascii=False, separators=(",", ":"))
with open(CACHE, "w", encoding="utf-8") as f:
    json.dump(cache, f, ensure_ascii=False, separators=(",", ":"))
print("Nowych:", len(nowe), "| lacznie w 7 dniach:", len(wszystkie))
