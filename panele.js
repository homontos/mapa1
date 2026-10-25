(function () {
  var SZARY = { kolor: "#8a8a8a", krycie: 0.6 };   // krycie 0 = bez szarosci, 1 = cala szara

  var css =
    "#lewa{position:fixed;left:10px;bottom:28px;z-index:3;width:300px;" +
    "max-width:calc(100vw - 70px);max-height:calc(100% - 40px);overflow-y:auto;" +
    "display:flex;flex-direction:column-reverse;gap:8px}" +
    "#lewa .panel{position:static!important;max-width:none!important;" +
    "width:auto!important;left:auto!important;right:auto!important;" +
    "top:auto!important;bottom:auto!important}" +
    ".p-nag{display:flex;justify-content:space-between;align-items:center;" +
    "font-weight:bold;cursor:pointer}" +
    ".p-nag button{border:0;background:none;font-size:18px;cursor:pointer}" +
    ".p-tresc{margin-top:6px}" +
    ".p-zwiniety .p-tresc{display:none}" +
    "#rynek .w{display:flex;justify-content:space-between;margin:2px 0}" +
    "#rynek .s{font-size:11px;color:#555;margin-top:6px}" +
    "#wiad-lista{max-height:220px;overflow-y:auto}" +
    "#wiad .l{margin:6px 0;padding-left:6px;font-size:12px;cursor:pointer}" +
    "#wiad .g{color:#555;font-size:10px;margin-top:4px}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var lewa = document.createElement("div");
  lewa.id = "lewa";
  document.body.appendChild(lewa);

  function opakuj(el, tytul, zwiniety) {
    var tresc = document.createElement("div");
    tresc.className = "p-tresc";
    while (el.firstChild) tresc.appendChild(el.firstChild);
    var nag = document.createElement("div");
    nag.className = "p-nag";
    var t = document.createElement("span");
    t.textContent = tytul;
    var b = document.createElement("button");
    b.textContent = "–";
    nag.appendChild(t);
    nag.appendChild(b);
    el.appendChild(nag);
    el.appendChild(tresc);
    nag.addEventListener("click", function () {
      var z = el.classList.toggle("p-zwiniety");
      b.textContent = z ? "+" : "–";
    });
    if (zwiniety) {
      el.classList.add("p-zwiniety");
      b.textContent = "+";
    }
    lewa.appendChild(el);
    return tresc;
  }

  // Ramka: rynek i czas
  var rynek = document.createElement("div");
  rynek.id = "rynek";
  rynek.className = "panel";
  rynek.innerHTML =
    '<div class="w"><span>USD/PLN</span><b id="r-usd">–</b></div>' +
    '<div class="w"><span>EUR/PLN</span><b id="r-eur">–</b></div>' +
    '<div class="w"><span>Ropa Brent</span><b id="r-brent">–</b></div>' +
    '<div class="s" id="r-info"></div>' +
    '<div class="s">Czas</div>' +
    '<div class="w"><span>Polska</span><b id="c-pl">–</b></div>' +
    '<div class="w"><span>UTC</span><b id="c-utc">–</b></div>' +
    '<div class="w"><span>Ormuz (Oman/ZEA, UTC+4)</span><b id="c-ormuz">–</b></div>' +
    '<div class="w"><span>Iran (UTC+3:30)</span><b id="c-iran">–</b></div>';
  document.body.appendChild(rynek);

  // Ramka: wiadomosci
  var wiad = document.createElement("div");
  wiad.id = "wiad";
  wiad.className = "panel";
  wiad.innerHTML = '<div id="wiad-lista">Ładowanie…</div>' +
    '<div class="g">Zdania tworzone automatycznie z danych GDELT, to nie jest ' +
    'tłumaczenie doniesień. Godzina = czas publikacji w mediach. ' +
    'Dotknij wiersza, aby przejść na mapie.</div>';
  document.body.appendChild(wiad);

  // Kolejnosc od dolu do gory. Wszystkie ramki startuja zwiniete.
  var panele = [
    ["legenda", "Legenda", true],
    ["fale-panel", "Pogoda morska", true],
    ["rynek", "Kursy i czas", true],
    ["wiad", "Wiadomości (ostatnie godziny)", true],
    ["szukaj-panel", "Widok i szukanie", true]
  ];
  panele.forEach(function (p) {
    var el = document.getElementById(p[0]);
    if (el) opakuj(el, p[1], p[2]);
  });

  // Ramka ze szczegolami (zdarzenia)
  window.pokazSzczegoly = function (tytul, wezel) {
    var el = document.getElementById("szczegoly");
    if (!el) {
      el = document.createElement("div");
      el.id = "szczegoly";
      el.className = "panel";
      opakuj(el, tytul, false);
    }
    el.querySelector(".p-nag span").textContent = tytul;
    var tresc = el.querySelector(".p-tresc");
    tresc.innerHTML = "";
    tresc.appendChild(wezel);
    el.classList.remove("p-zwiniety");
    el.querySelector(".p-nag button").textContent = "–";
  };

  // Zegary
  function czas(strefa) {
    return new Intl.DateTimeFormat("pl-PL", {
      timeZone: strefa, hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).format(new Date());
  }
  function zegary() {
    document.getElementById("c-pl").textContent = czas("Europe/Warsaw");
    document.getElementById("c-utc").textContent = czas("UTC");
    document.getElementById("c-ormuz").textContent = czas("Asia/Dubai");
    document.getElementById("c-iran").textContent = czas("Asia/Tehran");
  }
  zegary();
  setInterval(zegary, 1000);

  // Kursy
  function fmt(x, m) {
    return x.toLocaleString("pl-PL", { minimumFractionDigits: m, maximumFractionDigits: m });
  }
  function kursy() {
    fetch("rynek.json?t=" + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.usd) document.getElementById("r-usd").textContent = fmt(d.usd.kurs, 4) + " zł";
        if (d.eur) document.getElementById("r-eur").textContent = fmt(d.eur.kurs, 4) + " zł";
        if (d.brent) document.getElementById("r-brent").textContent = fmt(d.brent.cena, 2) + " USD";
        var info = [];
        if (d.usd) info.push("Kursy NBP z " + d.usd.data);
        if (d.brent) info.push("Brent: " + d.brent.data + " " + d.brent.godzina + " (opóźnione)");
        document.getElementById("r-info").textContent = info.join(" · ");
      })
      .catch(function () {});
  }
  kursy();
  setInterval(kursy, 10 * 60 * 1000);

  // Wiadomosci
  function wczytajWiad() {
    var box = document.getElementById("wiad-lista");
    fetch("wiadomosci.json?t=" + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (d) {
        box.innerHTML = "";
        (d.lista || []).forEach(function (x) {
          var w = document.createElement("div");
          w.className = "l";
          w.style.borderLeft = "3px solid " + (x.kat === "polska" ? "#1971c2" : "#e03131");
          var g = new Date(x.t).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
          w.appendChild(document.createTextNode(g + " · " + x.z + " "));
          if (/^https?:\/\//.test(x.u || "")) {
            var a = document.createElement("a");
            a.href = x.u; a.target = "_blank"; a.rel = "noopener";
            a.textContent = "↗";
            a.addEventListener("click", function (e) { e.stopPropagation(); });
            w.appendChild(a);
          }
          w.addEventListener("click", function () {
            map.flyTo({ center: [x.lon, x.lat], zoom: Math.max(map.getZoom(), 8) });
          });
          box.appendChild(w);
        });
        if (!box.firstChild) box.textContent = "Brak zdarzeń z ostatnich godzin.";
      })
      .catch(function () { box.textContent = "Brak danych."; });
  }
  wczytajWiad();
  setInterval(wczytajWiad, 10 * 60 * 1000);

  // Lekko szara mapa szczegolowa (nakladka pod statkami i znacznikami)
  function nalozSzary() {
    if (typeof aktualnyPodklad === "undefined" || aktualnyPodklad !== "szczegolowa") return;
    if (map.getLayer("szary-filtr")) return;
    map.addLayer({
      id: "szary-filtr", type: "background",
      paint: { "background-color": SZARY.kolor, "background-opacity": SZARY.krycie }
    }, map.getLayer("statki-postoj") ? "statki-postoj" : undefined);
  }
  map.on("style.load", nalozSzary);
  if (map.isStyleLoaded()) nalozSzary();

  // Zdjecie statku z Wikimedia Commons (jesli jest pod ta nazwa)
  var orygStatek = window.pokazPopupStatku;
  if (typeof orygStatek === "function") {
    window.pokazPopupStatku = function (p, poz) {
      orygStatek(p, poz);
      var nazwa = (p.nazwa || "").trim();
      if (nazwa.length < 4) return;
      var tr = document.querySelectorAll(".maplibregl-popup-content");
      var el = tr[tr.length - 1];
      if (!el) return;
      var adres = "https://commons.wikimedia.org/w/api.php?action=query&format=json" +
        "&origin=*&generator=search&gsrnamespace=6&gsrlimit=6&prop=imageinfo" +
        "&iiprop=url&iiurlwidth=300&gsrsearch=" + encodeURIComponent(nazwa + " ship");
      fetch(adres)
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var str = d.query && d.query.pages ? d.query.pages : {};
          var n = nazwa.toLowerCase();
          var trafione = Object.keys(str).map(function (k) { return str[k]; })
            .filter(function (s) {
              return s.title && s.title.toLowerCase().indexOf(n) !== -1 &&
                s.imageinfo && s.imageinfo[0] && s.imageinfo[0].thumburl;
            });
          if (!trafione.length) return;
          var ii = trafione[0].imageinfo[0];
          if (ii.thumburl.indexOf("https://") !== 0) return;
          var img = document.createElement("img");
          img.src = ii.thumburl;
          img.alt = "Zdjęcie statku";
          img.style.cssText = "width:100%;border-radius:4px;margin-top:6px";
          el.appendChild(img);
          var a = document.createElement("a");
          a.textContent = "Zdjęcie: Wikimedia Commons (może przedstawiać inny statek o tej nazwie)";
          if ((ii.descriptionurl || "").indexOf("https://") === 0) {
            a.href = ii.descriptionurl; a.target = "_blank"; a.rel = "noopener";
          }
          a.style.cssText = "display:block;font-size:11px;margin-top:2px";
          el.appendChild(a);
        })
        .catch(function () {});
    };
  }
})();
