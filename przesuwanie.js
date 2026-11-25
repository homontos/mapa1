(function () {
  var MQ = window.matchMedia ? window.matchMedia("(min-width: 900px) and (hover: hover) and (pointer: fine)") : null;
  function PC() { return !!(MQ && MQ.matches); }
  var CEL = "#gora-panel,#kamera,#hist-panel,.maplibregl-popup-content";
  var RZAD = 170;

  var st = document.createElement("style");
  st.textContent =
    "@media (min-width:900px) and (hover:hover) and (pointer:fine){" +
    "body #gora-panel,body #kamera,body #hist-panel{z-index:8}" +
    "body #gora-panel,body #kamera,body #hist-panel,body .maplibregl-popup-content{cursor:grab}" +
    "body #gora-panel a,body #gora-panel button,body #kamera a,body #kamera button,body #hist-panel button," +
    "body .maplibregl-popup-content a{cursor:pointer}" +
    "body #gora-panel{scrollbar-width:none}" +
    "body #gora-panel::-webkit-scrollbar{display:none}" +
    "body.kafle-dock #gora-panel{top:" + (8 + RZAD + 8) + "px!important;max-height:min(430px,calc(100vh - 270px))!important}" +
    "body #gora-panel.gp-wiad{resize:vertical;max-height:calc(100vh - 80px)!important}" +
    "body.kafle-dock #gora-panel.gp-wiad{max-height:calc(100vh - 270px)!important}" +
    "body #gora-panel.gp-wiad #wiad-lista{max-height:none!important;overflow:visible!important}" +
    "body.przeciaga,body.przeciaga *{user-select:none!important;cursor:grabbing!important}}";
  document.head.appendChild(st);

  var akt = null, byloRuch = false;

  document.addEventListener("pointerdown", function (ev) {
    if (!PC() || ev.button !== 0 || !ev.target.closest) return;
    var el = ev.target.closest(CEL);
    if (!el) return;
    if (ev.target.closest("a,button,input,select,textarea,label,svg,img,.maplibregl-popup-close-button")) return;
    var r = el.getBoundingClientRect();
    if (el.id === "gora-panel" && ev.clientX > r.right - 22 && ev.clientY > r.bottom - 22) return;   // uchwyt zmiany wysokosci
    akt = { el: el, x: ev.clientX, y: ev.clientY, dx: +el.dataset.dx || 0, dy: +el.dataset.dy || 0, r: r, ruch: false };
    byloRuch = false;
  }, true);

  document.addEventListener("pointermove", function (ev) {
    if (!akt) return;
    var mx = ev.clientX - akt.x, my = ev.clientY - akt.y;
    if (!akt.ruch) {
      if (Math.abs(mx) + Math.abs(my) < 5) return;
      akt.ruch = true;
      byloRuch = true;
      document.body.classList.add("przeciaga");
      var tip = akt.el.parentNode && akt.el.parentNode.querySelector && akt.el.parentNode.querySelector(".maplibregl-popup-tip");
      if (tip) tip.style.display = "none";
    }
    var l0 = akt.r.left - akt.dx, t0 = akt.r.top - akt.dy;
    var dx = Math.max(-l0 - akt.r.width + 60, Math.min(window.innerWidth - 60 - l0, akt.dx + mx));
    var dy = Math.max(-t0, Math.min(window.innerHeight - 40 - t0, akt.dy + my));
    akt.el.dataset.dx = dx;
    akt.el.dataset.dy = dy;
    akt.el.style.translate = dx + "px " + dy + "px";
    ev.preventDefault();
  }, true);

  function koniec() {
    if (akt) document.body.classList.remove("przeciaga");
    akt = null;
  }
  document.addEventListener("pointerup", koniec, true);
  document.addEventListener("pointercancel", koniec, true);
  document.addEventListener("click", function (ev) {
    if (byloRuch) { ev.stopPropagation(); ev.preventDefault(); byloRuch = false; }
  }, true);

  // Powrot na miejsce startowe przy kazdym ponownym otwarciu
  function reset(el) {
    el.dataset.dx = 0;
    el.dataset.dy = 0;
    el.style.translate = "";
    if (el.id === "gora-panel") el.style.height = "";
  }
  function podepnij() {
    var gp = document.getElementById("gora-panel");
    if (gp) {
      var zaw = gp.children[1];
      function klasa() { gp.classList.toggle("gp-wiad", !!gp.querySelector("#wiad,[data-wiad]")); }
      if (zaw) {
        new MutationObserver(function () { reset(gp); klasa(); }).observe(zaw, { childList: true });
      }
      new MutationObserver(function () { if (gp.style.display === "none") reset(gp); })
        .observe(gp, { attributes: true, attributeFilter: ["style"] });
    }
    ["kamera", "hist-panel"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      new MutationObserver(function () { if (el.style.display === "none") reset(el); })
        .observe(el, { attributes: true, attributeFilter: ["style"] });
      if (id === "kamera") new MutationObserver(function () { reset(el); }).observe(el, { childList: true });
    });
  }
  setTimeout(podepnij, 1500);
})();
