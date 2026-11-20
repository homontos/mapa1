import json
import os
import time
import urllib.request

ZRODLA = [
    "https://api.airplanes.live/v2/mil",
    "https://api.adsb.lol/v2/mil",
    "https://opendata.adsb.fi/api/v2/mil",
]
S, W, N, E = 33.0, -25.0, 72.0, 45.0      # Europa: poludnie, zachod, polnoc, wschod
WIEK_S = 24 * 3600
KAT = "dane_wyj"


def pobierz(url):
    zad = urllib.request.Request(url, headers={
        "User-Agent": "mapa-historia (prywatny projekt niekomercyjny)",
        "Accept": "application/json"})
    with urllib.request.urlopen(zad, timeout=60) as r:
        return json.load(r)


def liczba(x, nd=None):
    try:
        return round(float(x), nd) if nd is not None else int(float(x))
    except (TypeError, ValueError):
        return None


teraz = int(time.time())

# --- samoloty wojskowe: laczymy wszystkie zrodla po kodzie hex ---
wg_hex, zrodla_ok = {}, []
for url in ZRODLA:
    host = url.split("/")[2]
    try:
        d = pobierz(url)
        lista = d.get("ac") or d.get("aircraft") or []
    except Exception as e:
        print("Blad zrodla", host, type(e).__name__, str(e)[:100])
        continue
    dodane, w_europie = 0, 0
    for a in lista:
        lat, lon = a.get("lat"), a.get("lon")
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            continue
        if not (S <= lat <= N and W <= lon <= E):
            continue
        w_europie += 1
        hx = str(a.get("hex", "")).lower()
        if not hx or hx in wg_hex:
            continue
        alt = a.get("alt_baro")
        alt = 0 if alt == "ground" else liczba(alt)
        wg_hex[hx] = [hx, round(lat, 3), round(lon, 3), liczba(a.get("track")), alt,
                      str(a.get("flight") or "").strip(), a.get("t") or ""]
        dodane += 1
    zrodla_ok.append(host)
    print("Zrodlo", host, "| w Europie:", w_europie, "| nowych po scaleniu:", dodane)
    time.sleep(1.5)                      # limit: 1 zapytanie na sekunde
samoloty = list(wg_hex.values()) if zrodla_ok else None
zrodlo = "+".join(zrodla_ok)

# --- obiekty z Neptuna ---
neptun = None
try:
    d = pobierz("https://neptun.in.ua/api/v1/threats")
    neptun = []
    for t in d.get("threats", []):
        if t.get("areaOnly") or t.get("status") == "resolved":
            continue
        lat, lon = t.get("lat"), t.get("lon")
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            continue
        neptun.append([str(t.get("id") or ""), t.get("type") or "unknown", round(lat, 3), round(lon, 3),
                       liczba(t.get("heading")), liczba(t.get("uncertaintyKm"), 1),
                       t.get("count") or 0, 1 if t.get("advisory") else 0])
    print("Obiektow Neptun:", len(neptun))
except Exception as e:
    print("Blad Neptun", type(e).__name__, str(e)[:100])

if samoloty is None and neptun is None:
    raise SystemExit("Zadne zrodlo nie odpowiedzialo")

try:
    with open(os.path.join(KAT, "poprzednia.json"), encoding="utf-8") as f:
        snap = json.load(f).get("snapshoty", [])
except Exception:
    snap = []

snap.append({"t": teraz, "a": samoloty if samoloty is not None else [],
             "ba": 1 if samoloty is None else 0,
             "n": neptun if neptun is not None else [], "bn": 1 if neptun is None else 0})
snap = [s for s in snap if s["t"] >= teraz - WIEK_S]

with open(os.path.join(KAT, "historia_ruchu.json"), "w", encoding="utf-8") as f:
    json.dump({"v": 1, "snapshoty": snap}, f, separators=(",", ":"))
with open(os.path.join(KAT, "mil_teraz.json"), "w", encoding="utf-8") as f:
    json.dump({"t": teraz, "zrodlo": zrodlo, "a": samoloty or []}, f, separators=(",", ":"))
print("Samolotow razem:", len(samoloty or []), "| snapshotow w historii:", len(snap))
