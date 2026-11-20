(function () {
  var czesci = location.pathname.split("/").filter(Boolean);
  var BAZA = "https://raw.githubusercontent.com/" + location.hostname.split(".")[0] + "/" +
    (czesci[0] || "") + "/dane/";
  var lewa = document.getElementById("lewa");
  var NAZWY = { uav: "Dron", recon: "Dron rozpoznawczy", missile: "Rakieta", ballistic: "Rakieta balistyczna",
    kab: "Bomba KAB", mig31k: "MiG-31K", unknown: "Obiekt" };
  var PREDKOSCI = [1, 2, 5, 10];            // minut historii na sekunde
  var historia = null, aktywna = false, offset = 0, gra = false, iPred = 0;
  var wewn = false, patchGotowy = false, moj = "", ostatniaRamka = null;
  var niep = { type: "FeatureCollection", features: [] };
  var slad = { type: "FeatureCollection", features: [] };

  var st = document.createElement("style");
  st.textContent =
    "#hist-panel{position:fixed;left:50%;transform:translateX(-50%);bottom:62px;z-index:6;" +
    "width:calc(100vw - 16px);max-width:540px;display:none;box-sizing:border-box;" +
    "background:rgba(20,24,30,0.84);backdrop-filter:blur(6px);color:#fff;border-radius:12px;" +
    "padding:8px 10px;font:13px sans-serif;box-shadow:0 2px 10px rgba(0,0,0,0.5)}" +
    "#hist-panel .h-w{display:flex;align-items:center;gap:6px;margin-bottom:4px}" +
    "#hist-panel button{border:0;border-radius:8px;padding:6px 9px;font:bold 12px sans-serif;" +
    "background:rgba(255,255,255,0.18);color:#fff;cursor:pointer}" +
    "#hist-panel #h-live.zywo{background:#c92a2a}" +
    "#hist-panel #h-zegar{flex:1;text-align:center;font-weight:bold;font-variant-numeric:tabular-nums}" +
    "#hist-panel input[type=range]{width:100%;margin:6px 0}" +
    "#h-podsum{font-size:12px;color:#dde}#h-podsum a{color:#9ec5ff;cursor:pointer}" +
    "#h-info{font-size:11px;color:#aab;margin-top:2px}";
  document.head.appendChild(st);

  var p = document.createElement("div");
  p.id = "hist-panel";
  p.innerHTML =
    '<div class="h-w"><button id="h-live" class="zywo">● NA ŻYWO</button>' +
    '<button id="h-graj">▶</button><button id="h-pred">×1</button>' +
    '<span id="h-zegar">–</span><button id="h-x" aria-label="Zamknij">✕</button></div>' +
    '<input type="range" id="h-suwak" min="-1440" max="0" step="1" value="0">' +
    '<div id="h-podsum">Ładowanie historii…</div>' +
    '<div id="h-info">Zapis co ok. 5 min, pozycje między zapisami są interpolowane. ' +
    '×1 = 1 min historii na sekundę. Nieoficjalne dane, nie zastępują syren.</div>';
  document.body.appendChild(p);
  var el = function (id) { return document.getElementById(id); };
  var suwak = el("h-suwak"), zegar = el("h-zegar"), podsum = el("h-podsum");

  // ---------- Warstwy pomocnicze ----------
  function dodaj() {
    if (map.getSource("hist-niep")) return;
    map.addSource("hist-niep", { type: "geojson", data: niep });
    map.addLayer({ id: "hist-niep-fill", type: "fill", source: "hist-niep",
      paint: { "fill-color": "#e8590c", "fill-opacity": 0.1 } });
    map.addLayer({ id: "hist-niep-line", type: "line", source: "hist-niep",
      paint: { "line-color": "#e8590c", "line-width": 1, "line-dasharray": [2, 2] } });
    map.addSource("hist-slad", { type: "geojson", data: slad });
    map.addLayer({ id: "hist-slad", type: "line", source: "hist-slad",
      paint: { "line-color": "#ffa94d", "line-width": 2, "line-opacity": 0.8 } });
  }
  map.on("style.load", dodaj);
  if (map.isStyleLoaded()) dodaj();

  function zalatajSetData() {
    if (patchGotowy) return;
    var zr = map.getSource("neptun") || map.getSource("samoloty");
    if (!zr) return;
    var proto = Object.getPrototypeOf(zr), oryg = proto.setData;
    proto.setData = function (d, w) {
      if (aktywna && !wewn && (this.id === "neptun" || this.id === "samoloty")) return this;
      return oryg.call(this, d, w);
    };
    patchGotowy = true;
  }
  function ustaw(id, dane) {
    var z = map.getSource(id);
    if (!z) return;
    wewn = true;
    try { z.setData(dane); } finally { wewn = false; }
  }

  // ---------- Licznik na pasku ----------
  var licznik = document.getElementById("licznik-zagr");
  if (licznik) {
    new MutationObserver(function () {
      if (aktywna && moj && licznik.textContent !== moj) licznik.textContent = moj;
    }).observe(licznik, { childList: true, characterData: true, subtree: true });
  }

  // ---------- Interpolacja ----------
  function znajdz(T) {
    var s = historia.snapshoty;
    if (T <= s[0].t) return [s[0], s[0]];
    if (T >= s[s.length - 1].t) return [s[s.length - 1], s[s.length - 1]];
    for (var i = 1; i < s.length; i++) if (T <= s[i].t) return [s[i - 1], s[i]];
  }
  function mieszaj(l0, l1, f, kl, iLat, iLon, luka) {
    var m0 = {}, m1 = {}, w = [];
    l0.forEach(function (r) { if (r[kl]) m0[r[kl]] = r; });
    l1.forEach(function (r) { if (r[kl]) m1[r[kl]] = r; });
    l0.forEach(function (r) {
      var q = r[kl] ? m1[r[kl]] : null;
      if (q && luka) w.push({ r: r, lat: r[iLat] + (q[iLat] - r[iLat]) * f, lon: r[iLon] + (q[iLon] - r[iLon]) * f });
      else if (f < 0.5 || !l1.length) w.push({ r: r, lat: r[iLat], lon: r[iLon] });
    });
    l1.forEach(function (r) {
      var q = r[kl] ? m0[r[kl]] : null;
      if ((!q || !luka) && f >= 0.5 && l0 !== l1) w.push({ r: r, lat: r[iLat], lon: r[iLon] });
    });
    return w;
  }
  function slady(T, biezace, kl, iLat, iLon, pole) {
    var wsp = {};
    historia.snapshoty.forEach(function (x) {
      if (x.t > T || x.t < T - 3600) return;
      (x[pole] || []).forEach(function (r) { if (r[kl]) (wsp[r[kl]] = wsp[r[kl]] || []).push([r[iLon], r[iLat]]); });
    });
    var c = [];
    biezace.forEach(function (o) {
      var k = o.r[kl];
      if (!k || !wsp[k]) return;
      var l = wsp[k].concat([[o.lon, o.lat]]);
      if (l.length > 1) c.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: l } });
    });
    return c;
  }
  function okrag(lon, lat, km) {
    var pt = [], n = 32;
    for (var i = 0; i <= n; i++) {
      var a = i / n * 2 * Math.PI;
      pt.push([lon + km / (111.32 * Math.cos(lat * Math.PI / 180)) * Math.cos(a), lat + km / 110.57 * Math.sin(a)]);
    }
    return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [pt] } };
  }
  function hhmm(t) { return new Date(t * 1000).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }); }

  // ---------- Rysowanie klatki ----------
  function rysuj() {
    if (!historia) return;
    var T = Date.now() / 1000 + offset * 60;
    var pr = znajdz(T), s0 = pr[0], s1 = pr[1];
    var f = s1.t === s0.t ? 0 : Math.max(0, Math.min(1, (T - s0.t) / (s1.t - s0.t)));
    var luka = (s1.t - s0.t) <= 1200;
    var sam = mieszaj(s0.a || [], s1.a || [], f, 0, 1, 2, luka);
    var nep = mieszaj(s0.n || [], s1.n || [], f, 0, 2, 3, luka);

    ustaw("samoloty", { type: "FeatureCollection", features: sam.map(function (o) {
      return { type: "Feature", properties: { hex: o.r[0], track: o.r[3], alt: o.r[4], flight: o.r[5], typ: o.r[6] },
        geometry: { type: "Point", coordinates: [o.lon, o.lat] } };
    }) });
    ustaw("neptun", { type: "FeatureCollection", features: nep.map(function (o) {
      var r = o.r;
      return { type: "Feature", properties: { id: r[0], type: r[1], heading: typeof r[4] === "number" ? r[4] : undefined,
        uncertainty: r[5] || 0, count: r[6], advisory: r[7], przygaszony: r[7] },
        geometry: { type: "Point", coordinates: [o.lon, o.lat] } };
    }) });
    niep = { type: "FeatureCollection", features: nep.filter(function (o) { return o.r[5] > 0; })
      .map(function (o) { return okrag(o.lon, o.lat, o.r[5]); }) };
    slad = { type: "FeatureCollection", features: slady(T, nep, 0, 2, 3, "n").concat(slady(T, sam, 0, 1, 2, "a")) };
    var a = map.getSource("hist-niep"), b = map.getSource("hist-slad");
    if (a) a.setData(niep);
    if (b) b.setData(slad);

    var dr = 0, rk = 0;
    nep.forEach(function (o) {
      if (o.r[7]) return;
      var c = o.r[6] > 0 ? o.r[6] : 1;
      if (o.r[1] === "uav" || o.r[1] === "recon") dr += c;
      if (o.r[1] === "missile" || o.r[1] === "ballistic") rk += c;
    });
    moj = "🛩️" + dr + " 🚀" + rk;
    if (aktywna && licznik) licznik.textContent = moj;
    ostatniaRamka = { nep: nep, T: T };
    var wiek = Math.round((T - s0.t) / 60);
    podsum.textContent = "";
    podsum.appendChild(document.createTextNode("Drony: " + dr + " · rakiety: " + rk +
      " · samoloty wojskowe: " + sam.length + (T > s1.t + 900 ? " (ostatni zapis o " + hhmm(s1.t) + ") " : " ")));
    var lnk = document.createElement("a");
    lnk.textContent = "Lista sygnałów";
    lnk.addEventListener("click", lista);
    podsum.appendChild(lnk);
    zegar.textContent = hhmm(T) + (offset === 0 ? " (teraz)" : " (" + offset + " min)");
  }

  function lista() {
    if (!ostatniaRamka || !window.pokazSzczegoly) return;
    var box = document.createElement("div");
    function w(t, styl) {
      var d = document.createElement("div");
      d.style.margin = "4px 0";
      if (styl) d.style.cssText += styl;
      d.textContent = t;
      box.appendChild(d);
      return d;
    }
    if (!ostatniaRamka.nep.length) w("Brak obiektów w tej klatce.");
    ostatniaRamka.nep.forEach(function (o) {
      var r = o.r;
      var d = w((NAZWY[r[1]] || NAZWY.unknown) + (r[6] > 1 ? " ×" + r[6] : "") +
        (r[4] !== null && r[4] !== undefined ? " · kurs " + Math.round(r[4]) + "°" : "") +
        (r[7] ? " · obserwacja" : "") + " (" + o.lat.toFixed(2) + ", " + o.lon.toFixed(2) + ")", "cursor:pointer");
      d.addEventListener("click", function () { map.flyTo({ center: [o.lon, o.lat], zoom: Math.max(map.getZoom(), 7) }); });
    });
    w("Klatka z " + hhmm(ostatniaRamka.T) + ". Nieoficjalne, szacunkowe dane z NEPTUN. Nie zastępują syren.",
      "font-size:11px;color:#666;margin-top:8px");
    window.pokazSzczegoly("Sygnały z wybranej klatki", box);
  }

  // ---------- Sterowanie ----------
  function przyciskLive() {
    var b = el("h-live");
    b.className = offset === 0 ? "zywo" : "";
    b.textContent = offset === 0 ? "● NA ŻYWO" : "↩ Na żywo";
  }
  function naZywo() {
    offset = 0; gra = false; el("h-graj").textContent = "▶";
    suwak.value = 0;
    if (aktywna) rysuj();            // ostatnia klatka, potem przejmuje biezace odswiezanie
    aktywna = false; moj = "";
    niep = { type: "FeatureCollection", features: [] }; slad = niep;
    var a = map.getSource("hist-niep"), b = map.getSource("hist-slad");
    if (a) a.setData(niep);
    if (b) b.setData(slad);
    przyciskLive();
    var T = Date.now() / 1000;
    zegar.textContent = hhmm(T) + " (teraz)";
  }
  function ustawOffset(v) {
    offset = Math.min(0, Math.round(v));
    suwak.value = offset;
    if (offset === 0 && !gra) { naZywo(); return; }
    aktywna = true;
    przyciskLive();
    rysuj();
  }
  suwak.addEventListener("input", function () { ustawOffset(+suwak.value); });
  el("h-live").addEventListener("click", naZywo);
  el("h-graj").addEventListener("click", function () {
    if (!historia) return;
    gra = !gra;
    el("h-graj").textContent = gra ? "⏸" : "▶";
    if (gra && offset >= 0) ustawOffset(+suwak.min);
  });
  el("h-pred").addEventListener("click", function () {
    iPred = (iPred + 1) % PREDKOSCI.length;
    el("h-pred").textContent = "×" + PREDKOSCI[iPred];
  });
  setInterval(function () {
    if (!gra) return;
    offset += PREDKOSCI[iPred];
    if (offset >= 0) { gra = false; el("h-graj").textContent = "▶"; naZywo(); return; }
    suwak.value = offset;
    aktywna = true;
    przyciskLive();
    rysuj();
  }, 1000);
  setInterval(function () {            // zegar "teraz" tyka na zywo
    if (p.style.display === "block" && offset === 0) zegar.textContent = hhmm(Date.now() / 1000) + " (teraz)";
  }, 15000);

  function wczytaj(cb) {
    fetch(BAZA + "historia_ruchu.json?t=" + Math.floor(Date.now() / 60000))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        historia = d;
        var s = d.snapshoty || [];
        if (s.length < 2) { podsum.textContent = "Za mało danych (zapisów: " + s.length + "). Historia wypełnia się z czasem."; return; }
        var wiek = Math.ceil((Date.now() / 1000 - s[0].t) / 60);
        suwak.min = -Math.min(1440, Math.max(1, wiek));
        zegar.textContent = hhmm(Date.now() / 1000) + " (teraz)";
        podsum.textContent = "Przesuń suwak w lewo, aby cofnąć czas. Dostępne: " + Math.min(1440, wiek) + " min.";
        if (cb) cb();
      })
      .catch(function () { podsum.textContent = "Brak historii. Sprawdź automat „Historia ruchu”."; });
  }

  // ---------- Ikona w menu ----------
  var btn = document.createElement("button");
  btn.className = "ikona-menu";
  btn.textContent = "✈️";
  btn.title = "Podgląd historii";
  btn.setAttribute("aria-label", "Podgląd historii");
  if (lewa) setTimeout(function () { lewa.appendChild(btn); }, 400);
  function zamknijPanel() {
    p.style.display = "none";
    btn.classList.remove("akt");
    if (aktywna) naZywo();
  }
  btn.addEventListener("click", function () {
    if (p.style.display === "block") { zamknijPanel(); return; }
    p.style.display = "block";
    btn.classList.add("akt");
    zalatajSetData();
    wczytaj();
  });
  el("h-x").addEventListener("click", zamknijPanel);
})();
