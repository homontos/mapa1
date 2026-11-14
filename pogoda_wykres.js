(function () {
  var panel = document.getElementById("fale-panel");
  var tresc = panel && panel.querySelector(".p-tresc");
  if (!tresc) return;

  var blok = document.createElement("div");
  blok.id = "gdynia-wykres";
  blok.style.cssText = "border-bottom:1px solid #ddd;padding-bottom:6px;margin-bottom:6px";
  blok.textContent = "Wykres pogody: ładowanie…";
  var po = document.getElementById("gdynia-pogoda");
  if (po && po.parentNode === tresc) tresc.insertBefore(blok, po.nextSibling);
  else tresc.insertBefore(blok, tresc.firstChild);

  var DNI = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];
  function f1(x) { return (Math.round(x * 10) / 10).toString().replace(".", ","); }
  function suma(a) { return a.reduce(function (s, x) { return s + (x || 0); }, 0); }

  function rysuj(d) {
    var t = d.hourly.time, T = d.hourly.temperature_2m, P = d.hourly.precipitation;
    var n = t.length;
    var teraz = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Warsaw" })
      .slice(0, 13).replace(" ", "T");
    var iNow = -1;
    for (var k = 0; k < n; k++) { if (t[k].slice(0, 13) === teraz) { iNow = k; break; } }

    var W = 300, H = 140, L = 32, R = 296, top = 16, bot = 106;
    var tv = T.filter(function (x) { return x !== null; });
    var tmin = Math.floor(Math.min.apply(null, tv)) - 1;
    var tmax = Math.ceil(Math.max.apply(null, tv)) + 1;
    var pmax = Math.max(2, Math.max.apply(null, P.map(function (x) { return x || 0; })));
    function X(i) { return L + i * (R - L) / (n - 1); }
    function Y(v) { return bot - (v - tmin) / (tmax - tmin) * (bot - top); }

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="display:block">';
    if (iNow > 0) {
      s += '<rect x="' + L + '" y="' + top + '" width="' + (X(iNow) - L).toFixed(1) +
        '" height="' + (bot - top) + '" fill="#000" opacity="0.05"/>';
    }
    // linie dni i podpisy
    var dni = {};
    for (var i = 0; i < n; i++) {
      var dz = t[i].slice(0, 10);
      (dni[dz] = dni[dz] || []).push(i);
      if (i > 0 && t[i].slice(11, 13) === "00") {
        s += '<line x1="' + X(i).toFixed(1) + '" y1="' + top + '" x2="' + X(i).toFixed(1) +
          '" y2="' + bot + '" stroke="#bbb" stroke-width="0.7"/>';
      }
    }
    Object.keys(dni).forEach(function (dz) {
      var idx = dni[dz], cx = X((idx[0] + idx[idx.length - 1]) / 2);
      var nazwa = DNI[new Date(dz + "T12:00:00").getDay()];
      s += '<text x="' + cx.toFixed(1) + '" y="' + (bot + 12) + '" font-size="9" fill="#555" ' +
        'text-anchor="middle">' + nazwa + ' ' + dz.slice(8, 10) + '.' + dz.slice(5, 7) + '</text>';
    });
    // oś 0 °C
    if (tmin < 0 && tmax > 0) {
      s += '<line x1="' + L + '" y1="' + Y(0).toFixed(1) + '" x2="' + R + '" y2="' + Y(0).toFixed(1) +
        '" stroke="#888" stroke-dasharray="3,3" stroke-width="0.8"/>';
    }
    // słupki opadu
    var bw = Math.max(1.2, (R - L) / n * 0.8);
    for (var j = 0; j < n; j++) {
      var p = P[j] || 0;
      if (p <= 0) continue;
      var h = p / pmax * 40;
      s += '<rect x="' + (X(j) - bw / 2).toFixed(1) + '" y="' + (bot - h).toFixed(1) +
        '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="#4dabf7" opacity="0.75"/>';
    }
    // linia temperatury
    var pts = [];
    for (var m = 0; m < n; m++) {
      if (T[m] !== null) pts.push(X(m).toFixed(1) + "," + Y(T[m]).toFixed(1));
    }
    s += '<polyline fill="none" stroke="#e03131" stroke-width="2" points="' + pts.join(" ") + '"/>';
    // teraz
    if (iNow >= 0) {
      s += '<line x1="' + X(iNow).toFixed(1) + '" y1="' + top + '" x2="' + X(iNow).toFixed(1) +
        '" y2="' + bot + '" stroke="#333" stroke-dasharray="3,2" stroke-width="1"/>' +
        '<text x="' + X(iNow).toFixed(1) + '" y="' + (top - 4) + '" font-size="9" ' +
        'fill="#333" text-anchor="middle">teraz</text>';
      if (T[iNow] !== null) {
        s += '<circle cx="' + X(iNow).toFixed(1) + '" cy="' + Y(T[iNow]).toFixed(1) +
          '" r="3" fill="#e03131"/>';
      }
    }
    // skala temperatury
    s += '<text x="' + (L - 3) + '" y="' + (top + 3) + '" font-size="9" fill="#e03131" text-anchor="end">' + tmax + '°</text>' +
      '<text x="' + (L - 3) + '" y="' + (bot) + '" font-size="9" fill="#e03131" text-anchor="end">' + tmin + '°</text>';
    s += '</svg>';

    var opis = "";
    if (iNow >= 0) {
      var k24 = Math.min(n, iNow + 24), k72 = Math.min(n, iNow + 72);
      var t24 = T.slice(iNow, k24).filter(function (x) { return x !== null; });
      opis = "Najbliższe 24 h: " + f1(Math.min.apply(null, t24)) + " do " +
        f1(Math.max.apply(null, t24)) + " °C, opad " + f1(suma(P.slice(iNow, k24))) +
        " mm · 72 h: opad " + f1(suma(P.slice(iNow, k72))) + " mm";
    }
    blok.innerHTML = '<div style="font-weight:bold;margin-bottom:2px">Gdynia – temperatura i opady</div>' + s +
      '<div style="font-size:11px;color:#444;margin-top:2px">' + opis + '</div>' +
      '<div style="font-size:10px;color:#666">Linia: temperatura (°C). Słupki: opad (mm/h, skala do ' +
      f1(pmax) + '). Doba wstecz i 3 dni prognozy.</div>';
  }

  function wczytaj() {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=54.5189&longitude=18.5305" +
      "&hourly=temperature_2m,precipitation&past_days=1&forecast_days=3&timezone=Europe%2FWarsaw")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(rysuj)
      .catch(function () { blok.textContent = "Wykres pogody: brak danych."; });
  }
  wczytaj();
  setInterval(wczytaj, 30 * 60 * 1000);
})();
