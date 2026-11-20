(function () {
  var API = "https://neptun.in.ua/api/v1/threats";
  var PROMIEN_KM = 100;
  var czesci = location.pathname.split("/").filter(Boolean);
  var BAZA = "https://raw.githubusercontent.com/" + location.hostname.split(".")[0] + "/" +
    (czesci[0] || "") + "/dane/";
  var POLSKA = [[14.12,53.93],[16.0,54.55],[17.5,54.9],[18.5,54.95],[19.6,54.55],
    [19.9,54.4],[20.4,54.38],[22.8,54.38],[23.5,54.2],[23.55,53.9],[23.95,52.75],
    [23.6,52.1],[23.55,51.55],[24.05,50.85],[23.5,50.4],[22.7,49.6],[22.85,49.05],
    [22.1,49.2],[21.6,49.4],[20.3,49.35],[19.5,49.2],[18.9,49.5],[18.5,49.9],
    [17.7,50.3],[16.9,50.4],[16.2,50.7],[15.0,51.0],[14.75,51.05],[14.7,52.0],
    [14.55,52.6],[14.15,52.9],[14.2,53.5]];
  var NAZWY = { uav: "Dron", recon: "Dron rozpoznawczy", missile: "Rakieta",
    ballistic: "Rakieta balistyczna", kab: "Bomba kierowana KAB", mig31k: "MiG-31K", unknown: "Obiekt" };

  var st = document.createElement("style");
  st.textContent =
    "#granica-odz{flex:none;display:flex;align-items:center;justify-content:center;" +
    "width:30px;font:18px/1 sans-serif;cursor:pointer;color:#adb5bd;user-select:none}" +
    "#granica-odz.luzem{position:fixed;right:10px;bottom:70px;z-index:6;width:34px;height:34px;" +
    "background:#111;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)}";
  document.head.appendChild(st);

  var odznaka = document.createElement("div");
  odznaka.id = "granica-odz";
  odznaka.textContent = "●";
  odznaka.title = "Granica Polski: ładowanie…";
  var pasek = document.getElementById("pasek"), utc = document.getElementById("pasek-utc");
  if (pasek && utc) pasek.insertBefore(odznaka, utc.nextSibling);
  else { odznaka.className = "luzem"; document.body.appendChild(odznaka); }

  function wPolsce(lon, lat) {
    var w = false;
    for (var i = 0, j = POLSKA.length - 1; i < POLSKA.length; j = i++) {
      var xi = POLSKA[i][0], yi = POLSKA[i][1], xj = POLSKA[j][0], yj = POLSKA[j][1];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) w = !w;
    }
    return w;
  }
  function dystans(lon, lat) {
    if (wPolsce(lon, lat)) return 0;
    var kx = 111.32 * Math.cos(lat * Math.PI / 180), ky = 110.57, min = Infinity;
    for (var i = 0, j = POLSKA.length - 1; i < POLSKA.length; j = i++) {
      var ax = (POLSKA[j][0] - lon) * kx, ay = (POLSKA[j][1] - lat) * ky;
      var bx = (POLSKA[i][0] - lon) * kx, by = (POLSKA[i][1] - lat) * ky;
      var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      var t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
      var px = ax + t * dx, py = ay + t * dy, d = Math.sqrt(px * px + py * py);
      if (d < min) min = d;
    }
    return min;
  }

  var lista = [], lacznie = 0, godz = "";

  function ikona(znak, kolor, opis) {
    odznaka.textContent = znak;
    odznaka.style.color = kolor;
    odznaka.title = opis;
  }
  function pokazOdznake() {
    if (!lista.length) {
      ikona("●", "#51cf66", "Brak obiektów w promieniu " + PROMIEN_KM + " km od granicy Polski");
      return;
    }
    var n = lista[0];
    ikona("▲", n.km < 50 ? "#ff6b6b" : "#ff922b",
      (n.km === 0 ? "Obiekt nad Polską" : "Najbliższy obiekt: " + Math.round(n.km) + " km od granicy") +
      " (obiektów: " + lista.length + ")");
  }

  function data(t) {
    return new Date(t * 1000).toLocaleString("pl-PL",
      { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
  function hhmm(t) { return new Date(t * 1000).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }); }

  // ---------- Archiwum z historii ----------
  function statystyki(h) {
    var teraz = Date.now() / 1000, od = teraz - 24 * 3600, pkt = [], obj = {};
    (h.snapshoty || []).forEach(function (s) {
      if (s.t < od || s.bn) return;
      var ile = 0, minkm = Infinity;
      (s.n || []).forEach(function (r) {
        if (r[7]) return;
        var km = dystans(r[3], r[2]);
        if (km > PROMIEN_KM) return;
        ile += r[6] > 0 ? r[6] : 1;
        if (km < minkm) minkm = km;
        var k = r[0] || (r[1] + Math.round(r[2] * 10) + "_" + Math.round(r[3] * 10));
        var o = obj[k];
        if (!o) o = obj[k] = { typ: r[1], pierwszy: s.t, minkm: km, tmin: s.t, lat: r[2], lon: r[3] };
        if (km < o.minkm) { o.minkm = km; o.tmin = s.t; o.lat = r[2]; o.lon = r[3]; }
      });
      pkt.push({ t: s.t, ile: ile, km: minkm });
    });
    return { pkt: pkt, obj: Object.keys(obj).map(function (k) { return obj[k]; }), od: od, teraz: teraz };
  }

  function wykres(st) {
    var W = 300, H = 112, L = 24, R = 296, top = 10, bot = 86;
    var maxY = Math.max(3, Math.max.apply(null, st.pkt.map(function (p) { return p.ile; }).concat([0])));
    function X(t) { return L + (t - st.od) / (st.teraz - st.od) * (R - L); }
    function Y(v) { return bot - v / maxY * (bot - top); }
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" style="display:block">';
    [0, maxY / 2, maxY].forEach(function (g) {
      s += '<line x1="' + L + '" y1="' + Y(g).toFixed(1) + '" x2="' + R + '" y2="' + Y(g).toFixed(1) +
        '" stroke="#ccc" stroke-width="0.7"/><text x="' + (L - 3) + '" y="' + (Y(g) + 3).toFixed(1) +
        '" font-size="8" fill="#555" text-anchor="end">' + (Math.round(g * 10) / 10) + '</text>';
    });
    var d = new Date(st.od * 1000); d.setMinutes(0, 0, 0);
    for (var t = d.getTime() / 1000; t <= st.teraz; t += 3600) {
      if (t < st.od || new Date(t * 1000).getHours() % 3) continue;
      s += '<line x1="' + X(t).toFixed(1) + '" y1="' + top + '" x2="' + X(t).toFixed(1) + '" y2="' + bot +
        '" stroke="#ddd" stroke-width="0.6"/><text x="' + X(t).toFixed(1) + '" y="' + (bot + 11) +
        '" font-size="8" fill="#555" text-anchor="middle">' + hhmm(t) + '</text>';
    }
    var bw = Math.max(1.6, (R - L) / Math.max(1, st.pkt.length) * 0.8);
    st.pkt.forEach(function (p) {
      if (p.ile <= 0) return;
      s += '<rect x="' + (X(p.t) - bw / 2).toFixed(1) + '" y="' + Y(p.ile).toFixed(1) + '" width="' + bw.toFixed(1) +
        '" height="' + (bot - Y(p.ile)).toFixed(1) + '" fill="' + (p.km < 50 ? "#e03131" : "#f08c00") + '"/>';
    });
    return s + "</svg>";
  }

  function archiwum(kontener) {
    kontener.textContent = "Ładowanie archiwum…";
    fetch(BAZA + "historia_ruchu.json?t=" + Math.floor(Date.now() / 60000))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (h) {
        var st = statystyki(h);
        kontener.textContent = "";
        var tytul = document.createElement("div");
        tytul.style.cssText = "font-weight:bold;margin:8px 0 2px";
        tytul.textContent = "Archiwum: ostatnie 24 godziny (promień " + PROMIEN_KM + " km)";
        kontener.appendChild(tytul);
        if (!st.pkt.length) { kontener.appendChild(document.createTextNode("Brak zapisów w historii.")); return; }
        var w = document.createElement("div");
        w.innerHTML = wykres(st);
        kontener.appendChild(w);
        var naj = st.pkt.reduce(function (a, p) { return p.ile > a.ile ? p : a; }, st.pkt[0]);
        var blisko = st.pkt.reduce(function (a, p) { return p.km < a.km ? p : a; }, st.pkt[0]);
        var op = document.createElement("div");
        op.style.cssText = "font-size:12px;color:#444;margin:2px 0 6px";
        op.textContent = "Najwięcej naraz: " + naj.ile + " (" + data(naj.t) + "). " +
          (isFinite(blisko.km) ? "Najbliżej: " + (blisko.km === 0 ? "nad Polską" : Math.round(blisko.km) + " km od granicy") +
            " (" + data(blisko.t) + "). " : "") +
          "Unikalnych obiektów w strefie: " + st.obj.length + ". Zapisów: " + st.pkt.length + ".";
        kontener.appendChild(op);
        st.obj.sort(function (a, b) { return b.pierwszy - a.pierwszy; }).slice(0, 15).forEach(function (o) {
          var r = document.createElement("div");
          r.style.cssText = "margin:4px 0;padding-left:6px;border-left:3px solid " +
            (o.minkm < 50 ? "#e03131" : "#f08c00") + ";cursor:pointer;font-size:13px";
          r.textContent = data(o.pierwszy) + " · " + (NAZWY[o.typ] || NAZWY.unknown) + " · najbliżej " +
            (o.minkm === 0 ? "nad Polską" : Math.round(o.minkm) + " km od granicy") + " (" + data(o.tmin) +
            ", " + o.lat.toFixed(2) + "°N, " + o.lon.toFixed(2) + "°E)";
          r.addEventListener("click", function () { map.flyTo({ center: [o.lon, o.lat], zoom: Math.max(map.getZoom(), 7) }); });
          kontener.appendChild(r);
        });
      })
      .catch(function () { kontener.textContent = "Brak archiwum (sprawdź automat „Historia ruchu”)."; });
  }

  odznaka.addEventListener("click", function () {
    var box = document.createElement("div");
    function wiersz(t, styl) {
      var d = document.createElement("div");
      d.style.margin = "4px 0";
      if (styl) d.style.cssText += styl;
      d.textContent = t;
      box.appendChild(d);
    }
    wiersz("Teraz: obiektów w NEPTUN z dokładną pozycją: " + lacznie + (godz ? " (stan z " + godz + ")" : "") +
      ". W promieniu " + PROMIEN_KM + " km od granicy Polski: " + lista.length + ".");
    lista.slice(0, 6).forEach(function (x) {
      var t = x.t, gdzie = t.locality || t.district || t.region || "";
      wiersz("• " + (NAZWY[t.type] || NAZWY.unknown) + " – " +
        (x.km === 0 ? "nad Polską" : Math.round(x.km) + " km od granicy") + (gdzie ? " (" + gdzie + ")" : ""));
    });
    var kont = document.createElement("div");
    box.appendChild(kont);
    wiersz("Nieoficjalne, szacunkowe pozycje z NEPTUN. Granica Polski jest uproszczona (błąd rzędu kilkudziesięciu km). " +
      "Nie zastępuje Alertu RCB, syren ani komunikatów służb.", "font-size:11px;color:#666;margin-top:8px");
    if (window.pokazSzczegoly) window.pokazSzczegoly("Blisko granicy Polski", box);
    archiwum(kont);
    if (lista.length) map.flyTo({ center: [lista[0].t.lon, lista[0].t.lat], zoom: Math.max(map.getZoom(), 7) });
  });

  function odswiez() {
    if (document.hidden) return;
    fetch(API)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var nowa = [];
        lacznie = 0;
        (d.threats || []).forEach(function (t) {
          if (t.status === "resolved" || t.areaOnly) return;
          if (typeof t.lat !== "number" || typeof t.lon !== "number") return;
          lacznie++;
          if (t.status === "stale" || t.advisory) return;
          var km = dystans(t.lon, t.lat);
          if (km <= PROMIEN_KM) nowa.push({ t: t, km: km });
        });
        nowa.sort(function (a, b) { return a.km - b.km; });
        lista = nowa;
        godz = new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
        pokazOdznake();
      })
      .catch(function () { ikona("●", "#adb5bd", "Brak danych z NEPTUN"); });
  }
  odswiez();
  setInterval(odswiez, 30000);
})();