(function () {
  // ---------- Style: telefon (kamera i samolot na dole), pogoda w kaflu ----------
  var st = document.createElement("style");
  st.textContent =
    // pogoda w kaflu: bez wiersza "Gdynia - teraz" (telefon i komputer)
    ".kafel .tr.pol>div:first-child>div>div:first-child{display:none}" +
    // kazde urzadzenie inne niz komputer: kamera i dymek samolotu u dolu ekranu
    "@media not all and (min-width:900px) and (hover:hover) and (pointer:fine){" +
    "html body #kamera{position:fixed!important;top:auto!important;right:8px!important;left:54px!important;" +
    "bottom:72px!important;width:auto!important;height:auto!important;transform:none!important}" +
    "html body #kamera iframe{width:100%!important;height:auto!important;aspect-ratio:16/9}" +
    "body .samolot-popup{position:fixed!important;left:54px!important;bottom:72px!important;top:auto!important;" +
    "right:auto!important;transform:none!important;z-index:12!important}" +
    "body .samolot-popup .maplibregl-popup-tip{display:none!important}" +
    "body .samolot-popup .maplibregl-popup-content{width:235px!important;max-width:calc(100vw - 66px)!important}" +
    ".samolot-popup .sam-foto-box{height:115px!important}}";
  document.head.appendChild(st);

  // ---------- Pogoda morska (fale) do legendy ----------
  function wLegende() {
    var tresc = document.querySelector("#legenda .p-tresc");
    var cb = document.getElementById("przelacznik");
    if (!tresc || !cb || document.getElementById("morze-blok")) return;
    var panel = document.getElementById("fale-panel");
    var blok = document.createElement("div");
    blok.id = "morze-blok";
    blok.style.cssText = "margin-top:8px;border-top:1px solid rgba(255,255,255,0.15);padding-top:6px";
    var tyt = document.createElement("div");
    tyt.style.cssText = "font-weight:bold;margin-bottom:2px";
    tyt.textContent = "Pogoda morska (fale)";
    blok.appendChild(tyt);
    [cb.parentNode, document.getElementById("podpowiedz-pogody"), document.getElementById("legenda-fal"),
     document.getElementById("status-pogody"), panel && panel.querySelector(".zrodlo")].forEach(function (e) {
      if (e) blok.appendChild(e);
    });
    tresc.appendChild(blok);
    var nag = panel && panel.querySelector(".p-nag span");
    if (nag) nag.textContent = "Pogoda – Gdynia";
  }

  // ---------- Kolejnosc ikon ----------
  var KOLEJNOSC = [["🔍"], ["✏"], ["🌡"], ["🗞"], ["🚢", "⛴", "🛳", "🛥", "⚓"], ["✈"], ["📷"], ["📊"], ["💬"], ["🔖"], ["🔄"]];
  function uloz() {
    var l = document.getElementById("lewa");
    if (!l) return;
    var b = Array.prototype.slice.call(l.children).filter(function (x) { return x.classList.contains("ikona-menu"); });
    var uzyte = [], porz = [], odsw = null;
    KOLEJNOSC.forEach(function (gr, idx) {
      b.forEach(function (x) {
        if (uzyte.indexOf(x) >= 0) return;
        if (gr.some(function (e) { return x.textContent.indexOf(e) === 0; })) {
          uzyte.push(x);
          if (idx === KOLEJNOSC.length - 1) odsw = x; else porz.push(x);
        }
      });
    });
    b.forEach(function (x) { if (uzyte.indexOf(x) < 0) porz.push(x); });
    if (odsw) porz.push(odsw);
    var teraz = Array.prototype.slice.call(l.children);
    var ok = porz.length === teraz.length && porz.every(function (x, i) { return teraz[i] === x; });
    if (!ok) porz.forEach(function (x) { l.appendChild(x); });
  }

  var timer = null;
  function planuj() { clearTimeout(timer); timer = setTimeout(function () { wLegende(); uloz(); }, 250); }
  var lewa = document.getElementById("lewa");
  if (lewa) new MutationObserver(planuj).observe(lewa, { childList: true });
  [1200, 3000, 5000, 8000].forEach(function (ms) { setTimeout(function () { wLegende(); uloz(); }, ms); });
})();
