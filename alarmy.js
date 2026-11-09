(function () {
  var API = "https://neptun.in.ua/api/v1/alerts";
  var GEO_OBL = "https://neptun.in.ua/oblasts.geojson";
  var GEO_RAI = "https://neptun.in.ua/raions.geojson";
  var widoczne = true;
  var poligony = { type: "FeatureCollection", features: [] };
  var kola = { type: "FeatureCollection", features: [] };
  var geoObl = null, geoRai = null, ostatni = null;
  var KOLOR = ["case", ["==", ["get", "caly"], 1], "#e03131", "#f08c00"];

  // nazwa ukrainska -> [polska, szer, dl] (plan B, gdy brak granic)
  var CENTR = {
    "Вінницька область": ["Winnicki", 49.23, 28.47], "Волинська область": ["Wołyński", 50.75, 25.34],
    "Дніпропетровська область": ["Dniepropetrowski", 48.46, 35.05], "Донецька область": ["Doniecki", 48.0, 37.8],
    "Житомирська область": ["Żytomierski", 50.25, 28.66], "Закарпатська область": ["Zakarpacki", 48.62, 22.3],
    "Запорізька область": ["Zaporoski", 47.84, 35.14], "Івано-Франківська область": ["Iwanofrankiwski", 48.92, 24.71],
    "Київська область": ["Kijowski", 50.2, 30.5], "м. Київ": ["Kijów", 50.45, 30.52],
    "Кіровоградська область": ["Kirowohradzki", 48.51, 32.26], "Луганська область": ["Ługański", 48.57, 39.31],
    "Львівська область": ["Lwowski", 49.84, 24.03], "Миколаївська область": ["Mikołajowski", 46.97, 31.99],
    "Одеська область": ["Odeski", 46.48, 30.73], "Полтавська область": ["Połtawski", 49.59, 34.55],
    "Рівненська область": ["Rówieński", 50.62, 26.25], "Сумська область": ["Sumski", 50.91, 34.8],
    "Тернопільська область": ["Tarnopolski", 49.55, 25.59], "Харківська область": ["Charkowski", 49.99, 36.23],
    "Херсонська область": ["Chersoński", 46.64, 32.62], "Хмельницька область": ["Chmielnicki", 49.42, 26.98],
    "Черкаська область": ["Czerkaski", 49.44, 32.06], "Чернівецька область": ["Czerniowiecki", 48.29, 25.94],
    "Чернігівська область": ["Czernihowski", 51.49, 31.29], "Автономна Республіка Крим": ["Krym", 45.0, 34.1],
    "м. Севастополь": ["Sewastopol", 44.62, 33.52]
  };
  function norm(n) {
    n = (n || "").trim();
    if (n === "АР Крим") return "Автономна Республіка Крим";
    if (n === "Київ" || n === "місто Київ") return "м. Київ";
    if (n === "Севастополь") return "м. Севастополь";
    if (CENTR[n]) return n;
    if (CENTR[n + " область"]) return n + " область";
    return n;
  }

  function dodaj() {
    if (map.getSource("alarmy-poly")) return;
    var przed = map.getLayer("statki-postoj") ? "statki-postoj" : undefined;
    var wid = widoczne ? "visible" : "none";
    map.addSource("alarmy-poly", { type: "geojson", data: poligony });
    map.addSource("alarmy-kola", { type: "geojson", data: kola });
    map.addLayer({ id: "alarmy-fill", type: "fill", source: "alarmy-poly",
      layout: { visibility: wid },
      paint: { "fill-color": KOLOR, "fill-opacity": 0.3 } }, przed);
    map.addLayer({ id: "alarmy-line", type: "line", source: "alarmy-poly",
      layout: { visibility: wid },
      paint: { "line-color": KOLOR, "line-width": 1.5 } }, przed);
    map.addLayer({ id: "alarmy-kolo", type: "circle", source: "alarmy-kola",
      layout: { visibility: wid },
      paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 14, 8, 40],
        "circle-color": KOLOR, "circle-opacity": 0.35,
        "circle-stroke-width": 2, "circle-stroke-color": KOLOR } }, przed);
  }
  map.on("style.load", dodaj);
  if (map.isStyleLoaded()) dodaj();

  function pokaz(e) {
    var p = e.features[0].properties;
    var box = document.createElement("div");
    function wiersz(t) {
      var d = document.createElement("div");
      d.style.margin = "4px 0";
      d.textContent = t;
      box.appendChild(d);
    }
    wiersz("Alarm powietrzny: " + (p.caly == 1 ? "cały obwód" : "wybrane rejony i gminy"));
    if (p.nazwa) wiersz("Obszar: " + p.nazwa);
    if (p.obwod) wiersz("Obwód: " + p.obwod);
    if (p.od) wiersz("Od: " + new Date(p.od).toLocaleString("pl-PL"));
    var u = document.createElement("div");
    u.style.cssText = "font-size:11px;color:#666;margin-top:8px";
    u.appendChild(document.createTextNode(
      "Nieoficjalny agregator, dane mogą być spóźnione. Nie zastępuje syren. Dane: "));
    var a = document.createElement("a");
    a.href = "https://neptun.in.ua/"; a.target = "_blank"; a.rel = "noopener";
    a.textContent = "NEPTUN";
    u.appendChild(a);
    box.appendChild(u);
    window.pokazSzczegoly("Alarm: " + (p.obwod || p.nazwa || "?"), box);
  }
  ["alarmy-fill", "alarmy-kolo"].forEach(function (id) {
    map.on("click", id, pokaz);
    map.on("mouseenter", id, function () { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", id, function () { map.getCanvas().style.cursor = ""; });
  });

  // Legenda
  var tresc = document.querySelector("#legenda .p-tresc") || document.getElementById("legenda");
  var blok = document.createElement("div");
  blok.style.marginTop = "8px";
  blok.innerHTML =
    '<label><input type="checkbox" id="alarm-przel" checked> Alarmy lotnicze (Ukraina)</label>' +
    '<div class="leg"><span class="kropka" style="background:#e03131"></span><span>Cały obwód</span></div>' +
    '<div class="leg"><span class="kropka" style="background:#f08c00"></span><span>Wybrane rejony i gminy</span></div>' +
    '<div id="alarm-status" style="font-size:11px;color:#555">brak danych</div>' +
    '<div style="font-size:10px;color:#666">Dane: <a href="https://neptun.in.ua/" target="_blank" ' +
    'rel="noopener">NEPTUN</a> · nieoficjalne, nie zastępuje syren</div>';
  tresc.appendChild(blok);
  document.getElementById("alarm-przel").addEventListener("change", function () {
    widoczne = this.checked;
    ["alarmy-fill", "alarmy-line", "alarmy-kolo"].forEach(function (id) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", widoczne ? "visible" : "none");
    });
  });

  function dopasuj(f, zbior) {
    var p = f.properties || {};
    var kand = [p.key, p.id, p.code, p.slug, f.id];
    for (var i = 0; i < kand.length; i++) {
      if (kand[i] !== undefined && kand[i] !== null && zbior[String(kand[i])]) return String(kand[i]);
    }
    return null;
  }
  function swieze(x) {
    var t = new Date(x.since).getTime();
    return isNaN(t) || (Date.now() - t) < 14 * 86400000;   // starsze niz 2 tyg. = stale/nominalne
  }

  function przelicz(d) {
    var obl = {}, rai = {};
    (d.oblasts || []).filter(swieze).forEach(function (x) { obl[x.key] = x; });
    (d.raions || []).filter(swieze).forEach(function (x) { rai[x.key] = x; });
    var cechy = [];
    if (geoObl) geoObl.features.forEach(function (f) {
      var k = dopasuj(f, obl);
      if (k) cechy.push({ type: "Feature", geometry: f.geometry,
        properties: { caly: 1, nazwa: obl[k].name, obwod: obl[k].name, od: obl[k].since } });
    });
    if (geoRai) geoRai.features.forEach(function (f) {
      var k = dopasuj(f, rai);
      if (k) cechy.push({ type: "Feature", geometry: f.geometry,
        properties: { caly: 0, nazwa: rai[k].name, obwod: rai[k].oblast, od: rai[k].since } });
    });
    poligony = { type: "FeatureCollection", features: cechy };

    var kolaF = [];
    if (!cechy.length) {   // plan B: kolka w srodku obwodow
      var wid = {};
      Object.keys(obl).forEach(function (k) {
        var n = norm(obl[k].oblast || obl[k].name);
        wid[n] = { caly: 1, od: obl[k].since };
      });
      Object.keys(rai).forEach(function (k) {
        var n = norm(rai[k].oblast);
        if (!wid[n]) wid[n] = { caly: 0, od: rai[k].since };
      });
      Object.keys(wid).forEach(function (n) {
        if (!CENTR[n]) return;
        kolaF.push({ type: "Feature",
          geometry: { type: "Point", coordinates: [CENTR[n][2], CENTR[n][1]] },
          properties: { caly: wid[n].caly, obwod: CENTR[n][0], nazwa: n, od: wid[n].od } });
      });
    }
    kola = { type: "FeatureCollection", features: kolaF };
    var a = map.getSource("alarmy-poly"), b = map.getSource("alarmy-kola");
    if (a) a.setData(poligony);
    if (b) b.setData(kola);
    var godz = new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
    var ile = Object.keys(obl).length + Object.keys(rai).length;
    document.getElementById("alarm-status").textContent =
      "Obszarów z alarmem: " + ile + " (" + (cechy.length ? "granice" : "kółka") +
      ") · stan z " + godz;
  }

  function odswiez() {
    if (document.hidden) return;
    fetch(API)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { ostatni = d; przelicz(d); })
      .catch(function () {
        document.getElementById("alarm-status").textContent = "brak połączenia z NEPTUN";
      });
  }

  function wczytajGranice(url, ustaw) {
    return fetch(url).then(function (r) { return r.json(); }).then(ustaw).catch(function () {});
  }
  Promise.all([
    wczytajGranice(GEO_OBL, function (g) { geoObl = g; }),
    wczytajGranice(GEO_RAI, function (g) { geoRai = g; })
  ]).then(function () {
    odswiez();
    setInterval(odswiez, 30000);
  });
})();
