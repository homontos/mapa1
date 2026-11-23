(function () {
  var KOLORY = { 1: "#f2c200", 2: "#f08c00", 3: "#e03131" };

  function plakietka(kolor) {
    var c = document.createElement("canvas");
    c.width = 64; c.height = 64;
    var x = c.getContext("2d");
    x.shadowColor = "rgba(0,0,0,0.45)";
    x.shadowBlur = 4;
    x.beginPath();
    x.arc(32, 32, 24, 0, Math.PI * 2);
    x.fillStyle = kolor;
    x.fill();
    x.shadowBlur = 0;
    x.font = "30px sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText("🌦️", 32, 35);
    return x.getImageData(0, 0, 64, 64);
  }

  function zamien() {
    [1, 2, 3].forEach(function (s) {
      var n = "ost-" + s;
      if (map.hasImage(n)) map.removeImage(n);
      map.addImage(n, plakietka(KOLORY[s]));
    });
    if (map.getLayer("ostrzezenia")) {
      map.setLayoutProperty("ostrzezenia", "icon-size",
        ["interpolate", ["linear"], ["zoom"], 4, 0.3, 8, 0.45]);
    }
  }
  map.on("style.load", zamien);
  if (map.isStyleLoaded()) zamien();
})();
