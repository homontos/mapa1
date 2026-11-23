(function () {
  let tylkoCienie = false;
  const zapisaneFiltry = {};

  // 1. Dodanie przycisku ⛴️ do lewego menu (#lewa)
  const lewa = document.getElementById("lewa");
  const btnCienie = document.createElement("button");
  btnCienie.id = "btn-flota-cieni";
  btnCienie.className = "ikona-menu";
  btnCienie.textContent = "⛴️";
  btnCienie.title = "Tylko Flota Cieni i ślady tras";
  btnCienie.setAttribute("aria-label", "Tylko Flota Cieni");

  if (lewa) {
    lewa.appendChild(btnCienie);
  } else {
    btnCienie.style.cssText = "position:fixed;bottom:90px;left:10px;z-index:15;";
    document.body.appendChild(btnCienie);
  }

  // 2. Warstwa linii tras z pliku flota_cieni_trasy.geojson
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
        "line-width": 3,
        "line-dasharray":,
        "line-opacity": 0.9
      }
    });

    // Dymek po kliknieciu w fioletowa linie trasy
    map.on("click", "warstwa-trasy-floty-cieni", function (e) {
      if (!e.features || !e.features.length) return;
      const p = e.features[0].properties || {};
      const html = `
        <div style="font-family:sans-serif;font-size:12px;color:#222;max-width:240px;">
          <div style="font-weight:bold;color:#862e9c;margin-bottom:4px;">⛴️ ${p.nazwa || p.mmsi}</div>
          <div><b>MMSI:</b> ${p.mmsi || "–"}</div>
          ${p.cel ? `<div><b>Cel:</b> ${p.cel}</div>` : ""}
          <div style="margin-top:4px;color:#555;">${p.sankcje || "Flota Cieni"}</div>
        </div>
      `;
      new maplibregl.Popup({ offset: 10 }).setLngLat(e.lngLat).setHTML(html).addTo(map);
    });

    map.on("mouseenter", "warstwa-trasy-floty-cieni", function () {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "warstwa-trasy-floty-cieni", function () {
      map.getCanvas().style.cursor = "";
    });
  }

  // 3. Przelaczanie widocznosci tylko dla Floty Cieni
  function przelaczFiltrFlotyCieni() {
    if (typeof map === "undefined" || !map.getStyle()) return;

    tylkoCienie = !tylkoCienie;
    btnCienie.classList.toggle("akt", tylkoCienie);

    const warstwy = map.getStyle().layers || [];
    warstwy.forEach(function (w) {
      const id = w.id || "";
      const src = w.source || "";
      // Szukamy wszystkich warstw statkow (po nazwie zrodla lub warstwy)
      if ((src.includes("statk") || id.includes("statk")) && (w.type === "circle" || w.type === "symbol")) {
        if (tylkoCienie) {
          if (!(id in zapisaneFiltry)) {
            zapisaneFiltry[id] = map.getFilter(id) || null;
          }
          map.setFilter(id, ["==", ["get", "typ"], "Flota Cieni"]);
        } else {
          map.setFilter(id, zapisaneFiltry[id] !== undefined ? zapisaneFiltry[id] : null);
        }
      }
    });

    // Wzmocnienie linii tras, gdy tryb Floty Cieni jest aktywny
    if (map.getLayer("warstwa-trasy-floty-cieni")) {
      map.setPaintProperty("warstwa-trasy-floty-cieni", "line-width", tylkoCienie ? 4 : 2.5);
      map.setPaintProperty("warstwa-trasy-floty-cieni", "line-opacity", tylkoCienie ? 1 : 0.75);
    }
  }

  btnCienie.addEventListener("click", przelaczFiltrFlotyCieni);

  if (typeof map !== "undefined") {
    if (map.loaded()) dodajTrasyFlotyCieni();
    else map.on("load", dodajTrasyFlotyCieni);
  }
})();
  // 4. Obnizenie progu przyblizenia statkow z 6.3 na 4.8 (widac caly Baltyk)
  function obnizMinZoomStatkow() {
    if (typeof map === "undefined" || !map.getStyle()) return;
    (map.getStyle().layers || []).forEach(function (w) {
      const id = w.id || "";
      const src = w.source || "";
      if (src.includes("statk") || id.includes("statk")) {
        map.setLayerZoomRange(id, 4.8, 24);
      }
    });
  }

  if (typeof map !== "undefined") {
    if (map.loaded()) obnizMinZoomStatkow();
    else map.on("load", obnizMinZoomStatkow);
  }
