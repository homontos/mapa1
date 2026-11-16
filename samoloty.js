(function () {
  // Dane czytamy z galezi "dane" (domyslnie wyliczane z adresu strony).
  var BAZA_RECZNIE = "";   // np. "https://raw.githubusercontent.com/NAZWA/mapa/dane/"
  var czesci = location.pathname.split("/").filter(Boolean);
  var BAZA = BAZA_RECZNIE || ("https://raw.githubusercontent.com/" +
    location.hostname.split(".")[0] + "/" + (czesci[0] || "") + "/dane/");

  var widoczne = true;
  var dane = { type: "FeatureCollection", features: [] };
  var slad = { type: "FeatureCollection", features: [] };

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

  function wiersz(t, v) {
    if (v === undefined || v === null || v === "") return null;
    var d = document.createElement("div");
    d.style.fontSize = "13px";
    d.textContent = t + ": " + v;
    return d;
  }

  map.on("click", "samoloty", function (e) {
    var p = e.features[0].properties;
    var box = document.createElement("div");
    var tyt = document.createElement("div");
    tyt.style.cssText = "font-weight:bold;margin-bottom:4px";
    tyt.textContent = (p.flight || "").trim() || ("Samolot " + (p.hex || "").toUpperCase());
    box.appendChild(tyt);
    var foto = document.createElement("div");
    box.appendChild(foto);
    var wys = p.alt === 0 || p.alt === "0" ? "na ziemi" : (p.alt ? p.alt + " ft (" + Math.round(p.alt * 0.3048) + " m)" : null);
    [wiersz("Typ", p.typ), wiersz("Wysokość", wys),
     wiersz("Kurs", p.track ? Math.round(p.track) + "°" : null),
     wiersz("ICAO", (p.hex || "").toUpperCase()),
     wiersz("Wojskowy", "tak (wg bazy)")
    ].forEach(function (w) { if (w) box.appendChild(w); });
    var info = document.createElement("div");
    info.style.cssText = "font-size:11px;color:#666;margin-top:4px";
    info.textContent = "Przerywana linia: ślad z ostatnich godzin (zapis co ok. 5 min).";
    box.appendChild(info);
    var link = document.createElement("a");
    link.href = "https://www.planespotters.net/hex/" + encodeURIComponent((p.hex || "").toUpperCase());
    link.target = "_blank"; link.rel = "noopener";
    link.textContent = "Zdjęcia w Planespotters";
    link.style.fontSize = "12px";
    box.appendChild(link);
    var popup = new maplibregl.Popup({ maxWidth: "260px" }).setLngLat(e.lngLat).setDOMContent(box).addTo(map);
    popup.on("close", function () { ustawSlad(null); });
    pokazSlad(p.hex);

    fetch("https://api.planespotters.net/pub/photos/hex/" + encodeURIComponent(p.hex))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var f = d.photos && d.photos[0];
        var src = f && ((f.thumbnail_large && f.thumbnail_large.src) || (f.thumbnail && f.thumbnail.src));
        if (!src || src.indexOf("https://") !== 0) return;
        var img = document.createElement("img");
        img.src = src; img.alt = "Zdjęcie samolotu";
        img.style.cssText = "width:100%;border-radius:4px;margin-bottom:4px";
        foto.appendChild(img);
        var a = document.createElement("a");
        a.textContent = "Zdjęcie: " + (f.photographer || "autor") + " / Planespotters.net";
        if (f.link && f.link.indexOf("https://") === 0) { a.href = f.link; a.target = "_blank"; a.rel = "noopener"; }
        a.style.cssText = "display:block;font-size:11px;margin-bottom:4px";
        foto.appendChild(a);
      })
      .catch(function () {});
  });
  map.on("mouseenter", "samoloty", function () { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", "samoloty", function () { map.getCanvas().style.cursor = ""; });

  // Legenda
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
            properties: { hex: a[0], track: a[3], alt: a[4], flight: a[5], typ: a[6] },
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
