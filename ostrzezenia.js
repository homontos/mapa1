(function () {
  var widoczne = true;
  var dane = { type: "FeatureCollection", features: [] };
  var KOLORY = { 1: "#f2c200", 2: "#f08c00", 3: "#e03131" };

  function plakietka(kolor) {
    var c = document.createElement("canvas");
    c.width = 64; c.height = 64;
    var x = c.getContext("2d");
    x.beginPath();
    x.arc(32, 32, 28, 0, Math.PI * 2);
    x.fillStyle = kolor;
    x.fill();
    x.lineWidth = 4;
    x.strokeStyle = "#ffffff";
    x.stroke();
    x.fillStyle = "#ffffff";
    x.font = "bold 40px sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText("!", 32, 35);
    return x.getImageData(0, 0, 64, 64);
  }

  function dodaj() {
    [1, 2, 3].forEach(function (s) {
      if (!map.hasImage("ost-" + s)) map.addImage("ost-" + s, plakietka(KOLORY[s]));
    });
    if (map.getSource("ostrzezenia")) return;
    map.addSource("ostrzezenia", { type: "geojson", data: dane });
    map.addLayer({
      id: "ostrzezenia", type: "symbol", source: "ostrzezenia",
      layout: {
        visibility: widoczne ? "visible" : "none",
        "icon-image": ["match", ["get", "max"], 3, "ost-3", 2, "ost-2", "ost-1"],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 4, 0.5, 8, 0.75],
        "icon-allow-overlap": true, "icon-ignore-placement": true
      }
    });
  }
  map.on("style.load", dodaj);
  if (map.isStyleLoaded()) dodaj();

  var STOPNIE = { 1: "1. stopień (żółty)", 2: "2. stopień (pomarańczowy)", 3: "3. stopień (czerwony)" };
  function czas(s) {
    if (!s) return "?";
    var d = new Date(String(s).replace(" ", "T"));
    return isNaN(d.getTime()) ? String(s) : d.toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" });
  }

  map.on("click", "ostrzezenia", function (e) {
    var p = e.features[0].properties, lista = [];
    try { lista = JSON.parse(p.lista || "[]"); } catch (x) {}
    var box = document.createElement("div");
    function wiersz(t, styl) {
      var d = document.createElement("div");
      d.style.margin = "4px 0";
      if (styl) d.style.cssText += styl;
      d.textContent = t;
      box.appendChild(d);
    }
    lista.sort(function (a, b) { return b.stopien - a.stopien; });
    lista.forEach(function (w) {
      wiersz((w.rodzaj === "hydro" ? "[hydro] " : "") + w.zjawisko + " – " +
        (STOPNIE[w.stopien] || "stopień ?"), "font-weight:bold;margin-top:8px");
      wiersz("Od: " + czas(w.od) + " · do: " + czas(w.do) +
        (w.prawd ? " · prawdop. " + w.prawd + "%" : "") +
        (w.powiaty ? " · powiatów: " + w.powiaty : ""));
      if (w.przebieg) wiersz(w.przebieg, "font-size:12px;color:#444");
    });
    wiersz("Dane: IMGW-PIB (danepubliczne.imgw.pl). Susza hydrologiczna jest pomijana. " +
      "Informacja pomocnicza, nie zastępuje oficjalnych komunikatów IMGW, Alertu RCB ani służb.",
      "font-size:11px;color:#666;margin-top:8px");
    window.pokazSzczegoly("Ostrzeżenia: woj. " + String(p.nazwa).toLowerCase(), box);
  });
  map.on("mouseenter", "ostrzezenia", function () { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", "ostrzezenia", function () { map.getCanvas().style.cursor = ""; });

  var tresc = document.querySelector("#legenda .p-tresc") || document.getElementById("legenda");
  var blok = document.createElement("div");
  blok.style.marginTop = "8px";
  blok.innerHTML =
    '<label><input type="checkbox" id="ost-przel" checked> Ostrzeżenia IMGW (Polska)</label>' +
    '<div class="leg"><span class="kropka" style="background:#f2c200"></span><span>! 1. stopień</span></div>' +
    '<div class="leg"><span class="kropka" style="background:#f08c00"></span><span>! 2. stopień</span></div>' +
    '<div class="leg"><span class="kropka" style="background:#e03131"></span><span>! 3. stopień</span></div>' +
    '<div id="ost-status" style="font-size:11px;color:#555">brak danych</div>' +
    '<div style="font-size:10px;color:#666">Dane: IMGW-PIB. Kolor = najwyższy stopień w województwie. ' +
    'Bez suszy hydrologicznej.</div>';
  tresc.appendChild(blok);
  document.getElementById("ost-przel").addEventListener("change", function () {
    widoczne = this.checked;
    if (map.getLayer("ostrzezenia")) {
      map.setLayoutProperty("ostrzezenia", "visibility", widoczne ? "visible" : "none");
    }
  });

  function wczytaj() {
    fetch("ostrzezenia.json?t=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var cechy = [];
        Object.keys(d.woj || {}).forEach(function (k) {
          var g = d.woj[k];
          var lista = (g.lista || []).filter(function (w) {
            return !/susz/i.test(String(w.zjawisko || ""));    // bez suszy hydrologicznej
          });
          if (!lista.length) return;
          var max = Math.max.apply(null, lista.map(function (w) { return w.stopien || 1; }));
          cechy.push({ type: "Feature",
            properties: { nazwa: g.nazwa, max: Math.min(3, Math.max(1, max)), lista: JSON.stringify(lista) },
            geometry: { type: "Point", coordinates: [g.lon, g.lat] } });
        });
        dane = { type: "FeatureCollection", features: cechy };
        var z = map.getSource("ostrzezenia");
        if (z) z.setData(dane);
        var godz = d.czas ? new Date(d.czas).toLocaleTimeString("pl-PL",
          { hour: "2-digit", minute: "2-digit" }) : "?";
        document.getElementById("ost-status").textContent = cechy.length
          ? "Województw z ostrzeżeniem: " + cechy.length + " (stan z " + godz + ")"
          : "Brak aktywnych ostrzeżeń (stan z " + godz + ")";
      })
      .catch(function () {});
  }
  wczytaj();
  setInterval(wczytaj, 10 * 60 * 1000);
})();
