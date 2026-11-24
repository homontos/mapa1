(function () {
  var M = 90;        // wysokosc malych kafli na komputerze (px)
  var N = 210;       // wysokosc kafla wiadomosci (px)
  var P = 170;       // wysokosc kafla pogody (px)
  var TLO = "rgba(20,24,30,0.86)";
  var TEKST = "#e9edf2";
  var CZERW = "#c92a2a";

  var roots = ["body .maplibregl-popup-content", "body #gora-panel", "body #kamera", "body .kafel"];
  var css = "";

  // ---------- Uklad kafli na komputerze ----------
  css += "@media (min-width:900px) and (hover:hover) and (pointer:fine){" +
    "body #kafle.dock{grid-template-rows:" + M + "px " + M + "px " + N + "px " + P + "px!important;" +
    "grid-auto-rows:auto!important;gap:8px!important}" +
    "body #kafle.dock .kafel.wys3{grid-row:span 1!important}}";

  // ---------- Kolory: tlo, tekst, akcenty ----------
  css += roots.join(",") + "{background:" + TLO + "!important;color:" + TEKST + "!important;" +
    "backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);" +
    "border:1px solid rgba(255,255,255,0.12)!important;box-shadow:0 2px 10px rgba(0,0,0,0.5)!important}";
  roots.forEach(function (R) {
    css +=
      R + " *:not(a):not(button):not(svg):not(svg *):not(option){color:" + TEKST + "!important}" +
      R + " a{color:#9ec5ff!important}" +
      R + " svg text:not([fill='#e03131']){fill:#cfd6df!important}" +
      R + " svg line[stroke='#ccc']," + R + " svg line[stroke='#bbb']," + R + " svg line[stroke='#ddd']," +
      R + " svg line[stroke='#999']{stroke:rgba(255,255,255,0.2)!important}" +
      R + " svg line[stroke='#222']{stroke:#fff!important}" +
      R + " svg rect[fill='#000']{fill:#fff!important}" +
      R + " select," + R + " input[type=text]{background:#2a2f38!important;color:" + TEKST +
      "!important;border:1px solid #555!important;border-radius:6px}" +
      R + " button{background:rgba(255,255,255,0.14)!important;color:#fff!important;border-radius:8px}";
  });
  css +=
    "body .kafel h4{color:#fff!important;border-bottom:2px solid " + CZERW + "!important}" +
    "body .kafel .zam{background:none!important;color:#fff!important}" +
    "body .kafel button.nw{background:" + CZERW + "!important;color:#fff!important}" +
    "body #gora-panel .p-nag{border-bottom:2px solid " + CZERW + ";padding-bottom:4px;margin-bottom:6px}" +
    "body #gora-panel .p-nag span{color:#fff!important}" +
    "body #gora-x{background:none!important;color:#fff!important}" +
    "body #kamera .k-link{background:" + CZERW + "!important;color:#fff!important}" +
    "body .maplibregl-popup-close-button{background:none!important;color:#fff!important;font-size:18px}" +
    "body .maplibregl-popup-anchor-top .maplibregl-popup-tip,body .maplibregl-popup-anchor-top-left .maplibregl-popup-tip," +
    "body .maplibregl-popup-anchor-top-right .maplibregl-popup-tip{border-bottom-color:" + TLO + "!important}" +
    "body .maplibregl-popup-anchor-bottom .maplibregl-popup-tip,body .maplibregl-popup-anchor-bottom-left .maplibregl-popup-tip," +
    "body .maplibregl-popup-anchor-bottom-right .maplibregl-popup-tip{border-top-color:" + TLO + "!important}" +
    "body .maplibregl-popup-anchor-left .maplibregl-popup-tip{border-right-color:" + TLO + "!important}" +
    "body .maplibregl-popup-anchor-right .maplibregl-popup-tip{border-left-color:" + TLO + "!important}";

  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);
})();
