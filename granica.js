(function () {
  var API = "https://neptun.in.ua/api/v1/threats";
  var PROMIEN_KM = 100;
  var POLSKA = [[14.12,53.93],[16.0,54.55],[17.5,54.9],[18.5,54.95],[19.6,54.55],
    [19.9,54.4],[20.4,54.38],[22.8,54.38],[23.5,54.2],[23.55,53.9],[23.95,52.75],
    [23.6,52.1],[23.55,51.55],[24.05,50.85],[23.5,50.4],[22.7,49.6],[22.85,49.05],
    [22.1,49.2],[21.6,49.4],[20.3,49.35],[19.5,49.2],[18.9,49.5],[18.5,49.9],
    [17.7,50.3],[16.9,50.4],[16.2,50.7],[15.0,51.0],[14.75,51.05],[14.7,52.0],
    [14.55,52.6],[14.15,52.9],[14.2,53.5]];
  var NAZWY = { uav: "Dron", recon: "Dron rozpoznawczy", missile: "Rakieta",
    ballistic: "Rakieta balistyczna", kab: "Bomba kierowana KAB", mig31k: "MiG-31K", unknown: "Obiekt" };

  var pasek = document.getElementById("pasek");
  var utc = document.getElementById("pasek-utc");
  if (!pasek || !utc) return;

  var st = document.createElement("style");
  st.textContent =
    "#pasek-ost{flex:none;display:none;align-items:center;padding:0 8px;color:#fff;" +
    "font:bold 12px sans-serif;white-space:nowrap;cursor:pointer}";
  document.head.appendChild(st);
  var odznaka = document.createElement("div");
  odznaka.id = "pasek-ost";
  pasek.insertBefore(odznaka, utc.nextSibling);

  function wPolsce(lon, lat) {
    var w = false;
    for (var i = 0, j = POLSKA.length - 1; i < POLSKA.length; j = i++) {
      var xi = POLSKA[i][0], yi = POLSKA[i][1], xj = POLSKA[j][0], yj = POLSKA[j][1];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) w = !w;
    }
    return w;
  }
  // odleglosc w km od granicy (0, jesli punkt jest w Polsce)
  function dystans(lon, lat) {
    if (wPolsce(lon, lat)) return 0;
    var kx = 111.32 * Math.cos(lat * Math.PI / 180), ky = 110.57, min = Infinity;
    for (var i = 0, j = POLSKA.length - 1; i < POLSKA.length; j = i++) {
      var ax = (POLSKA[j][0] - lon) * kx, ay = (POLSKA[j][1] - lat) * ky;
      var bx = (POLSKA[i][0] - lon) * kx, by = (POLSKA[i][1] - lat) * ky;
      var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      var t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
      var px = ax + t * dx, py = ay + t * dy, d = Math.sqrt(px * px + py * py);
      if (d < min) min = d;
    }
    return min;
  }

  var lista = [];

  function pokazOdznake() {
    if (!lista.length) { odznaka.style.display = "none"; return; }
    var n = lista[0];
    odznaka.textContent = n.km === 0
      ? "⚠ nad Polską (" + lista.length + ")"
      : "⚠ " + Math.round(n.km) + " km od granicy (" + lista.length + ")";
    odznaka.style.background = n.km < 50 ? "#c92a2a" : "#e8590c";
    odznaka.style.display = "flex";
  }

  odznaka.addEventListener("click", function () {
    if (!lista.length) return;
    var box = document.createElement("div");
    function wiersz(t, styl) {
      var d = document.createElement("div");
      d.style.margin = "4px 0";
      if (styl) d.style.cssText += styl;
      d.textContent = t;
      box.appendChild(d);
    }
    wiersz("Obiekty w promieniu " + PROMIEN_KM + " km od granicy Polski: " + lista.length);
    lista.slice(0, 8).forEach(function (x) {
      var t = x.t;
      var gdzie = t.locality || t.district || t.region || "";
      wiersz("• " + (NAZWY[t.type] || NAZWY.unknown) + " – " +
        (x.km === 0 ? "nad Polską" : Math.round(x.km) + " km od granicy") +
        (gdzie ? " (" + gdzie + ")" : ""));
    });
    wiersz("Nieoficjalne, szacunkowe pozycje z NEPTUN. Granica Polski na tej mapie jest uproszczona " +
      "(błąd rzędu kilkudziesięciu km). Nie zastępuje Alertu RCB, syren ani komunikatów " +
      "Dowództwa Operacyjnego.", "font-size:11px;color:#666;margin-top:8px");
    if (window.pokazSzczegoly) window.pokazSzczegoly("Blisko granicy Polski", box);
    map.flyTo({ center: [lista[0].t.lon, lista[0].t.lat], zoom: Math.max(map.getZoom(), 7) });
  });

  function odswiez() {
    if (document.hidden) return;
    fetch(API)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var nowa = [];
        (d.threats || []).forEach(function (t) {
          if (t.status === "resolved" || t.status === "stale" || t.advisory || t.areaOnly) return;
          if (typeof t.lat !== "number" || typeof t.lon !== "number") return;
          var km = dystans(t.lon, t.lat);
          if (km <= PROMIEN_KM) nowa.push({ t: t, km: km });
        });
        nowa.sort(function (a, b) { return a.km - b.km; });
        lista = nowa;
        pokazOdznake();
      })
      .catch(function () {});
  }
  odswiez();
  setInterval(odswiez, 30000);
})();
