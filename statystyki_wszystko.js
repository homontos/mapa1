(function () {
  var lewa = document.getElementById("lewa");
  if (!lewa) return;
  var TYTUL = "Wskaźniki i trendy";
  var flaga = false, zajete = false;

  var st = document.createElement("style");
  st.textContent = "body.zbieram #gora-panel{visibility:hidden!important}";
  document.head.appendChild(st);

  function ikona(emoji) {
    var l = lewa.querySelectorAll(".ikona-menu");
    for (var i = 0; i < l.length; i++) if (l[i].textContent.indexOf(emoji) === 0) return l[i];
    return null;
  }
  function schowaj() {
    ["🕐", "🗄", "📈"].forEach(function (e) { var b = ikona(e); if (b) b.style.display = "none"; });
  }
  setTimeout(schowaj, 2500);
  setTimeout(schowaj, 5000);
  setTimeout(schowaj, 9000);

  function czekajNaPanel(wzorzec, ms) {
    return new Promise(function (res) {
      var t0 = Date.now();
      (function p() {
        var sp = document.querySelector("#szczegoly-gora .p-nag span");
        var tr = document.querySelector("#szczegoly-gora .p-tresc");
        if (sp && tr && wzorzec.test(sp.textContent) && tr.firstChild) { res(tr); return; }
        if (Date.now() - t0 > ms) { res(null); return; }
        setTimeout(p, 120);
      })();
    });
  }
  function zbierz(przycisk, wzorzec) {
    if (!przycisk) return Promise.resolve(null);
    var sp = document.querySelector("#szczegoly-gora .p-nag span");
    if (sp) sp.textContent = "";
    flaga = true;
    try { przycisk.click(); } catch (e) {}
    flaga = false;
    return czekajNaPanel(wzorzec, 5000).then(function (tr) {
      if (!tr) return null;
      var w = tr.firstChild;
      tr.removeChild(w);
      return w;
    });
  }

  // ---------- Pomocnicze ----------
  function f(x, m) { return x.toLocaleString("pl-PL", { minimumFractionDigits: m, maximumFractionDigits: m }); }
  function f1(x) { return (Math.round(x * 10) / 10).toString().replace(".", ","); }
  function el(tag, css, txt) {
    var x = document.createElement(tag);
    if (css) x.style.cssText = css;
    if (txt !== undefined) x.textContent = txt;
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
      return (i * (250 / (v.length - 1))).toFixed(1) + "," + (30 - (y - mn) / z * 28).toFixed(1);
    }).join(" ");
    var kolor = ((v[v.length - 1] >= v[0]) !== !!zly) ? "#2f9e44" : "#e03131";
    return '<svg viewBox="0 0 250 32" width="100%" height="32" preserveAspectRatio="none">' +
      '<polyline fill="none" stroke="' + kolor + '" stroke-width="2" points="' + p + '"/></svg>';
  }
  function wiersz(box, etyk, cena, hist, jedn, m, okres, krotki, zly, data) {
    var w = el("div", "display:flex;justify-content:space-between;margin-top:4px");
    w.appendChild(el("span", "", etyk));
    w.appendChild(el("b", "", f(cena, m) + jedn));
    box.appendChild(w);
    if (hist && hist.length > 1) {
      var s = el("div");
      s.innerHTML = spark(hist, zly);
      box.appendChild(s);
      box.appendChild(el("div", "font-size:11px;color:#9aa3ad;margin-bottom:3px",
        krotki + " " + okres + ": " + zm(proc(hist, krotki)) + " · " + (hist.length - 1) + " " + okres + ": " +
        zm(proc(hist, hist.length - 1)) + (data ? " · " + data : "")));
    }
  }

  // ---------- Sekcja: kursy, ropa, paliwa, zloto, WIG20 i zegary ----------
  function czas(s) {
    return new Intl.DateTimeFormat("pl-PL", { timeZone: s, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
  }
  function kursyCzas() {
    var box = el("div");
    var zeg = [["Polska", "Europe/Warsaw"], ["UTC", "UTC"], ["Ormuz (UTC+4)", "Asia/Dubai"], ["Iran (UTC+3:30)", "Asia/Tehran"]];
    var cz = el("div", "display:grid;grid-template-columns:1fr 1fr;gap:2px 10px;margin-bottom:4px");
    var wart = zeg.map(function (z) {
      var w = el("div", "display:flex;justify-content:space-between");
      w.appendChild(el("span", "", z[0]));
      var b = el("b", "font-variant-numeric:tabular-nums", czas(z[1]));
      w.appendChild(b);
      cz.appendChild(w);
      return b;
    });
    box.appendChild(cz);
    var n = 0, t = setInterval(function () {
      if (!cz.isConnected) { if (++n > 8) clearInterval(t); return; }
      n = 0;
      wart.forEach(function (b, i) { b.textContent = czas(zeg[i][1]); });
    }, 1000);
    var tr = el("div");
    box.appendChild(tr);
    return Promise.all([pobierz("rynek.json?t=" + Date.now()).catch(function () { return {}; }),
      pobierz("rynek_plus.json?t=" + Date.now()).catch(function () { return {}; })]).then(function (r) {
      var d = r[0], p = r[1];
      [["brent", "Ropa Brent", " USD", 2], ["usd", "USD/PLN", " zł", 4], ["eur", "EUR/PLN", " zł", 4]].forEach(function (x) {
        var o = d[x[0]];
        if (o) wiersz(tr, x[1], o.kurs !== undefined ? o.kurs : o.cena, o.hist, x[2], x[3], "dni rob.", 5, false, o.data);
      });
      if (p.paliwa && p.paliwa.on) wiersz(tr, "ON (śr.)", p.paliwa.on.cena, p.paliwa.on.hist, " zł/l", 2, "tyg.", 4, true, p.paliwa.on.data);
      if (p.paliwa && p.paliwa.pb95) wiersz(tr, "Pb95 (śr.)", p.paliwa.pb95.cena, p.paliwa.pb95.hist, " zł/l", 2, "tyg.", 4, true, p.paliwa.pb95.data);
      if (p.zloto) wiersz(tr, "Złoto (1 g)", p.zloto.cena, p.zloto.hist, " zł", 2, "notowań", 5, false, p.zloto.data);
      if (p.wig20) wiersz(tr, "WIG20", p.wig20.cena, p.wig20.hist, " pkt", 2, "notowań", 5, false, p.wig20.data);
      tr.appendChild(el("div", "font-size:10px;color:#9aa3ad;margin-top:4px",
        "Kursy: NBP (raz na dzień roboczy). Ropa: EIA / API Ninjas (opóźniona). Paliwa: fuel-prices.eu (CC BY 4.0), dane tygodniowe KE, " +
        "przeliczone po kursie NBP. Złoto: NBP."));
      return box;
    });
  }

  function trendy() {
    var M = [["g", "Statki – Zatoka Gdańska"], ["o", "Statki – Ormuz"], ["b", "Statki – Bab el-Mandeb"],
      ["s", "Samoloty nad Polską (starsza seria)"], ["a", "Alarmy lotnicze UA (liczba obszarów)"],
      ["d", "Drony i rakiety (NEPTUN)"]];
    return fetch("historia.json?t=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var box = document.createElement("div");
        M.forEach(function (m) {
          var pkt = [];
          Object.keys(d.dni || {}).sort().forEach(function (k) {
            var w = d.dni[k][m[0]];
            if (w && w[1]) pkt.push([k, w[0] / w[1]]);
          });
          pkt = pkt.slice(-30);
          box.appendChild(el("div", "font-weight:bold;margin-top:8px", m[1]));
          if (pkt.length < 2) { box.appendChild(el("div", "font-size:11px;color:#9aa3ad", "Za mało danych (dni: " + pkt.length + ").")); return; }
          var v = pkt.map(function (p) { return p[1]; }), n = v.length;
          var mn = Math.min.apply(null, v), mx = Math.max.apply(null, v), z = (mx - mn) || 1;
          var pts = v.map(function (y, i) {
            return (10 + i * (240 / (n - 1))).toFixed(1) + "," + (40 - (y - mn) / z * 34).toFixed(1);
          }).join(" ");
          var g = el("div");
          g.innerHTML = '<svg viewBox="0 0 260 46" width="100%" preserveAspectRatio="none"><polyline fill="none" stroke="' +
            (v[n - 1] >= v[0] ? "#2f9e44" : "#e03131") + '" stroke-width="2" points="' + pts + '"/></svg>';
          box.appendChild(g);
          box.appendChild(el("div", "font-size:11px;color:#9aa3ad", "Ostatni dzień: " + f1(v[n - 1]) + " · min " + f1(mn) +
            " · max " + f1(mx) + " · " + pkt[0][0] + " do " + pkt[n - 1][0]));
        });
        box.appendChild(el("div", "font-size:10px;color:#9aa3ad;margin-top:6px",
          "Średnia dzienna z próbek zapisywanych co ok. 3 godz. W Ormuzie i Bab el-Mandeb pozycje AIS mogą być fałszywe."));
        return box;
      })
      .catch(function () { return el("div", "", "Brak danych trendów dziennych."); });
  }

  function zloz(s) {
    var box = document.createElement("div");
    [["Kursy i czas", s.k], ["Blisko granicy Polski (24 h)", s.g], ["Statystyki obwodów", s.s],
     ["Trendy dzienne", s.t], ["Oś czasu (ostatnie godziny)", s.o]].forEach(function (p, i) {
      box.appendChild(el("div", "font-weight:bold;font-size:14px;" +
        (i ? "margin-top:14px;border-top:2px solid rgba(255,255,255,0.18);padding-top:8px" : ""), p[0]));
      box.appendChild(p[1] || el("div", "font-size:12px;color:#9aa3ad;margin:4px 0", "Brak danych."));
    });
    return box;
  }

  function otworz() {
    if (zajete) return;
    zajete = true;
    var x = document.getElementById("gora-x"), gp = document.getElementById("gora-panel");
    document.body.classList.add("zbieram");
    if (gp && gp.style.display === "block" && x) x.click();
    var fly = map.flyTo;
    map.flyTo = function () {};
    var s = {};
    kursyCzas().catch(function () { return null; })
      .then(function (w) { s.k = w; return zbierz(document.getElementById("granica-odz"), /Blisko granicy/); })
      .then(function (w) { s.g = w; return zbierz(ikona("📊"), /Statystyki/); })
      .then(function (w) { s.s = w; return trendy(); })
      .then(function (w) { s.t = w; return zbierz(ikona("🕐"), /Oś czasu/); })
      .then(function (w) { s.o = w; })
      .catch(function () {})
      .then(function () {
        map.flyTo = fly;
        var box = zloz(s);
        document.body.classList.remove("zbieram");
        if (window.pokazSzczegoly) window.pokazSzczegoly(TYTUL, box);
        zajete = false;
      });
  }

  lewa.addEventListener("click", function (ev) {
    var t = ev.target;
    if (!t || !t.classList || !t.classList.contains("ikona-menu") || t.textContent.indexOf("📊") !== 0) return;
    if (flaga) return;
    ev.stopPropagation();
    ev.preventDefault();
    var gp = document.getElementById("gora-panel");
    var sp = document.querySelector("#szczegoly-gora .p-nag span");
    if (gp && gp.style.display === "block" && sp && sp.textContent === TYTUL) {
      var x = document.getElementById("gora-x");
      if (x) x.click();
      return;
    }
    otworz();
  }, true);
})();
