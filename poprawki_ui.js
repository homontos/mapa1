(function () {
  var SZER_DYMKA = 340;     // szerokosc dymkow z ikon na komputerze (px)
  var MAX_WYS = 280;        // maksymalna wysokosc dymkow z ikon (px)

  // ---------- Punkt 6: mniejsze dymki z ikon na komputerze ----------
  var st = document.createElement("style");
  st.textContent =
    "@media (min-width: 900px) and (hover: hover) and (pointer: fine){" +
    "body #gora-panel,body.kafle-dock #gora-panel{left:52px!important;right:auto!important;" +
    "width:" + SZER_DYMKA + "px!important;max-height:min(" + MAX_WYS + "px,70vh)!important}" +
    "body #kamera,body.kafle-dock #kamera{width:" + SZER_DYMKA + "px!important}" +
    "body #hist-panel,body.kafle-dock #hist-panel{max-width:" + (SZER_DYMKA + 90) + "px!important}" +
    "}";
  document.head.appendChild(st);

  // ---------- Punkt 5: ON jako pierwszy wiersz w kaflu "Zloto, WIG20, paliwa" ----------
  var kont = document.getElementById("kafle");
  if (!kont) return;

  function jestWiersz(el) {
    return !!(el && el.firstChild && el.firstChild.tagName === "SPAN");
  }
  function przestaw(tr) {
    if (!tr) return;
    var dz = Array.prototype.slice.call(tr.children), i = -1, k, j, m;
    for (k = 0; k < dz.length; k++) {
      if (jestWiersz(dz[k]) && /^ON \(/.test(dz[k].firstChild.textContent)) { i = k; break; }
    }
    if (i < 1) return;                      // brak wiersza ON albo juz jest pierwszy
    var grupa = [dz[i]];
    for (j = i + 1; j < dz.length; j++) {
      if (jestWiersz(dz[j]) || /^Paliwa:/.test(dz[j].textContent)) break;
      grupa.push(dz[j]);
    }
    for (m = grupa.length - 1; m >= 0; m--) tr.insertBefore(grupa[m], tr.firstChild);
  }
  function kontrola() {
    var h = kont.querySelectorAll(".kafel h4");
    for (var n = 0; n < h.length; n++) {
      if (/Złoto/.test(h[n].textContent)) przestaw(h[n].parentNode.querySelector(".tr"));
    }
  }
  new MutationObserver(kontrola).observe(kont, { childList: true, subtree: true });
})();
