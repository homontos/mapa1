(function () {
  var BAZA_RECZNIE = "";   // np. "https://raw.githubusercontent.com/NAZWA/mapa/dane/"
  var czesci = location.pathname.split("/").filter(Boolean);
  var BAZA = BAZA_RECZNIE || ("https://raw.githubusercontent.com/" +
    location.hostname.split(".")[0] + "/" + (czesci[0] || "") + "/dane/");

  var widoczne = true;
  var dane = { type: "FeatureCollection", features: [] };
  var slad = { type: "FeatureCollection", features: [] };

  // ---------- Kraj z kodu ICAO hex (tabela przyblizona) ----------
  function krajZHex(hex) {
    if (!hex) return "🌍 Nieznany";
    var h = parseInt(hex, 16);
    if (isNaN(h)) return "🌍 Nieznany";
    if (h >= 0x488000 && h <= 0x48FFFF) return "🇵🇱 Polska";
    if (h >= 0x3C0000 && h <= 0x3FFFFF) return "🇩🇪 Niemcy";
    if (h >= 0x400000 && h <= 0x43FFFF) return "🇬🇧 Wielka Brytania";
    if (h >= 0xA00000 && h <= 0xAFFFFF) return "🇺🇸 USA";
    if (h >= 0x380000 && h <= 0x3BFFFF) return "🇫🇷 Francja";
    if (h >= 0x4A8000 && h <= 0x4AFFFF) return "🇸🇪 Szwecja";
    if (h >= 0x4A0000 && h <= 0x4A7FFF) return "🇷🇴 Rumunia";
    if (h >= 0x478000 && h <= 0x47FFFF) return "🇳🇴 Norwegia";
    if (h >= 0x458000 && h <= 0x45FFFF) return "🇩🇰 Dania";
    if (h >= 0x460000 && h <= 0x467FFF) return "🇫🇮 Finlandia";
    if (h >= 0x468000 && h <= 0x46FFFF) return "🇬🇷 Grecja";
    if (h >= 0x480000 && h <= 0x487FFF) return "🇳🇱 Holandia";
    if (h >= 0x448000 && h <= 0x44FFFF) return "🇧🇪 Belgia";
    if (h >= 0x498000 && h <= 0x49FFFF) return "🇨🇿 Czechy";
    if (h >= 0x505C00 && h <= 0x505FFF) return "🇸🇰 Słowacja";
    if (h >= 0x508000 && h <= 0x50FFFF) return "🇺🇦 Ukraina";
    if (h >= 0x502C00 && h <= 0x502FFF) return "🇱🇹 Litwa";
    if (h >= 0x502800 && h <= 0x502BFF) return "🇱🇻 Łotwa";
    if (h >= 0x501C00 && h <= 0x501FFF) return "🇪🇪 Estonia";
    if (h >= 0x300000 && h <= 0x33FFFF) return "🇮🇹 Włochy";
    if (h >= 0x340000 && h <= 0x37FFFF) return "🇪🇸 Hiszpania";
    if (h >= 0x4B0000 && h <= 0x4B7FFF) return "🇨🇭 Szwajcaria";
    if (h >= 0x4B8000 && h <= 0x4BFFFF) return "🇹🇷 Turcja";
    if (h >= 0x440000 && h <= 0x447FFF) return "🇦🇹 Austria";
    if (h >= 0x4D0000 && h <= 0x4D03FF) return "🇱🇺 Luksemburg";
    if (h >= 0xC00000 && h <= 0xC3FFFF) return "🇨🇦 Kanada";
    if (h >= 0x100000 && h <= 0x1FFFFF) return "🇷🇺 Rosja";
    return "🌍 Inny kraj";
  }

  // ---------- Style dymku ----------
  var st = document.createElement("style");
  st.textContent =
    "body .samolot-popup .maplibregl-popup-content{" +
      "padding:8px!important;background:#1e2022!important;color:#e9ecef!important;" +
      "border-radius:10px!important;width:280px!important;box-sizing:border-box!important;" +
      "box-shadow:0 6px 20px rgba(0,0,0,0.65)!important;font:13px/1.45 sans-serif!important" +
    "}" +
    "body .maplibregl-popup.samolot-popup.maplibregl-popup-anchor-top .maplibregl-popup-tip," +
    "body .maplibregl-popup.samolot-popup.maplibregl-popup-anchor-top-left .maplibregl-popup-tip," +
    "body .maplibregl-popup.samolot-popup.maplibregl-popup-anchor-top-right .maplibregl-popup-tip{border-bottom-color:#1e2022!important}" +
    "body .maplibregl-popup.samolot-popup.maplibregl-popup-anchor-bottom .maplibregl-popup-tip," +
    "body .maplibregl-popup.samolot-popup.maplibregl-popup-anchor-bottom-left .maplibregl-popup-tip," +
    "body .maplibregl-popup.samolot-popup.maplibregl-popup-anchor-bottom-right .maplibregl-popup-tip{border-top-color:#1e2022!important}" +
    "body .maplibregl-popup.samolot-popup.maplibregl-popup-anchor-left .maplibregl-popup-tip{border-right-color:#1e2022!important}" +
    "body .maplibregl-popup.samolot-popup.maplibregl-popup-anchor-right .maplibregl-popup-tip{border-left-color:#1e2022!important}" +
    "body .samolot-popup .maplibregl-popup-close-button{" +
      "top:10px!important;right:10px!important;width:24px!important;height:24px!important;" +
      "background:rgba(20,22,24,0.8)!important;color:#fff!important;border-radius:5px!important;" +
      "font-size:16px!important;line-height:24px!important;z-index:3!important" +
    "}" +
    ".samolot-popup .sam-foto-box{" +
      "width:100%;height:145px;background:#141517;border-radius:6px;overflow:hidden;" +
      "margin-bottom:7px;display:flex;align-items:center;justify-content:center;" +
      "color:#6c757d;font-size:11px" +
    "}" +
    ".samolot-popup .sam-foto-box img{width:100%;height:100%;object-fit:cover;display:block}" +
    "body .samolot-popup .sam-kraj{font-size:12px;color:#adb5bd!important;margin-bottom:2px}" +
    "body .samolot-popup .sam-linia-tytul{margin-bottom:4px;font-size:13px}" +
    "body .samolot-popup .sam-nazwa{font-weight:bold;font-size:14px;color:#fa5252!important;margin-right:8px}" +
    "body .samolot-popup .sam-typ{font-weight:bold;color:#fa5252!important}" +
    "body .samolot-popup .sam-wiersz{font-size:13px;color:#e9ecef!important}" +
    "@media (max-width:600px){" +
      "body .samolot-popup{position:fixed!important;left:54px!important;bottom:72px!important;" +
        "top:auto!important;right:auto!important;transform:none!important;z-index:12!important}" +
      "body .samolot-popup .maplibregl-popup-tip{display:none!important}" +
      "body .samolot-popup .maplibregl-popup-content{width:235px!important;max-width:calc(100vw - 66px)!important}" +
      ".samolot-popup .sam-foto-box{height:115px!important}" +
    "}";
  document.head.appendChild(st);

  // ---------- Ikona i warstwy (bez zmian) ----------
  function ikona() {
    var c = document.createElement("canvas");
    c.width = 64; c.height = 64;
    var x = c.getContext("2d");
    x.fillStyle = "#fff";
    x.beginPath();
    var p = [[32,4],[36,22],[58,36],[58,42],[36,35],[35,50],[42,56],[42,60],[32,57],
      [22,60],[22,56],[29,50],[28,35],[6,42],[6,36],[28,22]];
    x.moveTo(p[0][0], p[0][1]);
    for (var i = 1; i < p.length; i++) x.lineTo(p[i][0], p[i][1]);
    x.closePath(); x.fill();
    return x.getImageData(0, 0, 64, 64);
  }

  function dodaj() {
    if (!map.hasImage("samolot")) map.addImage("samolot", ikona(), { sdf: true });
    if (map.getSource("samoloty")) return;
    map.addSource("samoloty-slad", { type: "geojson", data: slad });
    map.addLayer({ id: "samoloty-slad", type: "line", source: "samoloty-slad",
      paint: { "line-color": "#e8590c", "line-width": 2, "line-dasharray": [2, 1.5] } });
    map.addSource("samoloty", { type: "geojson", data: dane });
    map.addLayer({
      id: "samoloty", type: "symbol", source: "samoloty",
      layout: {
        visibility: widoczne ? "visible" : "none",
        "icon-image": "samolot", "icon-size": 0.45,
        "icon-rotate": ["to-number", ["get", "track"], 0],
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true, "icon-ignore-placement": true
      },
      paint: { "icon-color": "#e8590c", "icon-halo-color": "#ffffff", "icon-halo-width": 1 }
    });
  }
  map.on("style.load", dodaj);
  if (map.isStyleLoaded()) dodaj();

  // ---------- Slad trasy z historii (bez zmian) ----------
  var historiaObietnica = null;
  function historia() {
    if (!historiaObietnica) {
      historiaObietnica = fetch(BAZA + "historia_ruchu.json?t=" + Math.floor(Date.now() / 60000))
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .catch(function () { historiaObietnica = null; return null; });
    }
    return historiaObietnica;
  }
  function ustawSlad(wsp) {
    slad = { type: "FeatureCollection", features: wsp && wsp.length > 1 ? [{ type: "Feature",
      properties: {}, geometry: { type: "LineString", coordinates: wsp } }] : [] };
    var z = map.getSource("samoloty-slad");
    if (z) z.setData(slad);
  }
  function pokazSlad(hex) {
    historia().then(function (h) {
      if (!h) return;
      var wsp = [];
      h.snapshoty.forEach(function (s) {
        (s.a || []).forEach(function (a) { if (a[0] === hex) wsp.push([a[2], a[1]]); });
      });
      ustawSlad(wsp);
    });
  }

  // ---------- Dymek po kliknieciu w samolot ----------
  function div(klasa, tekst) {
    var d = document.createElement("div");
    if (klasa) d.className = klasa;
    if (tekst !== undefined) d.textContent = tekst;
    return d;
  }
  function liczba(v) {
    if (v === undefined || v === null || v === "") return NaN;
    return +v;
  }

  map.on("click", "samoloty", function (e) {
    var p = e.features[0].properties;
    var hex = String(p.hex || "").toLowerCase();
    var box = document.createElement("div");

    // 1. zdjecie (stala ramka, zeby dymek nie przeskakiwal)
    var foto = div("sam-foto-box", "Ładowanie zdjęcia…");
    box.appendChild(foto);

    // 2. kraj
    box.appendChild(div("sam-kraj", krajZHex(hex)));

    // 3. nazwa wywolawcza + typ (czerwone, pogrubione)
    var tyt = div("sam-linia-tytul");
    var nazwa = document.createElement("span");
    nazwa.className = "sam-nazwa";
    nazwa.textContent = (p.flight || "").trim() || ("Samolot " + hex.toUpperCase());
    tyt.appendChild(nazwa);
    if (p.typ) {
      var typ = document.createElement("span");
      typ.className = "sam-typ";
      typ.textContent = "Typ: " + p.typ;
      tyt.appendChild(typ);
    }
    box.appendChild(tyt);

    // 4. wysokosc
    var alt = liczba(p.alt);
    var wys = (p.alt === 0 || p.alt === "0" || p.alt === "ground") ? "na ziemi"
      : (!isNaN(alt) ? Math.round(alt) + " ft (" + Math.round(alt * 0.3048) + " m)" : "—");
    box.appendChild(div("sam-wiersz", "Wysokość: " + wys));

    // 5. kurs
    var kurs = liczba(p.track);
    box.appendChild(div("sam-wiersz", "Kurs: " + (!isNaN(kurs) ? Math.round(kurs) + "°" : "—")));

    // 6. predkosc
    var gs = liczba(p.gs);
    box.appendChild(div("sam-wiersz", "Prędkość: " +
      (!isNaN(gs) ? Math.round(gs) + " kt (" + Math.round(gs * 1.852) + " km/h)" : "—")));

    // 7. ICAO, 8. wojskowy
    box.appendChild(div("sam-wiersz", "ICAO: " + hex.toUpperCase()));
    box.appendChild(div("sam-wiersz", "Wojskowy: tak (wg bazy)"));

    var popup = new maplibregl.Popup({ maxWidth: "none", className: "samolot-popup", offset: 14 })
      .setLngLat(e.lngLat).setDOMContent(box).addTo(map);
    popup.on("close", function () { ustawSlad(null); });
    pokazSlad(p.hex);

    fetch("https://api.planespotters.net/pub/photos/hex/" + encodeURIComponent(hex))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var f = d.photos && d.photos[0];
        var src = f && ((f.thumbnail_large && f.thumbnail_large.src) || (f.thumbnail && f.thumbnail.src));
        if (!src || src.indexOf("https://") !== 0) { foto.textContent = "Brak zdjęcia"; return; }
        var img = document.createElement("img");
        img.alt = "Zdjęcie samolotu";
        img.referrerPolicy = "no-referrer";
        img.onload = function () { foto.textContent = ""; foto.appendChild(img); };
        img.onerror = function () { foto.textContent = "Brak zdjęcia"; };
        img.src = src;
      })
      .catch(function () { foto.textContent = "Brak zdjęcia"; });
  });
  map.on("mouseenter", "samoloty", function () { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", "samoloty", function () { map.getCanvas().style.cursor = ""; });

  // ---------- Legenda (bez zmian) ----------
  var tresc = document.querySelector("#legenda .p-tresc") || document.getElementById("legenda");
  var blok = document.createElement("div");
  blok.style.marginTop = "8px";
  blok.innerHTML =
    '<label><input type="checkbox" id="sam-przel" checked> Samoloty wojskowe (Europa)</label>' +
    '<div class="leg"><span class="kropka" style="background:#e8590c"></span><span>Wojskowe (wg bazy)</span></div>' +
    '<div id="sam-status" style="font-size:11px;color:#555">brak danych</div>' +
    '<div style="font-size:10px;color:#666">Dane: airplanes.live / adsb.lol / adsb.fi. ' +
    'Tylko samoloty z włączonym transponderem.</div>';
  tresc.appendChild(blok);
  var status = document.getElementById("sam-status");
  document.getElementById("sam-przel").addEventListener("change", function () {
    widoczne = this.checked;
    if (map.getLayer("samoloty")) {
      map.setLayoutProperty("samoloty", "visibility", widoczne ? "visible" : "none");
    }
  });

  function wczytaj() {
    if (document.hidden) return;
    fetch(BAZA + "mil_teraz.json?t=" + Math.floor(Date.now() / 60000))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var cechy = (d.a || []).map(function (a) {
          return { type: "Feature",
            properties: { hex: a[0], track: a[3], alt: a[4], flight: a[5], typ: a[6], gs: a[7] },
            geometry: { type: "Point", coordinates: [a[2], a[1]] } };
        });
        dane = { type: "FeatureCollection", features: cechy };
        var z = map.getSource("samoloty");
        if (z) z.setData(dane);
        var wiek = (Date.now() / 1000 - d.t) / 60;
        var godz = new Date(d.t * 1000).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
        status.textContent = "Samolotów: " + cechy.length + " (stan z " + godz + ")" +
          (wiek > 30 ? " ⚠ dane starsze niż 30 min" : "");
      })
      .catch(function () { status.textContent = "brak danych (sprawdź automat „Historia ruchu”)"; });
  }
  wczytaj();
  setInterval(wczytaj, 60000);
})();
