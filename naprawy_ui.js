(function () {
  var st = document.createElement("style");
  st.textContent =
    "body #gora-panel #nar-kolory .nar-kolor{width:26px!important;height:26px!important;" +
    "border-radius:50%!important;border:2px solid #fff!important;padding:0!important;" +
    "box-shadow:0 0 0 1px rgba(255,255,255,0.35)!important}" +
    "body #gora-panel #nar-kolory .nar-kolor:nth-child(1){background:#e03131!important}" +
    "body #gora-panel #nar-kolory .nar-kolor:nth-child(2){background:#1c7ed6!important}" +
    "body #gora-panel #nar-kolory .nar-kolor:nth-child(3){background:#2f9e44!important}" +
    "body #gora-panel #nar-kolory .nar-kolor:nth-child(4){background:#111111!important}" +
    "body #gora-panel #nar-kolory .nar-kolor.akt{box-shadow:0 0 0 3px #ffffff!important}" +
    "#ostrzezenie{display:none!important}";
  document.head.appendChild(st);
})();
