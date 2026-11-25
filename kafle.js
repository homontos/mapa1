(function () {
  var SZER = 280;      // szerokosc panelu kafli na komputerze (px)
  var WYS = 100;       // wysokosc jednego rzedu kafli na komputerze (px)
  var ROT = 25;        // co ile sekund zmienia sie region w wiadomosciach
  var czesci = location.pathname.split("/").filter(Boolean);
  var BAZA = "https://raw.githubusercontent.com/" + location.hostname.split(".")[0] + "/" +
    (czesci[0] || "") + "/dane/";
  var TLO = "rgba(224,227,231,0.93)";
  var IKONY = { rakieta: "🚀", dron: "🛸", starcie: "💥", marynarka: "⚓", alarm: "⚠️", inne: "📍" };
  var REG = ["Europa Wschodnia", "Bliski Wschód", "Azja i Pacyfik", "Afryka", "Ameryki"];
  var KOL_OST = { 1: "#f2c200", 2: "#f08c00", 3: "#e03131" };
  var DNI = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];
  var POLSKA = [[14.12,53.93],[16.0,54.55],[17.5,54.9],[18.5,54.95],[19.6,54.55],
    [19.9,54.4],[20.4,54.38],[22.8,54.38],[23.5,54.2],[23.55,53.9],[23.95,52.75],
    [23.6,52.1],[23.55,51.55],[24.05,50.85],[23.5,50.4],[22.7,49.6],[22.85,49.05],
    [22.1,49.2],[21.6,49.4],[20.3,49.35],[19.5,49.2],[18.9,49.5],[18.5,49.9],
    [17.7,50.3],[16.9,50.4],[16.2,50.7],[15.0,51.0],[14.75,51.05],[14.7,52.0],
    [14.55,52.6],[14.15,52.9],[14.2,53.5]];
  var lewa = document.getElementById("lewa");
  if (!lewa) return;

  var MQ = window.matchMedia ? window.matchMedia("(min-width: 900px) and (hover: hover) and (pointer: fine)") : null;
  function DOCK() { return !!(MQ && MQ.matches); }

  var st = document.createElement("style");
  st.textContent =
    "#kafle{position:fixed;z-index:5;display:none;top:calc(env(safe-area-inset-top,0px) + 8px);" +
    "left:50px;right:6px;bottom:62px;grid-template-columns:1fr 1fr;" +
    "grid-template-rows:repeat(6,minmax(0,1fr));gap:6px}" +
    "#kafle.dock{left:auto;right:8px;top:8px;bottom:auto;width:" + SZER + "px;" +
    "max-height:calc(100vh - 70px);grid-template-rows:none;grid-auto-rows:" + WYS + "px;gap:10px;" +
    "overflow-y:auto;align-content:start;pointer-events:none;scrollbar-width:none}" +
    "#kafle.dock .kafel{pointer-events:auto}" +
    "body.kafle-dock .maplibregl-ctrl-top-right{right:" + (SZER + 8) + "px}" +
    "body.kafle-dock #gora-panel{right:" + (SZER + 24) + "px!important}" +
    "body.kafle-dock #hist-panel{left:calc((100vw - " + (SZER + 16) + "px)/2)!important}" +
    "body.kafle-dock #kamera{right:" + (SZER + 24) + "px!important}" +
    ".kafel{position:relative;background:" + TLO + ";backdrop-filter:blur(4px);" +
    "-webkit-backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.55);border-radius:10px;" +
    "box-shadow:0 1px 6px rgba(0,0,0,0.3);display:flex;flex-direction:column;min-height:0;min-width:0;" +
    "overflow:hidden;color:#222;font:12px sans-serif}" +
    ".kafel.szeroki{grid-column:span 2}" +
    ".kafel.wys3{grid-row:span 3}" +
    ".kafel h4{margin:0;padding:5px 8px 3px;font-size:12px;flex:none;border-bottom:1px solid rgba(0,0,0,0.1)}" +
    ".kafel .tr{flex:1;overflow-y:auto;padding:4px 8px;-webkit-overflow-scrolling:touch;min-height:0}" +
    ".kafel .tr.bez{padding:0;overflow:hidden}" +
    ".kafel .tr.bez svg{width:100%;height:100%;display:block}" +
    ".kafel .tr.pol{display:flex;gap:2px;padding:0 3px;overflow:hidden}" +
    ".kafel .tr.pol>div{min-width:0;min-height:0;overflow:hidden}" +
    ".kafel .zam{position:absolute;top:2px;right:4px;border:0;background:none;font-size:18px;cursor:pointer;color:#333}" +
    ".kafel button.nw{border:0;background:rgba(0,0,0,0.12);border-radius:6px;padding:2px 7px;font-size:12px;cursor:pointer}";
  document.head.appendChild(st);

  var kont = document.createElement("div");
  kont.id = "kafle";
  document.body.appendChild(kont);
  var otwarte = false, ciala = [], budowniczowie = [], timer = null;

  // ---------- Pomocnicze ----------
  function f(x, m) {
    return x.toLocaleString("pl-PL", { minimumFractionDigits: m, maximumFractionDigits: m });
  }
  function e(tag, css, tekst) {
    var x = document.createElement(tag);
    if (css) x.style.cssText = css;
    if (tekst !== undefined) x.textContent = tekst;
    return x;
  }
  function pobierz(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function proc(h, ile) {
    if (h.length < 2) return null;
    var k = h[h.length - 1][1], s = h[Math.max(0, h.length - 1 - ile)][1];
    return (k - s) / s * 100;
  }
  function zm(p) { return p === null ? "–" : (p >= 0 ? "▲ +" : "▼ ") + f(p, 2) + "%"; }
  function spark(h, zly) {
    var v = h.map(function (x) { return x[1]; });
    var mn = Math.min.apply(null, v), mx = Math.max.apply(null, v), z = (mx - mn) || 1;
    var p = v.map(function (y, i) {
      return (i * (250 / (v.length - 1))).toFixed(1) + "," + (24 - (y - mn) / z * 22).toFixed(1);
    }).join(" ");
    var gora = v[v.length - 1] >= v[0];
    var kolor = (gora !== !!zly) ? "#2f9e44" : "#e03131";
    return '<svg viewBox="0 0 250 26" width="100%" height="26" preserveAspectRatio="none">' +
      '<polyline fill="none" stroke="' + kolor + '" stroke-width="2" points="' + p + '"/></svg>';
  }
  function kafel(tytul, klasy) {
    var k = e("div");
    k.className = "kafel" + (klasy ? " " + klasy : "");
    k.appendChild(e("h4", "", tytul));
    var b = e("div");
    b.className = "tr";
    b.textContent = "Ładowanie…";
    k.appendChild(b);
    kont.appendChild(k);
    b.kafel = k;
    return b;
  }
  function seria(b, etyk, cena, hist, jedn, miejsca, okres, krotki, zly, data) {
    var w = e("div", "display:flex;justify-content:space-between;margin-top:3px");
    w.appendChild(e("span", "", etyk));
    w.appendChild(e("b", "", f(cena, miejsca) + jedn));
    b.appendChild(w);
    if (hist && hist.length > 1) {
      var s = e("div");
      s.innerHTML = spark(hist, zly);
      b.appendChild(s);
      b.appendChild(e("div", "font-size:9px;color:#555;margin-bottom:3px",
        krotki + " " + okres + ": " + zm(proc(hist, krotki)) + " · " + (hist.length - 1) + " " +
        okres + ": " + zm(proc(hist, hist.length - 1)) + (data ? " · " + data : "")));
    }
  }
  function brak(b) { b.className = "tr"; b.textContent = "Brak danych."; }

  // ---------- Kafel 1: ropa, potem kursy ----------
  function budujKursy(b) {
    b.className = "tr";
    pobierz("rynek.json?t=" + Date.now()).then(function (d) {
      b.textContent = "";
      [["brent", "Ropa Brent", " USD", 2], ["usd", "USD/PLN", " zł", 4], ["eur", "EUR/PLN", " zł", 4]]
        .forEach(function (p) {
          var o = d[p[0]];
          if (!o) return;
          seria(b, p[1], o.kurs !== undefined ? o.kurs : o.cena, o.hist, p[2], p[3], "dni rob.", 5, false, o.data);
        });
      if (!b.firstChild) brak(b);
    }).catch(function () { brak(b); });
  }

  // ---------- Kafel 2: zloto, WIG20, paliwa ----------
  function budujRynekPlus(b) {
    b.className = "tr";
    pobierz("rynek_plus.json?t=" + Date.now()).then(function (d) {
      b.textContent = "";
      if (d.zloto) seria(b, "Złoto (1 g)", d.zloto.cena, d.zloto.hist, " zł", 2, "notowań", 5, false, d.zloto.data);
      if (d.wig20) seria(b, "WIG20", d.wig20.cena, d.wig20.hist, " pkt", 2, "notowań", 5, false, d.wig20.data);
      if (d.paliwa) {
        if (d.paliwa.pb95) seria(b, "Pb95 (śr.)", d.paliwa.pb95.cena, d.paliwa.pb95.hist, " zł/l", 2, "tyg.", 4, true, d.paliwa.pb95.data);
        if (d.paliwa.on) seria(b, "ON (śr.)", d.paliwa.on.cena, d.paliwa.on.hist, " zł/l", 2, "tyg.", 4, true, d.paliwa.on.data);
        b.appendChild(e("div", "font-size:9px;color:#666", "Paliwa: fuel-prices.eu (CC BY 4.0), dane tygodniowe KE, przeliczone po kursie NBP."));
      }
      if (!b.firstChild) brak(b);
    }).catch(function () { brak(b); });
  }

  // ---------- Kafel 3: blisko granicy PL - wykres rysowany na caly kafel ----------
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
  function hhmm(t) { return new Date(t * 1000).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }); }

  function budujGranice(b) {
    b.className = "tr bez";
    b.textContent = "Ładowanie archiwum…";
    pobierz(BAZA + "historia_ruchu.json?t=" + Math.floor(Date.now() / 60000)).then(function (h) {
      var teraz = Date.now() / 1000, od = teraz - 86400, pkt = [];
      (h.snapshoty || []).forEach(function (s) {
        if (s.t < od || s.bn) return;
        var ile = 0, mk = Infinity;
        (s.n || []).forEach(function (r) {
          if (r[7]) return;
          var km = dystans(r[3], r[2]);
          if (km > 100) return;
          ile += r[6] > 0 ? r[6] : 1;
          if (km < mk) mk = km;
        });
        pkt.push({ t: s.t, ile: ile, km: mk });
      });
      if (pkt.length < 2) { b.className = "tr"; b.textContent = "Za mało zapisów historii."; return; }
      var W = Math.max(110, b.clientWidth), H = Math.max(70, b.clientHeight);
      var maxY = Math.max(3, Math.max.apply(null, pkt.map(function (p) { return p.ile; })));
      var L = 22, R = W - 4, top = 14, bot = H - 12, t0 = Math.max(pkt[0].t, od);
      function X(t) { return L + (t - t0) / (teraz - t0) * (R - L); }
      function Y(v) { return bot - v / maxY * (bot - top); }
      var s = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="100%">';
      [0, maxY / 2, maxY].forEach(function (g) {
        s += '<line x1="' + L + '" y1="' + Y(g).toFixed(1) + '" x2="' + R + '" y2="' + Y(g).toFixed(1) +
          '" stroke="#bbb" stroke-width="0.7"/><text x="' + (L - 3) + '" y="' + (Y(g) + 3).toFixed(1) +
          '" font-size="9" fill="#444" text-anchor="end">' + (Math.round(g * 10) / 10) + "</text>";
      });
      var krok = W < 260 ? 6 : 3, dt = new Date(t0 * 1000);
      dt.setMinutes(0, 0, 0);
      for (var t = dt.getTime() / 1000; t <= teraz; t += 3600) {
        if (t < t0 || new Date(t * 1000).getHours() % krok) continue;
        s += '<line x1="' + X(t).toFixed(1) + '" y1="' + top + '" x2="' + X(t).toFixed(1) + '" y2="' + bot +
          '" stroke="#ddd" stroke-width="0.6"/><text x="' + X(t).toFixed(1) + '" y="' + (H - 2) +
          '" font-size="9" fill="#444" text-anchor="middle">' + hhmm(t) + "</text>";
      }
      var bw = Math.max(1.6, (R - L) / pkt.length * 0.85);
      pkt.forEach(function (p) {
        if (p.ile <= 0) return;
        s += '<rect x="' + (X(p.t) - bw / 2).toFixed(1) + '" y="' + Y(p.ile).toFixed(1) + '" width="' + bw.toFixed(1) +
          '" height="' + (bot - Y(p.ile)).toFixed(1) + '" fill="' + (p.km < 50 ? "#e03131" : "#f08c00") + '"/>';
      });
      s += '<text x="' + (L + 2) + '" y="10" font-size="10" font-weight="bold" fill="#333">obiekty ≤100 km od granicy PL, 24 h</text></svg>';
      b.textContent = "";
      var g = e("div", "width:100%;height:100%");
      g.innerHTML = s;
      b.appendChild(g);
    }).catch(function () { brak(b); });
  }

  // ---------- Kafel 4: ostrzezenia IMGW - pomorskie ----------
  function budujPomorskie(b) {
    b.className = "tr";
    pobierz("ostrzezenia.json?t=" + Date.now()).then(function (d) {
      var g = (d.woj || {})["22"];
      var l = ((g && g.lista) || []).filter(function (w) { return !/susz/i.test(String(w.zjawisko || "")); });
      l.sort(function (a, c) { return (c.stopien || 0) - (a.stopien || 0); });
      b.textContent = "";
      if (!l.length) b.appendChild(e("div", "margin:4px 0", "Brak aktywnych ostrzeżeń IMGW dla woj. pomorskiego."));
      l.slice(0, 6).forEach(function (w) {
        var dt = new Date(String(w.do || "").replace(" ", "T"));
        var r = e("div", "margin:4px 0;padding-left:6px;border-left:4px solid " + (KOL_OST[w.stopien] || "#868e96"));
        r.appendChild(e("div", "font-weight:bold", (w.zjawisko || "ostrzeżenie") + " – " + (w.stopien || "?") + ". stopień"));
        if (!isNaN(dt.getTime())) {
          r.appendChild(e("div", "font-size:10px;color:#555", "do " + dt.toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })));
        }
        b.appendChild(r);
      });
      b.appendChild(e("div", "font-size:9px;color:#666;margin-top:4px", "Dane: IMGW-PIB (bez suszy hydrologicznej). Nie zastępuje komunikatów IMGW ani Alertu RCB."));
    }).catch(function () { brak(b); });
  }

  // ---------- Kafel 5: wiadomosci militarne, regiony co ROT sekund ----------
  var iReg = 0, pauza = false, sek = 0, daneNews = [], UI = null;
  function zRegionu(r) { return daneNews.filter(function (z) { return z.reg === r; }); }

  function rysujNews() {
    if (!UI || !UI.lista.isConnected) return;
    var r = REG[iReg], ev = zRegionu(r);
    UI.nazwa.textContent = "📡 " + r + " (" + ev.length + ")";
    UI.lista.textContent = "";
    if (!ev.length) { UI.lista.textContent = "Brak zdarzeń z ostatnich 7 dni w tym regionie."; return; }
    ev.slice(0, 15).forEach(function (z) {
      var w = e("div", "margin:4px 0;padding:3px 6px;border-left:3px solid #1c7ed6;cursor:pointer");
      w.appendChild(e("div", "font-size:10px;color:#555;font-weight:bold",
        (IKONY[z.kat] || "📍") + " " + (z.kraj || "").toUpperCase() + " · " +
        new Date(z.t * 1000).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })));
      w.appendChild(document.createTextNode(z.tekst + " "));
      if (/^https?:\/\//.test(z.u || "")) {
        var a = e("a", "font-size:11px", "↗ " + (z.z || "źródło"));
        a.href = z.u; a.target = "_blank"; a.rel = "noopener";
        a.addEventListener("click", function (ev2) { ev2.stopPropagation(); });
        w.appendChild(a);
      }
      w.addEventListener("click", function () {
        if (!DOCK()) zamknij();
        map.flyTo({ center: [z.lon, z.lat], zoom: Math.max(map.getZoom(), 6) });
      });
      UI.lista.appendChild(w);
    });
  }
  function nastepnyRegion() {
    for (var i = 1; i <= REG.length; i++) {
      var k = (iReg + i) % REG.length;
      if (zRegionu(REG[k]).length) { iReg = k; break; }
    }
    sek = 0;
    rysujNews();
  }
  function budujWiadomosci(b) {
    b.className = "tr";
    pobierz("swiat.json?t=" + Date.now()).then(function (d) {
      daneNews = d.zdarzenia || [];
      b.textContent = "";
      if (!daneNews.length) { b.textContent = "Brak zdarzeń z ostatnich 7 dni."; UI = null; return; }
      var gora = e("div", "display:flex;align-items:center;gap:4px");
      var nazwa = e("b", "flex:1;font-size:12px");
      var bp = e("button", "", pauza ? "▶" : "⏸");
      bp.className = "nw";
      var bd = e("button", "", "⏭");
      bd.className = "nw";
      gora.appendChild(nazwa); gora.appendChild(bp); gora.appendChild(bd);
      var pasWrap = e("div", "height:2px;background:rgba(0,0,0,0.15);margin:3px 0");
      var pasek = e("div", "height:2px;background:#1c7ed6;width:0");
      pasWrap.appendChild(pasek);
      var lista = e("div");
      b.appendChild(gora); b.appendChild(pasWrap); b.appendChild(lista);
      UI = { nazwa: nazwa, pasek: pasek, lista: lista, pauza: bp };
      bp.addEventListener("click", function () { pauza = !pauza; bp.textContent = pauza ? "▶" : "⏸"; });
      bd.addEventListener("click", nastepnyRegion);
      if (!zRegionu(REG[iReg]).length) nastepnyRegion(); else rysujNews();
    }).catch(function () { brak(b); });
  }

  // ---------- Kafel 6: pogoda Gdynia - maly tekst po lewej, duzy wykres po prawej ----------
  var P_CACHE = null, P_T = 0;
  function pogodaDane(cb) {
    if (P_CACHE && Date.now() - P_T < 600000) { cb(P_CACHE); return; }
    pobierz("https://api.open-meteo.com/v1/forecast?latitude=54.5189&longitude=18.5305" +
      "&hourly=temperature_2m,precipitation&past_days=1&forecast_days=3&timezone=Europe%2FWarsaw")
      .then(function (d) { P_CACHE = d; P_T = Date.now(); cb(d); })
      .catch(function () { cb(null); });
  }
  function rysujPogode(k) {
    pogodaDane(function (d) {
      if (!k.isConnected) return;
      k.textContent = "";
      if (!d || !d.hourly) { k.textContent = "Brak wykresu."; return; }
      var t = d.hourly.time, T = d.hourly.temperature_2m, P = d.hourly.precipitation;
      var teraz = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Warsaw" }).slice(0, 13).replace(" ", "T");
      var iN = 24, i;
      for (i = 0; i < t.length; i++) { if (t[i].slice(0, 13) === teraz) { iN = i; break; } }
      var a = Math.max(0, iN - 12), z = Math.min(t.length, iN + 37);
      t = t.slice(a, z); T = T.slice(a, z); P = P.slice(a, z); iN -= a;
      var n = t.length;
      var W = Math.max(110, k.clientWidth), H = Math.max(70, k.clientHeight);
      var L = 26, R = W - 3, top = 14, bot = H - 13;
      var tv = T.filter(function (x) { return x !== null; });
      var tmin = Math.floor(Math.min.apply(null, tv)) - 1, tmax = Math.ceil(Math.max.apply(null, tv)) + 1;
      var pmax = Math.max(2, Math.max.apply(null, P.map(function (x) { return x || 0; })));
      function X(j) { return L + j * (R - L) / (n - 1); }
      function Y(v) { return bot - (v - tmin) / (tmax - tmin) * (bot - top); }
      var s = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="100%">';
      if (iN > 0) s += '<rect x="' + L + '" y="' + top + '" width="' + (X(iN) - L).toFixed(1) + '" height="' + (bot - top) + '" fill="#000" opacity="0.05"/>';
      var bw = Math.max(1.4, (R - L) / n * 0.85);
      for (i = 0; i < n; i++) {
        var p = P[i] || 0;
        if (p <= 0) continue;
        var h = Math.min(1, p / pmax) * (bot - top) * 0.45;
        s += '<rect x="' + (X(i) - bw / 2).toFixed(1) + '" y="' + (bot - h).toFixed(1) + '" width="' + bw.toFixed(1) +
          '" height="' + h.toFixed(1) + '" fill="#4dabf7" opacity="0.85"/>';
      }
      for (i = 0; i < n; i++) {
        var pol = t[i].slice(11, 13) === "00";
        if (pol && i > 0) s += '<line x1="' + X(i).toFixed(1) + '" y1="' + top + '" x2="' + X(i).toFixed(1) + '" y2="' + bot + '" stroke="#999" stroke-width="0.7"/>';
        if (pol || i === 0) {
          var kon = i + 1; while (kon < n && t[kon].slice(11, 13) !== "00") kon++;
          s += '<text x="' + ((X(i) + X(Math.min(kon, n - 1))) / 2).toFixed(1) + '" y="' + (H - 2) +
            '" font-size="10" font-weight="bold" fill="#333" text-anchor="middle">' + DNI[new Date(t[i].slice(0, 10) + "T12:00:00").getDay()] + " " +
            t[i].slice(8, 10) + "." + t[i].slice(5, 7) + "</text>";
        }
      }
      var pts = [];
      for (i = 0; i < n; i++) { if (T[i] !== null) pts.push(X(i).toFixed(1) + "," + Y(T[i]).toFixed(1)); }
      s += '<polyline fill="none" stroke="#e03131" stroke-width="2.2" points="' + pts.join(" ") + '"/>';
      s += '<line x1="' + X(iN).toFixed(1) + '" y1="' + top + '" x2="' + X(iN).toFixed(1) + '" y2="' + bot +
        '" stroke="#222" stroke-dasharray="3,2" stroke-width="1"/>';
      if (T[iN] !== null) s += '<circle cx="' + X(iN).toFixed(1) + '" cy="' + Y(T[iN]).toFixed(1) + '" r="3.2" fill="#e03131"/>';
      s += '<text x="' + (L - 3) + '" y="' + (top + 4) + '" font-size="10" font-weight="bold" fill="#e03131" text-anchor="end">' + tmax + '°</text>' +
        '<text x="' + (L - 3) + '" y="' + bot + '" font-size="10" font-weight="bold" fill="#e03131" text-anchor="end">' + tmin + '°</text>' +
        '<text x="' + (R - 2) + '" y="10" font-size="10" font-weight="bold" fill="#333" text-anchor="end">°C (linia) / opad mm (słupki)</text></svg>';
      var g = e("div", "width:100%;height:100%");
      g.innerHTML = s;
      k.appendChild(g);
    });
  }
  function budujPogode(b, n) {
    var t = document.getElementById("gdynia-pogoda");
    if (!t || !t.children.length) {
      b.className = "tr";
      b.textContent = "Ładowanie pogody…";
      if ((n || 0) < 6) setTimeout(function () { if (otwarte && b.isConnected) budujPogode(b, (n || 0) + 1); }, 2000);
      return;
    }
    b.className = "tr pol";
    b.textContent = "";
    var lewy = e("div", "flex:0 0 31%;font-size:10px;line-height:1.25");
    var kt = t.cloneNode(true);
    kt.removeAttribute("id");
    kt.style.cssText = "border:0;margin:0;padding:0;font-size:10px";
    lewy.appendChild(kt);
    var prawy = e("div", "flex:1 1 0");
    b.appendChild(lewy);
    b.appendChild(prawy);
    rysujPogode(prawy);
  }

  // ---------- Otwieranie, zamykanie, odswiezanie ----------
  function zatrzymajTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function zamknij() {
    otwarte = false;
    zatrzymajTimer();
    kont.style.display = "none";
    kont.className = "";
    kont.textContent = "";
    UI = null;
    document.body.classList.remove("kafle-dock");
    btn.classList.remove("akt");
  }
  function wypelnij() {
    for (var i = 0; i < budowniczowie.length; i++) budowniczowie[i](ciala[i]);
  }
  function otworz() {
    var x = document.getElementById("gora-x"), gp = document.getElementById("gora-panel");
    if (!DOCK() && x && gp && gp.style.display === "block") x.click();
    kont.textContent = "";
    ciala = [kafel("Ropa i kursy"), kafel("Złoto, WIG20, paliwa"), kafel("Blisko granicy PL (24 h)"),
      kafel("Ostrzeżenia IMGW – pomorskie"),
      kafel("Wiadomości militarne (7 dni)", "szeroki wys3"),
      kafel("Pogoda – Gdynia", "szeroki")];
    budowniczowie = [budujKursy, budujRynekPlus, budujGranice, budujPomorskie, budujWiadomosci, budujPogode];
    var zam = e("button", "", "✕");
    zam.className = "zam";
    zam.setAttribute("aria-label", "Zamknij kafle");
    zam.addEventListener("click", zamknij);
    ciala[1].kafel.appendChild(zam);
    kont.className = DOCK() ? "dock" : "";
    document.body.classList.toggle("kafle-dock", DOCK());
    kont.style.display = "grid";
    otwarte = true;
    btn.classList.add("akt");
    sek = 0;
    wypelnij();
    zatrzymajTimer();
    timer = setInterval(function () {
      if (!otwarte || pauza || !UI || !UI.pasek.isConnected) return;
      sek++;
      UI.pasek.style.width = Math.min(100, sek / ROT * 100) + "%";
      if (sek >= ROT) nastepnyRegion();
    }, 1000);
  }

  // Na komputerze dane w otwartych kaflach odswiezaja sie same (z zachowaniem przewiniecia)
  setInterval(function () {
    if (!otwarte || !DOCK() || document.hidden) return;
    var poz = ciala.map(function (c) { return c.scrollTop; });
    var gl = kont.scrollTop;
    wypelnij();
    setTimeout(function () {
      ciala.forEach(function (c, i) { c.scrollTop = poz[i]; });
      kont.scrollTop = gl;
    }, 1500);
  }, 120000);

  var btn = document.createElement("button");
  btn.className = "ikona-menu";
  btn.textContent = "💬";
  btn.title = "Kafle (przegląd)";
  btn.setAttribute("aria-label", "Kafle");
  btn.addEventListener("click", function () { if (otwarte) zamknij(); else otworz(); });
  setTimeout(function () { lewa.appendChild(btn); }, 500);

  lewa.addEventListener("click", function (ev) {
    var t = ev.target;
    if (otwarte && !DOCK() && t && t.classList && t.classList.contains("ikona-menu") && t !== btn) zamknij();
  });

  if (MQ && MQ.addEventListener) {
    MQ.addEventListener("change", function () { if (otwarte) { zamknij(); otworz(); } });
  }
})();
