(function () {
  var tryb = null, biezace = [], kolor = "#e03131";
  var rysunki = { type: "FeatureCollection", features: [] };
  var podglad = { type: "FeatureCollection", features: [] };
  var etykiety = [], historia = [];

  var st = document.createElement("style");
  st.textContent =
    "body.narzedzie .maplibregl-popup,body.narzedzie #szczegoly{display:none!important}" +
    "#narzedzia button{padding:8px 4px;font-size:13px}" +
    "#narzedzia .siatka{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:6px}" +
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
    '<button id="nar-koniec">✔ Zakończ rysunek</button><button id="nar-cofnij">↩ Cofnij</button>' +
    '<button id="nar-wyczysc">🗑 Wyczyść</button><button id="nar-zrzut">📷 Zrzut JPEG</button></div>' +
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

  function etykieta(lng, lat, tekst, k) {
    var el = document.createElement("div");
    el.className = "nar-etykieta";
    el.style.borderColor = k;
    el.textContent = tekst;
    var m = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    var e = { lng: lng, lat: lat, tekst: tekst, kolor: k, marker: m };
    etykiety.push(e);
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

  function ustawTryb(t) {
    tryb = (tryb === t) ? null : t;
    biezace = [];
    podgladOdswiez();
    tr.querySelectorAll("[data-t]").forEach(function (b) {
      b.classList.toggle("akt", b.getAttribute("data-t") === tryb);
    });
    document.body.classList.toggle("narzedzie", !!tryb);
    map.getCanvas().style.cursor = tryb ? "crosshair" : "";
    var op = { miarka: "Dotykaj kolejnych punktów na mapie, potem „Zakończ rysunek”.",
      linia: "Dotykaj kolejnych punktów linii, potem „Zakończ rysunek”.",
      obszar: "Dotykaj narożników obszaru (min. 3), potem „Zakończ rysunek”.",
      tekst: "Dotknij miejsca na mapie i wpisz tekst." };
    podp.textContent = tryb ? op[tryb] : "Wybierz narzędzie.";
  }
  tr.querySelectorAll("[data-t]").forEach(function (b) {
    b.addEventListener("click", function () { ustawTryb(b.getAttribute("data-t")); });
  });

  map.on("click", function (e) {
    if (!tryb) return;
    var p = [e.lngLat.lng, e.lngLat.lat];
    if (tryb === "tekst") {
      var t = window.prompt("Wpisz tekst:");
      if (t && t.trim()) {
        var et = etykieta(p[0], p[1], t.trim(), kolor);
        historia.push({ etykieta: et });
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
    if (!tryb || tryb === "tekst") return;
    var wpis = {};
    if (tryb === "obszar" && biezace.length >= 3) {
      var pierscien = biezace.concat([biezace[0]]);
      wpis.cecha = { type: "Feature", properties: { kolor: kolor },
        geometry: { type: "Polygon", coordinates: [pierscien] } };
    } else if (tryb !== "obszar" && biezace.length >= 2) {
      var k = tryb === "miarka" ? "#0b7285" : kolor;
      wpis.cecha = { type: "Feature", properties: { kolor: k },
        geometry: { type: "LineString", coordinates: biezace } };
      if (tryb === "miarka") {
        var ost = biezace[biezace.length - 1];
        wpis.etykieta = etykieta(ost[0], ost[1], opisOdl(dlugosc(biezace)), "#0b7285");
      }
    } else {
      podp.textContent = "Za mało punktów.";
      return;
    }
    rysunki.features.push(wpis.cecha);
    historia.push(wpis);
    biezace = [];
    podgladOdswiez();
  });

  tr.querySelector("#nar-cofnij").addEventListener("click", function () {
    var w = historia.pop();
    if (!w) return;
    if (w.cecha) {
      var i = rysunki.features.indexOf(w.cecha);
      if (i >= 0) rysunki.features.splice(i, 1);
    }
    if (w.etykieta) {
      w.etykieta.marker.remove();
      var j = etykiety.indexOf(w.etykieta);
      if (j >= 0) etykiety.splice(j, 1);
    }
    odswiez();
  });

  tr.querySelector("#nar-wyczysc").addEventListener("click", function () {
    if (!window.confirm("Usunąć wszystkie rysunki, pomiary i teksty?")) return;
    rysunki = { type: "FeatureCollection", features: [] };
    etykiety.forEach(function (e) { e.marker.remove(); });
    etykiety = []; historia = []; biezace = [];
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

  tr.querySelector("#nar-zrzut").addEventListener("click", function () {
    podp.textContent = "Robię zrzut…";
    map.once("render", function () {
      var c = map.getCanvas();
      var out = document.createElement("canvas");
      out.width = c.width; out.height = c.height;
      var x = out.getContext("2d");
      x.fillStyle = "#ffffff";
      x.fillRect(0, 0, out.width, out.height);
      x.drawImage(c, 0, 0);
      var ratio = c.width / c.clientWidth;
      x.font = "bold " + Math.round(13 * ratio) + "px sans-serif";
      x.textBaseline = "middle";
      etykiety.forEach(function (e) {
        var p = map.project([e.lng, e.lat]);
        var px = p.x * ratio, py = p.y * ratio;
        var w = x.measureText(e.tekst).width + 10 * ratio, h = 20 * ratio;
        x.fillStyle = "rgba(255,255,255,0.92)";
        x.fillRect(px - w / 2, py - h / 2, w, h);
        x.lineWidth = 2 * ratio; x.strokeStyle = e.kolor;
        x.strokeRect(px - w / 2, py - h / 2, w, h);
        x.fillStyle = "#111"; x.textAlign = "center";
        x.fillText(e.tekst, px, py);
      });
      var stopka = "Zrzut mapy · " + new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
      var hs = 22 * ratio;
      x.fillStyle = "rgba(0,0,0,0.65)";
      x.fillRect(0, out.height - hs, out.width, hs);
      x.fillStyle = "#fff"; x.textAlign = "left";
      x.fillText(stopka, 8 * ratio, out.height - hs / 2);
      out.toBlob(function (blob) {
        if (!blob) { podp.textContent = "Nie udało się zrobić zrzutu."; return; }
        var nazwa = "mapa_" + new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-") + ".jpg";
        var plik = new File([blob], nazwa, { type: "image/jpeg" });
        podp.textContent = "Zrzut gotowy.";
        if (navigator.canShare && navigator.canShare({ files: [plik] })) {
          navigator.share({ files: [plik], title: "Zrzut mapy" }).catch(function (err) {
            if (err && err.name !== "AbortError") pobierz(blob, nazwa);
          });
        } else {
          pobierz(blob, nazwa);
        }
      }, "image/jpeg", 0.92);
    });
    map.triggerRepaint();
  });
})();
