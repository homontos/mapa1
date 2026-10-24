(function () {
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
    "#rynek .s{font-size:11px;color:#555;margin-top:6px}";
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

  // Kolejnosc od dolu do gory: legenda, pogoda, rynek, widok i szukanie
  var panele = [
    ["legenda", "Legenda statków", true],
    ["fale-panel", "Pogoda morska", true],
    ["rynek", "Kursy i czas", false],
    ["szukaj-panel", "Widok i szukanie", false]
  ];
  panele.forEach(function (p) {
    var el = document.getElementById(p[0]);
    if (el) opakuj(el, p[1], p[2]);
  });

  // Dla kolejnych etapow: ramka ze szczegolami (zdarzenia, samoloty)
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
})();
