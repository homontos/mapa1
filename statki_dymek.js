(function () {
  var st = document.createElement("style");
  st.textContent =
    "body .statek-popup{max-width:none!important}" +
    "body .statek-popup .maplibregl-popup-content{width:280px!important;max-width:none!important;box-sizing:border-box!important}" +
    "body .statek-popup img{width:100%;max-height:145px;object-fit:cover;border-radius:6px}" +
    "@media not all and (min-width:900px) and (hover:hover) and (pointer:fine){" +
      "body .statek-popup{position:fixed!important;left:54px!important;bottom:72px!important;top:auto!important;" +
        "right:auto!important;transform:none!important;z-index:12!important}" +
      "body .statek-popup .maplibregl-popup-tip{display:none!important}" +
      "body .statek-popup .maplibregl-popup-content{width:235px!important;max-width:calc(100vw - 66px)!important;" +
        "max-height:calc(100vh - 160px);overflow-y:auto}" +
      "body .statek-popup img{max-height:115px}" +
    "}";
  document.head.appendChild(st);

  var oryg = window.pokazPopupStatku;
  if (typeof oryg !== "function") return;
  window.pokazPopupStatku = function () {
    var przed = document.querySelectorAll(".maplibregl-popup").length;
    var wynik = oryg.apply(this, arguments);
    var po = document.querySelectorAll(".maplibregl-popup");
    if (po.length > przed) po[po.length - 1].classList.add("statek-popup");
    return wynik;
  };
})();
