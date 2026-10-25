(function () {
  var WIERSZE = [["usd", "r-usd"], ["eur", "r-eur"], ["brent", "r-brent"]];

  function proc(h, ile) {
    if (h.length < 2) return null;
    var koniec = h[h.length - 1][1];
    var start = h[Math.max(0, h.length - 1 - ile)][1];
    return (koniec - start) / start * 100;
  }
  function tekstZmiany(p) {
    if (p === null) return "–";
    return (p >= 0 ? "▲ +" : "▼ ") + p.toFixed(2).replace(".", ",") + "%";
  }
  function wykres(h) {
    var v = h.map(function (x) { return x[1]; });
    var min = Math.min.apply(null, v), max = Math.max.apply(null, v);
    var zakres = (max - min) || 1;
    var pkt = v.map(function (y, i) {
      return (i * (250 / (v.length - 1))).toFixed(1) + "," +
        (32 - (y - min) / zakres * 30).toFixed(1);
    }).join(" ");
    var kolor = v[v.length - 1] >= v[0] ? "#2f9e44" : "#e03131";
    return '<svg viewBox="0 0 250 34" width="100%" height="34" preserveAspectRatio="none">' +
      '<polyline fill="none" stroke="' + kolor + '" stroke-width="2" points="' + pkt + '"/></svg>';
  }

  function rysuj() {
    fetch("rynek.json?t=" + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (d) {
        document.querySelectorAll("#rynek .wyk").forEach(function (e) { e.remove(); });
        WIERSZE.forEach(function (p) {
          var h = d[p[0]] && d[p[0]].hist;
          var wiersz = document.getElementById(p[1]);
          if (!h || h.length < 2 || !wiersz) return;
          var rodzic = wiersz.parentNode;
          var blok = document.createElement("div");
          blok.className = "wyk";
          blok.innerHTML = wykres(h);
          var opis = document.createElement("div");
          opis.style.cssText = "font-size:11px;color:#555;margin-bottom:6px";
          opis.textContent = "5 dni rob.: " + tekstZmiany(proc(h, 5)) +
            " · " + (h.length - 1) + " dni rob.: " + tekstZmiany(proc(h, h.length - 1));
          blok.appendChild(opis);
          rodzic.parentNode.insertBefore(blok, rodzic.nextSibling);
        });
      })
      .catch(function () {});
  }
  rysuj();
  setInterval(rysuj, 10 * 60 * 1000);
})();
