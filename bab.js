(function () {
  // Przycisk "Bab el-Mandeb" obok pozostalych przyciskow widoku
  var ormuz = document.getElementById("btn-ormuz");
  if (ormuz) {
    ormuz.parentNode.style.flexWrap = "wrap";
    var b = document.createElement("button");
    b.id = "btn-bab";
    b.textContent = "Bab el-Mandeb";
    ormuz.parentNode.appendChild(b);
    b.addEventListener("click", function () {
      map.flyTo({ center: REGIONY.bab.srodek, zoom: REGIONY.bab.zoom });
    });
  }

  // Przelacznik statkow w legendzie
  var pokaz = true;
  function ustaw() {
    ["statki-postoj", "statki-ruch"].forEach(function (id) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", pokaz ? "visible" : "none");
      }
    });
  }
  var tresc = document.querySelector("#legenda .p-tresc") || document.getElementById("legenda");
  var blok = document.createElement("div");
  blok.style.marginBottom = "8px";
  blok.innerHTML = '<label><input type="checkbox" id="statki-przel" checked> Statki</label>';
  tresc.insertBefore(blok, tresc.firstChild);
  document.getElementById("statki-przel").addEventListener("change", function () {
    pokaz = this.checked;
    ustaw();
  });
  map.on("style.load", ustaw);
})();
