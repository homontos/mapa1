(function () {
  var tylkoCienie = false;
  var zapisaneFiltry = {};
  var wszystkieTrasy = null;
  var aktywnyZakresH = 72;

  var st = document.createElement("style");
  st.textContent =
    ".cien-popup .maplibregl-popup-content{" +
      "padding:10px!important;background:#13171d!important;color:#f1f3f5!important;" +
      "border-radius:10px!important;width:295px!important;box-sizing:border-box!important;" +
      "border:1.5px solid #fcc419!important;box-shadow:0 8px 24px rgba(0,0,0,0.75)!important;" +
      "font:13px/1.4 system-ui,-apple-system,sans-serif!important" +
    "}" +
    ".cien-popup .maplibregl-popup-tip{border-top-color:#fcc419!important;border-bottom-color:#fcc419!important}" +
    ".cien-popup .maplibregl-popup-close-button{" +
      "top:8px!important;right:8px!important;width:26px!important;height:26px!important;" +
      "background:#1f242d!important;color:#fff!important;border-radius:6px!important;" +
      "font-size:17px!important;line-height:26px!important;z-index:3!important" +
    "}" +
    ".cien-foto{width:100%;height:125px;background:#0d1015;border-radius:6px;overflow:hidden;margin-bottom:8px;display:flex;align-items:center;justify-content:center;color:#5c6470;font-size:11px}" +
    ".cien-foto img{width:100%;height:100%;object-fit:cover;display:block}" +
    ".cien-nazwa{font-size:17px;font-weight:800;color:#fff;letter-spacing:0.4px;padding-right:26px}" +
    ".cien-badge{display:inline-block;background:#f59f00;color:#111;font-weight:700;font-size:11px;padding:2px 9px;border-radius:12px;margin:4px 0 8px}" +
    ".cien-tabela{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px}" +
    ".cien-tabela td{padding:2px 0;vertical-align:top}" +
    ".cien-tabela td:first-child{color:#868e96;width:38%}" +
    ".cien-tabela td:last-child{color:#f1f3f5;font-weight:500}" +
    ".cien-btns{display:flex;gap:6px;margin-bottom:8px}" +
    ".cien-btns button{flex:1;background:#1f242d;color:#ced4da;border:1px solid #343a40;border-radius:6px;padding:5px 4px;font-size:11px;cursor:pointer}" +
    ".cien-btns button.akt-zakres{background:#3b181c;color:#ff8787;border-color:#fa5252;font-weight:bold}" +
    ".cien-sankcje{background:#1b2028;border:1px solid #2c323d;border-radius:6px;padding:6px 8px;font-size:11px;color:#ffd43b}" +
    "@media (max-width:600px){" +
      ".cien-popup{" +
        "position:fixed!important;left:54px!important;bottom:72px!important;" +
        "top:auto!important;right:auto!important;transform:none!important;z-index:12!important" +
      "}" +
      ".cien-popup .maplibregl-popup-tip{display:none!important}" +
      ".cien-popup .maplibregl-popup-content{width:245px!important;max-width:calc(100vw - 66px)!important;padding:8px!important}" +
      ".cien-foto{height:95px!important;margin-bottom:6px!important}" +
      ".cien-nazwa{font-size:15px!important}" +
    "}";
  document.head.appendChild(st);

  var lewa = document.getElementById("lewa");
  var btnCienie = document.createElement("button");
  btnCienie.id = "btn-flota-cieni";
  btnCienie.className = "ikona-menu";
  btnCienie.textContent = "⛴️";
  btnCienie.title = "Tylko Flota Cieni (żółte)";
  btnCienie.setAttribute("aria-label", "Tylko Flota Cieni");
  if (lewa) lewa.appendChild(btnCienie);

  function inicjujWarstweSladu() {
    if (typeof map === "undefined") return;
    if (!map.getSource("cien-wybrany-slad")) {
      map.addSource("cien-wybrany-slad", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
      map.addLayer({
        id: "warstwa-cien-wybrany-slad",
        type: "line",
        source: "cien-wybrany-slad",
        paint: {
          "line-color": "#ffffff",
          "line-width": 2.8,
          "line-opacity": 0.95
        }
      });
    }

    (map.getStyle().layers || []).forEach(function (w) {
      var id = w.id || "";
      var src = w.source || "";
      if ((src.includes("statk") || id.includes("statk")) && (w.type === "circle" || w.type === "symbol")) {
        map.on("click", id, function (e) {
          if (!e.features || !e.features.length) return;
          var it = e.features.values();
          var ft = it.next().value;
          var p = (ft && ft.properties) || {};
          if (p.typ !== "Flota Cieni" && !p.flota_cieni) return;
          otworzKarteFlotyCieni(p, e.lngLat);
        });
      }
    });
  }
  function pobierzTrasy() {
    if (wszystkieTrasy) return Promise.resolve(wszystkieTrasy);
    return fetch("flota_cieni_trasy.geojson?t=" + Math.floor(Date.now() / 60000))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { wszystkieTrasy = d; return d; })
      .catch(function () { return null; });
  }

  function rysujSladStatku(mmsi, godziny, statusEl) {
    var src = map.getSource("cien-wybrany-slad");
    if (!src) return;
    if (!mmsi) {
      src.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    pobierzTrasy().then(function (dane) {
      if (!dane || !dane.features) {
        if (statusEl) statusEl.textContent = "Brak zapisanej historii trasy (zbieranie co 10 min).";
        return;
      }
      var ft = dane.features.find(function (f) {
        return f.properties && String(f.properties.mmsi) === String(mmsi);
      });
      if (!ft || !ft.properties || !ft.properties.punkty) {
        src.setData({ type: "FeatureCollection", features: [] });
        if (statusEl) statusEl.textContent = "Zebrano dopiero 1 punkt pozycji – linia pojawi się po kolejnym cyklu.";
        return;
      }

      var progCzasu = Date.now() - godziny * 3600 * 1000;
      var coords = [];
      ft.properties.punkty.forEach(function (pt) {
        var it = pt.values();
        var pLon = it.next().value;
        var pLat = it.next().value;
        var pTs = it.next().value;
        var ts = Date.parse(pTs);
        if (!isNaN(ts) && ts >= progCzasu) {
          coords.push([pLon, pLat]);
        }
      });

      if (coords.length >= 2) {
        src.setData({
          type: "FeatureCollection",
          features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } }]
        });
        if (statusEl) statusEl.textContent = "Punktów na śladzie (" + godziny + "h): " + coords.length;
      } else {
        src.setData({ type: "FeatureCollection", features: [] });
        if (statusEl) statusEl.textContent = "Za mało punktów w ostatnich " + godziny + "h.";
      }
    });
  }

  function otworzKarteFlotyCieni(p, lngLat) {
    var mmsi = String(p.mmsi || "");
    var imo = String(p.imo || "");
    var nazwa = (p.nazwa || ("MMSI " + mmsi)).trim();

    var box = document.createElement("div");

    var foto = document.createElement("div");
    foto.className = "cien-foto";
    if (imo) {
      var img = document.createElement("img");
      img.src = "https://marinetraffic.com" + encodeURIComponent(imo);
      img.alt = nazwa;
      img.onerror = function () {
        foto.textContent = "Brak zdjęcia jednostki (IMO " + imo + ")";
      };
      foto.appendChild(img);
    } else {
      foto.textContent = "Brak numeru IMO dla zdjęcia";
    }
    box.appendChild(foto);

    var tyt = document.createElement("div");
    tyt.className = "cien-nazwa";
    tyt.textContent = nazwa;
    box.appendChild(tyt);

    var badge = document.createElement("div");
    badge.className = "cien-badge";
    badge.textContent = "Flota Cieni · Sankcje";
    box.appendChild(badge);

    var tab = document.createElement("table");
    tab.className = "cien-tabela";
    var predkosc = p.predkosc != null ? p.predkosc + " w." : "—";
    var kurs = p.kurs != null ? Math.round(p.kurs) + "°" : "—";
    var wiersze = [
      ["IMO / MMSI", (imo ? imo + " / " : "") + mmsi],
      ["Prędkość / Kurs", predkosc + " / " + kurs],
      ["Cel podróży", p.cel || "—"]
    ];
    wiersze.forEach(function (w) {
      var it = w.values();
      var tr = document.createElement("tr");
      var td1 = document.createElement("td");
      td1.textContent = it.next().value;
      var td2 = document.createElement("td");
      td2.textContent = it.next().value;
      tr.appendChild(td1);
      tr.appendChild(td2);
      tab.appendChild(tr);
    });
    box.appendChild(tab);

    var btns = document.createElement("div");
    btns.className = "cien-btns";
    var b24 = document.createElement("button");
    b24.textContent = "Ślad 24 h";
    var b72 = document.createElement("button");
    b72.textContent = "Ślad 72 h";
    b72.className = "akt-zakres";
    btns.appendChild(b24);
    btns.appendChild(b72);
    box.appendChild(btns);

    var statusSladu = document.createElement("div");
    statusSladu.style.cssText = "font-size:10px;color:#868e96;margin-bottom:6px";
    box.appendChild(statusSladu);

    b24.addEventListener("click", function () {
      aktywnyZakresH = 24;
      b24.classList.add("akt-zakres");
      b72.classList.remove("akt-zakres");
      rysujSladStatku(mmsi, 24, statusSladu);
    });
    b72.addEventListener("click", function () {
      aktywnyZakresH = 72;
      b72.classList.add("akt-zakres");
      b24.classList.remove("akt-zakres");
      rysujSladStatku(mmsi, 72, statusSladu);
    });

    var sank = document.createElement("div");
    sank.className = "cien-sankcje";
    sank.textContent = p.sankcje || "Jednostka na liście sankcyjnej OpenSanctions";
    box.appendChild(sank);

    var popup = new maplibregl.Popup({
      maxWidth: "295px",
      className: "cien-popup"
    }).setLngLat(lngLat).setDOMContent(box).addTo(map);

    popup.on("close", function () {
      rysujSladStatku(null);
    });

    rysujSladStatku(mmsi, aktywnyZakresH, statusSladu);
  }

  btnCienie.addEventListener("click", function () {
    if (typeof map === "undefined" || !map.getStyle()) return;
    tylkoCienie = !tylkoCienie;
    btnCienie.classList.toggle("akt", tylkoCienie);

    (map.getStyle().layers || []).forEach(function (w) {
      var id = w.id || "";
      var src = w.source || "";
      if ((src.includes("statk") || id.includes("statk")) && (w.type === "circle" || w.type === "symbol")) {
        if (tylkoCienie) {
          if (!(id in zapisaneFiltry)) zapisaneFiltry[id] = map.getFilter(id) || null;
          map.setFilter(id, ["==", ["get", "typ"], "Flota Cieni"]);
        } else {
          map.setFilter(id, zapisaneFiltry[id] !== undefined ? zapisaneFiltry[id] : null);
        }
      }
    });
  });
function startFlotaCieni() {
  inicjujWarstweSladu();
  setTimeout(inicjujWarstweSladu, 1500);
}

if (typeof map !== "undefined") {
  if (map.loaded()) startFlotaCieni();
  else map.on("load", startFlotaCieni);
}

