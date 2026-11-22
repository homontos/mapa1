import json
import os
import re
import urllib.request
from bs4 import BeautifulSoup
from google import genai
from pydantic import BaseModel

# 1. Monitorowane kanały Telegram (Bałtyk + Bliski Wschód + Morze Czerwone / Huti)
CHANNELS = [
    "OSINTdefender",
    "Osint613",
    "AbuAliExpress",
    "Middle_East_Spectator",
    "MMY1444",          # Yemen Military Media (Huti - zdjęcia i nagrania z Morza Czerwonego)
    "rybar",
    "baltic_watch"
]

# 2. Słowa kluczowe (PL + EN + AR)
KEYWORDS = [
    # Bałtyk i Flota Cieni
    "baltic", "gdansk", "gdańsk", "kaliningrad", "tanker", "shadow fleet",
    "cable", "nord stream", "gps", "jamming", "spoofing", "bałtyk", "flota cieni",
    # Bliski Wschód, Ormuz, Morze Czerwone i Huti
    "hormuz", "iran", "houthi", "houthis", "yemen", "red sea", "bab al-mandab",
    "bab el-mandeb", "aden", "ukmto", "centcom", "hodeidah", "mocha", "hanish",
    "perim", "vessel", "ship", "frigate", "destroyer", "usv", "missile", "drone",
    "ormuz", "huti", "morze czerwone", "jemen", "statek",
    # Arabskie słowa kluczowe (dla kanałów z Jemenu/Huti)
    "البحر الأحمر", "باب المندب", "الحوثي", "سفينة", "ناقلة", "خليج عدن", "الحديدة"
]

class EventData(BaseModel):
    is_relevant: bool
    title: str
    summary: str
    lat: float
    lon: float
    region: str  # "Bałtyk", "Ormuz" lub "Morze Czerwone"

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

def fetch_channel_posts(channel):
    url = f"https://t.me{channel}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    html = urllib.request.urlopen(req).read().decode('utf-8')
    soup = BeautifulSoup(html, 'html.parser')
    
    posts = []
    for msg in soup.select('.tgme_widget_message_wrap')[-12:]:
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
    return posts

def analyze_with_ai(post):
    prompt = f"""
    Przeanalizuj ten raport OSINT (może być po angielsku, rosyjsku lub arabsku). 
    Jeśli dotyczy incydentu morskiego, ataku na statek, blokady cieśniny, zakłóceń GPS, 
    kabli podmorskich, działań Huti lub floty cieni w jednym z 3 obszarów:
    1. "Bałtyk" (Morze Bałtyckie, Zatoka Gdańska, Kaliningrad, Cieśniny Duńskie)
    2. "Ormuz" (Cieśnina Ormuz, Zatoka Perska, Zatoka Omańska)
    3. "Morze Czerwone" (Morze Czerwone, Cieśnina Bab al-Mandab, Zatoka Adeńska, Jemen, Hodeidah, Wyspy Hanisz, Perim)
    ustaw is_relevant=true.

    Zwróć:
    - title: krótki, konkretny nagłówek po polsku
    - summary: zwięzłe streszczenie po polsku (max 2 zdania, podaj nazwę statku jeśli występuje)
    - region: dokładnie jedna z wartości: "Bałtyk", "Ormuz" lub "Morze Czerwone"
    - lat, lon: współrzędne GPS zdarzenia. Jeśli brak dokładnych danych, użyj punktu orientacyjnego:
      * Zatoka Gdańska: 54.60, 19.10
      * Cieśnina Ormuz: 26.56, 56.25
      * Cieśnina Bab al-Mandab: 12.58, 43.33
      * Okolice Hodeidah (Morze Czerwone): 14.80, 42.50
      * Zatoka Adeńska: 12.80, 46.50
    
    Tekst raportu: {post['raw_text']}
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
            for p in posts:
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
        except Exception as e:
            print(f"Błąd dla {ch}: {e}")

    all_events.sort(key=lambda x: x["date"], reverse=True)
    with open("feed.json", "w", encoding="utf-8") as f:
        json.dump(all_events[:30], f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
