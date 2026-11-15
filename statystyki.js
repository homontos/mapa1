(function () {
  var lewa = document.getElementById("lewa");
  if (!lewa) return;
  var INNE = "Poza Ukrainą / inne";

  var btn = document.createElement("button");
  btn.className = "ikona-menu";
  btn.textContent = "📊";
  btn.title = "Statystyki (30 dni)";
  btn.setAttribute("aria-label", "Statystyki");
  setTimeout(function () { lewa.appendChild(btn); }, 350);

  var dane = null;
  function f(x) { return (Math.round(x * 10) / 10).toString().replace(".", ","); }

  function sumaDnia(d, obl, typ) {
    var wpis = (dane.dni || {})[d];
    if (!wpis) return null;
    var s = 0;
    Object.keys(wpis).forEach(function (o) {
      if (obl !== "*" && o !== obl) return;
      var g = wpis[o];
      s += typ === "*" ? (g.d || 0) + (g.r || 0) + (g.k || 0) : (g[typ] || 0);
    });
    return s;
  }

  function zbuduj() {
    var box = document.createElement("div");
    var obwody = {};
    Object.keys(dane.dni || {}).forEach(function (d) {
      Object.keys(dane.dni[d]).forEach(function (o) { obwody[o] = 1; });
    });
    var nazwy = Object.keys(obwody).filter(function (o) { return o !== INNE; }).sort(function (a, b) {
      return a.localeCompare(b, "pl");
    });
    if (obwody[INNE]) nazwy.push(INNE);

    var selO = document.createElement("select"), selT = document.createElement("select");
    [selO, selT].forEach(function (s) { s.style.cssText = "width:100%;font-size:16px;padding:6px;margin-bottom:6px"; });
    [["*", "Cała Ukraina"]].concat(nazwy.map(function (n) { return [n, n]; })).forEach(function (p) {
      var o = document.createElement("option"); o.value = p[0]; o.textContent = p[1]; selO.appendChild(o);
    });
    [["*", "Wszystkie obiekty"], ["d", "Drony"], ["r", "Rakiety i lotnictwo"], ["k", "Bomby kierowane (KAB)"]]
      .forEach(function (p) {
        var o = document.createElement("option"); o.value = p[0]; o.textContent = p[1]; selT.appendChild(o);
      });
    var wykres = document.createElement("div"), opis = document.createElement("div");
    opis.style.cssText = "font-size:12px;color:#444;margin-top:4px";
    var uwaga = document.createElement("div");
    uwaga.style.cssText = "font-size:10px;color:#666;margin-top:6px";
    uwaga.textContent = "Liczba obiektów zgłoszonych w NEPTUN (doby UTC), liczona od momentu uruchomienia zbierania. " +
      "To trend z doniesień społecznościowych, a nie oficjalne statystyki ataków. Nie zastępuje syren ani Alertu RCB.";
    box.appendChild(selO); box.appendChild(selT); box.appendChild(wykres);
    box.appendChild(opis); box.appendChild(uwaga);

    function rysuj() {
      var obl = selO.value, typ = selT.value;
      var dzis = new Date(), dni = [];
      for (var i = 29; i >= 0; i--) {
        var d = new Date(Date.UTC(dzis.getUTCFullYear(), dzis.getUTCMonth(), dzis.getUTCDate() - i));
        var k = d.toISOString().slice(0, 10);
        dni.push({ k: k, w: sumaDnia(k, obl, typ), d: d });
      }
      var maU = dni.filter(function (x) { return x.w !== null; });
      if (!maU.length) { wykres.textContent = "Brak danych."; opis.textContent = ""; return; }
      var max = Math.max(1, Math.max.apply(null, maU.map(function (x) { return x.w; })));
      var Wd = 300, bot = 100, top = 14, n = dni.length, bw = (Wd - 36) / n;
      var s = '<svg viewBox="0 0 ' + Wd + ' 125" width="100%" style="display:block">';
      dni.forEach(function (x, i) {
        var xx = 30 + i * bw;
        if (x.w === null) {
          s += '<rect x="' + (xx + 1).toFixed(1) + '" y="' + (bot - 2) + '" width="' + (bw - 2).toFixed(1) +
            '" height="2" fill="#ced4da"/>';
        } else {
          var h = x.w / max * (bot - top);
          s += '<rect x="' + (xx + 1).toFixed(1) + '" y="' + (bot - h).toFixed(1) + '" width="' +
            (bw - 2).toFixed(1) + '" height="' + Math.max(h, x.w ? 1 : 0).toFixed(1) +
            '" fill="' + (i === n - 1 ? "#ff8787" : "#e8590c") + '"/>';
        }
        if (i % 5 === 0 || i === n - 1) {
          s += '<text x="' + (xx + bw / 2).toFixed(1) + '" y="' + (bot + 12) + '" font-size="8" fill="#555" ' +
            'text-anchor="middle">' + x.k.slice(8, 10) + '.' + x.k.slice(5, 7) + '</text>';
        }
      });
      s += '<text x="26" y="' + (top + 4) + '" font-size="9" fill="#555" text-anchor="end">' + max + '</text>' +
        '<text x="26" y="' + bot + '" font-size="9" fill="#555" text-anchor="end">0</text>' +
        '<line x1="28" y1="' + bot + '" x2="' + Wd + '" y2="' + bot + '" stroke="#999" stroke-width="0.8"/></svg>';
      wykres.innerHTML = s;

      var suma = maU.reduce(function (a, x) { return a + x.w; }, 0);
      var naj = maU.reduce(function (a, x) { return x.w > a.w ? x : a; }, maU[0]);
      var t = "Suma: " + suma + " (dni z danymi: " + maU.length + "). Najgorszy dzień: " +
        naj.k.slice(8, 10) + "." + naj.k.slice(5, 7) + " (" + naj.w + ").";
      var os = dni.slice(-7), po = dni.slice(-14, -7);
      var okOs = os.every(function (x) { return x.w !== null; });
      var okPo = po.length === 7 && po.every(function (x) { return x.w !== null; });
      if (okOs && okPo) {
        var a = os.reduce(function (s2, x) { return s2 + x.w; }, 0);
        var b = po.reduce(function (s2, x) { return s2 + x.w; }, 0);
        if (b > 0) {
          var zm = (a - b) / b * 100;
          t += " Ostatnie 7 dni vs poprzednie 7: " + (zm >= 0 ? "▲ +" : "▼ ") + f(zm) + "% (" + a + " vs " + b + ").";
        } else {
          t += " Ostatnie 7 dni: " + a + ", poprzednie 7: " + b + ".";
        }
      } else {
        t += " Porównanie 7 dni z poprzednimi 7 pojawi się po zebraniu 14 dni danych.";
      }
      opis.textContent = t;
    }
    selO.addEventListener("change", rysuj);
    selT.addEventListener("change", rysuj);
    rysuj();
    return box;
  }

  btn.addEventListener("click", function () {
    var gora = document.getElementById("gora-panel");
    var szcz = document.getElementById("szczegoly-gora");
    var tytul = szcz && szcz.querySelector(".p-nag span");
    if (gora && gora.style.display === "block" && tytul && /statystyki/i.test(tytul.textContent)) {
      var x = document.getElementById("gora-x");
      if (x) x.click();
      return;
    }
    fetch("statystyki.json?t=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        dane = d;
        if (window.pokazSzczegoly) window.pokazSzczegoly("Statystyki obwodów (30 dni)", zbuduj());
      })
      .catch(function () {
        var b = document.createElement("div");
        b.textContent = "Brak danych. Sprawdź, czy działa automat „Zapisz statystyki”.";
        if (window.pokazSzczegoly) window.pokazSzczegoly("Statystyki", b);
      });
  });
})();
