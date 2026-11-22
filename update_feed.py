import json
import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup

# 1. Kanały RSS (nieblokowane przez GitHub Actions, zawierają zdjęcia i newsy morskie/wojenne)
RSS_FEEDS = [
    ("gCaptain", "https://gcaptain.com"),
    ("Maritime Executive", "https://maritime-executive.com"),
    ("USNI News", "https://usni.org"),
    ("Defence24", "https://defence24.pl")
]

# 2. Kanały Telegrama (opcjonalne, jeśli IP GitHuba nie jest zablokowane)
TG_CHANNELS = ["OSINTdefender", "Osint613", "DeepStateUA", "operativnoZSU"]

# Mapowanie słów kluczowych na regiony i domyślne współrzędne [lat, lon, region]
LOCATIONS = [
    (["gdansk", "gdańsk", "baltic", "bałtyk", "kaliningrad", "shadow fleet", "flota cieni", "finland", "sweden", "gotland", "nord stream"], 54.85, 18.80, "Bałtyk"),
    (["hormuz", "ormuz", "persian gulf", "zatoka perska", "iran", "oman", "fujairah", "bandar abbas"], 26.56, 56.25, "Ormuz"),
    (["houthi", "huti", "red sea", "morze czerwone", "bab al-mandab", "bab el-mandeb", "yemen", "jemen", "aden", "hodeidah", "ukmto"], 13.20, 43.10, "Morze Czerwone"),
    (["ukraine", "ukrain", "crimea", "krym", "black sea", "morze czarne", "odesa", "odessa", "sevastopol", "sewastopol", "russia", "rosj"], 45.20, 33.50, "Ukraina / M. Czarne")
]

def match_location(text):
    t = text.lower()
    for words, lat, lon, region in LOCATIONS:
        if any(w in t for w in words):
            return lat, lon, region
    return None

def fetch_rss():
    events = []
    for name, url in RSS_FEEDS:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            xml_data = urllib.request.urlopen(req, timeout=15).read()
            root = ET.fromstring(xml_data)
            for item in root.findall('.//item')[:15]:
                title = (item.findtext('title') or '').strip()
                link = (item.findtext('link') or '').strip()
                pub_date = (item.findtext('pubDate') or '').strip()
                desc_html = item.findtext('description') or ''
                
                soup = BeautifulSoup(desc_html, 'html.parser')
                summary = soup.get_text(" ", strip=True)[:220] + "..."
                
                # Szukanie zdjęcia w RSS (enclosure, media:content lub tag <img> w opisie)
                image = None
                enc = item.find('enclosure')
                if enc is not None and 'url' in enc.attrib:
                    image = enc.attrib['url']
                if not image:
                    img_tag = soup.find('img')
                    if img_tag and img_tag.get('src'):
                        image = img_tag['src']

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
            url = f"https://t.me{ch}"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8')
            soup = BeautifulSoup(html, 'html.parser')
            for msg in soup.select('.tgme_widget_message_wrap')[-10:]:
                text_el = msg.select_one('.tgme_widget_message_text')
                if not text_el:
                    continue
                text = text_el.get_text(" ", strip=True)
                loc = match_location(text)
                if not loc:
                    continue
                lat, lon, region = loc
                date_el = msg.select_one('time.time')
                link_el = msg.select_one('a.tgme_widget_message_date')
                photo_el = msg.select_one('.tgme_widget_message_photo_wrap')
                image = None
                if photo_el and 'style' in photo_el.attrs:
                    m = re.search(r"background-image:url\('(.*?)'\)", photo_el['style'])
                    if m:
                        image = m.group(1)
                events.append({
                    "title": text[:80] + ("..." if len(text) > 80 else ""),
                    "summary": text[:220] + ("..." if len(text) > 220 else ""),
                    "lat": lat,
                    "lon": lon,
                    "region": region,
                    "image": image,
                    "source": f"@{ch}",
                    "url": link_el['href'] if link_el else url,
                    "date": date_el['datetime'] if date_el else ""
                })
        except Exception as e:
            print(f"TG @{ch} błąd: {e}")
    return events

def main():
    events = fetch_rss() + fetch_telegram()
    print(f"Pobrano łącznie {len(events)} wydarzeń.")
    with open("feed.json", "w", encoding="utf-8") as f:
        json.dump(events[:30], f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
