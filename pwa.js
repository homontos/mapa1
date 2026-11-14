(function () {
  function dodaj(tag, atr) {
    var e = document.createElement(tag);
    Object.keys(atr).forEach(function (k) { e.setAttribute(k, atr[k]); });
    document.head.appendChild(e);
  }
  dodaj("link", { rel: "manifest", href: "manifest.json" });
  dodaj("link", { rel: "apple-touch-icon", href: "apple-touch-icon.png" });
  dodaj("meta", { name: "theme-color", content: "#111111" });
  dodaj("meta", { name: "mobile-web-app-capable", content: "yes" });
  dodaj("meta", { name: "apple-mobile-web-app-capable", content: "yes" });
  dodaj("meta", { name: "apple-mobile-web-app-title", content: "Mapa" });
  dodaj("meta", { name: "apple-mobile-web-app-status-bar-style", content: "black" });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
})();
