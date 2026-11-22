import json
import random
import re
import requests
import urllib3
from bs4 import BeautifulSoup

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8, */*;q=0.5"
}

RSS_FEEDS = [
    ("gCaptain", "https://gcaptain.com"),
    ("Maritime Executive", "https://maritime-executive.com"),
    ("Defence24", "https://defence24.pl")
]

TG_CHANNELS = ["OSINTdefender", "Osint613", "DeepStateUA", "operativnoZSU", "Middle_East_Spectator"]

LOCATIONS = [
    (["gdansk", "gdańsk", "baltic", "bałtyk", "kaliningrad", "tanker", "shadow fleet", "flota cieni", "finland", "sweden", "gotland", "nord stream", "poland", "polsk", "marynark", "okręt", "morz"], 54.85, 18.80, "Bałtyk"),
    (["hormuz", "ormuz", "persian gulf", "zatoka perska", "iran", "oman", "fujairah", "bandar abbas"], 26.56, 56.25, "Ormuz"),
    (["houthi", "huti", "red sea", "morze czerwone", "bab al-mandab", "bab el-mandeb", "yemen", "jemen", "aden", "hodeidah", "ukmto", "israel", "gaza", "lebanon", "bliski wschód"], 13.20, 43.10, "Morze Czerwone"),
    (["ukraine", "ukrain", "crimea", "krym", "black sea", "morze czarne", "odesa", "odessa", "sevastopol", "sewastopol", "russia", "rosj", "kharkiv", "donetsk"], 45.20, 33.50, "Ukraina / M. Czarne")
]

def match_location(text):
    t = text.lower()
    for words, lat, lon, region in LOCATIONS:
        if any(w in t for w in words):
            j_lat = round(lat + random.uniform(-0.35, 0.35), 4)
            j_lon = round(lon + random.uniform(-0.45, 0.45), 4)
            return j_lat, j_lon, region
    return None

def fetch_rss():
    events = []
    for name, url in RSS_FEEDS:
        try:
            r = requests.get(url, headers=HEADERS, timeout=20, verify=False)
            print(f"RSS {name}: status {r.status_code}, początek: {r.text[:80]!r}")
            if r.status_code != 200:
                continue

            soup = BeautifulSoup(r.content, "html.parser")
            # Szukamy zarówno <item> (RSS), <entry> (Atom), jak i <article> (gdy strona zwraca HTML)
            items = soup.find_all(["item", "entry"])[:25]
            print(f"RSS {name}: znaleziono {len(items)} wpisów")

            for item in items:
                title_tag = item.find("title")
                title = title_tag.get_text(strip=True) if title_tag else ""

                link = ""
                link_tag = item.find("link")
                if link_tag:
                    link = link_tag.get("href") or link_tag.get_text(strip=True) or (link_tag.next_sibling.strip() if link_tag.next_sibling else "")
                if not link:
                    guid_tag = item.find("guid")
                    link = guid_tag.get_text(strip=True) if guid_tag else url

                date_tag = item.find(["pubdate", "published", "updated"])
                pub_date = date_tag.get_text(strip=True) if date_tag else ""

                desc_tag = item.find(["description", "summary", "content"])
                desc_html = desc_tag.get_text() if desc_tag else ""
                desc_soup = BeautifulSoup(desc_html, "html.parser")
                summary = desc_soup.get_text(" ", strip=True)[:220] + "..."

                image = None
                enc = item.find("enclosure")
                if enc and enc.get("url"):
                    image = enc["url"]
                if not image:
                    media = item.find(["media:content", "media:thumbnail"])
                    if media and media.get("url"):
                        image = media["url"]
                if not image:
                    img_tag = desc_soup.find("img")
                    if img_tag and img_tag.get("src"):
                        image = img_tag["src"]

                loc = match_location(title + " " + summary)
                if loc:
                    lat, lon, region = loc
                    events.append({
                        "title": title,
                        "summary": summary,
                        "lat": lat,
                        "lon": lon,
                        "region": region,
                        "image": image,
                        "source": name,
                        "url": link,
                        "date": pub_date
                    })
        except Exception as e:
            print(f"RSS {name} błąd: {e}")
    return events

def fetch_telegram():
    events = []
    for ch in TG_CHANNELS:
        try:
            url = "/".join(["https:", "", "t.me", "s", ch])
            r = requests.get(url, headers=HEADERS, timeout=15, verify=False)
            print(f"TG @{ch} ({url}): status {r.status_code}")
            if r.status_code != 200:
                continue
            soup = BeautifulSoup(r.text, "html.parser")
            msgs = soup.select(".tgme_widget_message_wrap")[-15:]
            print(f"TG @{ch}: znaleziono {len(msgs)} wiadomości")
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
                    "summary": text[:230] + ("..." if len(text) > 230 else ""),
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
    events = fetch_rss() + fetch_telegram()
    print(f"SUMA POBRANYCH WYDARZEŃ: {len(events)}")
    if len(events) > 0:
        with open("feed.json", "w", encoding="utf-8") as f:
            json.dump(events[:35], f, ensure_ascii=False, indent=2)
        print("Zapisano nowe dane do feed.json")
    else:
        print("Brak nowych danych – zachowano dotychczasowy plik feed.json")

if __name__ == "__main__":
    main()
