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
  // Ukrycie ikon, ktore wchodza do nowego panelu (zostaja do uzytku wewnetrznego)
  function schowaj() {
    ["🕐", "🗄"].forEach(function (e) { var b = ikona(e); if (b) b.style.display = "none"; });
  }
  setTimeout(schowaj, 2500);
  setTimeout(schowaj, 5000);

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

  function f1(x) { return (Math.round(x * 10) / 10).toString().replace(".", ","); }
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
          var tyt = document.createElement("div");
          tyt.style.cssText = "font-weight:bold;margin-top:8px";
          tyt.textContent = m[1];
          box.appendChild(tyt);
          if (pkt.length < 2) {
            var b = document.createElement("div");
            b.style.cssText = "font-size:11px;color:#666";
            b.textContent = "Za mało danych (dni: " + pkt.length + ").";
            box.appendChild(b);
            return;
          }
          var v = pkt.map(function (p) { return p[1]; }), n = v.length;
          var mn = Math.min.apply(null, v), mx = Math.max.apply(null, v), z = (mx - mn) || 1;
          var pts = v.map(function (y, i) {
            return (10 + i * (240 / (n - 1))).toFixed(1) + "," + (40 - (y - mn) / z * 34).toFixed(1);
          }).join(" ");
          var g = document.createElement("div");
          g.innerHTML = '<svg viewBox="0 0 260 46" width="100%" preserveAspectRatio="none"><polyline fill="none" stroke="' +
            (v[n - 1] >= v[0] ? "#2f9e44" : "#e03131") + '" stroke-width="2" points="' + pts + '"/></svg>';
          box.appendChild(g);
          var o = document.createElement("div");
          o.style.cssText = "font-size:11px;color:#555";
          o.textContent = "Ostatni dzień: " + f1(v[n - 1]) + " · min " + f1(mn) + " · max " + f1(mx) +
            " · " + pkt[0][0] + " do " + pkt[n - 1][0];
          box.appendChild(o);
        });
        var u = document.createElement("div");
        u.style.cssText = "font-size:10px;color:#666;margin-top:6px";
        u.textContent = "Średnia dzienna z próbek zapisywanych co ok. 3 godz. W Ormuzie i Bab el-Mandeb pozycje AIS mogą być fałszywe.";
        box.appendChild(u);
        return box;
      })
      .catch(function () {
        var b = document.createElement("div");
        b.textContent = "Brak danych trendów dziennych.";
        return b;
      });
  }

  function zloz(s) {
    var box = document.createElement("div");
    [["Blisko granicy Polski (24 h)", s.g], ["Statystyki obwodów", s.s], ["Trendy dzienne", s.t],
     ["Oś czasu (ostatnie godziny)", s.o]].forEach(function (p, i) {
      var h = document.createElement("div");
      h.style.cssText = "font-weight:bold;font-size:14px;" + (i ? "margin-top:14px;border-top:2px solid rgba(0,0,0,0.2);padding-top:8px" : "");
      h.textContent = p[0];
      box.appendChild(h);
      if (p[1]) box.appendChild(p[1]);
      else {
        var b = document.createElement("div");
        b.style.cssText = "font-size:12px;color:#666;margin:4px 0";
        b.textContent = "Brak danych.";
        box.appendChild(b);
      }
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
    zbierz(document.getElementById("granica-odz"), /Blisko granicy/)
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
    if (flaga) return;                       // wywolanie wewnetrzne: przepusc do oryginalnej obslugi
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
