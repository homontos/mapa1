(function () {
  var REG = ["Europa Wschodnia", "Bliski Wschód", "Azja i Pacyfik", "Afryka", "Ameryki"];
  var CENTRA = { "Europa Wschodnia": [[32, 50], 4.5], "Bliski Wschód": [[45, 29], 4.5],
    "Azja i Pacyfik": [[110, 20], 3], "Afryka": [[20, 5], 3], "Ameryki": [[-80, 15], 2.5] };
  var IKONY = { rakieta: "🚀", dron: "🛸", starcie: "💥", marynarka: "⚓", alarm: "⚠️", inne: "📍" };
  var ROTACJA = 25;
  var dane = [], widoczne = true, iReg = 0, pauza = false, sek = 0;
  var czesci = { type: "FeatureCollection", features: [] };

  function f(t) {
    return new Date(t * 1000).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
  function ikonaEmoji(e) {
    var c = document.createElement("canvas");
    c.width = 48; c.height = 48;
    var x = c.getContext("2d");
    x.fillStyle = "rgba(20,24,30,0.88)";
    x.beginPath(); x.arc(24, 24, 22, 0, 6.2832); x.fill();
    x.lineWidth = 2; x.strokeStyle = "rgba(255,255,255,0.7)"; x.stroke();
    x.font = "26px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(e, 24, 26);
    return x.getImageData(0, 0, 48, 48);
  }

  function dodaj() {
    Object.keys(IKONY).forEach(function (k) {
      if (!map.hasImage("sw-" + k)) map.addImage("sw-" + k, ikonaEmoji(IKONY[k]));
    });
    if (map.getSource("swiat")) return;
    map.addSource("swiat", { type: "geojson", data: czesci });
    map.addLayer({
      id: "swiat", type: "symbol", source: "swiat",
      layout: { visibility: widoczne ? "visible" : "none", "icon-image": ["concat", "sw-", ["get", "kat"]],
        "icon-size": 0.6, "icon-allow-overlap": true, "icon-ignore-placement": true }
    });
  }
  map.on("style.load", dodaj);
  if (map.isStyleLoaded()) dodaj();

  // ---------- Szczegoly ----------
  function szczegoly(ev) {
    var box = document.createElement("div");
    function w(t, styl) {
      var d = document.createElement("div");
      d.style.margin = "4px 0";
      if (styl) d.style.cssText += styl;
      d.textContent = t;
      box.appendChild(d);
    }
    w(ev.tekst, "font-size:14px");
    w("Region: " + ev.reg + " · " + f(ev.t), "font-size:12px;color:#555");
    var a = document.createElement("a");
    a.href = ev.u; a.target = "_blank"; a.rel = "noopener";
    a.textContent = "Źródło: " + ev.z + " ↗";
    if (ev.img && /^https:\/\//.test(ev.img)) {
      var im = document.createElement("img");
      im.src = ev.img; im.loading = "lazy"; im.alt = "Zdjęcie z posta";
      im.style.cssText = "width:100%;max-height:150px;object-fit:cover;border-radius:6px;margin:6px 0";
      box.appendChild(im);
    }
    a.style.fontSize = "12px";
    box.appendChild(a);
    w("Automatyczne streszczenie i tłumaczenie nagłówka (AI). Lokalizacja przybliżona. " +
      "Nieoficjalne, nie zastępuje komunikatów służb.", "font-size:11px;color:#666;margin-top:8px");
    if (window.pokazSzczegoly) window.pokazSzczegoly(IKONY[ev.kat] + " " + (ev.kraj || "Zdarzenie"), box);
  }
  map.on("click", "swiat", function (e) {
    var id = e.features[0].properties.id;
    var ev = dane.filter(function (z) { return z.id === id; })[0];
    if (ev) szczegoly(ev);
  });
  map.on("mouseenter", "swiat", function () { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", "swiat", function () { map.getCanvas().style.cursor = ""; });

  // ---------- Legenda ----------
  var tr = document.querySelector("#legenda .p-tresc") || document.getElementById("legenda");
  var blok = document.createElement("div");
  blok.style.marginTop = "8px";
  blok.innerHTML =
    '<label><input type="checkbox" id="sw-przel" checked> Zdarzenia militarne na świecie (RSS, 7 dni)</label>' +
    '<div style="font-size:12px;color:#444">🚀 rakieta · 🛸 dron · 💥 starcie · ⚓ marynarka · ⚠️ alarm · 📍 inne</div>' +
    '<div id="sw-status" style="font-size:11px;color:#555">brak danych</div>' +
    '<div style="font-size:10px;color:#666">Źródła: kanały RSS mediów. Streszczenia i tłumaczenia automatyczne (AI).</div>';
  tr.appendChild(blok);
  document.getElementById("sw-przel").addEventListener("change", function () {
    widoczne = this.checked;
    if (map.getLayer("swiat")) map.setLayoutProperty("swiat", "visibility", widoczne ? "visible" : "none");
  });

  // ---------- Wiadomosci: rotacja regionow co 25 s ----------
  var wiad = document.getElementById("wiad");
  var tresc = wiad && wiad.querySelector(".p-tresc");
  var lista = null, tytulR = null, pasek = null;
  if (tresc) {
    Array.prototype.forEach.call(tresc.children, function (c) { c.style.display = "none"; });
    var nagS = wiad.querySelector(".p-nag span");
    if (nagS) nagS.textContent = "Wiadomości militarne (regiony)";
    var ui = document.createElement("div");
    ui.innerHTML =
      '<div style="display:flex;align-items:center;gap:6px"><b id="sw-tytul" style="flex:1"></b>' +
      '<button id="sw-pauza">⏸</button><button id="sw-dalej">⏭</button></div>' +
      '<div style="height:2px;background:#ddd;margin:4px 0"><div id="sw-pasek" style="height:2px;background:#1c7ed6;width:0"></div></div>' +
      '<div id="sw-lista" style="max-height:240px;overflow-y:auto"></div>' +
      '<div style="font-size:10px;color:#666;margin-top:4px">Zmiana regionu co ' + ROTACJA + ' s. ' +
      'Dotknij wiersza, aby zobaczyć zdarzenie na mapie.</div>';
    tresc.appendChild(ui);
    lista = ui.querySelector("#sw-lista"); tytulR = ui.querySelector("#sw-tytul"); pasek = ui.querySelector("#sw-pasek");
    ui.querySelector("#sw-pauza").addEventListener("click", function () {
      pauza = !pauza; this.textContent = pauza ? "▶" : "⏸";
    });
    ui.querySelector("#sw-dalej").addEventListener("click", function () { nastepny(); });
  }

  function pokazRegion() {
    if (!lista) return;
    var r = REG[iReg];
    var ev = dane.filter(function (z) { return z.reg === r; });
    tytulR.textContent = "📡 " + r + " (" + ev.length + ")";
    lista.textContent = "";
    if (!ev.length) { lista.textContent = "Brak zdarzeń z ostatnich 7 dni."; return; }
    ev.slice(0, 12).forEach(function (z) {
      var d = document.createElement("div");
      d.style.cssText = "margin:5px 0;padding:4px 6px;border-left:3px solid #1c7ed6;cursor:pointer;font-size:13px";
      var m = document.createElement("div");
      m.style.cssText = "font-size:11px;color:#555;font-weight:bold";
      m.textContent = IKONY[z.kat] + " " + (z.kraj || "").toUpperCase() + " · " + f(z.t);
      d.appendChild(m);
      d.appendChild(document.createTextNode(z.tekst.split(". ")[0].replace(/\.?$/, ".")));
      d.addEventListener("click", function () {
        map.flyTo({ center: [z.lon, z.lat], zoom: Math.max(map.getZoom(), 6) });
        szczegoly(z);
      });
      lista.appendChild(d);
    });
  }
  function nastepny() { iReg = (iReg + 1) % REG.length; sek = 0; pokazRegion(); }
  setInterval(function () {
    if (pauza || !lista) return;
    sek++;
    if (pasek) pasek.style.width = Math.min(100, sek / ROTACJA * 100) + "%";
    if (sek >= ROTACJA) nastepny();
  }, 1000);

  // ---------- Statystyki 7 dni w ikonie 📊 ----------
  function sekcja() {
    var s = document.createElement("div");
    s.style.cssText = "margin-top:14px;border-top:1px solid #ddd;padding-top:8px";
    var h = document.createElement("div");
    h.style.fontWeight = "bold";
    h.textContent = "Zdarzenia militarne w regionach (7 dni, RSS)";
    s.appendChild(h);
    var razem = 0;
    REG.forEach(function (r, i) {
      var ev = dane.filter(function (z) { return z.reg === r; });
      razem += ev.length;
      var kat = {};
      ev.forEach(function (z) { kat[z.kat] = (kat[z.kat] || 0) + 1; });
      var opis = Object.keys(kat).map(function (k) { return IKONY[k] + kat[k]; }).join(" ");
      var w = document.createElement("div");
      w.style.cssText = "display:flex;justify-content:space-between;margin:5px 0;cursor:pointer;font-size:13px";
      w.innerHTML = "<span></span><b></b>";
      w.firstChild.textContent = r + (opis ? "  " + opis : "");
      w.lastChild.textContent = ev.length;
      w.addEventListener("click", function () {
        iReg = i; sek = 0; pokazRegion();
        map.flyTo({ center: CENTRA[r][0], zoom: CENTRA[r][1] });
      });
      s.appendChild(w);
    });
    var t = document.createElement("div");
    t.style.cssText = "font-size:12px;color:#555;margin-top:4px";
    t.textContent = "Łącznie: " + razem + ". Automatyczne tłumaczenie i klasyfikacja (AI), mogą zawierać błędy.";
    s.appendChild(t);
    return s;
  }
  var oryg = window.pokazSzczegoly;
  if (typeof oryg === "function") {
    window.pokazSzczegoly = function (tytul, wezel) {
      if (/statystyki/i.test(String(tytul))) wezel.appendChild(sekcja());
      return oryg.apply(this, arguments);
    };
  }

  // ---------- Dane ----------
  function wczytaj() {
    fetch("swiat.json?t=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        dane = d.zdarzenia || [];
        czesci = { type: "FeatureCollection", features: dane.map(function (z) {
          return { type: "Feature", properties: { id: z.id, kat: z.kat },
            geometry: { type: "Point", coordinates: [z.lon, z.lat] } };
        }) };
        var zr = map.getSource("swiat");
        if (zr) zr.setData(czesci);
        document.getElementById("sw-status").textContent = "Zdarzeń z 7 dni: " + dane.length +
          (d.czas ? " (stan z " + new Date(d.czas * 1000).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) + ")" : "");
        pokazRegion();
      })
      .catch(function () { document.getElementById("sw-status").textContent = "brak danych (sprawdź automat „RSS swiat”)"; });
  }
  wczytaj();
  setInterval(wczytaj, 10 * 60 * 1000);
})();
