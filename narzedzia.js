(function () {
  var tryb = null, biezace = [], kolor = "#e03131", licznik = 0;
  var rysunki = { type: "FeatureCollection", features: [] };
  var podglad = { type: "FeatureCollection", features: [] };
  var wpisy = [];

  var st = document.createElement("style");
  st.textContent =
    "body.narzedzie .maplibregl-popup,body.narzedzie #szczegoly{display:none!important}" +
    "#narzedzia button{padding:8px 4px;font-size:13px}" +
    "#narzedzia .siatka{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:6px}" +
    "#narzedzia .szeroki{grid-column:span 2}" +
    "#narzedzia button.akt{background:#d0ebff;border:1px solid #1c7ed6;font-weight:bold}" +
    ".nar-kolor{width:26px;height:26px;border-radius:50%;border:2px solid #fff;" +
    "box-shadow:0 0 0 1px #999;padding:0!important}" +
    ".nar-kolor.akt{box-shadow:0 0 0 3px #1c7ed6!important}" +
    ".nar-etykieta{background:rgba(255,255,255,0.92);border:2px solid;border-radius:4px;" +
    "padding:1px 5px;font:bold 12px sans-serif;color:#111;white-space:nowrap}";
  document.head.appendChild(st);

  // ---------- Panel ----------
  var lewa = document.getElementById("lewa");
  var panel = document.createElement("div");
  panel.id = "narzedzia";
  panel.className = "panel p-zwiniety";
  var nag = document.createElement("div");
  nag.className = "p-nag";
  nag.innerHTML = "<span>Narzędzia (miarka, rysunki, zrzut)</span><button>+</button>";
  var tr = document.createElement("div");
  tr.className = "p-tresc";
  tr.innerHTML =
    '<div class="siatka">' +
    '<button data-t="miarka">📏 Miarka</button><button data-t="linia">✏️ Linia</button>' +
    '<button data-t="obszar">⬠ Obszar</button><button data-t="tekst">🔤 Tekst</button>' +
    '<button data-t="gumka" class="szeroki">🧽 Gumka (dotknij, aby usunąć)</button>' +
    '<button id="nar-koniec">✔ Zakończ rysunek</button><button id="nar-cofnij">↩ Cofnij</button>' +
    '<button id="nar-wyczysc">🗑 Wyczyść wszystko</button><button id="nar-zrzut">📷 Zrzut JPEG</button></div>' +
    '<div id="nar-kolory" style="display:flex;gap:8px;margin:6px 0"></div>' +
    '<div id="nar-podp" style="font-size:12px;color:#444">Wybierz narzędzie.</div>';
  panel.appendChild(nag);
  panel.appendChild(tr);
  nag.addEventListener("click", function () {
    var z = panel.classList.toggle("p-zwiniety");
    nag.querySelector("button").textContent = z ? "+" : "–";
  });
  if (lewa) lewa.appendChild(panel);
  var podp = tr.querySelector("#nar-podp");

  ["#e03131", "#1c7ed6", "#2f9e44", "#111111"].forEach(function (k, i) {
    var b = document.createElement("button");
    b.className = "nar-kolor" + (i === 0 ? " akt" : "");
    b.style.background = k;
    b.addEventListener("click", function () {
      kolor = k;
      tr.querySelectorAll(".nar-kolor").forEach(function (x) { x.classList.remove("akt"); });
      b.classList.add("akt");
      podgladOdswiez();
    });
    tr.querySelector("#nar-kolory").appendChild(b);
  });

  // ---------- Warstwy ----------
  function dodaj() {
    if (map.getSource("rysunki")) return;
    map.addSource("rysunki", { type: "geojson", data: rysunki });
    map.addSource("rys-podglad", { type: "geojson", data: podglad });
    map.addLayer({ id: "rys-obszar", type: "fill", source: "rysunki",
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: { "fill-color": ["get", "kolor"], "fill-opacity": 0.2 } });
    map.addLayer({ id: "rys-linia", type: "line", source: "rysunki",
      paint: { "line-color": ["get", "kolor"], "line-width": 3 } });
    map.addLayer({ id: "rys-podglad-l", type: "line", source: "rys-podglad",
      filter: ["==", ["geometry-type"], "LineString"],
      paint: { "line-color": ["get", "kolor"], "line-width": 3, "line-dasharray": [2, 2] } });
    map.addLayer({ id: "rys-podglad-p", type: "circle", source: "rys-podglad",
      filter: ["==", ["geometry-type"], "Point"],
      paint: { "circle-radius": 5, "circle-color": ["get", "kolor"],
        "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });
  }
  map.on("style.load", dodaj);
  if (map.isStyleLoaded()) dodaj();

  function odswiez() {
    var a = map.getSource("rysunki"), b = map.getSource("rys-podglad");
    if (a) a.setData(rysunki);
    if (b) b.setData(podglad);
  }

  // ---------- Pomocnicze ----------
  function odl(a, b) {
    var R = 6371.0088, r = Math.PI / 180;
    var dLat = (b[1] - a[1]) * r, dLng = (b[0] - a[0]) * r;
    var h = Math.pow(Math.sin(dLat / 2), 2) +
      Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.pow(Math.sin(dLng / 2), 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function dlugosc(p) {
    var s = 0;
    for (var i = 1; i < p.length; i++) s += odl(p[i - 1], p[i]);
    return s;
  }
  function f1(x) { return x.toFixed(1).replace(".", ","); }
  function opisOdl(km) { return f1(km) + " km (" + f1(km / 1.852) + " mil morskich)"; }

  function usun(w) {
    if (w.cecha) {
      var i = rysunki.features.indexOf(w.cecha);
      if (i >= 0) rysunki.features.splice(i, 1);
    }
    if (w.etykieta) w.etykieta.marker.remove();
    var j = wpisy.indexOf(w);
    if (j >= 0) wpisy.splice(j, 1);
    odswiez();
  }

  function etykieta(lng, lat, tekst, k, wpis) {
    var el = document.createElement("div");
    el.className = "nar-etykieta";
    el.style.borderColor = k;
    el.textContent = tekst;
    var e = { lng: lng, lat: lat, tekst: tekst, kolor: k, wpis: wpis };
    e.marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    el.addEventListener("click", function (ev) {
      if (tryb === "gumka") {
        ev.stopPropagation();
        usun(wpis);
        podp.textContent = "Usunięto.";
      }
    });
    return e;
  }

  function podgladOdswiez() {
    var c = [];
    if (biezace.length > 1) {
      c.push({ type: "Feature", properties: { kolor: kolor },
        geometry: { type: "LineString", coordinates: biezace } });
    }
    biezace.forEach(function (p) {
      c.push({ type: "Feature", properties: { kolor: kolor },
        geometry: { type: "Point", coordinates: p } });
    });
    podglad = { type: "FeatureCollection", features: c };
    odswiez();
  }

  // Zatwierdza rysowany obiekt. Zwraca true, jesli cos zapisano.
  function zatwierdz() {
    var wpis = { uid: ++licznik };
    if (tryb === "obszar" && biezace.length >= 3) {
      wpis.cecha = { type: "Feature", properties: { kolor: kolor, uid: wpis.uid },
        geometry: { type: "Polygon", coordinates: [biezace.concat([biezace[0]])] } };
    } else if ((tryb === "linia" || tryb === "miarka") && biezace.length >= 2) {
      var k = tryb === "miarka" ? "#0b7285" : kolor;
      wpis.cecha = { type: "Feature", properties: { kolor: k, uid: wpis.uid },
        geometry: { type: "LineString", coordinates: biezace } };
      if (tryb === "miarka") {
        var ost = biezace[biezace.length - 1];
        wpis.etykieta = etykieta(ost[0], ost[1], opisOdl(dlugosc(biezace)), "#0b7285", wpis);
      }
    } else {
      return false;
    }
    rysunki.features.push(wpis.cecha);
    wpisy.push(wpis);
    biezace = [];
    podgladOdswiez();
    return true;
  }

  var OPISY = {
    miarka: "Dotykaj kolejnych punktów na mapie. Zmiana narzędzia zatwierdza pomiar.",
    linia: "Dotykaj kolejnych punktów linii. Zmiana narzędzia zatwierdza linię.",
    obszar: "Dotykaj narożników obszaru (min. 3). Zmiana narzędzia zatwierdza obszar.",
    tekst: "Dotknij miejsca na mapie i wpisz tekst.",
    gumka: "Dotknij linii, obszaru lub napisu, aby go usunąć."
  };

  function ustawTryb(t) {
    zatwierdz();                    // zachowaj to, co jest rysowane
    biezace = [];
    tryb = (tryb === t) ? null : t;
    podgladOdswiez();
    tr.querySelectorAll("[data-t]").forEach(function (b) {
      b.classList.toggle("akt", b.getAttribute("data-t") === tryb);
    });
    document.body.classList.toggle("narzedzie", !!tryb);
    map.getCanvas().style.cursor = tryb ? "crosshair" : "";
    podp.textContent = tryb ? OPISY[tryb] : "Wybierz narzędzie.";
  }
  tr.querySelectorAll("[data-t]").forEach(function (b) {
    b.addEventListener("click", function () { ustawTryb(b.getAttribute("data-t")); });
  });

  map.on("click", function (e) {
    if (!tryb) return;
    if (tryb === "gumka") {
      var r = 14;
      var warstwy = ["rys-linia", "rys-obszar"].filter(function (id) { return map.getLayer(id); });
      var obj = map.queryRenderedFeatures(
        [[e.point.x - r, e.point.y - r], [e.point.x + r, e.point.y + r]], { layers: warstwy });
      if (obj.length) {
        var id = obj[0].properties.uid;
        var w = wpisy.filter(function (x) { return x.uid == id; })[0];
        if (w) { usun(w); podp.textContent = "Usunięto."; return; }
      }
      podp.textContent = "Nic tu nie ma. Dotknij linii, obszaru lub napisu.";
      return;
    }
    var p = [e.lngLat.lng, e.lngLat.lat];
    if (tryb === "tekst") {
      var t = window.prompt("Wpisz tekst:");
      if (t && t.trim()) {
        var wpis = { uid: ++licznik };
        wpis.etykieta = etykieta(p[0], p[1], t.trim(), kolor, wpis);
        wpisy.push(wpis);
      }
      return;
    }
    biezace.push(p);
    podgladOdswiez();
    if (tryb === "miarka" && biezace.length > 1) {
      podp.textContent = "Dystans: " + opisOdl(dlugosc(biezace));
    }
  });

  tr.querySelector("#nar-koniec").addEventListener("click", function () {
    if (!zatwierdz()) podp.textContent = "Za mało punktów albo wybierz narzędzie rysowania.";
    else podp.textContent = "Zapisano. Możesz rysować dalej.";
  });

  tr.querySelector("#nar-cofnij").addEventListener("click", function () {
    if (biezace.length) { biezace.pop(); podgladOdswiez(); return; }
    var w = wpisy[wpisy.length - 1];
    if (w) usun(w);
  });

  tr.querySelector("#nar-wyczysc").addEventListener("click", function () {
    if (!window.confirm("Usunąć wszystkie rysunki, pomiary i teksty?")) return;
    wpisy.slice().forEach(usun);
    biezace = [];
    podgladOdswiez();
  });

  // ---------- Zrzut JPEG ----------
  function pobierz(blob, nazwa) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nazwa;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  tr.querySelector("#nar-zrzut").addEventListe
