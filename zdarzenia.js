(function () {
  var dane = { type: "FeatureCollection", features: [] };
  var widoczne = true;

  function dodaj() {
    if (map.getSource("zdarzenia")) return;
    map.addSource("zdarzenia", { type: "geojson", data: dane });
    map.addLayer({
      id: "zdarzenia", type: "circle", source: "zdarzenia",
      layout: { visibility: widoczne ? "visible" : "none" },
      paint: {
        "circle-radius": ["interpolate", ["linear"],
          ["coalesce", ["get", "ile"], 1], 1, 5, 50, 14],
        "circle-color": ["match", ["get", "kategoria"],
          "ukraina", "#e03131", "polska", "#1971c2", "#868e96"],
        "circle-opacity": 0.7,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff"
      }
    });
  }
  map.on("style.load", dodaj);
  if (map.isStyleLoaded()) dodaj();

  map.on("click", "zdarzenia", function (e) {
    var p = e.features[0].properties;
    var box = document.createElement("div");
    var info = document.createElement("div");
    info.textContent = (p.kategoria === "polska" ? "Polska" : "Ukraina") +
      " · wzmianki w mediach (24 h): " + (p.ile || "?");
    box.appendChild(info);
    var lista = [];
    try { lista = JSON.parse(p.linki || "[]"); } catch (x) {}
    lista.forEach(function (l) {
      if (!/^https?:\/\//.test(l.u)) return;
      var d = document.createElement("div");
      d.style.margin = "6px 0";
      var a = document.createElement("a");
      a.href = l.u;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = l.t;
      d.appendChild(a);
      box.appendChild(d);
    });
    var uwaga = document.createElement("div");
    uwaga.style.cssText = "font-size:11px;color:#666;margin-top:8px";
    uwaga.textContent = "Dane z mediów (GDELT), lokalizowane automatycznie. " +
      "Mogą być niedokładne i niezweryfikowane.";
    box.appendChild(uwaga);
    window.pokazSzczegoly("Zdarzenia: " + (p.miejsce || "?"), box);
  });
  map.on("mouseenter", "zdarzenia", function () { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", "zdarzenia", function () { map.getCanvas().style.cursor = ""; });

  // Wpis w legendzie z przelacznikiem
  var tresc = document.querySelector("#legenda .p-tresc") || document.getElementById("legenda");
  var blok = document.createElement("div");
  blok.style.marginTop = "8px";
  blok.innerHTML =
    '<label><input type="checkbox" id="zd-przel" checked> Zdarzenia (media, 24 h)</label>' +
    '<div class="leg"><span class="kropka" style="background:#e03131"></span><span>Ukraina</span></div>' +
    '<div class="leg"><span class="kropka" style="background:#1971c2"></span><span>Polska</span></div>';
  tresc.appendChild(blok);
  document.getElementById("zd-przel").addEventListener("change", function () {
    widoczne = this.checked;
    if (map.getLayer("zdarzenia")) {
      map.setLayoutProperty("zdarzenia", "visibility", widoczne ? "visible" : "none");
    }
  });

  function wczytaj() {
    fetch("zdarzenia.geojson?t=" + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (d) {
        dane = d;
        var z = map.getSource("zdarzenia");
        if (z) z.setData(dane);
      })
      .catch(function () {});
  }
  wczytaj();
  setInterval(wczytaj, 10 * 60 * 1000);
})();
