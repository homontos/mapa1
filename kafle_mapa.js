(function () {
  var CENTRA = { "Europa Wschodnia": [[32, 50], 4.5], "Bliski Wschód": [[45, 29], 4.5],
    "Azja i Pacyfik": [[110, 20], 3], "Afryka": [[20, 5], 3], "Ameryki": [[-80, 15], 2.5] };
  var kont = document.getElementById("kafle");
  if (!kont) return;
  var podazaj = false, ostatni = "";

  var st = document.createElement("style");
  st.textContent = "#kafle .podazaj{display:flex;align-items:center;gap:5px;font-size:11px;margin-bottom:2px;cursor:pointer}" +
    "#kafle .podazaj input{width:15px;height:15px;accent-color:#c92a2a;margin:0}";
  document.head.appendChild(st);

  function aktualnyRegion(tr) {
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
  function kontrola() {
    var h = kont.querySelectorAll(".kafel h4");
    for (var i = 0; i < h.length; i++) {
      if (!/Wiadomości militarne/.test(h[i].textContent)) continue;
      var tr = h[i].parentNode.querySelector(".tr");
      if (!tr || !tr.querySelector("b")) continue;
      if (!tr.querySelector(".podazaj")) {
        var l = document.createElement("label");
        l.className = "podazaj";
        var c = document.createElement("input");
        c.type = "checkbox";
        c.checked = podazaj;
        l.appendChild(c);
        l.appendChild(document.createTextNode("Mapa podąża za regionem"));
        c.addEventListener("change", function () {
          podazaj = this.checked;
          if (podazaj) lec(aktualnyRegion(tr) || "Europa Wschodnia");
        });
        tr.insertBefore(l, tr.firstChild);
      }
      var r = aktualnyRegion(tr);
      if (podazaj && r && r !== ostatni) lec(r);
    }
  }
  new MutationObserver(kontrola).observe(kont, { childList: true, subtree: true, characterData: true });
})();
