import json
import random
import re
from datetime import datetime, timedelta, timezone
import requests
import urllib3
from bs4 import BeautifulSoup
from deep_translator import GoogleTranslator

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
}

TG_CHANNELS = [
    "sztuka_wojny",
    "AbuAliExpress",
    "idfofficial",
    "manniefabian",
    "Osint613",
    "OSINTdefender",
    "Middle_East_Spectator",
    "DeepStateUA",
    "operativnoZSU"
]

# Kanały, które już publikują po polsku (pomijamy tłumaczenie)
POLISH_CHANNELS = {"sztuka_wojny"}

LOCATIONS = [
    ([
        "israel", "izrael", "gaza", "gazie", "idf", "hamas", "hezbollah",
        "lebanon", "liban", "beirut", "bejrut", "west bank", "zachodni brzeg",
        "jerusalem", "jerozolim", "tel aviv", "tel awiw", "rafah", "khan yunis",
        "hebron", "jenin", "nablus", "syria", "syrii", "damascus", "damaszek",
        "golan", "jordan", "jordani", "haifa", "hajfa", "netanyahu", "netanjahu",
        "palestin", "palestyń"
    ], 31.95, 35.10, "Izrael / Lewant"),

    ([
        "gdansk", "gdańsk", "gdyni", "baltic", "bałtyk", "kaliningrad", "królewiec",
        "tanker", "tankow", "shadow fleet", "flota cieni", "finland", "fińsk",
        "sweden", "szwecj", "gotland", "nord stream", "poland", "polsk", "marynark",
        "okręt", "kabl", "szczecin", "świnoujści"
    ], 54.85, 18.80, "Bałtyk"),

    ([
        "hormuz", "ormuz", "persian gulf", "zatoka perska", "iran", "oman",
        "fujairah", "bandar abbas", "teheran", "tehran", "irgc", "kharg"
    ], 26.56, 56.25, "Ormuz"),

    ([
        "houthi", "huti", "red sea", "morze czerwone", "bab al-mandab", "bab el-mandeb",
        "yemen", "jemen", "aden", "hodeidah", "ukmto", "sanaa", "sana"
    ], 13.20, 43.10, "Morze Czerwone"),

    ([
        "ukraine", "ukrain", "crimea", "krym", "black sea", "morze czarne",
        "odesa", "odessa", "sevastopol", "sewastopol", "russia", "rosj",
        "kharkiv", "charków", "donetsk", "donieck", "kyiv", "kijów", "front"
    ], 45.20, 33.50, "Ukraina / M. Czarne")
]

translator = GoogleTranslator(source="auto", target="pl")

def translate_to_pl(text, channel):
    if channel in POLISH_CHANNELS or not text:
        return text
    try:
        return translator.translate(text)
    except Exception as e:
        print(f"Błąd tłumaczenia ({channel}): {e}")
        return text

def is_within_24h(date_str, cutoff_time):
    if not date_str:
        return False
    try:
        post_dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        if post_dt.tzinfo is None:
            post_dt = post_dt.replace(tzinfo=timezone.utc)
        return post_dt >= cutoff_time
    except Exception:
        return False

def match_location(text):
    t = text.lower()
    for words, lat, lon, region in LOCATIONS:
        if any(w in t for w in words):
            j_lat = round(lat + random.uniform(-0.35, 0.35), 4)
            j_lon = round(lon + random.uniform(-0.40, 0.40), 4)
            return j_lat, j_lon, region
    return None

def fetch_telegram():
    events = []
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=24)

    for ch in TG_CHANNELS:
        try:
            url = "/".join(["https:", "", "t.me", "s", ch])
            r = requests.get(url, headers=HEADERS, timeout=15, verify=False)
            print(f"TG @{ch}: status {r.status_code}")
            if r.status_code != 200:
                continue

            soup = BeautifulSoup(r.text, "html.parser")
            msgs = soup.select(".tgme_widget_message_wrap")[-25:]

            for msg in msgs:
                date_el = msg.select_one("time.time")
                date_str = date_el["datetime"] if date_el and date_el.has_attr("datetime") else ""

                # Odrzucamy wpisy starsze niż 24 godziny
                if not is_within_24h(date_str, cutoff_time):
                    continue

                text_el = msg.select_one(".tgme_widget_message_text")
                if not text_el:
                    continue
                raw_text = text_el.get_text(" ", strip=True)

                loc = match_location(raw_text)
                if not loc:
                    continue
                lat, lon, region = loc

                # Tłumaczymy skrócony tekst jednorazowo, żeby przyspieszyć działanie
                short_raw = raw_text[:300]
                translated = translate_to_pl(short_raw, ch)

                title = translated[:85] + ("..." if len(translated) > 85 else "")
                summary = translated[:240] + ("..." if len(translated) > 240 else "")

                link_el = msg.select_one("a.tgme_widget_message_date")
                photo_el = msg.select_one(".tgme_widget_message_photo_wrap")
                image = None
                if photo_el and "style" in photo_el.attrs:
                    m = re.search(r"background-image:url\('(.*?)'\)", photo_el["style"])
                    if m:
                        image = m.group(1)

                events.append({
                    "title": title,
                    "summary": summary,
                    "lat": lat,
                    "lon": lon,
                    "region": region,
                    "image": image,
                    "source": "@" + ch,
                    "url": link_el["href"] if link_el else url,
                    "date": date_str
                })
        except Exception as e:
            print(f"TG @{ch} błąd: {e}")
    return events

def main():
    raw_events = fetch_telegram()
    raw_events.sort(key=lambda x: x["date"], reverse=True)

    balanced = []
    counts = {}
    for ev in raw_events:
        reg = ev["region"]
        if counts.get(reg, 0) < 10:
            balanced.append(ev)
            counts[reg] = counts.get(reg, 0) + 1

    print(f"Statystyki regionów (ostatnie 24h): {counts}")
    with open("feed.json", "w", encoding="utf-8") as f:
        json.dump(balanced, f, ensure_ascii=False, indent=2)
    print(f"Zapisano {len(balanced)} świeżych wydarzeń po polsku do feed.json")

if __name__ == "__main__":
    main()
