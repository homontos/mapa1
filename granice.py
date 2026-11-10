import json
import urllib.request

BAZA = "https://neptun.in.ua/"
PLIKI = [("oblasts.geojson", "granice_obwody.geojson"),
         ("raions.geojson", "granice_rejony.geojson")]


def pobierz(url):
    zad = urllib.request.Request(url, headers={
        "User-Agent": "mapa-granic (prywatny projekt niekomercyjny)",
        "Accept": "application/json"})
    with urllib.request.urlopen(zad, timeout=120) as r:
        return r.read()


alerty = json.loads(pobierz(BAZA + "api/v1/alerts"))
klucze = {str(x.get("key")) for x in alerty.get("oblasts", []) + alerty.get("raions", [])}
print("Kluczy w aktywnych alarmach:", len(klucze), sorted(klucze)[:5])

zapisane = 0
for zrodlo, cel in PLIKI:
    try:
        dane = json.loads(pobierz(BAZA + zrodlo))
        cechy = dane.get("features", [])
        print(zrodlo, "-> obiektow:", len(cechy))
        if cechy:
            print("  przyklad wlasciwosci:",
                  json.dumps(cechy[0].get("properties"), ensure_ascii=False)[:300],
                  "| id:", cechy[0].get("id"))
        trafienia = 0
        for f in cechy:
            p = f.get("properties") or {}
            kand = [p.get("key"), p.get("id"), p.get("code"), p.get("slug"), f.get("id")]
            if any(k is not None and str(k) in klucze for k in kand):
                trafienia += 1
        print("  dopasowan do aktywnych alarmow:", trafienia)
        with open(cel, "w", encoding="utf-8") as f:
            json.dump(dane, f, ensure_ascii=False, separators=(",", ":"))
        zapisane += 1
    except Exception as e:
        print("Blad", zrodlo, type(e).__name__, str(e)[:150])

if not zapisane:
    raise SystemExit("Nie pobrano zadnego pliku z granicami")