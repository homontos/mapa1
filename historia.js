(function () {
  var METRYKI = [
    ["g", "Statki – Zatoka Gdańska"], ["o", "Statki – Ormuz"], ["b", "Statki – Bab el-Mandeb"],
    ["s", "Samoloty nad Polską"], ["a", "Alarmy lotnicze UA (liczba obszarów)"],
    ["d", "Drony i rakiety (NEPTUN)"]
  ];
  var lewa = document.getElementById("lewa");
  if (!lewa) return;

  var panel = document.createElement("div");
  panel.className = "panel p-zwiniety";
  panel.id = "historia";
  var nag = document.createElement("div");
  nag.className = "p-nag";
  nag.innerHTML = "<span>Historia (trendy dzienne)</span><button>+</button>";
  var tr = document.createElement("div");
  tr.className = "p-tresc";
  var sel = document.createElement("select");
  sel.style.cssText = "width:100%;font-size:16px;padding:6px;margin-bottom:6px";
  METRYKI.forEach(function (m) {
    var o = document.createElement("option");
    o.value = m[0]; o.textContent = m[1];
    sel.appendChild(o);
  });
  var wykres = document.createElement("div");
  var opis = document.createElement("div");
  opis.style.cssText = "font-size:12px;color:#444;margin-top:4px";
  var uwaga = document.createElement("div");
  uwaga.style.cssText = "font-size:10px;color:#666;margin-top:6px";
  uwaga.textContent = "Średnia dzienna z próbek zapisywanych co ok. 3 godz. W Ormuzie i Bab el-Mandeb " +
    "pozycje AIS mogą być fałszywe, więc to wskaźnik orientacyjny.";
  tr.appendChild(sel); tr.appendChild(wykres); tr.appendChild(opis); tr.appendChild(uwaga);
  panel.appendChild(nag); panel.appendChild(tr);
  nag.addEventListener("click", function () {
    var z = panel.classList.toggle("p-zwiniety");
    nag.querySelector("button").textContent = z ? "+" : "–";
  });
  lewa.appendChild(panel);

  var dane = null;
  function f(x) { return Math.round(x * 10) / 10; }

  function rysuj() {
    var m = sel.value;
    if (!dane) { wykres.textContent = "Brak danych."; opis.textContent = ""; return; }
    var pkt = [];
    Object.keys(dane.dni || {}).sort().forEach(function (k) {
      var w = dane.dni[k][m];
      if (w && w[1]) pkt.push([k, w[0] / w[1]]);
    });
    pkt = pkt.slice(-30);
    if (pkt.length < 2) {
      wykres.textContent = "Za mało danych (dni z pomiarem: " + pkt.length +
        "). Wykres wypełni się z kolejnymi dniami.";
      opis.textContent = pkt.length ? "Dziś: " + f(pkt[0][1]) : "";
      return;
    }
    var v = pkt.map(function (p) { return p[1]; });
    var min = Math.min.apply(null, v), max = Math.max.apply(null, v), zakres = (max - min) || 1;
    var n = pkt.length;
    var pts = v.map(function (y, i) {
      return (10 + i * (240 / (n - 1))).toFixed(1) + "," + (78 - (y - min) / zakres * 62).toFixed(1);
    });
    var ost = pts[n - 1].split(",");
    var kolor = v[n - 1] >= v[0] ? "#2f9e44" : "#e03131";
    wykres.innerHTML =
      '<svg viewBox="0 0 260 90" width="100%" height="90" preserveAspectRatio="none">' +
      '<polyline fill="none" stroke="' + kolor + '" stroke-width="2" points="' + pts.join(" ") + '"/>' +
      '<circle cx="' + ost[0] + '" cy="' + ost[1] + '" r="3" fill="' + kolor + '"/></svg>';
    var zm = v[n - 2] ? (v[n - 1] - v[n - 2]) / v[n - 2] * 100 : null;
    opis.textContent = "Ostatni dzień: " + f(v[n - 1]) + " · min " + f(min) + " · max " + f(max) +
      (zm === null ? "" : " · zmiana: " + (zm >= 0 ? "+" : "") + f(zm) + "%") +
      " · okres: " + pkt[0][0] + " do " + pkt[n - 1][0] + " (" + n + " dni)";
  }
  sel.addEventListener("change", rysuj);

  function wczytaj() {
    fetch("historia.json?t=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { dane = d; rysuj(); })
      .catch(function () { dane = null; rysuj(); });
  }
  wczytaj();
  setInterval(wczytaj, 30 * 60 * 1000);
})();
