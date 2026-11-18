import json
import os
import re
import urllib.error
import urllib.request

PLIK = "tlumaczenia.json"
KLUCZ = os.environ.get("GEMINI_API_KEY", "").strip()
if not KLUCZ:
    raise SystemExit("Brak sekretu GEMINI_API_KEY")
CYR = re.compile(r"[А-Яа-яІіЇїЄєҐґ]")


def pobierz(url, dane=None, naglowki=None):
    h = {"User-Agent": "mapa-tlumaczenia (prywatny projekt niekomercyjny)"}
    h.update(naglowki or {})
    zad = urllib.request.Request(url, data=dane, headers=h)
    with urllib.request.urlopen(zad, timeout=60) as r:
        return r.read()


def modele():
    nazwy = []
    try:
        d = json.loads(pobierz("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=" + KLUCZ))
        nazwy = [m["name"].split("/")[-1] for m in d.get("models", [])
                 if "generateContent" in m.get("supportedGenerationMethods", [])]
    except Exception as e:
        print("Lista modeli niedostepna:", type(e).__name__, str(e)[:80])
    zle = ("image", "tts", "audio", "live", "embedding", "vision", "robotics", "computer", "customtools")
    flash = [n for n in nazwy if "flash" in n and not any(z in n for z in zle)]
    pref = [n for n in ("gemini-flash-lite-latest", "gemini-flash-latest") if n in flash]
    reszta = sorted([n for n in flash if n not in pref], reverse=True)
    reszta.sort(key=lambda n: ("preview" in n or "exp" in n))
    wynik = pref + reszta
    return (wynik or ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash"])[:5]


d = json.loads(pobierz("https://neptun.in.ua/api/v1/threats"))
teksty = []
for t in d.get("threats", []):
    for k in ("title", "explanationShort", "region", "district", "locality"):
        v = t.get(k)
        if isinstance(v, str) and CYR.search(v) and v.strip() not in teksty:
            teksty.append(v.strip())

try:
    with open(PLIK, encoding="utf-8") as f:
        cache = json.load(f).get("t", {})
except Exception:
    cache = {}

nowe = [x for x in teksty if x not in cache][:50]
print("Tekstow ukrainskich:", len(teksty), "| do przetlumaczenia:", len(nowe))

if nowe:
    prompt = (
        "Przetłumacz na język polski każdy z poniższych krótkich tekstów z ukraińskiego (komunikaty o zagrożeniach "
        "z powietrza i nazwy miejsc). Nazwy miejscowości i obwodów podaj w polskiej pisowni (np. Харків -> Charków, "
        "Київ -> Kijów). Zachowaj sens, bez dopisywania. Zwróć TYLKO obiekt JSON, w którym kluczem jest numer, "
        "a wartością tłumaczenie. Teksty: " + json.dumps({str(i): x for i, x in enumerate(nowe)}, ensure_ascii=False))
    ciało = json.dumps({"contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1}}).encode()
    wynik = None
    for model in modele():
        try:
            odp = json.loads(pobierz(
                "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + KLUCZ,
                ciało, {"Content-Type": "application/json"}))
            wynik = json.loads(odp["candidates"][0]["content"]["parts"][0]["text"])
            print("Uzyto modelu:", model)
            break
        except urllib.error.HTTPError as e:
            print("Model", model, "- blad HTTP", e.code)
            if e.code in (401, 403):
                break
        except Exception as e:
            print("Model", model, "- blad:", type(e).__name__, str(e)[:80])
    if wynik is None:
        raise SystemExit("Nie udalo sie przetlumaczyc")
    for i, x in enumerate(nowe):
        pl = wynik.get(str(i))
        if isinstance(pl, str) and pl.strip():
            cache[x] = pl.strip()[:300]

cache = dict(list(cache.items())[-3000:])
with open(PLIK, "w", encoding="utf-8") as f:
    json.dump({"t": cache}, f, ensure_ascii=False, separators=(",", ":"))
print("Zapisano tlumaczen:", len(cache))
