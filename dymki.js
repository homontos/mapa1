(function () {
  var TLO = "rgba(255,255,255,0.88)";      // kolor tla dymkow (ostatnia liczba = przezroczystosc)
  var st = document.createElement("style");
  st.textContent =
    ".maplibregl-popup-content{background:" + TLO + "!important;backdrop-filter:blur(4px);" +
    "-webkit-backdrop-filter:blur(4px);border-radius:10px!important;color:#222;" +
    "box-shadow:0 1px 6px rgba(0,0,0,0.3)!important;font:13px sans-serif}" +
    ".maplibregl-popup-close-button{color:#444;font-size:18px}" +
    ".maplibregl-popup-anchor-top .maplibregl-popup-tip,.maplibregl-popup-anchor-top-left .maplibregl-popup-tip," +
    ".maplibregl-popup-anchor-top-right .maplibregl-popup-tip{border-bottom-color:" + TLO + "!important}" +
    ".maplibregl-popup-anchor-bottom .maplibregl-popup-tip,.maplibregl-popup-anchor-bottom-left .maplibregl-popup-tip," +
    ".maplibregl-popup-anchor-bottom-right .maplibregl-popup-tip{border-top-color:" + TLO + "!important}" +
    ".maplibregl-popup-anchor-left .maplibregl-popup-tip{border-right-color:" + TLO + "!important}" +
    ".maplibregl-popup-anchor-right .maplibregl-popup-tip{border-left-color:" + TLO + "!important}";
  document.head.appendChild(st);
})();
