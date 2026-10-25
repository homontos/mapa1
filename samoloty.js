(function () {
  var ADRESY = ["samoloty.json"];
  var POLSKA = [[14.12,53.93],[16.0,54.55],[17.5,54.9],[18.5,54.95],[19.6,54.55],
    [19.9,54.4],[20.4,54.38],[22.8,54.38],[23.5,54.2],[23.55,53.9],[23.95,52.75],
    [23.6,52.1],[23.55,51.55],[24.05,50.85],[23.5,50.4],[22.7,49.6],[22.85,49.05],
    [22.1,49.2],[21.6,49.4],[20.3,49.35],[19.5,49.2],[18.9,49.5],[18.5,49.9],
    [17.7,50.3],[16.9,50.4],[16.2,50.7],[15.0,51.0],[14.75,51.05],[14.7,52.0],
    [14.55,52.6],[14.15,52.9],[14.2,53.5]];
  var widoczne = true;
  var dane = { type: "FeatureCollection", features: [] };

  function wPolsce(lon, lat) {
    var w = false;
    for (var i = 0, j = POLSKA.length - 1; i < POLSKA.length; j = i++) {
      var xi = POLSKA[i][0], yi = POLSKA[i][1], xj = POLSKA[j][0], yj = POLSKA[j][1];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) w = !w;
    }
    return w;
  }

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
      paint: {
        "icon-color": ["case", ["==", ["get", "wojsk"], 1], "#e8590c", "#343a40"],
        "icon-halo-color": "#ffffff", "icon-halo-width": 1
      }
    });
  }
  map.on("style.load", dodaj);
  if (map.isStyleLoaded()) dodaj();

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
    tyt.textContent = (p.flight || "").trim() || ("Samolot " + p.hex);
    box.appendChild(tyt);
    var foto = document.createElement("div");
    box.appendChild(foto);
    var wys = p.alt === "ground" ? "na ziemi"
      : (p.alt ? p.alt + " ft (" + Math.round(p.alt * 0.3048) + " m)" : null);
    [wiersz("Rejestracja", p.r), wiersz("Typ", p.t), wiersz("Wysokość", wys),
     wiersz("Prędkość", p.gs ? Math.round(p.gs) + " węzłów" : null),
     wiersz("Kurs", p.track ? Math.round(p.track) + "°" : null),
     wiersz("Squawk", p.squawk), wiersz("ICAO", (p.hex || "").toUpperCase()),
     p.wojsk == 1 ? wiersz("Oznaczenie", "wojskowy (wg bazy)") : null
    ].forEach(function (w) { if (w) box.appendChild(w); });
    var link = document.createElement("a");
    link.href = "https://www.planespotters.net/hex/" + encodeURIComponent((p.hex || "").toUpperCase());
    link.target = "_blank"; link.rel = "noopener";
    link.textContent = "Zdjęcia w Planespotters";
    link.style.fontSize = "12px";
    box.appendChild(link);
    new maplibregl.Popup({ maxWidth: "260px" }).setLngLat(e.lngLat).setDOMContent(box).addTo(map);

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

  // Wpis w legendzie
  var tresc = document.querySelector("#legenda .p-tresc") || document.getElementById("legenda");
  var blok = document.createElement("div");
  blok.style.marginTop = "8px";
  blok.innerHTML =
    '<label><input type="checkbox" id="sam-przel" checked> Samoloty nad Polską</label>' +
    '<div class="leg"><span class="kropka" style="background:#343a40"></span><span>Cywilne</span></div>' +
    '<div class="leg"><span class="kropka" style="background:#e8590c"></span><span>Wojskowe (wg bazy)</span></div>' +
    '<div id="sam-status" style="font-size:11px;color:#555"></div>' +
    '<div style="font-size:10px;color:#666">Dane: adsb.fi / adsb.lol</div>';
  tresc.appendChild(blok);
  var status = document.getElementById("sam-status");
  document.getElementById("sam-przel").addEventListener("change", function () {
    widoczne = this.checked;
    if (map.getLayer("samoloty")) {
      map.setLayoutProperty("samoloty", "visibility", widoczne ? "visible" : "none");
    }
  });

  function pobierz(i) {
    if (i >= ADRESY.length) { status.textContent = "Samoloty: brak danych"; return; }
    fetch(ADRESY[i] + "?t=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var lista = d.ac || d.aircraft || [];
        var cechy = [];
        lista.forEach(function (a) {
          if (typeof a.lat !== "number" || typeof a.lon !== "number") return;
          if (!wPolsce(a.lon, a.lat)) return;
          cechy.push({
            type: "Feature",
            properties: {
              hex: a.hex, flight: a.flight, r: a.r, t: a.t,
              alt: a.alt_baro, gs: a.gs, track: a.track, squawk: a.squawk,
              wojsk: (a.dbFlags & 1) ? 1 : 0
            },
            geometry: { type: "Point", coordinates: [a.lon, a.lat] }
          });
        });
        dane = { type: "FeatureCollection", features: cechy };
        var z = map.getSource("samoloty");
        if (z) z.setData(dane);
        var godz = d.czas ? new Date(d.czas).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "?";
        status.textContent = "Samolotów nad Polską: " + cechy.length + " (stan z " + godz + ")";
      })
      .catch(function () { pobierz(i + 1); });
  }
  function odswiez() { if (!document.hidden) pobierz(0); }
  odswiez();
  setInterval(odswiez, 60000);

  // Statki: link do zdjec i danych (zdjec nie pobieramy automatycznie)
  var oryg = window.pokazPopupStatku;
  if (typeof oryg === "function") {
    window.pokazPopupStatku = function (p, poz) {
      oryg(p, poz);
      var tresci = document.querySelectorAll(".maplibregl-popup-content");
      var el = tresci[tresci.length - 1];
      if (el && p.mmsi) {
        var a = document.createElement("a");
        a.href = "https://www.marinetraffic.com/en/ais/details/ships/mmsi:" + encodeURIComponent(p.mmsi);
        a.target = "_blank"; a.rel = "noopener";
        a.textContent = "Zdjęcia i dane statku (MarineTraffic)";
        a.style.cssText = "display:block;font-size:12px;margin-top:6px";
        el.appendChild(a);
      }
    };
  }
})();
