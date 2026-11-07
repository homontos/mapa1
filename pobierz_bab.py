kod = open("pobierz_ormuz.py", encoding="utf-8").read()
kod = kod.replace("https://hormuz.data-tracking.net/api/ships",
                  "https://hormuz.data-tracking.net/api/bab/ships")
kod = kod.replace("statki_ormuz.geojson", "statki_bab.geojson")
exec(compile(kod, "pobierz_ormuz.py", "exec"))
