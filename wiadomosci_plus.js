(function () {
  var foto = {};

  var st = document.createElement("style");
  st.textContent =
    "@media (min-width:900px) and (hover:hover) and (pointer:fine){" +
    "body #gora-panel.wiad-dluga{max-height:min(860px,88vh)!important}}" +
    "#gora-panel img.wiad-foto{width:100%;max-height:260px;object-fit:cover;border-radius:8px;margin:6px 0 2px}" +
    "#gora-panel .wiad-podpis{font-size:10px;color:#9aa3ad;margin-bottom:6px}";
  document.head.appendChild(st);

  function wczytaj() {
    fetch("swiat.json?t=" + Math.floor(Date.now() / 60000))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        (d.zdarzenia || []).forEach(function (z) {
          if (z.img && /^https:\/\//.test(z.img)) foto[z.u] = z.img;
        });
      })
      .catch(function () {});
  }
  wczytaj();
  setInterval(wczytaj, 5 * 60 * 1000);

  var oryg = window.pokazSzczegoly;
  if (typeof oryg !== "function") return;
  window.pokazSzczegoly = function (tytul, wezel) {
    try {
      var a = wezel.querySelector("a[href^='http']");
      if (a && /^Źródło:/.test(a.textContent) && /Automatyczne streszczenie/.test(wezel.textContent)) {
        wezel.setAttribute("data-wiad", "1");
        var src = foto[a.getAttribute("href")];
        if (src && !wezel.querySelector("img.wiad-foto")) {
          var im = document.createElement("img");
          im.className = "wiad-foto";
          im.referrerPolicy = "no-referrer";
          im.loading = "lazy";
          im.alt = "Zdjęcie z materiału źródłowego";
          im.onerror = function () { var p = this.nextSibling; this.remove(); if (p && p.className === "wiad-podpis") p.remove(); };
          var pod = document.createElement("div");
          pod.className = "wiad-podpis";
          pod.textContent = "Zdjęcie z materiału źródłowego (prawa autorskie: właściciel źródła).";
          wezel.insertBefore(pod, wezel.children[1] || null);
          wezel.insertBefore(im, pod);
          im.src = src;
        }
      }
    } catch (e) {}
    return oryg.apply(this, arguments);
  };

  // Panel jest wyzszy tylko gdy pokazuje wiadomosc militarna
  var gp = document.getElementById("gora-panel");
  if (gp) {
    new MutationObserver(function () {
      gp.classList.toggle("wiad-dluga", !!gp.querySelector("[data-wiad]"));
    }).observe(gp, { childList: true, subtree: true });
  }
})();
