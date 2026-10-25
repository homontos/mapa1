import json
from datetime import datetime, timedelta, timezone

GODZINY = 6
MAKS = 40
KODY = {
    "181": "Porwanie lub wzięcie zakładników", "182": "Pobicie lub zabójstwo",
    "183": "Zamach bombowy", "185": "Próba zamachu", "186": "Zamach",
    "190": "Użycie siły militarnej", "191": "Blokada", "192": "Zajęcie terytorium",
    "193": "Starcie z użyciem broni strzeleckiej",
    "194": "Ostrzał artyleryjski lub starcie z użyciem czołgów",
    "195": "Atak z powietrza (rakiety, drony, naloty)",
    "196": "Naruszenie zawieszenia broni", "200": "Masowa przemoc",
    "202": "Masowe zabójstwa", "204": "Użycie broni masowego rażenia",
}
RODZAJE = {"atak": "Atak", "walki": "Walki", "przemoc masowa": "Masowa przemoc"}
MIEJSCA = {
    "Kyiv": "Kijów", "Kiev": "Kijów", "Kharkiv": "Charków", "Odesa": "Odessa",
    "Lviv": "Lwów", "Dnipro": "Dniepr", "Zaporizhzhia": "Zaporoże",
    "Kherson": "Chersoń", "Donetsk": "Donieck", "Luhansk": "Ługańsk",
    "Mykolaiv": "Mikołajów", "Chernihiv": "Czernihów", "Sloviansk": "Słowiańsk",
    "Bakhmut": "Bachmut", "Crimea": "Krym", "Warsaw": "Warszawa",
    "Rzeszow": "Rzeszów", "Krakow": "Kraków", "Gdansk": "Gdańsk",
    "Wroclaw": "Wrocław", "Poznan": "Poznań", "Lodz": "Łódź",
    "Ukraine": "Ukraina", "Poland": "Polska", "Russia": "Rosja",
    "Belarus": "Białoruś",
}

with open("zdarzenia_surowe.json", encoding="utf-8") as f:
    surowe = json.load(f)

teraz = datetime.now(timezone.utc)
granica = (teraz - timedelta(hours=GODZINY)).isoformat()
grupy = {}
for z in surowe["zdarzenia"]:
    if z["t"] <= granica:
        continue
    opis = KODY.get(z.get("kod")) or RODZAJE.get(z["rodzaj"], "Zdarzenie")
    czesci = [c.strip() for c in z["miejsce"].split(",") if c.strip()]
    if not czesci:
        continue
    nazwa = MIEJSCA.get(czesci[0], czesci[0])
    kraj = MIEJSCA.get(czesci[-1], czesci[-1])
    miejsce = nazwa if len(czesci) == 1 else nazwa + ", " + kraj
    g = grupy.setdefault((opis, miejsce), {
        "t": z["t"], "baza": opis + " — " + miejsce, "kat": z["kat"],
        "lat": z["lat"], "lon": z["lon"], "n": 0, "m": -1, "u": z["url"]})
    g["n"] += 1
    if z["t"] > g["t"]:
        g["t"] = z["t"]
    if z["m"] > g["m"]:
        g["m"] = z["m"]
        g["u"] = z["url"]

lista = []
for g in sorted(grupy.values(), key=lambda x: x["t"], reverse=True)[:MAKS]:
    zdanie = g["baza"] + (" (doniesień: " + str(g["n"]) + ")" if g["n"] > 1 else "")
    lista.append({"t": g["t"], "z": zdanie, "kat": g["kat"],
                  "lat": g["lat"], "lon": g["lon"], "u": g["u"]})

with open("wiadomosci.json", "w", encoding="utf-8") as f:
    json.dump({"czas": teraz.isoformat(timespec="seconds"), "lista": lista},
              f, ensure_ascii=False, separators=(",", ":"))
print("Wiadomosci:", len(lista))
