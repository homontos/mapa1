(function () {
  // Wklej tu darmowy klucz z https://carto.com/basemaps/apikey (opcjonalnie).
  // Zostaw puste, aby uzywac wlasnego ciemnego podkladu (bez klucza).
  var KLUCZ_CARTO = "cb1_59qx_1_374b471616a9fde45c69285a";
  var URL_CARTO = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json?key=";

  var szara = document.getElementById("btn-szara");
  if (!szara) return;
  var b = document.createElement("button");
  b.id = "btn-ciemna";
  b.textContent = "Ciemna";
  szara.parentNode.appendChild(b);

  var attr = document.createElement("div");
  attr.style.cssText = "position:fixed;left:6px;bottom:60px;z-index:4;display:none;" +
    "font:10px sans-serif;color:#ccc;background:rgba(0,0,0,0.55);padding:2px 6px;border-radius:4px";
  attr.innerHTML = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" ' +
    'rel="noopener" style="color:#9ec5ff">OpenStreetMap</a>, © <a href="https://carto.com/attributions" ' +
    'target="_blank" rel="noopener" style="color:#9ec5ff">CARTO</a>';
  document.body.appendChild(attr);

  // Wlasny ciemny podklad: ta sama mapa co szara, w ciemnych kolorach
  function stylCiemnyWlasny() {
    var s = stylSzary();
    s.layers.forEach(function (l) {
      var p = l.paint || {};
      if (p["background-color"]) p["background-color"] = "#141a24";
      if (p["fill-color"]) p["fill-color"] = (l.id.indexOf("morze") === 0) ? "#141a24" : "#2a3342";
      if (p["line-color"]) p["line-color"] = "#4b5565";
    });
    return s;
  }

  var staraUstaw = window.ustawPodklad;
  window.ustawPodklad = function (nazwa) {
    if (nazwa === "ciemna") {
      if (aktualnyPodklad === "ciemna") return;
      aktualnyPodklad = "ciemna";
      map.setStyle(KLUCZ_CARTO ? URL_CARTO + encodeURIComponent(KLUCZ_CARTO) : stylCiemnyWlasny(),
        { diff: false });
    } else {
      staraUstaw(nazwa);
    }
    attr.style.display = (aktualnyPodklad === "ciemna" && KLUCZ_CARTO) ? "block" : "none";
    window.odswiezPrzyciskiPodkladu();
  };

  var staraOdsw = window.odswiezPrzyciskiPodkladu;
  window.odswiezPrzyciskiPodkladu = function () {
    staraOdsw();
    b.className = aktualnyPodklad === "ciemna" ? "aktywny" : "";
  };

  b.addEventListener("click", function () { window.ustawPodklad("ciemna"); });
})();
