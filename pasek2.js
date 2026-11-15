(function () {
  var pasek = document.getElementById("pasek");
  var utc = document.getElementById("pasek-utc");
  if (!pasek || !utc) return;

  var st = document.createElement("style");
  st.textContent =
    "#pasek-gora2{position:fixed;left:0;right:0;bottom:30px;height:26px;z-index:5;" +
    "display:flex;pointer-events:none}" +
    "#pasek-gora2>*{pointer-events:auto}" +
    "#klaster{flex:none;display:flex;align-items:center;height:26px;" +
    "background:rgba(17,17,17,0.92);border-radius:0 8px 0 0}" +
    "#klaster #licznik-zagr{border-left:0;padding:0 6px;height:26px}" +
    "#klaster #granica-odz{width:28px;height:26px}" +
    "#pilne-okno{flex:1;display:none;overflow:hidden;white-space:nowrap;background:#ffd43b;" +
    "color:#000;font:bold 13px sans-serif}" +
    "#pilne-tresc{display:inline-block;padding-left:100vw;line-height:26px;" +
    "animation:pilne-przewijaj 60s linear infinite}" +
    "#pilne-okno:hover #pilne-tresc,#pilne-okno:active #pilne-tresc{animation-play-state:paused}" +
    "@keyframes pilne-przewijaj{from{transform:translateX(0)}to{transform:translateX(-100%)}}" +
    "#pilne-okno a{color:#000;text-decoration:none}" +
    ".pilne-tag{background:#000;color:#ffd43b;font-size:11px;padding:1px 6px;" +
    "border-radius:3px;margin:0 8px 0 18px}" +
    ".maplibregl-ctrl-bottom-left{bottom:56px!important}" +
    "body.pilne-aktywne .maplibregl-ctrl-bottom-right{bottom:56px!important}";
  document.head.appendChild(st);

  var wiersz = document.createElement("div");
  wiersz.id = "pasek-gora2";
  var klaster = document.createElement("div");
  klaster.id = "klaster";
  klaster.style.minWidth = utc.offsetWidth + "px";
  var okno = document.createElement("div");
  okno.id = "pilne-okno";
  var tor = document.createElement("span");
  tor.id = "pilne-tresc";
  okno.appendChild(tor);
  wiersz.appendChild(klaster);
  wiersz.appendChild(okno);
  document.body.appendChild(wiersz);

  // Licznik i ikona granicy przechodza z paska do pola nad godzina UTC
  function przenies() {
    ["licznik-zagr", "granica-odz"].forEach(function (id) {
      var e = document.getElementById(id);
      if (e && e.parentNode !== klaster) {
        e.classList.remove("luzem");
        klaster.appendChild(e);
      }
    });
  }
  przenies();
  setTimeout(przenies, 500);
  setTimeout(przenies, 2000);

  function pokaz(lista) {
    tor.textContent = "";
    if (!lista || !lista.length) {
      okno.style.display = "none";
      document.body.classList.remove("pilne-aktywne");
      return;
    }
    lista.forEach(function (x) {
      var tag = document.createElement("span");
      tag.className = "pilne-tag";
      tag.textContent = "PILNE";
      tor.appendChild(tag);
      var a = document.createElement("a");
      a.textContent = x.t;
      if (/^https?:\/\//.test(x.u)) { a.href = x.u; a.target = "_blank"; a.rel = "noopener"; }
      tor.appendChild(a);
    });
    okno.style.display = "block";
    document.body.classList.add("pilne-aktywne");
    tor.style.animationDuration = Math.max(30, Math.round(tor.scrollWidth / 70)) + "s";
  }

  function wczytaj() {
    fetch("naglowki.json?t=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { pokaz(d.pilne); })
      .catch(function () { pokaz([]); });
  }
  wczytaj();
  setInterval(wczytaj, 5 * 60 * 1000);
})();
