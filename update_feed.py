import json
import random
import re
import requests
import urllib3
from bs4 import BeautifulSoup

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
}

# Kanał @sztuka_wojny na pierwszym miejscu, żeby polskie wpisy były na samej górze
TG_CHANNELS = [
    "sztuka_wojny",
    "OSINTdefender",
    "Osint613",
    "Middle_East_Spectator",
    "DeepStateUA",
    "operativnoZSU"
]

# Rozszerzone słowa kluczowe (PL + EN + UA + RU)
LOCATIONS = [
    ([
        "gdansk", "gdańsk", "gdyni", "baltic", "bałtyk", "kaliningrad", "królewiec",
        "tanker", "tankow", "shadow fleet", "flota cieni", "finland", "fińsk",
        "sweden", "szwecj", "gotland", "nord stream", "poland", "polsk", "marynark",
        "okręt", "kabl", "szczecin", "świnoujści"
    ], 54.85, 18.80, "Bałtyk"),

    ([
        "hormuz", "ormuz", "persian gulf", "zatoka perska", "iran", "oman",
        "fujairah", "bandar abbas", "teheran", "tehran"
    ], 26.56, 56.25, "Ormuz"),

    ([
        "houthi", "huti", "red sea", "morze czerwone", "bab al-mandab", "bab el-mandeb",
        "yemen", "jemen", "aden", "hodeidah", "ukmto", "israel", "izrael",
        "gaza", "gazie", "lebanon", "liban", "hezbollah", "syria", "syrii"
    ], 13.20, 43.10, "Morze Czerwone"),

    ([
        "ukraine", "ukrain", "crimea", "krym", "black sea", "morze czarne",
        "odesa", "odessa", "sevastopol", "sewastopol", "russia", "rosj",
        "kharkiv", "charków", "donetsk", "donieck", "kyiv", "kijów", "front"
    ], 45.20, 33.50, "Ukraina / M. Czarne")
]

def match_location(text):
    t = text.lower()
    for words, lat, lon, region in LOCATIONS:
        if any(w in t for w in words):
            j_lat = round(lat + random.uniform(-0.35, 0.35), 4)
            j_lon = round(lon + random.uniform(-0.45, 0.45), 4)
            return j_lat, j_lon, region
    return None

def fetch_telegram():
    events = []
    for ch in TG_CHANNELS:
        try:
            url = "/".join(["https:", "", "t.me", "s", ch])
            r = requests.get(url, headers=HEADERS, timeout=15, verify=False)
            print(f"TG @{ch}: status {r.status_code}")
            if r.status_code != 200:
                continue
            soup = BeautifulSoup(r.text, "html.parser")
            msgs = soup.select(".tgme_widget_message_wrap")[-15:]
            for msg in msgs:
                text_el = msg.select_one(".tgme_widget_message_text")
                if not text_el:
                    continue
                text = text_el.get_text(" ", strip=True)
                loc = match_location(text)
                if not loc:
                    continue
                lat, lon, region = loc
                date_el = msg.select_one("time.time")
                link_el = msg.select_one("a.tgme_widget_message_date")
                photo_el = msg.select_one(".tgme_widget_message_photo_wrap")
                image = None
                if photo_el and "style" in photo_el.attrs:
                    m = re.search(r"background-image:url\('(.*?)'\)", photo_el["style"])
                    if m:
                        image = m.group(1)
                events.append({
                    "title": text[:85] + ("..." if len(text) > 85 else ""),
                    "summary": text[:240] + ("..." if len(text) > 240 else ""),
                    "lat": lat,
                    "lon": lon,
                    "region": region,
                    "image": image,
                    "source": "@" + ch,
                    "url": link_el["href"] if link_el else url,
                    "date": date_el["datetime"] if date_el else ""
                })
        except Exception as e:
            print(f"TG @{ch} błąd: {e}")
    return events

def main():
    events = fetch_telegram()
    # Sortowanie od najnowszych po dacie publikacji
    events.sort(key=lambda x: x["date"], reverse=True)
    print(f"SUMA POBRANYCH WYDARZEŃ: {len(events)}")
    if len(events) > 0:
        with open("feed.json", "w", encoding="utf-8") as f:
            json.dump(events[:35], f, ensure_ascii=False, indent=2)
        print("Zapisano nowe dane do feed.json")

if __name__ == "__main__":
    main()
