(function () {
  var css =
    "#pasek{position:fixed;left:0;right:0;bottom:0;height:30px;z-index:5;display:flex;" +
    "background:#111;color:#fff;font:13px sans-serif}" +
    "#pasek-utc{flex:none;background:#c92a2a;padding:0 10px;display:flex;" +
    "align-items:center;font-weight:bold;font-variant-numeric:tabular-nums}" +
    "#pasek-okno{flex:1;overflow:hidden;white-space:nowrap}" +
    "#pasek-tresc{display:inline-block;padding-left:100vw;line-height:30px;" +
    "animation:pasek-przewijaj 120s linear infinite}" +
    "#pasek-okno:hover #pasek-tresc,#pasek-okno:active #pasek-tresc{animation-play-state:paused}" +
    "@keyframes pasek-przewijaj{from{transform:translateX(0)}to{transform:translateX(-100%)}}" +
    "#pasek a{color:#fff;text-decoration:none}" +
    ".pt{font-size:11px;font-weight:bold;padding:1px 5px;border-radius:3px;margin:0 8px 0 22px}" +
    "#lewa{bottom:40px!important;max-height:calc(100% - 90px)!important}" +
    ".maplibregl-ctrl-bottom-right,.maplibregl-ctrl-bottom-left{bottom:30px!important}" +
    "#gdynia-pogoda{font-size:13px;border-bottom:1px solid #ddd;padding-bottom:6px;margin-bottom:6px}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  // ---------- Pasek wiadomosci i UTC ----------
  var pasek = document.createElement("div");
  pasek.id = "pasek";
  pasek.innerHTML = '<div id="pasek-utc">UTC --:--:--</div>' +
    '<div id="pasek-okno"><span id="pasek-tresc">Ładowanie wiadomości…</span></div>';
  document.body.appendChild(pasek);

  var fmtUtc = new Intl.DateTimeFormat("pl-PL", {
    timeZone: "UTC", hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  function utc() {
    document.getElementById("pasek-utc").textContent = "UTC " + fmtUtc.format(new Date());
  }
  utc();
  setInterval(utc, 1000);

  function zbuduj(d) {
    var tor = document.getElementById("pasek-tresc");
    tor.textContent = "";
    [["POLSKA", d.polska, "#c92a2a"], ["ŚWIAT", d.swiat, "#1971c2"]].forEach(function (g) {
      (g[1] || []).forEach(function (x) {
        var tag = document.createElement("span");
        tag.className = "pt";
        tag.style.background = g[2];
        tag.textContent = g[0];
        tor.appendChild(tag);
        var a = document.createElement("a");
        a.textContent = x.t;
        if (/^https?:\/\//.test(x.u)) { a.href = x.u; a.target = "_blank"; a.rel = "noopener"; }
        tor.appendChild(a);
      });
    });
    if (!tor.firstChild) { tor.textContent = "Brak wiadomości."; return; }
    tor.style.animationDuration = Math.max(60, Math.round(tor.scrollWidth / 70)) + "s";
  }
  function naglowki() {
    fetch("naglowki.json?t=" + Date.now())
      .then(function (r) { return r.json(); })
      .then(zbuduj)
      .catch(function () {
        document.getElementById("pasek-tresc").textContent = "Brak wiadomości.";
      });
  }
  naglowki();
  setInterval(naglowki, 10 * 60 * 1000);

  // ---------- Pogoda Gdyni w ramce pogody ----------
  var KODY = function (k) {
    if (k === 0) return "bezchmurnie";
    if (k <= 3) return "zachmurzenie częściowe lub pochmurno";
    if (k === 45 || k === 48) return "mgła";
    if (k >= 51 && k <= 57) return "mżawka";
    if (k >= 61 && k <= 67) return "deszcz";
    if (k >= 71 && k <= 77) return "śnieg";
    if (k >= 80 && k <= 82) return "przelotny deszcz";
    if (k === 85 || k === 86) return "przelotny śnieg";
    if (k >= 95) return "burza";
    return "";
  };
  var KIER = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  var panel = document.getElementById("fale-panel");
  var tresc = panel && panel.querySelector(".p-tresc");
  if (panel) {
    var tyt = panel.querySelector(".p-nag span");
    if (tyt) tyt.textContent = "Pogoda (Gdynia i morze)";
  }
  var blok = document.createElement("div");
  blok.id = "gdynia-pogoda";
  blok.textContent = "Gdynia: ładowanie…";
  if (tresc) tresc.insertBefore(blok, tresc.firstChild);

  function pogodaGdyni() {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=54.5189&longitude=18.5305" +
      "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m," +
      "wind_direction_10m,wind_gusts_10m,pressure_msl,cloud_cover&wind_speed_unit=kn")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var c = d.current || {};
        var n = function (x, m) { return Number(x).toFixed(m).replace(".", ","); };
        var linie = ["Gdynia – teraz"];
        linie.push(n(c.temperature_2m, 1) + " °C (odczuwalna " + n(c.apparent_temperature, 1) + " °C)" +
          (KODY(c.weather_code) ? ", " + KODY(c.weather_code) : ""));
        linie.push("Wiatr " + n(c.wind_speed_10m, 0) + " węzłów z " +
          KIER[Math.round(c.wind_direction_10m / 45) % 8] +
          ", porywy " + n(c.wind_gusts_10m, 0));
        linie.push("Ciśnienie " + Math.round(c.pressure_msl) + " hPa, zachmurzenie " +
          Math.round(c.cloud_cover) + "%");
        blok.textContent = "";
        linie.forEach(function (l, i) {
          var w = document.createElement("div");
          w.textContent = l;
          if (i === 0) w.style.fontWeight = "bold";
          blok.appendChild(w);
        });
      })
      .catch(function () { blok.textContent = "Gdynia: brak danych pogodowych."; });
  }
  pogodaGdyni();
  setInterval(pogodaGdyni, 15 * 60 * 1000);
})();
