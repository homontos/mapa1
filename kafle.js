(function () {
  var czesci = location.pathname.split("/").filter(Boolean);
  var BAZA = "https://raw.githubusercontent.com/" + location.hostname.split(".")[0] + "/" +
    (czesci[0] || "") + "/dane/";
  var TLO = "rgba(224,227,231,0.93)";
  var INNE = "Poza Ukrainą / inne";
  var IKONY = { rakieta: "🚀", dron: "🛸", starcie: "💥", marynarka: "⚓", alarm: "⚠️", inne: "📍" };
  var lewa = document.getElementById("lewa");
  if (!lewa) return;

  var st = document.createElement("style");
  st.textContent =
    "#kafle{position:fixed;z-index:5;display:none;top:calc(env(safe-area-inset-top,0px) + 8px);" +
    "left:50px;right:6px;bottom:62px;grid-template-columns:1fr 1fr;" +
    "grid-template-rows:repeat(6,minmax(0,1fr));gap:6px}" +
    ".kafel{position:relative;background:" + TLO + ";backdrop-filter:blur(4px);" +
    "-webkit-backdrop-filter:blur(4px);border-radius:10px;box-shadow:0 1px 6px rgba(0,0,0,0.3);" +
    "display:flex;flex-direction:column;min-height:0;min-width:0;overflow:hidden;color:#222;font:12px sans-serif}" +
    ".kafel.szeroki{grid-column:span 2}" +
    ".kafel h4{margin:0;padding:5px 8px 3px;font-size:12px;flex:none;border-bottom:1px solid rgba(0,0,0,0.1)}" +
    ".kafel .tr{flex:1;overflow-y:auto;padding:4px 8px;-webkit-overflow-scrolling:touch;min-height:0}" +
    ".kafel .zam{position:absolute;top:2px;right:4px;border:0;background:none;font-size:18px;cursor:pointer;color:#333}";
  document.head.appendChild(st);

  var kont = document.createElement("div");
  kont.id = "kafle";
  document.body.appendChild(kont);
  var otwarte = false;

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
      return (i * (250 / (v.length - 1))).toFixed(1) + "," + (30 - (y - mn) / z * 28).toFixed(1);
    }).join(" ");
    var gora = v[v.length - 1] >= v[0];
    var kolor = (gora !== !!zly) ? "#2f9e44" : "#e03131";
    return '<svg viewBox="0 0 250 32" width="100%" height="32" preserveAspectRatio="none">' +
      '<polyline fill="none" stroke="' + kolor + '" stroke-width="2" points="' + p + '"/></svg>';
  }
  function kafel(tytul, szeroki) {
    var k = e("div");
    k.className = "kafel" + (szeroki ? " szeroki" : "");
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
      b.appendChild(e("div", "font-size:10px;color:#555;margin-bottom:3px",
        krotki + " " + okres + ": " + zm(proc(hist, krotki)) + " · " + (hist.length - 1) + " " +
        okres + ": " + zm(proc(hist, hist.length - 1)) + (data ? " · " + data : "")));
    }
  }
  function brak(b) { b.textContent = "Brak danych."; }

  // ---------- Kafel 1: kursy i ropa ----------
  function budujKursy(b) {
    pobierz("rynek.json?t=" + Date.now()).then(function (d) {
      b.textContent = "";
      [["usd", "USD/PLN", " zł", 4], ["eur", "EUR/PLN", " zł", 4], ["brent", "Ropa Brent", " USD", 2]]
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
    pobierz("rynek_plus.json?t=" + Date.now()).then(function (d) {
      b.textContent = "";
      if (d.wig20) seria(b, "WIG20", d.wig20.cena, d.wig20.hist, " pkt", 2, "notowań", 5, false, d.wig20.data);
      if (d.zloto) seria(b, "Złoto (1 g)", d.zloto.cena, d.zloto.hist, " zł", 2, "notowań", 5, false, d.zloto.data);
      if (d.paliwa) {
        if (d.paliwa.pb95) seria(b, "Pb95 (śr.)", d.paliwa.pb95.cena, d.paliwa.pb95.hist, " zł/l", 2, "tyg.", 4, true, d.paliwa.pb95.data);
        if (d.paliwa.on) seria(b, "ON (śr.)", d.paliwa.on.cena, d.paliwa.on.hist, " zł/l", 2, "tyg.", 4, true, d.paliwa.on.data);
        b.appendChild(e("div", "font-size:10px;color:#666", "Paliwa: fuel-prices.eu (CC BY 4.0), dane tygodniowe KE, przeliczone po kursie NBP."));
      }
      if (!b.firstChild) brak(b);
    }).catch(function () { brak(b); });
  }

  // ---------- Kafel 3: blisko granicy (przechwycenie panelu ikony granicy) ----------
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
    var p = document.getElementById("granica-odz");
    var w = p ? przechwyc(p) : null;
    b.textContent = "";
    if (w) b.appendChild(w.w); else brak(b);
  }

  // ---------- Kafel 4: pogoda Gdynia ----------
  function budujPogode(b) {
    b.textContent = "";
    ["gdynia-pogoda", "gdynia-wykres"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var kopia = el.cloneNode(true);
      kopia.removeAttribute("id");
      b.appendChild(kopia);
    });
    if (!b.firstChild) b.textContent = "Pogoda się jeszcze ładuje. Otwórz kafle ponownie za chwilę.";
  }

  // ---------- Kafel 5: wiadomosci militarne ----------
  function budujWiadomosci(b) {
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
          zamknij();
          map.flyTo({ center: [z.lon, z.lat], zoom: Math.max(map.getZoom(), 6) });
        });
        b.appendChild(w);
      });
    }).catch(function () { brak(b); });
  }

  // ---------- Kafel 6: statystyki obwodow (cala Ukraina, wszystkie typy) ----------
  function budujStat(b) {
    pobierz("statystyki.json?t=" + Date.now()).then(function (d) {
      var dni = d.dni || {};
      function suma(k) {
        var w = dni[k];
        if (!w) return null;
        var s = 0;
        Object.keys(w).forEach(function (o) {
          if (o === INNE) return;
          var g = w[o];
          s += (g.d || 0) + (g.r || 0) + (g.k || 0);
        });
        return s;
      }
      var dz = new Date(), tab = [];
      for (var i = 29; i >= 0; i--) {
        var k = new Date(Date.UTC(dz.getUTCFullYear(), dz.getUTCMonth(), dz.getUTCDate() - i)).toISOString().slice(0, 10);
        tab.push({ k: k, w: suma(k) });
      }
      var ma = tab.filter(function (x) { return x.w !== null; });
      if (!ma.length) { brak(b); return; }
      var max = Math.max.apply(null, [1].concat(ma.map(function (x) { return x.w; })));
      var bw = (300 - 36) / 30, bot = 78, top = 10;
      var s = '<svg viewBox="0 0 300 96" width="100%" style="display:block">';
      tab.forEach(function (x, i) {
        var xx = 30 + i * bw;
        if (x.w === null) {
          s += '<rect x="' + (xx + 1).toFixed(1) + '" y="' + (bot - 2) + '" width="' + (bw - 2).toFixed(1) + '" height="2" fill="#bbb"/>';
        } else {
          var h = x.w / max * (bot - top);
          s += '<rect x="' + (xx + 1).toFixed(1) + '" y="' + (bot - h).toFixed(1) + '" width="' + (bw - 2).toFixed(1) +
            '" height="' + Math.max(h, x.w ? 1 : 0).toFixed(1) + '" fill="' + (i === 29 ? "#ff8787" : "#e8590c") + '"/>';
        }
        if (i % 5 === 0 || i === 29) {
          s += '<text x="' + (xx + bw / 2).toFixed(1) + '" y="90" font-size="8" fill="#555" text-anchor="middle">' +
            x.k.slice(8, 10) + "." + x.k.slice(5, 7) + "</text>";
        }
      });
      s += '<text x="26" y="' + (top + 4) + '" font-size="9" fill="#555" text-anchor="end">' + max + "</text>" +
        '<text x="26" y="' + bot + '" font-size="9" fill="#555" text-anchor="end">0</text>' +
        '<line x1="28" y1="' + bot + '" x2="300" y2="' + bot + '" stroke="#999" stroke-width="0.8"/></svg>';
      b.textContent = "";
      var w = e("div");
      w.innerHTML = s;
      b.appendChild(w);
      var razem = ma.reduce(function (a, x) { return a + x.w; }, 0);
      var naj = ma.reduce(function (a, x) { return x.w > a.w ? x : a; }, ma[0]);
      var os = tab.slice(-7), po = tab.slice(-14, -7);
      var okO = os.every(function (x) { return x.w !== null; }), okP = po.length === 7 && po.every(function (x) { return x.w !== null; });
      var t = "Cała Ukraina, wszystkie typy. Suma: " + razem + " (dni z danymi: " + ma.length + "). Najgorszy dzień: " +
        naj.k.slice(8, 10) + "." + naj.k.slice(5, 7) + " (" + naj.w + ").";
      if (okO && okP) {
        var a7 = os.reduce(function (a, x) { return a + x.w; }, 0), b7 = po.reduce(function (a, x) { return a + x.w; }, 0);
        t += b7 > 0 ? " 7 dni vs poprzednie 7: " + zm((a7 - b7) / b7 * 100) + " (" + a7 + " vs " + b7 + ")."
          : " 7 dni: " + a7 + ", poprzednie 7: " + b7 + ".";
      } else t += " Porównanie 7 dni pojawi się po 14 dniach danych.";
      b.appendChild(e("div", "font-size:11px;color:#444", t));
      b.appendChild(e("div", "font-size:10px;color:#666;margin-top:4px",
        "Liczba obiektów zgłoszonych w NEPTUN (doby UTC), od uruchomienia zbierania. To trend z doniesień, nie oficjalne dane."));
    }).catch(function () { brak(b); });
  }

  // ---------- Kafel 7: drony i rakiety, ostatnie 24 h ----------
  function budujDrony(b) {
    pobierz(BAZA + "historia_ruchu.json?t=" + Math.floor(Date.now() / 60000)).then(function (h) {
      var DR = { uav: 1, recon: 1, missile: 1, ballistic: 1 }, KR = { missile: 1, ballistic: 1 };
      var teraz = Date.now() / 1000, od = teraz - 86400, v = [], ev = [], poprz = {}, ostD = 0, ostR = 0;
      (h.snapshoty || []).forEach(function (x, i) {
        if (x.bn) return;
        var suma = 0, ids = {}, dd = 0, rr = 0;
        (x.n || []).forEach(function (r) {
          if (r[7] || !DR[r[1]]) return;
          var c = r[6] > 0 ? r[6] : 1;
          suma += c;
          if (KR[r[1]]) rr += c; else dd += c;
          var k = r[0] || (r[1] + Math.round(r[2] * 10) + "_" + Math.round(r[3] * 10));
          ids[k] = 1;
          if (i > 0 && KR[r[1]] && !poprz[k]) ev.push(x.t);
        });
        v.push([x.t, suma]);
        ostD = dd; ostR = rr;
        poprz = ids;
      });
      v = v.filter(function (p) { return p[0] >= od; });
      if (v.length < 2) { b.textContent = "Za mało danych historii (zapisów: " + v.length + ")."; return; }
      var sr = v.map(function (p) {
        var o = v.filter(function (q) { return q[0] <= p[0] && q[0] >= p[0] - 1800; });
        return [p[0], o.reduce(function (s, q) { return s + q[1]; }, 0) / o.length];
      });
      var mx = v.reduce(function (a, p) { return p[1] > a[1] ? p : a; }, v[0]);
      var t0 = Math.max(v[0][0], od), maxY = Math.max(4, Math.ceil(mx[1] * 1.1));
      var W = 300, L = 24, R = 296, top = 14, bot = 92;
      function X(t) { return L + (t - t0) / (teraz - t0) * (R - L); }
      function Y(y) { return bot - y / maxY * (bot - top); }
      var s = '<svg viewBox="0 0 300 120" width="100%" style="display:block">';
      [0, maxY / 2, maxY].forEach(function (g) {
        s += '<line x1="' + L + '" y1="' + Y(g).toFixed(1) + '" x2="' + R + '" y2="' + Y(g).toFixed(1) +
          '" stroke="#ccc" stroke-width="0.7"/><text x="' + (L - 3) + '" y="' + (Y(g) + 3).toFixed(1) +
          '" font-size="8" fill="#555" text-anchor="end">' + (Math.round(g * 10) / 10) + "</text>";
      });
      var dt = new Date(t0 * 1000); dt.setMinutes(0, 0, 0);
      for (var t = dt.getTime() / 1000; t <= teraz; t += 3600) {
        if (t < t0 || new Date(t * 1000).getHours() % 3) continue;
        s += '<text x="' + X(t).toFixed(1) + '" y="112" font-size="8" fill="#555" text-anchor="middle">' +
          new Date(t * 1000).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) + "</text>";
      }
      v.forEach(function (p) {
        s += '<line x1="' + X(p[0]).toFixed(1) + '" y1="' + bot + '" x2="' + X(p[0]).toFixed(1) + '" y2="' + Y(p[1]).toFixed(1) +
          '" stroke="#ff922b" stroke-width="2" opacity="0.6"/>';
      });
      s += '<polyline fill="none" stroke="#333" stroke-width="1.8" points="' +
        sr.map(function (p) { return X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1); }).join(" ") + '"/>';
      ev.filter(function (x) { return x >= t0; }).forEach(function (x) {
        s += '<circle cx="' + X(x).toFixed(1) + '" cy="' + (bot + 7) + '" r="2.6" fill="#e03131"/>';
      });
      var ost = v[v.length - 1][1], srAll = Math.round(v.reduce(function (a, p) { return a + p[1]; }, 0) / v.length);
      var pig = ost + " · śr. " + srAll, pw = pig.length * 5.4 + 10;
      s += '<rect x="' + (R - pw) + '" y="1" width="' + pw + '" height="13" rx="6" fill="rgba(0,0,0,0.75)"/>' +
        '<text x="' + (R - pw / 2) + '" y="10.5" font-size="9" font-weight="bold" fill="#fff" text-anchor="middle">' + pig + "</text></svg>";
      b.textContent = "";
      b.appendChild(e("div", "font-weight:bold", "Teraz: drony " + ostD + " · rakiety " + ostR));
      var w = e("div");
      w.innerHTML = s;
      b.appendChild(w);
      b.appendChild(e("div", "font-size:11px;color:#444",
        "Najwięcej naraz: " + mx[1] + " o " + new Date(mx[0] * 1000).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) +
        ". Linia: średnia krocząca z 30 min. Słupki: liczba obiektów w zapisie (ok. 5 min). Czerwone kropki: nowe rakiety."));
    }).catch(function () { brak(b); });
  }

  // ---------- Kafel 8: trendy dzienne (wszystkie wykresy pod soba) ----------
  function budujTrendy(b) {
    var M = [["g", "Statki – Zatoka Gdańska"], ["o", "Statki – Ormuz"], ["b", "Statki – Bab el-Mandeb"],
      ["s", "Samoloty nad Polską (starsza seria)"], ["a", "Alarmy lotnicze UA (liczba obszarów)"],
      ["d", "Drony i rakiety (NEPTUN)"]];
    pobierz("historia.json?t=" + Date.now()).then(function (d) {
      b.textContent = "";
      M.forEach(function (m) {
        var pkt = [];
        Object.keys(d.dni || {}).sort().forEach(function (k) {
          var w = d.dni[k][m[0]];
          if (w && w[1]) pkt.push([k, w[0] / w[1]]);
        });
        pkt = pkt.slice(-30);
        b.appendChild(e("div", "font-weight:bold;margin-top:6px", m[1]));
        if (pkt.length < 2) { b.appendChild(e("div", "font-size:11px;color:#666", "Za mało danych (dni: " + pkt.length + ").")); return; }
        var v = pkt.map(function (p) { return p[1]; });
        var mn = Math.min.apply(null, v), mx = Math.max.apply(null, v), z = (mx - mn) || 1, n = v.length;
        var pts = v.map(function (y, i) {
          return (10 + i * (240 / (n - 1))).toFixed(1) + "," + (40 - (y - mn) / z * 34).toFixed(1);
        }).join(" ");
        var kol = v[n - 1] >= v[0] ? "#2f9e44" : "#e03131";
        var g = e("div");
        g.innerHTML = '<svg viewBox="0 0 260 46" width="100%" preserveAspectRatio="none"><polyline fill="none" stroke="' + kol +
          '" stroke-width="2" points="' + pts + '"/></svg>';
        b.appendChild(g);
        b.appendChild(e("div", "font-size:10px;color:#555",
          "Ostatni dzień: " + f(v[n - 1], 1) + " · min " + f(mn, 1) + " · max " + f(mx, 1) + " · " + pkt[0][0] + " do " + pkt[n - 1][0]));
      });
      b.appendChild(e("div", "font-size:10px;color:#666;margin-top:6px",
        "Średnia dzienna z próbek zapisywanych co ok. 3 godz. W Ormuzie i Bab el-Mandeb pozycje AIS mogą być fałszywe."));
    }).catch(function () { brak(b); });
  }

  // ---------- Otwieranie i zamykanie ----------
  function zamknij() {
    otwarte = false;
    kont.style.display = "none";
    kont.textContent = "";
    btn.classList.remove("akt");
  }
  function otworz() {
    var x = document.getElementById("gora-x");        // zamknij panel u gory, jesli otwarty
    if (x && document.getElementById("gora-panel").style.display === "block") x.click();
    kont.textContent = "";
    var k1 = kafel("Kursy i ropa");
    var k2 = kafel("Złoto, WIG20, paliwa");
    var zam = e("button", "", "✕");
    zam.className = "zam";
    zam.setAttribute("aria-label", "Zamknij kafle");
    zam.addEventListener("click", zamknij);
    k2.kafel.appendChild(zam);
    var k3 = kafel("Blisko granicy Polski");
    var k4 = kafel("Pogoda – Gdynia");
    var k5 = kafel("Wiadomości militarne (7 dni)", true);
    var k6 = kafel("Statystyki obwodów – cała Ukraina (30 dni)", true);
    var k7 = kafel("Drony i rakiety – ostatnie 24 godziny", true);
    var k8 = kafel("Trendy dzienne", true);
    kont.style.display = "grid";
    otwarte = true;
    btn.classList.add("akt");
    budujKursy(k1); budujRynekPlus(k2); budujGranice(k3); budujPogode(k4);
    budujWiadomosci(k5); budujStat(k6); budujDrony(k7); budujTrendy(k8);
  }

  var btn = document.createElement("button");
  btn.className = "ikona-menu";
  btn.textContent = "💬";
  btn.title = "Kafle (przegląd)";
  btn.setAttribute("aria-label", "Kafle");
  btn.addEventListener("click", function () { if (otwarte) zamknij(); else otworz(); });
  setTimeout(function () { lewa.appendChild(btn); }, 500);

  // Dotkniecie innej ikony menu zamyka kafle
  lewa.addEventListener("click", function (ev) {
    var t = ev.target;
    if (otwarte && t && t.classList && t.classList.contains("ikona-menu") && t !== btn) zamknij();
  });
})();
