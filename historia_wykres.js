(function () {
  var czesci = location.pathname.split("/").filter(Boolean);
  var BAZA = "https://raw.githubusercontent.com/" + location.hostname.split(".")[0] + "/" +
    (czesci[0] || "") + "/dane/";
  var panel = document.getElementById("hist-panel");
  var suwak = document.getElementById("h-suwak");
  if (!panel || !suwak) return;

  var DRONY = { uav: 1, recon: 1, missile: 1, ballistic: 1 };
  var KRYT = { missile: 1, ballistic: 1 };
  var otwarty = false, seria = null;

  var st = document.createElement("style");
  st.textContent =
    "#h-wyk{margin:4px 0;border-top:1px solid rgba(255,255,255,0.15);padding-top:4px}" +
    "#h-wyk-gl{display:flex;align-items:center;gap:8px;cursor:pointer}" +
    "#h-wyk-gl .t{flex:1;font-size:12px}" +
    "#h-wyk-tr{display:none;margin-top:4px}" +
    "#h-wyk-tr svg{display:block;width:100%;cursor:pointer}";
  document.head.appendChild(st);

  var blok = document.createElement("div");
  blok.id = "h-wyk";
  blok.innerHTML =
    '<div id="h-wyk-gl"><span id="h-wyk-spark"></span><span class="t" id="h-wyk-t">Drony i rakiety · ładowanie…</span>' +
    '<span id="h-wyk-strz">▾</span></div><div id="h-wyk-tr"></div>';
  suwak.parentNode.insertBefore(blok, suwak);
  var gl = document.getElementById("h-wyk-gl"), tekst = document.getElementById("h-wyk-t");
  var spark = document.getElementById("h-wyk-spark"), tr = document.getElementById("h-wyk-tr");
  var strz = document.getElementById("h-wyk-strz");

  function hhmm(t) { return new Date(t * 1000).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }); }

  function policz(h) {
    var v = [], ev = [], poprz = {};
    h.snapshoty.forEach(function (x, i) {
      if (x.bn) return;                          // brak danych Neptuna w tym zapisie
      var suma = 0, ids = {};
      (x.n || []).forEach(function (r) {
        if (r[7] || !DRONY[r[1]]) return;
        suma += r[6] > 0 ? r[6] : 1;
        var k = r[0] || (r[1] + Math.round(r[2] * 10) + "_" + Math.round(r[3] * 10));
        ids[k] = 1;
        if (i > 0 && KRYT[r[1]] && !poprz[k]) ev.push(x.t);
      });
      v.push([x.t, suma]);
      poprz = ids;
    });
    var sr = v.map(function (p) {
      var o = v.filter(function (q) { return q[0] <= p[0] && q[0] >= p[0] - 1800; });
      return [p[0], o.reduce(function (s, q) { return s + q[1]; }, 0) / o.length];
    });
    return { v: v, ev: ev, sr: sr };
  }

  function nowa(a, k) { return document.createElementNS("http://www.w3.org/2000/svg", a); }

  function rysuj() {
    if (!seria || seria.v.length < 2) { tekst.textContent = "Drony i rakiety · za mało danych"; spark.textContent = ""; return; }
    var now = Date.now() / 1000;
    var t0 = Math.max(seria.v[0][0], now - 720 * 60), t1 = now;
    var v = seria.v.filter(function (p) { return p[0] >= t0; });
    var mx = v.reduce(function (a, p) { return p[1] > a[1] ? p : a; }, v[0]);
    var godz = Math.max(1, Math.round((t1 - t0) / 3600));
    tekst.textContent = "Drony i rakiety · " + godz + " h, najwięcej naraz: " + mx[1] + " o " + hhmm(mx[0]);

    var maxY = Math.max(4, Math.ceil(mx[1] * 1.1));
    // miniatura
    var sp = v.map(function (p) {
      return (((p[0] - t0) / (t1 - t0)) * 78 + 1).toFixed(1) + "," + (21 - p[1] / maxY * 19).toFixed(1);
    }).join(" ");
    spark.innerHTML = '<svg viewBox="0 0 80 22" width="80" height="22"><polyline fill="none" stroke="#ffa94d" stroke-width="1.5" points="' + sp + '"/></svg>';

    // pelny wykres
    var W = 300, H = 124, L = 24, R = 296, top = 16, bot = 96;
    function X(t) { return L + (t - t0) / (t1 - t0) * (R - L); }
    function Y(x) { return bot - x / maxY * (bot - top); }
    var s = '<svg id="h-wyk-svg" viewBox="0 0 ' + W + " " + H + '">';
    [0, maxY / 2, maxY].forEach(function (g) {
      s += '<line x1="' + L + '" y1="' + Y(g).toFixed(1) + '" x2="' + R + '" y2="' + Y(g).toFixed(1) +
        '" stroke="rgba(255,255,255,0.15)" stroke-width="0.7"/>' +
        '<text x="' + (L - 3) + '" y="' + (Y(g) + 3).toFixed(1) + '" font-size="8" fill="#aab" text-anchor="end">' +
        (Math.round(g * 10) / 10) + '</text>';
    });
    var d = new Date(t0 * 1000); d.setMinutes(0, 0, 0);
    for (var tt = d.getTime() / 1000; tt <= t1; tt += 3600) {
      if (tt < t0 || new Date(tt * 1000).getHours() % 3) continue;
      s += '<line x1="' + X(tt).toFixed(1) + '" y1="' + top + '" x2="' + X(tt).toFixed(1) + '" y2="' + bot +
        '" stroke="rgba(255,255,255,0.1)" stroke-width="0.7"/>' +
        '<text x="' + X(tt).toFixed(1) + '" y="' + (H - 4) + '" font-size="8" fill="#aab" text-anchor="middle">' +
        hhmm(tt) + '</text>';
    }
    v.forEach(function (p) {
      s += '<line x1="' + X(p[0]).toFixed(1) + '" y1="' + bot + '" x2="' + X(p[0]).toFixed(1) + '" y2="' + Y(p[1]).toFixed(1) +
        '" stroke="#ff922b" stroke-width="2" opacity="0.55"/>';
    });
    var lin = seria.sr.filter(function (p) { return p[0] >= t0; }).map(function (p) {
      return X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1);
    }).join(" ");
    s += '<polyline fill="none" stroke="#ffffff" stroke-width="1.8" points="' + lin + '"/>';
    seria.ev.filter(function (e) { return e >= t0; }).forEach(function (e) {
      s += '<circle cx="' + X(e).toFixed(1) + '" cy="' + (bot + 6) + '" r="2.6" fill="#ff6b6b"/>';
    });
    s += '<line id="h-wyk-kursor" x1="0" y1="' + top + '" x2="0" y2="' + bot +
      '" stroke="#9ec5ff" stroke-width="1" stroke-dasharray="3,2"/>';
    var ost = v[v.length - 1][1];
    var sr = Math.round(v.reduce(function (a, p) { return a + p[1]; }, 0) / v.length);
    var pig = ost + " · śr. " + sr;
    var pw = pig.length * 5.4 + 10;
    s += '<rect x="' + (R - pw) + '" y="1" width="' + pw + '" height="13" rx="6" fill="rgba(255,255,255,0.9)"/>' +
      '<text x="' + (R - pw / 2) + '" y="10.5" font-size="9" font-weight="bold" fill="#222" text-anchor="middle">' + pig + '</text>';
    s += '</svg>';
    tr.innerHTML = s;
    kursor();

    var svg = document.getElementById("h-wyk-svg");
    svg.addEventListener("click", function (e) {
      var r = svg.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width * W;
      var t = t0 + (x - L) / (R - L) * (t1 - t0);
      var off = Math.round((t - Date.now() / 1000) / 60);
      off = Math.max(+suwak.min, Math.min(0, off));
      suwak.value = off;
      suwak.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  function kursor() {
    var k = document.getElementById("h-wyk-kursor");
    if (!k || !seria || seria.v.length < 2) return;
    var now = Date.now() / 1000;
    var t0 = Math.max(seria.v[0][0], now - 720 * 60);
    var t = now + (+suwak.value) * 60;
    var x = 24 + (t - t0) / (now - t0) * (296 - 24);
    x = Math.max(24, Math.min(296, x));
    k.setAttribute("x1", x); k.setAttribute("x2", x);
  }
  suwak.addEventListener("input", kursor);
  setInterval(kursor, 5000);

  gl.addEventListener("click", function () {
    otwarty = !otwarty;
    tr.style.display = otwarty ? "block" : "none";
    strz.textContent = otwarty ? "▴" : "▾";
    if (otwarty) kursor();
  });

  function wczytaj() {
    fetch(BAZA + "historia_ruchu.json?t=" + Math.floor(Date.now() / 60000))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (h) { seria = policz(h); rysuj(); })
      .catch(function () { tekst.textContent = "Drony i rakiety · brak danych historii"; });
  }
  new MutationObserver(function () { if (panel.style.display === "block") wczytaj(); })
    .observe(panel, { attributes: true, attributeFilter: ["style"] });
  setInterval(function () { if (panel.style.display === "block") wczytaj(); }, 60000);
})();
