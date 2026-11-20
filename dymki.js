(function () {
  // JEDEN kolor dla wszystkich dymkow i paneli (ostatnia liczba = przezroczystosc 0-1).
  // Szarosc: im nizsze pierwsze trzy liczby, tym ciemniejszy szary.
  var TLO = "rgba(224,227,231,0.9)";
  var st = document.createElement("style");
  st.textContent =
    ".maplibregl-popup-content,#gora-panel,#kamera{background:" + TLO + "!important;" +
    "backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);color:#222}" +
    ".maplibregl-popup-content{border-radius:10px!important;box-shadow:0 1px 6px rgba(0,0,0,0.3)!important;" +
    "font:13px sans-serif}" +
    ".maplibregl-popup-close-button{color:#444;font-size:18px}" +
    ".maplibregl-popup-anchor-top .maplibregl-popup-tip,.maplibregl-popup-anchor-top-left .maplibregl-popup-tip," +
    ".maplibregl-popup-anchor-top-right .maplibregl-popup-tip{border-bottom-color:" + TLO + "!important}" +
    ".maplibregl-popup-anchor-bottom .maplibregl-popup-tip,.maplibregl-popup-anchor-bottom-left .maplibregl-popup-tip," +
    ".maplibregl-popup-anchor-bottom-right .maplibregl-popup-tip{border-top-color:" + TLO + "!important}" +
    ".maplibregl-popup-anchor-left .maplibregl-popup-tip{border-right-color:" + TLO + "!important}" +
    ".maplibregl-popup-anchor-right .maplibregl-popup-tip{border-left-color:" + TLO + "!important}";
  document.head.appendChild(st);
})();
