(function () {
  var NAZWY = { uav: "Dron", recon: "Dron rozpoznawczy", missile: "Rakieta",
    ballistic: "Rakieta balistyczna", kab: "Bomba kierowana KAB", mig31k: "MiG-31K",
    unknown: "Obiekt nierozpoznany" };
  var lewa = document.getElementById("lewa");
  if (!lewa) return;

  var btn = document.createElement("button");
  btn.className = "ikona-menu";
  btn.textContent = "🕐";
  btn.title = "Oś czasu (12 godzin)";
  btn.setAttribute("aria-label", "Oś czasu");
  setTimeout(function () { lewa.appendChild(btn); }, 300);

  function godzina(iso) {
    var d = new Date(iso);
    var dzis = new Date().toDateString() === d.toDateString();
    return dzis ? d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function zbuduj(d) {
    var box = document.createElement("div");
    function wiersz(t, styl) {
      var x = document.createElement("div");
      x.style.margin = "4px 0";
      if (styl) x.style.cssText += styl;
      x.textContent = t;
      box.appendChild(x);
      return x;
    }
    var lista = Object.keys(d.zdarzenia || {}).map(function (k) { return d.zdarzenia[k]; })
      .sort(function (a, b) { return a.pierwszy < b.pierwszy ? 1 : -1; });
    if (!lista.length) {
      wiersz("Brak zapisanych obiektów z ostatnich 12 godzin.");
    }
    var teraz = Date.now();
    lista.forEach(function (z) {
      var aktywny = z.status !== "resolved" && (teraz - new Date(z.ostatni).getTime()) < 15 * 60000;
      var blisko = z.min_km !== undefined && z.min_km <= 100;
      var tekst = godzina(z.pierwszy) + " · " + (NAZWY[z.typ] || NAZWY.unknown) +
        (z.liczba > 1 ? " ×" + z.liczba : "") +
        (z.miejsce ? " – " + z.miejsce : "") +
        (z.kurs !== null && z.kurs !== undefined ? " · kurs " + Math.round(z.kurs) + "°" : "") +
        (blisko ? " · ⚠ " + (z.min_km === 0 ? "nad Polską" : Math.round(z.min_km) + " km od granicy PL") : "") +
        (aktywny ? "" : " · nie widziany od " + godzina(z.ostatni));
      var w = wiersz(tekst, "padding-left:6px;border-left:3px solid " +
        (blisko ? "#e8590c" : aktywny ? "#868e96" : "#ced4da") + ";cursor:pointer;" +
        (aktywny ? "" : "color:#777"));
      w.addEventListener("click", function () {
        map.flyTo({ center: [z.lon, z.lat], zoom: Math.max(map.getZoom(), 7) });
      });
    });
    wiersz("Godzina = moment, w którym automat po raz pierwszy zauważył obiekt (opóźnienie do kilku minut). " +
      "⚠ = obiekt był w promieniu 100 km od uproszczonej granicy Polski. Nieoficjalne, szacunkowe dane z NEPTUN. " +
      "Nie zastępuje syren, Alertu RCB ani komunikatów służb. Stan z " +
      (d.czas ? godzina(d.czas) : "?") + ".", "font-size:11px;color:#666;margin-top:8px");
    var a = document.createElement("a");
    a.href = "https://neptun.in.ua/"; a.target = "_blank"; a.rel = "noopener";
    a.textContent = "Dane: NEPTUN";
    a.style.fontSize = "11px";
    box.appendChild(a);
    return box;
  }

  btn.addEventListener("click", function () {
    var gora = document.getElementById("gora-panel");
    var szcz = document.getElementById("szczegoly-gora");
    var tytul = szcz && szcz.querySelector(".p-nag span");
    if (gora && gora.style.display === "block" && tytul && /oś czasu/i.test(tytul.textContent)) {
      var x = document.getElementById("gora-x");
      if (x) x.click();
      return;
    }
    fetch("os_czasu.json?t=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        if (window.pokazSzczegoly) window.pokazSzczegoly("Oś czasu (ostatnie 12 godzin)", zbuduj(d));
      })
      .catch(function () {
        var b = document.createElement("div");
        b.textContent = "Brak danych osi czasu. Sprawdź, czy działa automat „Zapisz os czasu”.";
        if (window.pokazSzczegoly) window.pokazSzczegoly("Oś czasu", b);
      });
  });
})();
