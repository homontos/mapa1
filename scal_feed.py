import hashlib
import html
import json
import re
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urlparse

SWIAT = "swiat.json"
FEED = "feed.json"
DNI = 7

REGION = [("bałtyk", "Europa Wschodnia"), ("baltyk", "Europa Wschodnia"), ("baltic", "Europa Wschodnia"),
          ("ukrain", "Europa Wschodnia"), ("izrael", "Bliski Wschód"), ("israel", "Bliski Wschód"),
          ("ormuz", "Bliski Wschód"), ("hormuz", "Bliski Wschód"), ("czerwone", "Bliski Wschód"),
          ("red sea", "Bliski Wschód"), ("huti", "Bliski Wschód"), ("houthi", "Bliski Wschód"),
          ("jemen", "Bliski Wschód"), ("yemen", "Bliski Wschód")]
KAT = [("rakieta", r"rakiet|missile|ракет|ballist|iskander|kalibr"),
       ("dron", r"\bdron|drone|uav|бпла|дрон|shahed|шахед"),
       ("marynarka", r"okręt|statek|tankow|ship|vessel|navy|naval|fleet|tanker|судн|корабл|флот"),
       ("alarm", r"alarm|syren|siren|сирен|тривог|тревог"),
       ("starcie", r"atak|strike|attack|clash|battle|explosi|wybuch|ostrzał|shell|удар|атак|бой|взрыв")]


def czysc(s, maks):
    s = html.unescape(re.sub(r"<[^>]+>", " ", str(s or "")))
    return re.sub(r"\s+", " ", s).strip()[:maks]


def epoka(v):
    try:
        if isinstance(v, (int, float)):
            return int(v / 1000) if v > 1e12 else int(v)
        s = str(v).strip()
        if re.fullmatch(r"\d+(\.\d+)?", s):
            return epoka(float(s))
        try:
            d = datetime.fromisoformat(s.replace("Z", "+00:00"))
        except Exception:
            d = parsedate_to_datetime(s)
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return int(d.timestamp())
    except Exception:
        return int(time.time())


try:
    with open(SWIAT, encoding="utf-8") as f:
        baza = json.load(f)
except Exception:
    baza = {"czas": int(time.time()), "zdarzenia": []}
zd = baza.get("zdarzenia", [])
znane = {z["id"] for z in zd}

try:
    with open(FEED, encoding="utf-8") as f:
        feed = json.load(f)
except Exception as e:
    raise SystemExit("Brak lub uszkodzony " + FEED + ": " + type(e).__name__)
if isinstance(feed, dict):
    feed = next((v for v in feed.values() if isinstance(v, list)), [])

dodane = bez_wsp = 0
for ev in feed:
    if not isinstance(ev, dict):
        continue
    url = str(ev.get("url") or "").strip()
    if not re.match(r"https?://", url):
        continue
    pid = hashlib.sha1(url.encode()).hexdigest()[:10]
    if pid in znane:
        continue
    try:
        lat, lon = float(ev.get("lat")), float(ev.get("lon"))
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError
    except (TypeError, ValueError):
        bez_wsp += 1
        continue
    etykieta = czysc(ev.get("region"), 40)
    reg = next((r for k, r in REGION if k in etykieta.lower()), "Europa Wschodnia")
    tytul, opis = czysc(ev.get("title"), 200), czysc(ev.get("summary"), 300)
    tekst = (tytul + (". " + opis if opis else "")).strip()[:300]
    if not tekst:
        continue
    kat = next((k for k, w in KAT if re.search(w, (tytul + " " + opis).lower())), "inne")
    img = str(ev.get("image") or "").strip()
    wpis = {"id": pid, "t": epoka(ev.get("date")), "kraj": etykieta or "Telegram", "reg": reg, "kat": kat,
            "tekst": tekst, "u": url, "z": czysc(ev.get("source"), 40) or urlparse(url).netloc.replace("www.", ""),
            "lat": round(lat, 3), "lon": round(lon, 3)}
    if img.startswith("https://"):
        wpis["img"] = img
    zd.append(wpis)
    znane.add(pid)
    dodane += 1

granica = int(time.time()) - DNI * 86400
zd = sorted([z for z in zd if z["t"] >= granica], key=lambda z: -z["t"])
baza["zdarzenia"] = zd
baza["czas"] = max(int(baza.get("czas", 0)), int(time.time()))
with open(SWIAT, "w", encoding="utf-8") as f:
    json.dump(baza, f, ensure_ascii=False, separators=(",", ":"))
print("Feed:", len(feed), "rekordow | dodano:", dodane, "| bez wspolrzednych:", bez_wsp, "| razem w 7 dniach:", len(zd))
