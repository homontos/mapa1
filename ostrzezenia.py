import json
import urllib.request
from datetime import datetime, timezone

WOJ = {
    "02": ("Dolnośląskie", 51.1, 16.9), "04": ("Kujawsko-pomorskie", 53.1, 18.4),
    "06": ("Lubelskie", 51.2, 22.9), "08": ("Lubuskie", 52.2, 15.3),
    "10": ("Łódzkie", 51.6, 19.5), "12": ("Małopolskie", 49.9, 20.2),
    "14": ("Mazowieckie", 52.4, 21.1), "16": ("Opolskie", 50.7, 17.9),
    "18": ("Podkarpackie", 49.9, 22.1), "20": ("Podlaskie", 53.2, 22.9),
    "22": ("Pomorskie", 54.1, 18.0), "24": ("Śląskie", 50.3, 19.0),
    "26": ("Świętokrzyskie", 50.8, 20.8), "28": ("Warmińsko-mazurskie", 53.8, 20.8),
    "30": ("Wielkopolskie", 52.3, 17.3), "32": ("Zachodniopomorskie", 53.5, 15.8),
}
ZRODLA = [("meteo", "https://danepubliczne.imgw.pl/api/data/warningsmeteo"),
          ("hydro", "https://danepubliczne.imgw.pl/api/data/warningshydro")]


def pobierz(url):
    zad = urllib.request.Request(url, headers={
        "User-Agent": "mapa-ostrzezen (prywatny projekt niekomercyjny)",
        "Accept": "application/json"})
    with urllib.request.urlopen(zad, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def pierwsze(r, nazwy):
    for n in nazwy:
        if r.get(n) not in (None, ""):
            return r[n]
    return None


def lista(dane):
    if isinstance(dane, list):
        return [x for x in dane if isinstance(x, dict)]
    if isinstance(dane, dict):
        for w in dane.values():
            if isinstance(w, list):
                return [x for x in w if isinstance(x, dict)]
    return []


def kody_woj(w):
    kody = {}
    t = pierwsze(w, ["teryt", "kody_teryt", "powiaty_teryt"])
    if isinstance(t, str):
        t = [x.strip() for x in t.replace(";", ",").split(",") if x.strip()]
    for x in (t or []):
        k = str(x).strip().zfill(4)[:2]
        if k in WOJ:
            kody[k] = kody.get(k, 0) + 1
    if not kody:                                  # plan B: nazwa wojewodztwa w tekscie
        tekst = json.dumps(w, ensure_ascii=False).lower()
        for k, (n, _, _) in WOJ.items():
            if n.lower() in tekst:
                kody[k] = 0
    return kody


wynik = {}
pobrano = 0
for rodzaj, url in ZRODLA:
    try:
        rekordy = lista(pobierz(url))
    except Exception as e:
        print("Blad", rodzaj, type(e).__name__, str(e)[:120])
        continue
    pobrano += 1
    print(rodzaj, "- ostrzezen:", len(rekordy))
    if rekordy:
        print("Przyklad rekordu:", json.dumps(rekordy[0], ensure_ascii=False)[:600])
    for w in rekordy:
        try:
            st = int(pierwsze(w, ["stopien", "level", "stopien_zagrozenia"]) or 0)
        except ValueError:
            st = 0
        wpis = {
            "rodzaj": rodzaj,
            "zjawisko": pierwsze(w, ["nazwa_zdarzenia", "zdarzenie", "event", "nazwa"]) or "ostrzeżenie",
            "stopien": st,
            "prawd": pierwsze(w, ["prawdopodobienstwo", "probability"]),
            "od": pierwsze(w, ["obowiazuje_od", "valid_from", "od"]),
            "do": pierwsze(w, ["obowiazuje_do", "valid_to", "do"]),
            "przebieg": str(pierwsze(w, ["tresc", "przebieg", "komentarz"]) or "")[:300],
        }
        for k, ile in kody_woj(w).items():
            g = wynik.setdefault(k, {"nazwa": WOJ[k][0], "lat": WOJ[k][1], "lon": WOJ[k][2],
                                     "max": 0, "lista": []})
            g["max"] = max(g["max"], st)
            g["lista"].append(dict(wpis, powiaty=ile))

if not pobrano:
    raise SystemExit("Nie pobrano zadnych ostrzezen")

with open("ostrzezenia.json", "w", encoding="utf-8") as f:
    json.dump({"czas": datetime.now(timezone.utc).isoformat(timespec="seconds"), "woj": wynik},
              f, ensure_ascii=False, separators=(",", ":"))
print("Zapisano. Wojewodztw z ostrzezeniami:", len(wynik))
