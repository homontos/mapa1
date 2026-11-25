(function () {
  var KAM_W = 280;     // domyslna szerokosc okna kamery (px), tyle samo co NEWS w kafle_mapa.js
  var KAM_H = 158;     // domyslna wysokosc (px), tyle samo co KAM_H w kafle_mapa.js
  var panel = document.getElementById("kamera");
  if (!panel) return;
  var MQ = window.matchMedia ? window.matchMedia("(min-width: 900px) and (hover: hover) and (pointer: fine)") : null;
  function PC() { return !!(MQ && MQ.matches); }
  var root = document.documentElement;
  var w = KAM_W, h = KAM_H;
  try {
    var s = JSON.parse(localStorage.getItem("mapa-kamera") || "null");
    if (s && s.w >= 200 && s.h >= 120) { w = s.w; h = s.h; }
  } catch (e) {}
  function ustaw() {
    root.style.setProperty("--kam-w", w + "px");
    root.style.setProperty("--kam-h", h + "px");
  }
  ustaw();

  var st = document.createElement("style");
  st.textContent =
    // tylko obraz: bez tytulu, przycisku i opisu (komputer i telefon)
    "#kamera .k-nag,#kamera .k-link,#kamera .k-uwaga{display:none!important}" +
    "html body #kamera{padding:0!important;overflow:hidden!important;border-radius:10px}" +
    "#kamera iframe{display:block;width:100%!important;margin:0!important;border-radius:0!important;aspect-ratio:16/9;height:auto!important}" +
    "#kamera .kam-pasek{position:absolute;left:20px;right:0;top:0;height:14px;z-index:3;cursor:grab}" +
    "#kamera button.kam-rog{position:absolute;left:0;top:0;width:18px;height:18px;padding:0;z-index:4;" +
    "cursor:nwse-resize;border:0;border-radius:0 0 8px 0;opacity:0.45}" +
    "@media (min-width:900px) and (hover:hover) and (pointer:fine){" +
    "html body #kamera,html body.kafle-dock #kamera{position:fixed!important;left:auto!important;top:auto!important;" +
    "right:8px!important;bottom:68px!important;width:var(--kam-w)!important;height:var(--kam-h)!important;z-index:8}" +
    "html body #kamera iframe{height:100%!important;aspect-ratio:auto}}";
  document.head.appendChild(st);

  function zapisz() {
    try { localStorage.setItem("mapa-kamera", JSON.stringify({ w: w, h: h })); } catch (e) {}
  }

  function uchwyty() {
    if (!PC() || !panel.querySelector("iframe") || panel.querySelector(".kam-pasek")) return;
    var pasek = document.createElement("div");
    pasek.className = "kam-pasek";
    pasek.title = "Przeciągnij, aby przesunąć okno";
    pasek.addEventListener("pointerdown", function (ev) {
      try { pasek.setPointerCapture(ev.pointerId); } catch (e) {}
    });
    var rog = document.createElement("button");
    rog.className = "kam-rog";
    rog.title = "Przeciągnij, aby zmienić rozmiar okna";
    rog.setAttribute("aria-label", "Zmień rozmiar okna kamery");
    var sx = 0, sy = 0, sw = 0, sh = 0, trwa = false;
    rog.addEventListener("pointerdown", function (ev) {
      trwa = true;
      sx = ev.clientX; sy = ev.clientY;
      sw = panel.offsetWidth; sh = panel.offsetHeight;
      try { rog.setPointerCapture(ev.pointerId); } catch (e) {}
      ev.preventDefault();
    });
    rog.addEventListener("pointermove", function (ev) {
      if (!trwa) return;
      w = Math.max(200, Math.min(window.innerWidth * 0.9, sw + (sx - ev.clientX)));
      h = Math.max(120, Math.min(window.innerHeight * 0.8, sh + (sy - ev.clientY)));
      ustaw();
    });
    function koniec() { if (trwa) { trwa = false; zapisz(); } }
    rog.addEventListener("pointerup", koniec);
    rog.addEventListener("pointercancel", koniec);
    panel.appendChild(pasek);
    panel.appendChild(rog);
  }
  new MutationObserver(uchwyty).observe(panel, { childList: true });
  uchwyty();
})();
