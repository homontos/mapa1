(function () {
  // ---------- 1. Ponawianie nieudanych pobran ----------
  var f0 = window.fetch ? window.fetch.bind(window) : null;
  function czekaj(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  if (f0) {
    window.fetch = function (url, opts) {
      var metoda = String((opts && opts.method) || (url && url.method) || "GET").toUpperCase();
      if (metoda !== "GET") return f0(url, opts);
      var proby = 0;
      function probuj() {
        return f0(url, opts).then(function (r) {
          if ((r.status === 502 || r.status === 503 || r.status === 504) && proby < 2) {
            proby++;
            return czekaj(proby * 800).then(probuj);
          }
          return r;
        }, function (blad) {
          if ((blad && blad.name === "AbortError") || proby >= 2) throw blad;
          proby++;
          return czekaj(proby * 800).then(probuj);
        });
      }
      return probuj();
    };
  }

  // ---------- 2. Kontrola po zaladowaniu: ewentualne samoczynne odswiezenie ----------
  var KLUCZ = "mapa-auto-odswiezenia";
  var bledy = 0;
  window.addEventListener("error", function () { bledy++; });

  var toast = document.createElement("div");
  toast.style.cssText = "position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99;" +
    "background:#111;color:#fff;padding:8px 14px;border-radius:8px;font:13px sans-serif;display:none";
  toast.textContent = "Odświeżam stronę…";
  function dodajToast() { document.body.appendChild(toast); }
  if (document.body) dodajToast(); else document.addEventListener("DOMContentLoaded", dodajToast);

  function wszystkoOK() {
    try {
      if (typeof map === "undefined" || !map.getStyle || !map.getStyle()) return false;
      if (!map.getLayer("statki-postoj")) return false;
      if (!document.getElementById("pasek")) return false;
      if (document.querySelectorAll("#lewa .ikona-menu").length < 8) return false;
    } catch (e) { return false; }
    return true;
  }
  function licznikAuto() {
    try { return +(sessionStorage.getItem(KLUCZ) || 0); } catch (e) { return 99; }
  }
  setTimeout(function () {
    var n = licznikAuto();
    if (n >= 2) return;                     // nie wpadamy w petle
    if (wszystkoOK() && bledy === 0) {
      try { sessionStorage.setItem(KLUCZ, "0"); } catch (e) {}
      return;
    }
    try { sessionStorage.setItem(KLUCZ, String(n + 1)); } catch (e) {}
    toast.style.display = "block";
    setTimeout(function () { location.reload(); }, 600);
  }, 12000);

  // ---------- 3. Ikona 🔄 na dole menu ----------
  function dodajPrzycisk() {
    var lewa = document.getElementById("lewa");
    if (!lewa) return;
    var b = document.createElement("button");
    b.className = "ikona-menu";
    b.textContent = "🔄";
    b.title = "Odśwież stronę";
    b.setAttribute("aria-label", "Odśwież stronę");
    b.addEventListener("click", function () {
      try { sessionStorage.setItem(KLUCZ, "0"); } catch (e) {}
      b.style.opacity = "1";
      toast.style.display = "block";
      setTimeout(function () { location.reload(); }, 200);
    });
    lewa.appendChild(b);
  }
  setTimeout(dodajPrzycisk, 2500);        // po pozostalych ikonach, zeby byl na samym dole
})();
