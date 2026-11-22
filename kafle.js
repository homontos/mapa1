(function () {
  var SZER = 280;      // szerokosc panelu kafli na komputerze (px)
  var WYS = 150;       // wysokosc jednego rzedu kafli na komputerze (px)
  var czesci = location.pathname.split("/").filter(Boolean);
  var BAZA = "https://raw.githubusercontent.com/" + location.hostname.split(".")[0] + "/" +
    (czesci[0] || "") + "/dane/";
  var TLO = "rgba(224,227,231,0.93)";
  var IKONY = { rakieta: "🚀", dron: "🛸", starcie: "💥", marynarka: "⚓", alarm: "⚠️", inne: "📍" };
  var KOL_OST = { 1: "#f2c200", 2: "#f08c00", 3: "#e03131" };
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
    ".kafel.wysoki{grid-row:span 2}" +
    ".kafel h4{margin:0;padding:5px 8px 3px;font-size:12px;flex:none;border-bottom:1px solid rgba(0,0,0,0.1)}" +
    ".kafel .tr{flex:1;overflow-y:auto;padding:4px 8px;-webkit-overflow-scrolling:touch;min-height:0}" +
    ".kafel .tr.bez{padding:0;overflow:hidden}" +
    ".kafel .tr.bez svg{width:100%;height:100%;display:block}" +
    ".kafel .tr.pol{display:flex;gap:6px;padding:4px 6px;overflow:hidden}" +
    ".kafel .tr.pol>div{flex:1;min-width:0;overflow:hidden}" +
    ".kafel .tr.pol svg{width:100%;height:100%;display:block}" +
    ".kafel .zam{position:absolute;top:2px;right:4px;border:0;background:none;font-size:18px;cursor:pointer;color:#333}";
  document.head.appendChild(st);

  var kont = document.createElement("div");
  kont.id = "kafle";
  document.body.appendChild(kont);
  var otwarte = false, ciala = [], budowniczowie = [];

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

  // ---------- Kafel 2: zloto, potem WIG20 i paliwa ----------
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

  // ---------- Kafel 3: blisko granicy PL - tylko wykres ----------
  function przechwyc(przycisk) {
    var oryg = window.pokazSzczegoly, fly = map.flyTo, wynik = null;
    window.pokazSzczegoly = function (t, w) { wynik = { t: t, w: w }; };
    map.flyTo = function () {};
    try { przycisk.click(); } catch (err) {}
    window.pokazSzczegoly = oryg;
    map.flyTo = fly;
    return wynik;
  }
  function budujGranice(b) {
    b.className = "tr bez";
    var p = document.getElementById("granica-odz");
    var w = p ? przechwyc(p) : null;
    b.textContent = "";
    if (!w) { brak(b); return; }
    b.textContent = "Ładowanie archiwum…";
    var n = 0;
    var t = setInterval(function () {
      n++;
      var svg = w.w.querySelector("svg");
      if (svg) {
        clearInterval(t);
        b.textContent = "";
        var kopia = svg.cloneNode(true);
        kopia.removeAttribute("style");
        b.appendChild(kopia);
      } else if (n > 40 || /Brak/.test(w.w.textContent)) {
        clearInterval(t);
        b.className = "tr";
        b.textContent = "Brak archiwum zbliżeń (zbyt mało zapisów historii).";
      }
    }, 250);
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

  // ---------- Kafel 5: wiadomosci militarne (wysoki) ----------
  function budujWiadomosci(b) {
    b.className = "tr";
    pobierz("swiat.json?t=" + Date.now()).then(function (d) {
      b.textContent = "";
      var l = (d.zdarzenia || []).slice(0, 40);
      if (!l.length) { b.textContent = "Brak zdarzeń z ostatnich 7 dni."; return; }
      l.forEach(function (z) {
        var w = e("div", "margin:4px 0;padding:3px 6px;border-left:3px solid #1c7ed6;cursor:pointer");
        w.appendChild(e("div", "font-size:10px;color:#555;font-weight:bold",
          (IKONY[z.kat] || "📍") + " " + (z.kraj || "").toUpperCase() + " · " + z.reg + " · " +
          new Date(z.t * 1000).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })));
        w.appendChild(document.createTextNode(z.tekst + " "));
        if (/^https?:\/\//.test(z.u || "")) {
          var a = e("a", "font-size:11px", "↗ " + (z.z || "źródło"));
          a.href = z.u; a.target = "_blank"; a.rel = "noopener";
          a.addEventListener("click", function (ev) { ev.stopPropagation(); });
          w.appendChild(a);
        }
        w.addEventListener("click", function () {
          if (!DOCK()) zamknij();
          map.flyTo({ center: [z.lon, z.lat], zoom: Math.max(map.getZoom(), 6) });
        });
        b.appendChild(w);
      });
    }).catch(function () { brak(b); });
  }

  // ---------- Kafel 6: pogoda Gdynia - tekst po lewej, wykres po prawej ----------
  function budujPogode(b, n) {
    var t = document.getElementById("gdynia-pogoda"), w = document.getElementById("gdynia-wykres");
    var svg = w && w.querySelector("svg");
    if (!t || !t.children.length || !svg) {
      b.className = "tr";
      b.textContent = "Ładowanie pogody…";
      if ((n || 0) < 6) {
        setTimeout(function () { if (otwarte && b.isConnected) budujPogode(b, (n || 0) + 1); }, 2000);
      }
      return;
    }
    b.className = "tr pol";
    b.textContent = "";
    var lewy = e("div", "font-size:12px");
    var kt = t.cloneNode(true);
    kt.removeAttribute("id");
    kt.style.cssText = "border:0;margin:0;padding:0;font-size:12px";
    lewy.appendChild(kt);
    var prawy = e("div");
    var ks = svg.cloneNode(true);
    ks.removeAttribute("style");
    prawy.appendChild(ks);
    b.appendChild(lewy);
    b.appendChild(prawy);
  }

  // ---------- Kafel 7: drony i rakiety, 24 h - tylko wykres dopasowany do kafla ----------
  function budujDrony(b) {
    b.className = "tr bez";
    pobierz(BAZA + "historia_ruchu.json?t=" + Math.floor(Date.now() / 60000)).then(function (h) {
      var DR = { uav: 1, recon: 1, missile: 1, ballistic: 1 }, KR = { missile: 1, ballistic: 1 };
      var teraz = Date.now() / 1000, od = teraz - 86400, v = [], ev = [], poprz = {};
      (h.snapshoty || []).forEach(function (x, i) {
        if (x.bn) return;
        var suma = 0, ids = {};
        (x.n || []).forEach(function (r) {
          if (r[7] || !DR[r[1]]) return;
          suma += r[6] > 0 ? r[6] : 1;
          var k = r[0] || (r[1] + Math.round(r[2] * 10) + "_" + Math.round(r[3] * 10));
          ids[k] = 1;
          if (i > 0 && KR[r[1]] && !poprz[k]) ev.push(x.t);
        });
        v.push([x.t, suma]);
        poprz = ids;
      });
      v = v.filter(function (p) { return p[0] >= od; });
      if (v.length < 2) { b.className = "tr"; b.textContent = "Za mało danych historii (zapisów: " + v.length + ")."; return; }
      var sr = v.map(function (p) {
        var o = v.filter(function (q) { return q[0] <= p[0] && q[0] >= p[0] - 1800; });
        return [p[0], o.reduce(function (s, q) { return s + q[1]; }, 0) / o.length];
      });
      var mx = v.reduce(function (a, p) { return p[1] > a[1] ? p : a; }, v[0]);
      var W = Math.max(200, b.clientWidth || 300), H = Math.max(70, b.clientHeight || 100);
      var t0 = Math.max(v[0][0], od), maxY = Math.max(4, Math.ceil(mx[1] * 1.1));
      var L = 26, R = W - 6, top = 15, bot = H - 15;
      function X(t) { return L + (t - t0) / (teraz - t0) * (R - L); }
      function Y(y) { return bot - y / maxY * (bot - top); }
      var s = '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none">';
      [0, maxY / 2, maxY].forEach(function (g) {
        s += '<line x1="' + L + '" y1="' + Y(g).toFixed(1) + '" x2="' + R + '" y2="' + Y(g).toFixed(1) +
          '" stroke="#ccc" stroke-width="0.7"/><text x="' + (L - 3) + '" y="' + (Y(g) + 3).toFixed(1) +
          '" font-size="9" fill="#555" text-anchor="end">' + (Math.round(g * 10) / 10) + "</text>";
      });
      var krok = W < 260 ? 6 : 3;
      var dt = new Date(t0 * 1000); dt.setMinutes(0, 0, 0);
      for (var t = dt.getTime() / 1000; t <= teraz; t += 3600) {
        if (t < t0 || new Date(t * 1000).getHours() % krok) continue;
        s += '<text x="' + X(t).toFixed(1) + '" y="' + (H - 3) + '" font-size="9" fill="#555" text-anchor="middle">' +
          new Date(t * 1000).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) + "</text>";
      }
      v.forEach(function (p) {
        s += '<line x1="' + X(p[0]).toFixed(1) + '" y1="' + bot + '" x2="' + X(p[0]).toFixed(1) + '" y2="' + Y(p[1]).toFixed(1) +
          '" stroke="#ff922b" stroke-width="2" opacity="0.6"/>';
      });
      s += '<polyline fill="none" stroke="#333" stroke-width="1.8" points="' +
        sr.map(function (p) { return X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1); }).join(" ") + '"/>';
      ev.filter(function (x) { return x >= t0; }).forEach(function (x) {
        s += '<circle cx="' + X(x).toFixed(1) + '" cy="' + (bot + 6) + '" r="2.4" fill="#e03131"/>';
      });
      var ost = v[v.length - 1][1], srAll = Math.round(v.reduce(function (a, p) { return a + p[1]; }, 0) / v.length);
      var pig = ost + " · śr. " + srAll, pw = pig.length * 5.6 + 10;
      s += '<rect x="' + (R - pw) + '" y="1" width="' + pw + '" height="13" rx="6" fill="rgba(0,0,0,0.75)"/>' +
        '<text x="' + (R - pw / 2) + '" y="10.5" font-size="9" font-weight="bold" fill="#fff" text-anchor="middle">' + pig + "</text></svg>";
      b.textContent = "";
      var g = e("div", "width:100%;height:100%");
      g.innerHTML = s;
      b.appendChild(g);
    }).catch(function () { brak(b); });
  }

  // ---------- Otwieranie, zamykanie, odswiezanie ----------
  function zamknij() {
    otwarte = false;
    kont.style.display = "none";
    kont.className = "";
    kont.textContent = "";
    document.body.classList.remove("kafle-dock");
    btn.classList.remove("akt");
  }
  function wypelnij() {
    for (var i = 0; i < budowniczowie.length; i++) budowniczowie[i](ciala[i]);
  }
  function otworz() {
    var x = document.getElementById("gora-x"), gp = document.getElementById("gora-panel");
    if (!DOCK() && x && gp && gp.style.display === "block") x.click();   // na telefonie zamknij panel u gory
    kont.textContent = "";
    ciala = [kafel("Ropa i kursy"), kafel("Złoto, WIG20, paliwa"), kafel("Blisko granicy PL (24 h)"),
      kafel("Ostrzeżenia IMGW – pomorskie"),
      kafel("Wiadomości militarne (7 dni)", "szeroki wysoki"),
      kafel("Pogoda – Gdynia", "szeroki"),
      kafel("Drony i rakiety – 24 godziny", "szeroki")];
    budowniczowie = [budujKursy, budujRynekPlus, budujGranice, budujPomorskie, budujWiadomosci, budujPogode, budujDrony];
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
    wypelnij();
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

  // Na telefonie dotkniecie innej ikony zamyka kafle; na komputerze zostaja otwarte
  lewa.addEventListener("click", function (ev) {
    var t = ev.target;
    if (otwarte && !DOCK() && t && t.classList && t.classList.contains("ikona-menu") && t !== btn) zamknij();
  });

  if (MQ && MQ.addEventListener) {
    MQ.addEventListener("change", function () { if (otwarte) { zamknij(); otworz(); } });
  }
})();
