(function () {
  var CENTRA = { "Europa Wschodnia": [[32, 50], 4.5], "Bliski Wschód": [[45, 29], 4.5],
    "Azja i Pacyfik": [[110, 20], 3], "Afryka": [[20, 5], 3], "Ameryki": [[-80, 15], 2.5] };
  var RZAD = 170;      // wysokosc rzedu malych kafli na komputerze (px)
  var NEWS = 280;      // szerokosc kolumny wiadomosci na komputerze (px), tyle samo co SZER w kafle.js
  var kont = document.getElementById("kafle");
  if (!kont) return;
  var podazaj = false, ostatni = "";

  var DOCK = "html body #kafle.dock";
  var st = document.createElement("style");
  st.textContent =
    // bez paskow przewijania we wszystkich kaflach
    "#kafle,.kafel .tr{scrollbar-width:none;-ms-overflow-style:none}" +
    "#kafle::-webkit-scrollbar,.kafel .tr::-webkit-scrollbar{display:none;width:0;height:0}" +
    // naglowek kafla wiadomosci: tytul + 3 kontrolki w jednej linii
    ".kafel h4.glowny{display:flex;align-items:center;gap:4px;padding-right:6px}" +
    ".kafel h4 .tyt{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".kafel h4 .ster{flex:none;display:flex;align-items:center;gap:3px}" +
    ".kafel h4 .ster button.nw{padding:1px 6px;font-size:11px;line-height:1.3}" +
    ".kafel h4 .ster input{width:15px;height:15px;margin:0 0 0 2px;accent-color:#c92a2a;cursor:pointer}" +
    // uklad na komputerze: rzad malych kafli u gory po lewej, wiadomosci na calej wysokosci po prawej
    "@media (min-width:900px) and (hover:hover) and (pointer:fine){" +
    DOCK + "{left:52px!important;right:8px!important;top:8px!important;bottom:68px!important;" +
    "width:auto!important;max-height:none!important;overflow:visible!important;align-content:stretch!important;" +
    "grid-template-columns:repeat(5,minmax(0,1fr)) " + NEWS + "px!important;" +
    "grid-template-rows:" + RZAD + "px minmax(0,1fr)!important;grid-auto-rows:auto!important;gap:8px!important}" +
    DOCK + " .kafel{grid-column:auto!important;grid-row:auto!important}" +
    DOCK + " .kafel:nth-child(6){grid-column:1!important;grid-row:1!important}" +
    DOCK + " .kafel:nth-child(1){grid-column:2!important;grid-row:1!important}" +
    DOCK + " .kafel:nth-child(2){grid-column:3!important;grid-row:1!important}" +
    DOCK + " .kafel:nth-child(3){grid-column:4!important;grid-row:1!important}" +
    DOCK + " .kafel:nth-child(4){grid-column:5!important;grid-row:1!important}" +
    DOCK + " .kafel:nth-child(5){grid-column:6!important;grid-row:1 / span 2!important}" +
    // pogoda w malym kaflu: tekst nad wykresem
    DOCK + " .kafel .tr.pol{flex-direction:column!important;gap:0!important}" +
    DOCK + " .kafel .tr.pol>div:first-child{flex:0 0 auto!important;max-height:58px;overflow:hidden}" +
    DOCK + " .kafel .tr.pol>div:first-child>div>div:first-child{display:none}" +
    DOCK + " .kafel .tr.pol>div:last-child{flex:1 1 0!important;min-height:0}" +
    "}";
  document.head.appendChild(st);

  function region(tr) {
    var b = tr.querySelector("b");
    var m = b && /^📡\s*(.+?)\s*\(\d+\)\s*$/.exec(b.textContent || "");
    return m ? m[1] : "";
  }
  function lec(r) {
    var c = CENTRA[r];
    if (!c) return;
    ostatni = r;
    map.flyTo({ center: c[0], zoom: c[1], duration: 2500 });
  }
  function podazanie(tr) {
    var r = region(tr);
    if (podazaj && r && r !== ostatni) lec(r);
  }

  function zbudujNaglowek(h) {
    h.textContent = "";
    h.className = "glowny";
    var t = document.createElement("span");
    t.className = "tyt";
    t.textContent = "Wiadomości militarne";
    var s = document.createElement("span");
    s.className = "ster";
    var l = document.createElement("input");
    l.type = "checkbox";
    l.checked = podazaj;
    l.title = "Mapa podąża za regionem";
    l.setAttribute("aria-label", "Mapa podąża za regionem");
    l.addEventListener("change", function () {
      podazaj = this.checked;
      var tr = h.parentNode.querySelector(".tr");
      if (podazaj && tr) lec(region(tr) || "Europa Wschodnia");
    });
    s.appendChild(l);
    h.appendChild(t);
    h.appendChild(s);
  }

  function przenies(tile, h) {
    var tr = tile.querySelector(".tr");
    if (!tr) return;
    var nw = tr.querySelectorAll("button.nw");
    if (nw.length) {
      var s = h.querySelector(".ster"), l = s.querySelector("input");
      Array.prototype.forEach.call(s.querySelectorAll("button.nw"), function (b) { b.remove(); });
      Array.prototype.forEach.call(nw, function (b) { s.insertBefore(b, l); });
    }
    podazanie(tr);
  }

  function pracuj() {
    var k = kont.querySelectorAll(".kafel");
    for (var i = 0; i < k.length; i++) {
      var h = k[i].querySelector("h4");
      if (!h) continue;
      var typ = k[i].getAttribute("data-typ");
      if (!typ) {
        var t = h.textContent;
        typ = /Blisko granicy/.test(t) ? "granica" : /IMGW/.test(t) ? "imgw" :
          /Wiadomości militarne/.test(t) ? "news" : "inne";
        k[i].setAttribute("data-typ", typ);
        if (typ === "granica") h.style.display = "none";
        if (typ === "imgw") h.textContent = "IMGW pomorskie";
        if (typ === "news") zbudujNaglowek(h);
      }
      if (typ === "news") przenies(k[i], h);
    }
  }
  new MutationObserver(pracuj).observe(kont, { childList: true, subtree: true, characterData: true });
})();
