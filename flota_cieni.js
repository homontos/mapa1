(function () {
  var TYP = "Flota Cieni";
  var GODZ = 24;                       // ile godzin sladu pokazywac
  var tylkoCienie = false;
  var zapisaneFiltry = {};
  var wszystkieTrasy = undefined;
  var zarejestrowane = {};
  var aktPopup = null;

  var czesci = location.pathname.split("/").filter(Boolean);
  var BAZA = "https://raw.githubusercontent.com/" + location.hostname.split(".")[0] + "/" + (czesci[0] || "");
  var URL_TRAS = ["flota_cieni_trasy.geojson", BAZA + "/dane/flota_cieni_trasy.geojson",
    BAZA + "/dane_flota/flota_cieni_trasy.geojson"];

  var P = "body .cien-popup ";
  var st = document.createElement("style");
  st.textContent =
    "body .cien-popup{max-width:none!important}" +
    P + ".maplibregl-popup-content{padding:10px!important;background:#13171d!important;color:#f1f3f5!important;" +
      "border-radius:10px!important;width:280px!important;max-width:none!important;box-sizing:border-box!important;" +
      "border:1.5px solid #fcc419!important;box-shadow:0 8px 24px rgba(0,0,0,0.75)!important;" +
      "font:13px/1.4 system-ui,-apple-system,sans-serif!important}" +
    "body .maplibregl-popup.cien-popup.maplibregl-popup-anchor-top .maplibregl-popup-tip," +
    "body .maplibregl-popup.cien-popup.maplibregl-popup-anchor-top-left .maplibregl-popup-tip," +
    "body .maplibregl-popup.cien-popup.maplibregl-popup-anchor-top-right .maplibregl-popup-tip{border-bottom-color:#fcc419!important}" +
    "body .maplibregl-popup.cien-popup.maplibregl-popup-anchor-bottom .maplibregl-popup-tip," +
    "body .maplibregl-popup.cien-popup.maplibregl-popup-anchor-bottom-left .maplibregl-popup-tip," +
    "body .maplibregl-popup.cien-popup.maplibregl-popup-anchor-bottom-right .maplibregl-popup-tip{border-top-color:#fcc419!important}" +
    "body .maplibregl-popup.cien-popup.maplibregl-popup-anchor-left .maplibregl-popup-tip{border-right-color:#fcc419!important}" +
    "body .maplibregl-popup.cien-popup.maplibregl-popup-anchor-right .maplibregl-popup-tip{border-left-color:#fcc419!important}" +
    P + ".maplibregl-popup-close-button{top:8px!important;right:8px!important;width:26px!important;height:26px!important;" +
      "background:#1f242d!important;color:#fff!important;border-radius:6px!important;font-size:17px!important;" +
      "line-height:26px!important;z-index:3!important}" +
    P + ".cien-foto{position:relative;width:100%;height:145px;background:#0d1015;border-radius:6px;overflow:hidden;" +
      "margin-bottom:8px;display:flex;align-items:center;justify-content:center;color:#868e96!important;font-size:11px}" +
    P + ".cien-foto img{width:100%;height:100%;object-fit:cover;display:block}" +
    P + ".cien-foto a.cien-zrodlo{position:absolute;right:4px;bottom:3px;font-size:9px;background:rgba(0,0,0,0.6);" +
      "padding:1px 6px;border-radius:4px;color:#ced4da!important;text-decoration:none}" +
    P + ".cien-nazwa{font-size:17px;font-weight:800;color:#fff!important;letter-spacing:0.4px;padding-right:26px}" +
    P + ".cien-badge{display:inline-block;background:#f59f00!important;color:#111!important;font-weight:700;" +
      "font-size:11px;padding:2px 9px;border-radius:12px;margin:4px 0 8px}" +
    P + ".cien-tabela{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px}" +
    P + ".cien-tabela td{padding:2px 0;vertical-align:top}" +
    P + ".cien-tabela td:first-child{color:#868e96!important;width:38%}" +
    P + ".cien-tabela td:last-child{color:#f1f3f5!important;font-weight:500}" +
    P + ".cien-status{font-size:10px;color:#868e96!important;margin-bottom:6px}" +
    P + ".cien-sankcje{background:#1b2028;border:1px solid #2c323d;border-radius:6px;padding:6px 8px;font-size:11px;color:#ffd43b!important}" +
    "@media not all and (min-width:900px) and (hover:hover) and (pointer:fine){" +
      "body .cien-popup{position:fixed!important;left:54px!important;bottom:72px!important;top:auto!important;" +
        "right:auto!important;transform:none!important;z-index:12!important}" +
      P + ".maplibregl-popup-tip{display:none!important}" +
      P + ".maplibregl-popup-content{width:235px!important;max-width:calc(100vw - 66px)!important;padding:8px!important;" +
        "max-height:calc(100vh - 160px);overflow-y:auto}" +
      P + ".cien-foto{height:115px!important;margin-bottom:6px!important}" +
      P + ".cien-nazwa{font-size:15px!important}" +
    "}";
  document.head.appendChild(st);

  // ---------- Pomocnicze ----------
  function jestCien(p) {
    if (!p) return false;
    if (p.typ === TYP) return true;
    var f = p.flota_cieni;
    return !!f && f !== "false" && f !== "0" && f !== 0;
  }
  function warstwyStatkow() {
    var s = map.getStyle();
    return ((s && s.layers) || []).filter(function (w) {
      var id = w.id || "", src = w.source || "";
      return (String(src).indexOf("statk") >= 0 || id.indexOf("statk") >= 0) && (w.type === "circle" || w.type === "symbol");
    }).map(function (w) { return w.id; });
  }
  function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

  var orygPopupStatku = window.pokazPopupStatku;
  window.pokazPopupStatku = function (p) {
    if (jestCien(p)) return;
    if (typeof orygPopupStatku === "function") return orygPopupStatku.apply(this, arguments);
  };

  // ---------- Przycisk filtra ----------
  var lewa = document.getElementById("lewa");
  var btnCienie = document.createElement("button");
  btnCienie.id = "btn-flota-cieni";
  btnCienie.className = "ikona-menu";
  btnCienie.textContent = "⛴️";
  btnCienie.title = "Tylko Flota Cieni (żółte)";
  btnCienie.setAttribute("aria-label", "Tylko Flota Cieni");
  if (lewa) lewa.appendChild(btnCienie);

  function zastosujFiltr() {
    warstwyStatkow().forEach(function (id) {
      if (!(id in zapisaneFiltry)) zapisaneFiltry[id] = map.getFilter(id) || null;
      var orig = zapisaneFiltry[id], cond = ["==", ["get", "typ"], TYP];
      map.setFilter(id, tylkoCienie ? (orig ? ["all", orig, cond] : cond) : orig);
    });
  }
  btnCienie.addEventListener("click", function () {
    if (typeof map === "undefined" || !map.getStyle()) return;
    tylkoCienie = !tylkoCienie;
    btnCienie.classList.toggle("akt", tylkoCienie);
    zastosujFiltr();
  });

  // ---------- Slad (jak przy samolotach: linia przerywana, znika po zamknieciu dymka) ----------
  function dodajSlad() {
    if (map.getSource("cien-wybrany-slad")) return;
    map.addSource("cien-wybrany-slad", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "warstwa-cien-wybrany-slad", type: "line", source: "cien-wybrany-slad",
      paint: { "line-color": "#fcc419", "line-width": 2.2, "line-opacity": 0.9, "line-dasharray": [2, 1.5] } });
  }
  function pobierzTrasy() {
    if (wszystkieTrasy !== undefined) return Promise.resolve(wszystkieTrasy);
    function proba(i) {
      if (i >= URL_TRAS.length) { wszystkieTrasy = null; return null; }
      return fetch(URL_TRAS[i] + (URL_TRAS[i].indexOf("?") < 0 ? "?t=" + Math.floor(Date.now() / 60000) : ""))
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (d) { wszystkieTrasy = d; return d; })
        .catch(function () { return proba(i + 1); });
    }
    return Promise.resolve(proba(0));
  }
  function czas(v) {
    if (v === undefined || v === null || v === "") return null;
    if (typeof v === "number") return v > 1e12 ? v : (v > 1e9 ? v * 1000 : null);
    var s = String(v).trim();
    if (/^\d+(\.\d+)?$/.test(s)) return czas(+s);
    var t = Date.parse(s.replace(" ", "T"));
    return isNaN(t) ? null : t;
  }
  function znajdz(dane, mmsi, imo) {
    var lista = dane.features || (Array.isArray(dane) ? dane : null);
    if (lista) {
      return lista.filter(function (f) {
        var p = (f && f.properties) || f || {};
        return String(p.mmsi || p.MMSI || p.id || "") === mmsi || (imo && String(p.imo || p.IMO || "") === imo);
      })[0] || null;
    }
    return dane[mmsi] ? { properties: { punkty: dane[mmsi] } } : null;
  }
  function punkty(ft) {
    var p = ft.properties || ft, out = [];
    var pk = p.punkty || p.points || p.track || p.trasa || p.historia || p.positions;
    if (typeof pk === "string") { try { pk = JSON.parse(pk); } catch (e) { pk = null; } }
    if (Array.isArray(pk)) {
      pk.forEach(function (pt) {
        var lon, lat, t;
        if (Array.isArray(pt)) { lon = +pt[0]; lat = +pt[1]; t = czas(pt[2]); }
        else if (pt && typeof pt === "object") {
          lon = +(pt.lon !== undefined ? pt.lon : (pt.lng !== undefined ? pt.lng : pt.x));
          lat = +(pt.lat !== undefined ? pt.lat : pt.y);
          t = czas(pt.ts !== undefined ? pt.ts : (pt.t !== undefined ? pt.t : (pt.time !== undefined ? pt.time : pt.czas)));
        }
        if (isFinite(lon) && isFinite(lat)) out.push({ lon: lon, lat: lat, t: t });
      });
    }
    var g = ft.geometry;
    if (!out.length && g && (g.type === "LineString" || g.type === "MultiLineString")) {
      var c = g.type === "MultiLineString" ? [].concat.apply([], g.coordinates) : g.coordinates;
      c.forEach(function (q) { out.push({ lon: +q[0], lat: +q[1], t: czas(q[2]) }); });
    }
    return out;
  }
  function pustySlad() {
    var s = map.getSource("cien-wybrany-slad");
    if (s) s.setData({ type: "FeatureCollection", features: [] });
  }
  function rysujSlad(mmsi, imo, statusEl) {
    var src = map.getSource("cien-wybrany-slad");
    if (!src) return;
    pobierzTrasy().then(function (dane) {
      if (aktPopup === null) return;
      if (!dane) { statusEl.textContent = "Nie znaleziono pliku tras (flota_cieni_trasy.geojson)."; return; }
      var ft = znajdz(dane, mmsi, imo);
      var ile = (dane.features || (Array.isArray(dane) ? dane : Object.keys(dane))).length;
      if (!ft) { statusEl.textContent = "Brak tego statku w pliku tras (statków w pliku: " + ile + ")."; pustySlad(); return; }
      var pkt = punkty(ft);
      if (pkt.every(function (x) { return x.t !== null; })) pkt.sort(function (a, b) { return a.t - b.t; });
      var prog = Date.now() - GODZ * 3600 * 1000;
      var mamyCzas = pkt.some(function (x) { return x.t !== null; });
      var okno = mamyCzas ? pkt.filter(function (x) { return x.t !== null && x.t >= prog; }) : pkt;
      var uwaga = "";
      if (mamyCzas && okno.length < 2 && pkt.length >= 2) { okno = pkt; uwaga = " (starsze niż " + GODZ + " h)"; }
      if (okno.length < 2) { statusEl.textContent = "Za mało punktów śladu (" + okno.length + ")."; pustySlad(); return; }
      src.setData({ type: "FeatureCollection", features: [{ type: "Feature", properties: {},
        geometry: { type: "LineString", coordinates: okno.map(function (x) { return [x.lon, x.lat]; }) } }] });
      statusEl.textContent = "Ślad: " + okno.length + " punktów" + (mamyCzas ? " z ostatnich " + GODZ + " h" : "") + uwaga + ".";
    });
  }

  // ---------- Zdjecie: pole "foto" w danych, w drugiej kolejnosci Wikimedia Commons ----------
  function wstawFoto(foto, src, tytul, strona) {
    var img = document.createElement("img");
    img.alt = tytul || "Zdjęcie jednostki";
    img.referrerPolicy = "no-referrer";
    img.onload = function () {
      foto.textContent = "";
      foto.appendChild(img);
      if (strona && /^https:\/\//.test(strona)) {
        var a = document.createElement("a");
        a.className = "cien-zrodlo";
        a.href = strona; a.target = "_blank"; a.rel = "noopener";
        a.textContent = "Wikimedia Commons";
        foto.appendChild(a);
      }
    };
    img.onerror = function () { foto.textContent = "Brak zdjęcia jednostki w bazie"; };
    img.src = src;
  }
  function szukajFoto(imo, nazwa, foto) {
    var nn = norm(nazwa), zap = [];
    if (nn.length >= 4) zap.push(nazwa + " ship");
    if (/^\d{7}$/.test(imo) && nn.length >= 4) zap.push("IMO " + imo + " " + nazwa);
    (function proba(i) {
      if (i >= zap.length) { foto.textContent = "Brak zdjęcia jednostki w bazie"; return; }
      fetch("https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search" +
        "&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|mime&iiurlwidth=640&gsrsearch=" + encodeURIComponent(zap[i]))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var s3 = (d.query && d.query.pages) || {};
          var tr = Object.keys(s3).map(function (k) { return s3[k]; }).sort(function (a, b) {
            return (a.index || 99) - (b.index || 99);
          }).filter(function (s) {
            var ii = s.imageinfo && s.imageinfo[0];
            return ii && (ii.mime === "image/jpeg" || ii.mime === "image/png") && ii.thumburl &&
              ii.thumburl.indexOf("https://") === 0 && norm(s.title).indexOf(nn) >= 0;
          });
          if (!tr.length) { proba(i + 1); return; }
          var ii = tr[0].imageinfo[0];
          wstawFoto(foto, ii.thumburl, tr[0].title, ii.descriptionurl);
        })
        .catch(function () { proba(i + 1); });
    })(0);
  }

  // ---------- Karta statku floty cieni ----------
  function otworz(p, lngLat) {
    if (aktPopup) { try { aktPopup.remove(); } catch (e) {} aktPopup = null; }
    var mmsi = String(p.mmsi || ""), imo = String(p.imo || "");
    if (imo === "0") imo = "";
    var nazwa = String(p.nazwa || ("MMSI " + mmsi)).trim();

    var box = document.createElement("div");
    var foto = document.createElement("div");
    foto.className = "cien-foto";
    foto.textContent = "Ładowanie zdjęcia…";
    box.appendChild(foto);
    if (p.foto && /^https:\/\//.test(p.foto)) wstawFoto(foto, p.foto, nazwa, "");
    else szukajFoto(imo, nazwa, foto);

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
    var predkosc = p.predkosc != null && p.predkosc !== "" ? p.predkosc + " w." : "—";
    var kurs = p.kurs != null && p.kurs !== "" ? Math.round(p.kurs) + "°" : "—";
    [["IMO / MMSI", (imo ? imo + " / " : "") + mmsi], ["Prędkość / Kurs", predkosc + " / " + kurs],
     ["Cel podróży", p.cel || "—"]].forEach(function (w) {
      var tr = document.createElement("tr");
      var td1 = document.createElement("td"), td2 = document.createElement("td");
      td1.textContent = w[0];
      td2.textContent = w[1];
      tr.appendChild(td1); tr.appendChild(td2);
      tab.appendChild(tr);
    });
    box.appendChild(tab);

    var status = document.createElement("div");
    status.className = "cien-status";
    status.textContent = "Ładowanie śladu…";
    box.appendChild(status);

    var sank = document.createElement("div");
    sank.className = "cien-sankcje";
    sank.textContent = p.sankcje || "Jednostka na liście sankcyjnej OpenSanctions";
    box.appendChild(sank);

    var popup = new maplibregl.Popup({ maxWidth: "none", className: "cien-popup", offset: 14 })
      .setLngLat(lngLat).setDOMContent(box).addTo(map);
    aktPopup = popup;
    popup.on("close", function () {
      if (aktPopup === popup) aktPopup = null;
      pustySlad();
    });
    rysujSlad(mmsi, imo, status);
  }

  // ---------- Klikniecia (rejestrowane tylko raz na warstwe) ----------
  function rejestrujKlik() {
    warstwyStatkow().forEach(function (id) {
      if (zarejestrowane[id]) return;
      zarejestrowane[id] = true;
      map.on("click", id, function (e) {
        var ft = (e.features || []).filter(function (f) { return jestCien(f.properties); })[0];
        if (ft) otworz(ft.properties || {}, e.lngLat);
      });
      map.on("mouseenter", id, function () { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", id, function () { map.getCanvas().style.cursor = ""; });
    });
  }

  function start() {
    dodajSlad();
    rejestrujKlik();
    if (tylkoCienie) zastosujFiltr();
  }
  if (typeof map !== "undefined") {
    map.on("style.load", start);
    if (map.isStyleLoaded()) start();
    else map.once("load", start);
    setTimeout(start, 1500);
  }
})();
