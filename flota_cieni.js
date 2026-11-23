(function () {
  function dodajTrasyFlotyCieni() {
    if (typeof map === "undefined") return;
    if (map.getSource("trasy-floty-cieni")) return;

    map.addSource("trasy-floty-cieni", {
      type: "geojson",
      data: "flota_cieni_trasy.geojson?t=" + Date.now()
    });

    map.addLayer({
      id: "warstwa-trasy-floty-cieni",
      type: "line",
      source: "trasy-floty-cieni",
      paint: {
        "line-color": "#9c36b5",
        "line-width": 2.5,
        "line-dasharray": [2, 2],
        "line-opacity": 0.85
      }
    });
  }

  if (typeof map !== "undefined") {
    if (map.loaded()) dodajTrasyFlotyCieni();
    else map.on("load", dodajTrasyFlotyCieni);
  }
})();
