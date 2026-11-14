(function () {
  var lewa = document.getElementById("lewa");
  if (!lewa) return;

  var st = document.createElement("style");
  st.textContent =
    "#lewa{top:10px!important;bottom:auto!important;left:6px!important;width:auto!important;" +
    "max-width:none!important;max-height:none!important;overflow:visible!important;" +
    "flex-direction:column!important;gap:6px!important;background:none!important;z-index:6}" +
    ".ikona-menu{width:36px;height:36px;border:0;border-radius:10px;padding:0;cursor:pointer;" +
    "background:rgba(255,255,255,0.35);backdrop-filter:blur(2px);font-size:18px;line-height:1;" +
    "opacity:0.55;box-shadow:none}" +
    ".ikona-menu.akt{opacity:1;background:rgba(255,255,255,0.92)}" +
    "#gora-panel{position:fixed;top:8px;left:52px;right:56px;z-index:5;display:none;" +
    "max-height:calc(100vh - 110px);max-height:calc(100dvh - 110px);overflow-y:auto;" +
    "background:rgba(255,255,255,0.88);backdrop-filter:blur(4px);border-radius:10px;" +
    "padding:8px 10px;box-shadow:0 1px 6px rgba(0,0,0,0.3);font:13px sans-serif;color:#222}" +
    "#gora-panel .panel{position:static!important;background:none!important;box-shadow:none!important;" +
    "padding:0!important;max-width:none!important;width:auto!important;display:block!important;" +
    "left:auto!important;right:auto!important;top:auto!important;bottom:auto!important}" +
    "#gora-panel .p-zwiniety .p-tresc{display:block!important}" +
    "#gora-panel .p-nag{cursor:default;padding-right:26px}" +
    "#gora-panel .p-nag button{display:none}" +
    "#gora-x{position:absolute;top:4px;right:6px;border:0;background:none;font-size:20px;" +
    "line-height:1;cursor:pointer;color:#444}" +
    "body.narzedzie #szczegoly-gora{display:none!important}";
  document.head.appendChild(st);

  var schowek = document.createElement("div");
  schowek.style.display = "none";
  document.body.appendChild(schowek);

  var gora = document.createElement("div");
  gora.id = "gora-panel";
  var krzyzyk = document.createElement("button");
  krzyzyk.id = "gora-x";
  krzyzyk.textContent = "×";
  krzyzyk.setAttribute("aria-label", "Zamknij panel");
  gora.appendChild(krzyzyk);
  var zawartosc = document.createElement("div");
  gora.appendChild(zawartosc);
  document.body.appendChild(gora);

  var otwarty = null, aktBtn = null;

  function zamknij() {
    if (otwarty) { schowek.appendChild(otwarty); otwarty = null; }
    if (aktBtn) { aktBtn.classList.remove("akt"); aktBtn = null; }
    gora.style.display = "none";
  }
  function otworz(el, btn) {
    zamknij();
    el.classList.remove("p-zwiniety");
    zawartosc.appendChild(el);
    otwarty = el;
    if (btn) { btn.classList.add("akt"); aktBtn = btn; }
    gora.style.display = "block";
    gora.scrollTop = 0;
  }
  krzyzyk.addEventListener("click", zamknij);

  // Ikony, od gory do dolu: [id panelu, ikona, opis]
  [["szukaj-panel", "🔍", "Widok i szukanie"], ["narzedzia", "✏️", "Narzędzia"],
   ["legenda", "🔖", "Legenda"], ["fale-panel", "🌡️", "Pogoda"],
   ["rynek", "📈", "Kursy i czas"], ["wiad", "🗞️", "Wiadomości"],
   ["historia", "🗄️", "Historia"]].forEach(function (p) {
    var el = document.getElementById(p[0]);
    if (!el) return;
    schowek.appendChild(el);
    var b = document.createElement("button");
    b.className = "ikona-menu";
    b.textContent = p[1];
    b.title = p[2];
    b.setAttribute("aria-label", p[2]);
    b.addEventListener("click", function () {
      if (otwarty === el) zamknij(); else otworz(el, b);
    });
    lewa.appendChild(b);
  });

  // Pozostale, nieuzywane ramki z lewej kolumny chowamy
  Array.prototype.slice.call(lewa.children).forEach(function (c) {
    if (c.classList && c.classList.contains("panel")) schowek.appendChild(c);
  });

  // Szczegoly obiektow (drony, alarmy, zdarzenia...) w tym samym miejscu u gory
  window.pokazSzczegoly = function (tytul, wezel) {
    if (document.body.classList.contains("narzedzie")) return;
    var el = document.getElementById("szczegoly-gora");
    if (!el) {
      el = document.createElement("div");
      el.id = "szczegoly-gora";
      el.className = "panel";
      el.innerHTML = '<div class="p-nag"><span></span></div><div class="p-tresc"></div>';
      schowek.appendChild(el);
    }
    el.querySelector(".p-nag span").textContent = tytul;
    var t = el.querySelector(".p-tresc");
    t.textContent = "";
    t.appendChild(wezel);
    otworz(el, null);
  };
})();
