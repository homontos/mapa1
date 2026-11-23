(function () {
  var ZOOM_STATKI = 6.3;

  // Punkt 9: ikony fal bez bialej ramki
  var st = document.createElement("style");
  st.textContent = '.znacznik[style*="50%"]{border:0!important;box-shadow:none!important}';
  document.head.appendChild(st);

  // Punkt 3: statki widoczne dopiero od przyblizenia 6.3
  function zakres() {
    ["statki-postoj", "statki-ruch"].forEach(function (id) {
      if (map.getLayer(id)) map.setLayerZoomRange(id, ZOOM_STATKI, 24);
    });
  }
  map.on("style.load", zakres);
  if (map.isStyleLoaded()) zakres();

  // Punkt 8: bez przycisku "Szara" i bez pola szukania
  function porzadki() {
    ["btn-szara", "szukaj", "wynik"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
  }
  porzadki();
  setTimeout(porzadki, 1500);

  // Ciemny podklad od razu
  function ciemny() {
    if (typeof window.ustawPodklad === "function" && document.getElementById("btn-ciemna")) {
      window.ustawPodklad("ciemna");
    }
  }
  ciemny();
  setTimeout(ciemny, 800);
})();
