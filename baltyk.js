(function () {
  var ZOOM_OD = 6.3;
  var OBSZAR = [9.0, 53.0, 31.0, 66.5];      // zachod, poludnie, wschod, polnoc
  var widoczne = true;

  function dodaj() {
    if (map.getSource("baltyk-granice")) return;
    var przed = map.getLayer("statki-postoj") ? "statki-postoj" : undefined;
    var wid = widoczne ? "visible" : "none";
    map.addSource("baltyk-granice", { type: "geojson", data: "wybrzeze_baltyk.geojson" });
    map.addLayer({
      id: "baltyk-granice", type: "line", source: "baltyk-granice", minzoom: ZOOM_OD,
      layout: { visibility: wid },
      paint: { "line-color": "#8e9aaf", "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.8, 10, 1.6],
        "line-opacity": 0.9 }
    }, przed);
    map.addSource("baltyk-morskie", {
      type: "raster", tiles: ["https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"],
      tileSize: 256, minzoom: 5, maxzoom: 18, bounds: OBSZAR,
      attribution: "© OpenSeaMap contributors"
    });
    map.addLayer({
      id: "baltyk-morskie", type: "raster", source: "baltyk-morskie", minzoom: ZOOM_OD,
      layout: { visibility: wid }, paint: { "raster-opacity": 0.9 }
    }, przed);
  }
  map.on("style.load", dodaj);
  if (map.isStyleLoaded()) dodaj();

  var tresc = document.querySelector("#legenda .p-tresc") || document.getElementById("legenda");
  var blok = document.createElement("div");
  blok.style.marginTop = "8px";
  blok.innerHTML =
    '<label><input type="checkbox" id="baltyk-przel" checked> Bałtyk: granice i tory wodne (od przybliżenia ' +
    ZOOM_OD + ')</label>' +
    '<div id="baltyk-status" style="font-size:11px;color:#555"></div>' +
    '<div style="font-size:10px;color:#666">Tory wodne i oznakowanie: © OpenSeaMap contributors. ' +
    'Granice i brzegi: Natural Earth.</div>';
  tresc.appendChild(blok);
  var status = document.getElementById("baltyk-status");
  function pokaz() {
    var z = map.getZoom();
    status.textContent = z >= ZOOM_OD ? "Widoczne (przybliżenie " + z.toFixed(1) + ")."
      : "Przybliż mapę (teraz " + z.toFixed(1) + ", od " + ZOOM_OD + ").";
  }
  map.on("zoom", pokaz);
  pokaz();
  document.getElementById("baltyk-przel").addEventListener("change", function () {
    widoczne = this.checked;
    ["baltyk-granice", "baltyk-morskie"].forEach(function (id) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", widoczne ? "visible" : "none");
    });
  });
})();
