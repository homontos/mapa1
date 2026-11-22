import json
import os
import re
import urllib.request
from bs4 import BeautifulSoup
from google import genai
from pydantic import BaseModel

# 1. Monitorowane kanały Telegram (Bałtyk + Ukraina/Morze Czarne + Bliski Wschód/Huti)
CHANNELS = [
    "OSINTdefender",
    "Osint613",
    "AbuAliExpress",
    "Middle_East_Spectator",
    "MMY1444",          # Yemen Military Media (Huti)
    "DeepStateUA",      # Ukraina / front
    "operativnoZSU",    # Ukraina / Morze Czarne
    "rybar"
]

# 2. Szerokie słowa kluczowe (morskie + wojenne + incydenty)
KEYWORDS = [
    # Bałtyk i Flota Cieni
    "baltic", "gdansk", "gdańsk", "kaliningrad", "tanker", "shadow fleet",
    "cable", "nord stream", "gps", "jamming", "spoofing", "bałtyk", "flota cieni",
    # Bliski Wschód, Ormuz, Morze Czerwone, Huti
    "hormuz", "iran", "houthi", "houthis", "yemen", "red sea", "bab al-mandab",
    "bab el-mandeb", "aden", "ukmto", "centcom", "hodeidah", "israel", "gaza", "lebanon",
    "vessel", "ship", "frigate", "destroyer", "usv", "missile", "drone", "strike",
    "البحر الأحمر", "باب المندب", "الحوثي", "سفينة", "ناقلة", "خليج عدن",
    # Ukraina i Morze Czarne
    "ukraine", "crimea", "black sea", "odesa", "odessa", "sevastopol", "kherson",
    "kharkiv", "donetsk", "zaporizhzhia", "kyiv", "shahed", "uav", "drone", "strike",
    "україна", "крим", "чорне море", "одеса", "севастополь", "дрон", "удар"
]

class EventData(BaseModel):
    is_relevant: bool
    title: str
    summary: str
    lat: float
    lon: float
    region: str  # "Bałtyk", "Ormuz", "Morze Czerwone" lub "Ukraina / M. Czarne"

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("BŁĄD KRYTYCZNY: Brak zmiennej GEMINI_API_KEY w Secrets!")

client = genai.Client(api_key=api_key)

def fetch_channel_posts(channel):
    url = f"https://t.me{channel}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    html = urllib.request.urlopen(req, timeout=15).read().decode('utf-8')
    soup = BeautifulSoup(html, 'html.parser')
    
    posts = []
    # Sprawdzamy ostatnie 20 wpisów z każdego kanału
    for msg in soup.select('.tgme_widget_message_wrap')[-20:]:
        text_el = msg.select_one('.tgme_widget_message_text')
        date_el = msg.select_one('time.time')
        link_el = msg.select_one('a.tgme_widget_message_date')
        photo_el = msg.select_one('.tgme_widget_message_photo_wrap')
        
        if not text_el:
            continue
            
        text = text_el.get_text(separator=" ").strip()
        if not any(kw in text.lower() for kw in KEYWORDS):
            continue
            
        image_url = None
        if photo_el and 'style' in photo_el.attrs:
            match = re.search(r"background-image:url\('(.*?)'\)", photo_el['style'])
            if match:
                image_url = match.group(1)
                
        posts.append({
            "source": f"@{channel}",
            "date": date_el['datetime'] if date_el else "",
            "url": link_el['href'] if link_el else url,
            "raw_text": text,
            "image": image_url
        })
    print(f"Kanał @{channel}: znaleziono {len(posts)} pasujących postów.")
    return posts

def analyze_with_ai(post):
    prompt = f"""
    Przeanalizuj ten raport OSINT (może być po angielsku, ukraińsku, rosyjsku lub arabsku).
    Jeśli opisuje konkretne wydarzenie wojskowe, incydent morski, atak dronów/rakiet, 
    zakłócenia GPS, uszkodzenie kabli lub ruchy floty cieni w jednym z 4 regionów:
    1. "Bałtyk" (Morze Bałtyckie, Zatoka Gdańska, Kaliningrad, Cieśniny Duńskie)
    2. "Ormuz" (Cieśnina Ormuz, Zatoka Perska, Zatoka Omańska, Iran)
    3. "Morze Czerwone" (Morze Czerwone, Bab al-Mandab, Zatoka Adeńska, Jemen, Huti, Bliski Wschód)
    4. "Ukraina / M. Czarne" (Ukraina, Krym, Morze Czarne, Odessa, Sewastopol, linia frontu)
    ustaw is_relevant=true. Odrzuć (is_relevant=false) zwykłe komentarze polityczne bez konkretnego zdarzenia.

    Zwróć:
    - title: krótki, konkretny nagłówek po polsku
    - summary: zwięzłe streszczenie po polsku (max 2 zdania)
    - region: dokładnie jedna z wartości: "Bałtyk", "Ormuz", "Morze Czerwone" lub "Ukraina / M. Czarne"
    - lat, lon: współrzędne GPS miejsca zdarzenia (lub przybliżony środek wskazanego miasta/akwenu, np. Zatoka Gdańska: 54.60, 19.10; Ormuz: 26.56, 56.25; Bab al-Mandab: 12.58, 43.33; Sewastopol: 44.61, 33.52; Odessa: 46.48, 30.72).
    
    Tekst: {post['raw_text'][:1200]}
    """
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": EventData,
        },
    )
    return json.loads(response.text)

def main():
    all_events = []
    for ch in CHANNELS:
        try:
            posts = fetch_channel_posts(ch)
            # Analizujemy maksymalnie 6 najnowszych z kanału, żeby nie przekroczyć limitów darmowego API
            for p in posts[-6:]:
                try:
                    ai_res = analyze_with_ai(p)
                    if ai_res.get("is_relevant"):
                        all_events.append({
                            "title": ai_res["title"],
                            "summary": ai_res["summary"],
                            "lat": ai_res["lat"],
                            "lon": ai_res["lon"],
                            "region": ai_res["region"],
                            "image": p["image"],
                            "source": p["source"],
                            "url": p["url"],
                            "date": p["date"]
                        })
                except Exception as ai_err:
                    print(f"Błąd AI dla wpisu z @{ch}: {ai_err}")
        except Exception as e:
            print(f"Błąd pobierania kanału @{ch}: {e}")

    print(f"Łącznie zakwalifikowano wydarzeń: {len(all_events)}")
    all_events.sort(key=lambda x: x["date"], reverse=True)
    
    with open("feed.json", "w", encoding="utf-8") as f:
        json.dump(all_events[:35], f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
