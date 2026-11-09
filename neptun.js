(function () {
  var URL_API = "https://neptun.in.ua/api/v1/threats";
  var widoczne = true;
  var dane = { type: "FeatureCollection", features: [] };
  var TYPY = {
    uav: ["Dron (BpLA / Shahed)", "#e8590c"],
    recon: ["Dron rozpoznawczy", "#868e96"],
    missile: ["Rakieta", "#e03131"],
    ballistic: ["Rakieta balistyczna", "#a61e4d"],
    kab: ["Bomba kierowana (KAB)", "#7048e8"],
    mig31k: ["MiG-31K", "#1971c2"],
    unknown: ["Obiekt nierozpoznany", "#495057"]
  };
  var KOLOR = ["match", ["get", "type"]];
  Object.keys(TYPY).forEach(function (k) { KOLOR.push(k, TYPY[k][1]); });
  KOLOR.push("#495057");
  var KRYCIE = ["case", ["==", ["get", "przygaszony"], 1], 0.45, 1];

  function strzalka() {
    var c = document.createElement("canvas");
    c.width = 64; c.height = 64;
    var x = c.getContext("2d");
    x.fillStyle = "#fff";
    x.beginPath();
    x.moveTo(32, 4); x.lineTo(54, 58); x.lineTo(32, 46); x.lineTo(10, 58);
    x.closePath(); x.fill();
    return x.getImageData(0, 0, 64, 64);
  }

  function dodaj() {
    if (!map.hasImage("dron-strzalka")) map.addImage("dron-strzalka", strzalka(), { sdf: true });
    if (map.getSource("neptun")) return;
    map.addSource("neptun", { type: "geojson", data: dane });
    var wid = widoczne ? "visible" : "none";
    map.addLayer({
      id: "neptun-punkt", type: "circle", source: "neptun",
      filter: ["!=", ["typeof", ["get", "heading"]], "number"],
      layout: { visibility: wid },
      paint: {
        "circle-radius": 7, "circle-color": KOLOR, "circle-opacity": KRYCIE,
        "circle-stroke-width": 1.5, "circle-stroke-color": "#ffffff"
      }
    });
    map.addLayer({
      id: "neptun-ruch", type: "symbol", source: "neptun",
      filter: ["==", ["typeof", ["get", "heading"]], "number"],
      layout: {
        visibility: wid, "icon-image": "dron-strzalka", "icon-size": 0.5,
        "icon-rotate": ["get", "heading"], "icon-rotation-alignment": "map",
        "icon-allow-overlap": true, "icon-ignore-placement": true
      },
      paint: {
        "icon-color": KOLOR, "icon-opacity": KRYCIE,
        "icon-halo-color": "#ffffff", "icon-halo-width": 1
      }
    });
  }
  map.on("style.load", dodaj);
  if (map.isStyleLoaded()) dodaj();

  function temu(iso) {
    var m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    return isNaN(m) ? null : (m < 1 ? "przed chwilą" : m + " min temu");
  }
  var POW = { low: "niska", medium: "średnia", high: "wysoka" };

  function pokaz(e) {
    var p = e.features[0].properties;
    var box = document.createElement("div");
    function wiersz(t) {
      var d = document.createElement("div");
      d.style.margin = "4px 0";
      d.textContent = t;
      box.appendChild(d);
    }
    var typ = TYPY[p.type] || TYPY.unknown;
    wiersz("Typ: " + typ[0]);
    var miejsce = [p.locality, p.district, p.region].filter(function (x) { return x; }).join(", ");
    if (miejsce) wiersz("Miejsce: " + miejsce);
    if (p.count > 0) wiersz("Liczba obiektów: " + p.count);
    if (p.heading !== undefined && p.heading !== null && p.heading !== "") wiersz("Kurs: " + Math.round(p.heading) + "°");
    if (p.speed) wiersz("Prędkość: ok. " + Math.round(p.speed) + " km/h");
    wiersz("Pewność: " + (POW[p.confidence] || "nieznana") +
      (p.sources ? " (źródeł: " + p.sources + ")" : ""));
    if (p.quality === "approx" || p.uncertainty > 0) {
      wiersz("Pozycja przybliżona" + (p.uncertainty > 0 ? " (±" + p.uncertainty + " km)" : ""));
    }
    if (p.title) wiersz("Opis źródła: " + p.title + (p.opis ? " – " + p.opis : ""));
    var t = temu(p.updatedAt);
    if (t) wiersz("Aktualizacja: " + t);
    if (p.advisory == 1) wiersz("To obserwacja, a nie sygnał do schronienia się.");
    var u = document.createElement("div");
    u.style.cssText = "font-size:11px;color:#666;margin-top:8px";
    u.appendChild(document.createTextNode(
      "Nieoficjalny agregator doniesień. Pozycje są szacunkowe i bywają spóźnione. " +
      "Nie zastępuje syren ani oficjalnych alarmów. Dane: "));
    var a = document.createElement("a");
    a.href = "https://neptun.in.ua/"; a.target = "_blank"; a.rel = "noopener";
    a.textContent = "NEPTUN";
    u.appendChild(a);
    box.appendChild(u);
    window.pokazSzczegoly(typ[0] + (miejsce ? " – " + (p.locality || p.region) : ""), box);
  }
  ["neptun-punkt", "neptun-ruch"].forEach(function (id) {
    map.on("click", id, pokaz);
    map.on("mouseenter", id, function () { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", id, function () { map.getCanvas().style.cursor = ""; });
  });

  // Wpis w legendzie
  var tresc = document.querySelector("#legenda .p-tresc") || document.getElementById("legenda");
  var blok = document.createElement("div");
  blok.style.marginTop = "8px";
  var html = '<label><input type="checkbox" id="neptun-przel" checked> Drony i rakiety (NEPTUN)</label>';
  Object.keys(TYPY).forEach(function (k) {
    html += '<div class="leg"><span class="kropka" style="background:' + TYPY[k][1] +
      '"></span><span>' + TYPY[k][0] + '</span></div>';
  });
  html += '<div id="neptun-status" style="font-size:11px;color:#555">brak danych</div>' +
    '<div style="font-size:10px;color:#666">Dane: <a href="https://neptun.in.ua/" ' +
    'target="_blank" rel="noopener">NEPTUN – карта повітряних тривог</a>. ' +
    'Nieoficjalne, szacunkowe. Nie zastępuje syren.</div>';
  blok.innerHTML = html;
  tresc.appendChild(blok);
  document.getElementById("neptun-przel").addEventListener("change", function () {
    widoczne = this.checked;
    ["neptun-punkt", "neptun-ruch"].forEach(function (id) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", widoczne ? "visible" : "none");
    });
  });

  function odswiez() {
    if (document.hidden) return;
    fetch(URL_API)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var cechy = [], bezPunktu = 0;
        (d.threats || []).forEach(function (t) {
          if (t.status === "resolved") return;
          if (t.areaOnly) { bezPunktu++; return; }
          if (typeof t.lat !== "number" || typeof t.lon !== "number") return;
          var v = t.velocity || {};
          cechy.push({
            type: "Feature",
            properties: {
              id: t.id, type: t.type || "unknown", title: t.title || "",
              opis: t.explanationShort || "", region: t.region || "",
              district: t.district || "", locality: t.locality || "",
              heading: typeof t.heading === "number" ? t.heading : undefined,
              confidence: t.confidenceLevel || "", sources: t.sourceCount || 0,
              count: t.count || 0, updatedAt: t.updatedAt,
              speed: v.speedKmh || 0, uncertainty: t.uncertaintyKm || 0,
              quality: t.positionQuality || "",
              advisory: t.advisory ? 1 : 0,
              przygaszony: (t.advisory || t.status === "stale") ? 1 : 0
            },
            geometry: { type: "Point", coordinates: [t.lon, t.lat] }
          });
        });
        dane = { type: "FeatureCollection", features: cechy };
        var z = map.getSource("neptun");
        if (z) z.setData(dane);
        var godz = new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
        document.getElementById("neptun-status").textContent =
          "Obiektów na mapie: " + cechy.length +
          (bezPunktu ? " (+" + bezPunktu + " bez dokładnej pozycji)" : "") +
          " · stan z " + godz;
      })
      .catch(function () {
        document.getElementById("neptun-status").textContent = "brak połączenia z NEPTUN";
      });
  }
  odswiez();
  setInterval(odswiez, 15000);
})();
