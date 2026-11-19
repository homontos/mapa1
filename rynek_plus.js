(function () {
  var panel = document.getElementById("rynek");
  var info = document.getElementById("r-info");
  if (!panel || !info) return;

  var blok = document.createElement("div");
  blok.id = "rynek-plus";
  blok.style.cssText = "border-top:1px solid #ddd;margin-top:6px;padding-top:4px";
  info.parentNode.insertBefore(blok, info);

  function fmt(x, m) {
    return x.toLocaleString("pl-PL", { minimumFractionDigits: m, maximumFractionDigits: m });
  }
  function proc(h, ile) {
    if (h.length < 2) return null;
    var k = h[h.length - 1][1], s = h[Math.max(0, h.length - 1 - ile)][1];
    return (k - s) / s * 100;
  }
  function zmiana(p) {
    return p === null ? "–" : (p >= 0 ? "▲ +" : "▼ ") + fmt(p, 2) + "%";
  }
  function wykres(h) {
    var v = h.map(function (x) { return x[1]; });
    var min = Math.min.apply(null, v), max = Math.max.apply(null, v), z = (max - min) || 1;
    var pkt = v.map(function (y, i) {
      return (i * (250 / (v.length - 1))).toFixed(1) + "," + (32 - (y - min) / z * 30).toFixed(1);
    }).join(" ");
    var kolor = v[v.length - 1] >= v[0] ? "#2f9e44" : "#e03131";
    return '<svg viewBox="0 0 250 34" width="100%" height="34" preserveAspectRatio="none">' +
      '<polyline fill="none" stroke="' + kolor + '" stroke-width="2" points="' + pkt + '"/></svg>';
  }
  function wiersz(etykieta, wartosc) {
    var d = document.createElement("div");
    d.style.cssText = "display:flex;justify-content:space-between;margin:2px 0";
    var a = document.createElement("span"), b = document.createElement("b");
    a.textContent = etykieta;
    b.textContent = wartosc;
    d.appendChild(a); d.appendChild(b);
    blok.appendChild(d);
  }
  function seria(etykieta, o, jednostka, miejsca) {
    wiersz(etykieta, fmt(o.cena, miejsca) + jednostka);
    if (o.hist && o.hist.length > 1) {
      var w = document.createElement("div");
      w.innerHTML = wykres(o.hist);
      blok.appendChild(w);
      var op = document.createElement("div");
      op.style.cssText = "font-size:11px;color:#555;margin-bottom:6px";
      op.textContent = "5 notowań: " + zmiana(proc(o.hist, 5)) + " · " + (o.hist.length - 1) +
        " notowań: " + zmiana(proc(o.hist, o.hist.length - 1)) + " (stan z " + o.data + ")";
      blok.appendChild(op);
    }
  }

  function rysuj(d) {
    blok.textContent = "";
    if (d.wig20) seria("WIG20", d.wig20, " pkt", 2);
    if (d.zloto) seria("Złoto (1 g, NBP)", d.zloto, " zł", 2);
    if (d.paliwa) {
      var p = d.paliwa;
      if (p.pb95) wiersz("Pb95 (śr. Polska)", fmt(p.pb95, 2) + " zł/l");
      if (p.on) wiersz("ON (śr. Polska)", fmt(p.on, 2) + " zł/l");
      if (p.lpg) wiersz("LPG (śr. Polska)", fmt(p.lpg, 2) + " zł/l");
      var u = document.createElement("div");
      u.style.cssText = "font-size:10px;color:#666;margin:2px 0 4px";
      u.textContent = "Paliwa: średnie krajowe wg Komisji Europejskiej (Weekly Oil Bulletin), dane tygodniowe " +
        "z " + p.data + " z kilkudniowym opóźnieniem, przeliczone po kursie NBP. Ceny na stacjach mogą się różnić.";
      blok.appendChild(u);
    }
    if (!blok.firstChild) blok.textContent = "Brak dodatkowych danych rynkowych.";
  }

  function wczytaj() {
    fetch("rynek_plus.json?t=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(rysuj)
      .catch(function () { blok.textContent = ""; });
  }
  wczytaj();
  setInterval(wczytaj, 10 * 60 * 1000);
})();
