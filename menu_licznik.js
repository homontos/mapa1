(function () {
  var API = "https://neptun.in.ua/api/v1/threats";

  // ---------- Przycisk menu ----------
  var st = document.createElement("style");
  st.textContent =
    "#lewa{top:54px!important}" +
    "body.menu-zwiniete #lewa{display:none!important}" +
    "#menu-przel{position:fixed;top:10px;left:6px;width:36px;height:36px;z-index:7;" +
    "border-radius:10px;padding:0;cursor:pointer;font-size:18px;line-height:1;" +
    "background:rgba(20,24,30,0.78);color:#fff;border:1px solid rgba(255,255,255,0.28);" +
    "box-shadow:0 1px 4px rgba(0,0,0,0.5)}" +
    "#licznik-zagr{flex:none;display:flex;align-items:center;padding:0 8px;color:#fff;" +
    "font:bold 13px sans-serif;white-space:nowrap;cursor:pointer;border-left:1px solid #333}" +
    "#licznik-zagr.luzem{position:fixed;right:10px;bottom:106px;z-index:6;padding:6px 10px;" +
    "background:#111;border-radius:8px}";
  document.head.appendChild(st);

  var przycisk = document.createElement("button");
  przycisk.id = "menu-przel";
  przycisk.setAttribute("aria-label", "Menu");
  document.body.appendChild(przycisk);

  var zapamietane = null;
  try { zapamietane = localStorage.getItem("mapa-menu"); } catch (e) {}
  var otwarte = zapamietane === "1";           // domyslnie schowane
  function ustaw() {
    document.body.classList.toggle("menu-zwiniete", !otwarte);
    przycisk.textContent = otwarte ? "✕" : "☰";
    try { localStorage.setItem("mapa-menu", otwarte ? "1" : "0"); } catch (e) {}
  }
  przycisk.addEventListener("click", function () {
    if (otwarte) {
      var x = document.getElementById("gora-x");   // zamknij otwarty panel
      if (x) x.click();
    }
    otwarte = !otwarte;
    ustaw();
  });
  ustaw();

  // ---------- Licznik dronow i rakiet ----------
  var NAZWY = { uav: "Drony", recon: "Drony rozpoznawcze", missile: "Rakiety",
    ballistic: "Rakiety balistyczne", kab: "Bomby kierowane (KAB)", mig31k: "MiG-31K",
    unknown: "Obiekty nierozpoznane" };
  var licznik = document.createElement("div");
  licznik.id = "licznik-zagr";
  licznik.textContent = "🛩️– 🚀–";
  licznik.title = "Liczba lecących dronów i rakiet (szacunek z NEPTUN)";
  var pasek = document.getElementById("pasek");
  var po = document.getElementById("granica-odz") || document.getElementById("pasek-utc");
  if (pasek && po) pasek.insertBefore(licznik, po.nextSibling);
  else { licznik.className = "luzem"; document.body.appendChild(licznik); }

  var ostatnie = null, godz = "";

  function liczba(t) { return t.count > 0 ? t.count : 1; }

  function przelicz(d) {
    var wg = {}, grupy = {};
    (d.threats || []).forEach(function (t) {
      if (t.status === "resolved" || t.status === "stale" || t.advisory) return;
      var k = t.type || "unknown";
      wg[k] = (wg[k] || 0) + liczba(t);
      grupy[k] = (grupy[k] || 0) + 1;
    });
    ostatnie = { wg: wg, grupy: grupy };
    var drony = (wg.uav || 0) + (wg.recon || 0);
    var rakiety = (wg.missile || 0) + (wg.ballistic || 0);
    licznik.textContent = "🛩️" + drony + " 🚀" + rakiety;
    godz = new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
    licznik.title = "Drony: " + drony + ", rakiety: " + rakiety + " (stan z " + godz + ")";
  }

  licznik.addEventListener("click", function () {
    var box = document.createElement("div");
    function wiersz(t, styl) {
      var d = document.createElement("div");
      d.style.margin = "4px 0";
      if (styl) d.style.cssText += styl;
      d.textContent = t;
      box.appendChild(d);
    }
    if (!ostatnie) { wiersz("Brak danych z NEPTUN."); }
    else {
      var klucze = Object.keys(ostatnie.wg);
      if (!klucze.length) wiersz("Aktualnie brak aktywnych obiektów w NEPTUN.");
      klucze.forEach(function (k) {
        wiersz((NAZWY[k] || k) + ": " + ostatnie.wg[k] +
          " (wpisów: " + ostatnie.grupy[k] + ")");
      });
      if (godz) wiersz("Stan z " + godz, "color:#666;font-size:12px");
    }
    wiersz("To szacunki z doniesień agregatora NEPTUN, a nie oficjalne liczby. Nie zastępuje syren " +
      "ani Alertu RCB.", "font-size:11px;color:#666;margin-top:8px");
    var a = document.createElement("a");
    a.href = "https://neptun.in.ua/"; a.target = "_blank"; a.rel = "noopener";
    a.textContent = "Dane: NEPTUN";
    a.style.cssText = "font-size:11px";
    box.appendChild(a);
    if (window.pokazSzczegoly) window.pokazSzczegoly("Drony i rakiety (NEPTUN)", box);
  });

  function odswiez() {
    if (document.hidden) return;
    fetch(API)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(przelicz)
      .catch(function () { licznik.textContent = "🛩️? 🚀?"; });
  }
  odswiez();
  setInterval(odswiez, 20000);
})();
