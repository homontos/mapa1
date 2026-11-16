(function () {
  // Wklej tu klucz z developer.tomtom.com:
  var KLUCZ = "KGJrFz6I7mnOIQpzp1arM6dFmCnHaEhl";
  var TROJMIASTO = [18.2, 54.2, 18.95, 54.8];     // ladujemy kafelki tylko stad
  var widoczne = true;

  var tresc = document.querySelector("#legenda .p-tresc") || document.getElementById("legenda");
  var blok = document.createElement("div");
  blok.style.marginTop = "8px";
  blok.innerHTML =
    '<label><input type="checkbox" id="korki-przel" checked> Korki – Trójmiasto (TomTom)</label>' +
    '<div class="leg"><span class="kropka" style="background:#2f9e44"></span><span>Płynnie</span></div>' +
    '<div class="leg"><span class="kropka" style="background:#f08c00"></span><span>Wolno</span></div>' +
    '<div class="leg"><span class="kropka" style="background:#e03131"></span><span>Korek</span></div>' +
    '<div class="leg"><span class="kropka" style="background:#8b0000"></span><span>Stoi</span></div>' +
    '<div id="korki-status" style="font-size:11px;color:#555"></div>' +
    '<a href="#" id="korki-leć" style="font-size:12px">Pokaż Trójmiasto</a>' +
    '<div style="font-size:10px;color:#666">Dane o ruchu: © TomTom. Widoczne od przybliżenia na miasto.</div>';
  tresc.appendChild(blok);
  var status = document.getElementById("korki-status");
  status.textContent = KLUCZ ? "Przybliż mapę na Trójmiasto." : "Wklej klucz TomTom w pliku korki.js.";

  document.getElementById("korki-leć").addEventListener("click", function (e) {
    e.preventDefault();
    map.flyTo({ center: [18.6, 54.45], zoom: 6.3 });
  });

  function dodaj() {
    if (!KLUCZ || map.getSource("korki")) return;
    var k = encodeURIComponent(KLUCZ);
    map.addSource("korki", {
      type: "vector",
      tiles: ["a", "b", "c", "d"].map(function (h) {
        return "https://" + h + ".api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.pbf?key=" + k;
      }),
      minzoom: 0, maxzoom: 22, bounds: TROJMIASTO, attribution: "© TomTom"
    });
    map.addLayer({
      id: "korki", type: "line", source: "korki", "source-layer": "Traffic flow",
      minzoom: 6.3,
      layout: { visibility: widoczne ? "visible" : "none", "line-cap": "round" },
      paint: {
        "line-color": ["step", ["to-number", ["get", "traffic_level"], 1],
          "#8b0000", 0.25, "#e03131", 0.5, "#f08c00", 0.75, "#2f9e44"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1.5, 14, 5],
        "line-opacity": 0.85
      }
    }, map.getLayer("statki-postoj") ? "statki-postoj" : undefined);
  }
  map.on("style.load", dodaj);
  if (map.isStyleLoaded()) dodaj();

  map.on("error", function (e) {
    if (e && e.sourceId === "korki") status.textContent = "Błąd pobierania danych o ruchu (sprawdź klucz).";
  });
  document.getElementById("korki-przel").addEventListener("change", function () {
    widoczne = this.checked;
    if (map.getLayer("korki")) {
      map.setLayoutProperty("korki", "visibility", widoczne ? "visible" : "none");
    }
  });
})();
