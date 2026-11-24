(function () {
  var PROMIEN = 16;     // promien tla ikon wiadomosci (jednostki na plotnie 48x48; bylo 22)
  var FALA = 22;        // srednica tla ikon wysokosci fali w px (bylo 30)
  var EMOJI = { rakieta: "🚀", dron: "🛸", starcie: "💥", marynarka: "⚓", alarm: "⚠️", inne: "📍" };

  // Ikony wysokosci fali: mniejsze tlo dopasowane do liczby
  var st = document.createElement("style");
  st.textContent = '.znacznik[style*="50%"]{width:' + FALA + 'px!important;height:' + FALA +
    'px!important;font-size:11px!important;border:0!important;box-shadow:none!important}';
  document.head.appendChild(st);

  // Ikony wiadomosci militarnych: to samo emoji, mniejsze tlo
  function ikona(emoji) {
    var c = document.createElement("canvas");
    c.width = 48; c.height = 48;
    var x = c.getContext("2d");
    x.fillStyle = "rgba(20,24,30,0.88)";
    x.beginPath(); x.arc(24, 24, PROMIEN, 0, 6.2832); x.fill();
    x.lineWidth = 2; x.strokeStyle = "rgba(255,255,255,0.7)"; x.stroke();
    x.font = "26px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(emoji, 24, 26);
    return x.getImageData(0, 0, 48, 48);
  }
  function zamien() {
    Object.keys(EMOJI).forEach(function (k) {
      var n = "sw-" + k;
      if (map.hasImage(n)) map.removeImage(n);
      map.addImage(n, ikona(EMOJI[k]));
    });
  }
  map.on("style.load", zamien);
  if (map.isStyleLoaded()) zamien();
})();
