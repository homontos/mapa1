(function () {
  var widoczne = true;
  var dane = { type: "FeatureCollection", features: [] };

  function dodaj() {
    if (map.getSource("front")) return;
    var przed = map.getLayer("statki-postoj") ? "statki-postoj" : undefined;
    var wid = widoczne ? "visible" : "none";
    map.addSource("front", { type: "geojson", data: dane });
    map.addLayer({ id: "front-fill", type: "fill", source: "front",
      filter: ["==", ["get", "rodzaj"], "okupowane"], layout: { visibility: wid },
      paint: { "fill-color": "#c92a2a", "fill-opacity": 0.18 } }, przed);
    map.addLayer({ id: "front-line", type: "line", source: "front",
      filter: ["==", ["get", "rodzaj"], "granica"], layout: { visibility: wid },
      paint: { "line-color": "#a61e1e", "line-width": 2 } }, przed);
  }
  map.on("style.load", dodaj);
  if (map.isStyleLoaded()) dodaj();

  var tresc = document.querySelector("#legenda .p-tresc") || document.getElementById("legenda");
  var blok = document.createElement("div");
  blok.style.marginTop = "8px";
  blok.innerHTML =
    '<label><input type="checkbox" id="front-przel" checked> Linia frontu (Ukraina)</label>' +
    '<div class="leg"><span class="kropka" style="background:#c92a2a"></span><span>Obszar okupowany</span></div>' +
    '<div id="front-status" style="font-size:11px;color:#555">brak danych</div>' +
    '<div style="font-size:10px;color:#666">Dane: DeepStateMap.live (kopia: cyterat/deepstate-map-data, GPL-3.0). ' +
    'Przybliżone i zwykle spóźnione. Nie do celów operacyjnych.</div>';
  tresc.appendChild(blok);
  document.getElementById("front-przel").addEventListener("change", function () {
    widoczne = this.checked;
    ["front-fill", "front-line"].forEach(function (id) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", widoczne ? "visible" : "none");
    });
  });

  function wczytaj() {
    fetch("front.geojson?t=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        dane = d;
        var z = map.getSource("front");
        if (z) z.setData(dane);
        var wiek = (Date.now() - new Date(d.data + "T00:00:00Z").getTime()) / 86400000;
        document.getElementById("front-status").textContent =
          "Stan z dnia: " + d.data + (wiek > 3 ? " ⚠ dane starsze niż 3 dni" : "");
      })
      .catch(function () {
        document.getElementById("front-status").textContent = "brak danych";
      });
  }
  wczytaj();
  setInterval(wczytaj, 30 * 60 * 1000);
})();
