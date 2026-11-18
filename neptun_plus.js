(function () {
  var czesci = location.pathname.split("/").filter(Boolean);
  var BAZA = "https://raw.githubusercontent.com/" + location.hostname.split(".")[0] + "/" +
    (czesci[0] || "") + "/dane/";
  var API = "https://neptun.in.ua/api/v1/threats";
  var KOLORY = { uav: "#e8590c", recon: "#868e96", missile: "#e03131", ballistic: "#a61e4d",
    kab: "#7048e8", mig31k: "#1971c2", unknown: "#495057" };
  var NAZWY = { uav: "Dron (BpLA)", recon: "Dron rozpoznawczy", missile: "Rakieta",
    ballistic: "Rakieta balistyczna", kab: "Bomba kierowana (KAB)", mig31k: "MiG-31K",
    unknown: "Obiekt nierozpoznany" };
  // [wzorzec w opisie, nazwa, zapytanie do Wikipedii, krotki opis]
  var MODELE = [
    [/шахед|shahed|герань|geran/i, "Shahed-136 / Geran-2", "HESA Shahed 136",
      "Dron-kamikadze dalekiego zasięgu, konstrukcji irańskiej (w Rosji używany jako Geran-2)."],
    [/орлан|orlan/i, "Orlan-10", "Orlan-10", "Rosyjski dron rozpoznawczy."],
    [/ланцет|lancet/i, "Lancet", "ZALA Lancet", "Rosyjski dron uderzeniowy (amunicja krążąca)."],
    [/гербер|gerber/i, "Gerbera", "Gerbera drone Russia", "Rosyjski dron-wabik, używany do zmylenia obrony."],
    [/іскандер|iskander/i, "Iskander", "9K720 Iskander", "Rosyjski pocisk balistyczny krótkiego zasięgu."],
    [/калібр|kalibr/i, "Kalibr", "3M-54 Kalibr", "Rosyjski pocisk manewrujący odpalany z okrętów i okrętów podwodnych."],
    [/х-?101|kh-?101/i, "Ch-101", "Kh-101", "Rosyjski pocisk manewrujący odpalany z samolotów."],
    [/кинджал|kinzhal|х-?47/i, "Kindżał (Ch-47M2)", "Kh-47M2 Kinzhal", "Rosyjski pocisk aerobalistyczny."],
    [/циркон|zircon|tsirkon/i, "Cyrkon", "3M22 Zircon", "Rosyjski pocisk hipersoniczny."],
    [/х-?22|kh-?22/i, "Ch-22", "Kh-22", "Rosyjski ciężki pocisk przeciwokrętowy."],
    [/х-?59|kh-?59/i, "Ch-59", "Kh-59", "Rosyjski pocisk manewrujący."],
    [/х-?55|kh-?55/i, "Ch-55", "Kh-55", "Rosyjski pocisk manewrujący."],
    [/міг-?31|mig-?31/i, "MiG-31K", "Mikoyan MiG-31", "Rosyjski myśliwiec przechwytujący, nosiciel pocisku Kindżał."],
    [/ту-?95|tu-?95/i, "Tu-95", "Tupolev Tu-95", "Rosyjski strategiczny bombowiec."],
    [/ту-?160|tu-?160/i, "Tu-160", "Tupolev Tu-160", "Rosyjski strategiczny bombowiec."],
    [/ту-?22|tu-?22/i, "Tu-22M3", "Tupolev Tu-22M", "Rosyjski bombowiec dalekiego zasięgu."]
  ];
  var TL = {}, slady = {}, wiki = {}, lokalne = {};
  var widoczne = true;

  // ---------- Tlumaczenia ----------
  function wczytajTL() {
    fetch("tlumaczenia.json?t=" + Math.floor(Date.now() / 60000))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { TL = d.t || {}; })
      .catch(function () {});
  }
  wczytajTL();
  setInterval(wczytajTL, 5 * 60 * 1000);

  function wstawTekst(el, oryg) {
    oryg = String(oryg || "").trim();
    var pl = TL[oryg] || lokalne[oryg];
    if (pl) { el.textContent = pl; return; }
    if (!/[А-Яа-яІіЇїЄєҐґ]/.test(oryg)) { el.textContent = oryg; return; }
    el.textContent = oryg + " (tłumaczę…)";
    fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(oryg.slice(0, 400)) + "&langpair=uk|pl")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var t = d && d.responseData && d.responseData.translatedText;
        if (t) { lokalne[oryg] = t; el.textContent = t + " (tłumaczenie automatyczne)"; }
        else el.textContent = oryg + " (oryginał)";
      })
      .catch(function () { el.textContent = oryg + " (oryginał)"; });
  }

  // ---------- Zdjecia z Wikipedii ----------
  function foto(zapytanie, kontener) {
    function wstaw(d) {
      if (!d || !d.src) return;
      var img = document.createElement("img");
      img.src = d.src; img.alt = d.tytul;
      img.style.cssText = "width:100%;border-radius:4px;margin:4px 0 0";
      kontener.appendChild(img);
      var a = document.createElement("a");
      a.textContent = "Zdjęcie poglądowe: Wikipedia – " + d.tytul;
      a.href = d.url; a.target = "_blank"; a.rel = "noopener";
      a.style.cssText = "display:block;font-size:11px;margin-bottom:4px";
      kontener.appendChild(a);
    }
    if (wiki[zapytanie] !== undefined) { wstaw(wiki[zapytanie]); return; }
    fetch("https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search" +
      "&gsrlimit=1&prop=pageimages|info&piprop=thumbnail&pithumbsize=320&inprop=url&gsrsearch=" +
      encodeURIComponent(zapytanie))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var st = d.query && d.query.pages, p = st && st[Object.keys(st)[0]];
        var wynik = p && p.thumbnail && String(p.thumbnail.source).indexOf("https://") === 0
          ? { src: p.thumbnail.source, tytul: p.title, url: p.fullurl } : null;
        wiki[zapytanie] = wynik;
        wstaw(wynik);
      })
      .catch(function () { wiki[zapytanie] = null; });
  }

  // ---------- Tory lotu ----------
  function km(a, b) {
    var R = 6371, r = Math.PI / 180, dl = (b[1] - a[1]) * r, dn = (b[0] - a[0]) * r;
    var h = Math.pow(Math.sin(dl / 2), 2) + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.pow(Math.sin(dn / 2), 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function dodajPunkt(id, typ, lon, lat, t) {
    var s = slady[id] || (slady[id] = { typ: typ, pkt: [], brak: 0 });
    s.brak = 0; s.typ = typ;
    var ost = s.pkt[s.pkt.length - 1];
    if (!ost || km(ost, [lon, lat]) > 0.3) s.pkt.push([lon, lat, t]);
  }
  var daneSlad = { type: "FeatureCollection", features: [] };
  var daneStart = { type: "FeatureCollection", features: [] };

  function dodaj() {
    if (map.getSource("neptun-slad")) return;
    var przed = map.getLayer("neptun-punkt") ? "neptun-punkt" : (map.getLayer("statki-postoj") ? "statki-postoj" : undefined);
    var wid = widoczne ? "visible" : "none";
    map.addSource("neptun-slad", { type: "geojson", data: daneSlad });
    map.addSource("neptun-start", { type: "geojson", data: daneStart });
    map.addLayer({ id: "neptun-slad", type: "line", source: "neptun-slad", layout: { visibility: wid },
      paint: { "line-color": ["get", "kolor"], "line-width": 2.5, "line-opacity": 0.75 } }, przed);
    map.addLayer({ id: "neptun-start", type: "circle", source: "neptun-start", layout: { visibility: wid },
      paint: { "circle-radius": 3.5, "circle-color": "#ffffff", "circle-stroke-width": 2,
        "circle-stroke-color": ["get", "kolor"] } }, przed);
  }
  map.on("style.load", dodaj);
  if (map.isStyleLoaded()) dodaj();

  function rysujSlady() {
    var odtwarzanie = document.getElementById("h-suwak") && +document.getElementById("h-suwak").value !== 0;
    var c = [], s = [];
    if (!odtwarzanie) {
      Object.keys(slady).forEach(function (id) {
        var x = slady[id];
        if (x.pkt.length < 2) return;
        var k = KOLORY[x.typ] || KOLORY.unknown;
        c.push({ type: "Feature", properties: { kolor: k },
          geometry: { type: "LineString", coordinates: x.pkt.map(function (p) { return [p[0], p[1]]; }) } });
        s.push({ type: "Feature", properties: { kolor: k },
          geometry: { type: "Point", coordinates: [x.pkt[0][0], x.pkt[0][1]] } });
      });
    }
    daneSlad = { type: "FeatureCollection", features: c };
    daneStart = { type: "FeatureCollection", features: s };
    var a = map.getSource("neptun-slad"), b = map.getSource("neptun-start");
    if (a) a.setData(daneSlad);
    if (b) b.setData(daneStart);
  }

  function odswiez() {
    if (document.hidden) return;
    fetch(API)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var teraz = Date.now(), obecne = {};
        (d.threats || []).forEach(function (t) {
          if (t.areaOnly || t.status === "resolved" || t.advisory) return;
          if (typeof t.lat !== "number" || typeof t.lon !== "number" || !t.id) return;
          var id = String(t.id);
          obecne[id] = 1;
          dodajPunkt(id, t.type || "unknown", t.lon, t.lat, teraz);
        });
        Object.keys(slady).forEach(function (id) {
          if (!obecne[id] && ++slady[id].brak >= 2) delete slady[id];
        });
        rysujSlady();
      })
      .catch(function () {});
  }

  // Poczatkowe tory z zapisanej historii, potem dopisywanie na zywo
  fetch(BAZA + "historia_ruchu.json?t=" + Math.floor(Date.now() / 60000))
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (h) {
      (h.snapshoty || []).forEach(function (s) {
        (s.n || []).forEach(function (r) {
          if (r[0] && !r[7]) dodajPunkt(String(r[0]), r[1] || "unknown", r[3], r[2], s.t * 1000);
        });
      });
    })
    .catch(function () {})
    .then(function () { odswiez(); setInterval(odswiez, 20000); });

  // ---------- Szczegoly obiektu ----------
  function szczegoly(e) {
    var p = e.features[0].properties;
    var typ = p.type || "unknown";
    var tekstModelu = (p.title || "") + " " + (p.opis || "");
    var model = null;
    for (var i = 0; i < MODELE.length; i++) { if (MODELE[i][0].test(tekstModelu)) { model = MODELE[i]; break; } }

    var box = document.createElement("div");
    function w(t, styl) {
      var d = document.createElement("div");
      d.style.margin = "4px 0";
      if (styl) d.style.cssText += styl;
      d.textContent = t;
      box.appendChild(d);
      return d;
    }
    w((NAZWY[typ] || NAZWY.unknown) + (model ? " – " + model[1] : " (model nieustalony)"), "font-weight:bold");
    var fotoBox = document.createElement("div");
    box.appendChild(fotoBox);
    if (model) { w(model[3], "font-size:13px"); foto(model[2], fotoBox); }
    else w("Model nie został podany w opisie, więc nie pokazuję zdjęcia.", "font-size:12px;color:#777");

    if (p.title) { var d1 = w("", "margin-top:8px"); wstawTekst(d1, p.title); }
    if (p.opis && p.opis !== p.title) { var d2 = w(""); wstawTekst(d2, p.opis); }
    var miejsce = document.createElement("div");
    miejsce.style.margin = "4px 0";
    box.appendChild(miejsce);
    var cz = [p.locality, p.district, p.region].filter(function (x) { return x; });
    var lab = document.createElement("span"); lab.textContent = "Miejsce: "; miejsce.appendChild(lab);
    cz.forEach(function (x, i) {
      var s = document.createElement("span");
      miejsce.appendChild(s);
      wstawTekst(s, x);
      if (i < cz.length - 1) miejsce.appendChild(document.createTextNode(", "));
    });
    if (p.count > 0) w("Liczba obiektów: " + p.count);
    if (p.heading !== undefined && p.heading !== null && p.heading !== "") w("Kurs: " + Math.round(p.heading) + "°");
    if (p.speed) w("Prędkość: ok. " + Math.round(p.speed) + " km/h");
    var sl = slady[String(p.id)];
    if (sl && sl.pkt.length > 1) {
      var d = 0;
      for (var j = 1; j < sl.pkt.length; j++) d += km(sl.pkt[j - 1], sl.pkt[j]);
      w("Tor lotu: od " + new Date(sl.pkt[0][2]).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) +
        ", przebyte ok. " + Math.round(d) + " km (linia na mapie zniknie, gdy obiekt zniknie z NEPTUN).");
    }
    w("Nieoficjalny agregator doniesień. Pozycje szacunkowe i bywają spóźnione. Rodzaj obiektu ustalono na podstawie " +
      "opisu źródła, zdjęcie jest poglądowe. Nie zastępuje syren ani Alertu RCB.", "font-size:11px;color:#666;margin-top:8px");
    var a = document.createElement("a");
    a.href = "https://neptun.in.ua/"; a.target = "_blank"; a.rel = "noopener";
    a.textContent = "Dane: NEPTUN"; a.style.fontSize = "11px";
    box.appendChild(a);
    if (window.pokazSzczegoly) window.pokazSzczegoly((NAZWY[typ] || "Obiekt") + (model ? " " + model[1] : ""), box);
  }
  ["neptun-punkt", "neptun-ruch"].forEach(function (id) { map.on("click", id, szczegoly); });

  // ---------- Legenda ----------
  var tresc = document.querySelector("#legenda .p-tresc") || document.getElementById("legenda");
  var blok = document.createElement("div");
  blok.innerHTML = '<label style="font-size:12px"><input type="checkbox" id="np-slad" checked> Tory lotu dronów i rakiet</label>';
  tresc.appendChild(blok);
  document.getElementById("np-slad").addEventListener("change", function () {
    widoczne = this.checked;
    ["neptun-slad", "neptun-start"].forEach(function (id) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", widoczne ? "visible" : "none");
    });
  });
})();
