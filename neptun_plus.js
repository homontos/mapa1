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
  // [wzorzec w opisie, id zdjecia, nazwa, krotki opis]
  var MODELE = [
    [/шахед|shahed|герань|geran/i, "shahed", "Shahed-136 / Geran-2", "Dron-kamikadze dalekiego zasięgu, konstrukcji irańskiej (w Rosji Geran-2)."],
    [/орлан|orlan/i, "orlan", "Orlan-10", "Rosyjski dron rozpoznawczy."],
    [/ланцет|lancet/i, "lancet", "Lancet", "Rosyjski dron uderzeniowy (amunicja krążąca)."],
    [/гербер|gerber/i, "gerbera", "Gerbera", "Rosyjski dron-wabik do zmylenia obrony."],
    [/іскандер|iskander/i, "iskander", "Iskander", "Rosyjski pocisk balistyczny krótkiego zasięgu."],
    [/калібр|kalibr/i, "kalibr", "Kalibr", "Rosyjski pocisk manewrujący z okrętów."],
    [/х-?101|kh-?101/i, "kh101", "Ch-101", "Rosyjski pocisk manewrujący z samolotów."],
    [/кинджал|kinzhal|х-?47/i, "kinzhal", "Kindżał (Ch-47M2)", "Rosyjski pocisk aerobalistyczny."],
    [/циркон|zircon|tsirkon/i, "zircon", "Cyrkon", "Rosyjski pocisk hipersoniczny."],
    [/х-?22|kh-?22/i, "kh22", "Ch-22", "Rosyjski ciężki pocisk przeciwokrętowy."],
    [/х-?59|kh-?59/i, "kh59", "Ch-59", "Rosyjski pocisk manewrujący."],
    [/х-?55|kh-?55/i, "kh55", "Ch-55", "Rosyjski pocisk manewrujący."],
    [/міг-?31|mig-?31/i, "mig31", "MiG-31K", "Rosyjski myśliwiec przechwytujący, nosiciel pocisku Kindżał."],
    [/ту-?95|tu-?95/i, "tu95", "Tu-95", "Rosyjski strategiczny bombowiec."],
    [/ту-?160|tu-?160/i, "tu160", "Tu-160", "Rosyjski strategiczny bombowiec."],
    [/ту-?22|tu-?22/i, "tu22", "Tu-22M3", "Rosyjski bombowiec dalekiego zasięgu."]
  ];
  var OBL = { "Вінницька": "winnicki", "Волинська": "wołyński", "Дніпропетровська": "dniepropietrowski",
    "Донецька": "doniecki", "Житомирська": "żytomierski", "Закарпатська": "zakarpacki", "Запорізька": "zaporoski",
    "Івано-Франківська": "iwanofrankiwski", "Київська": "kijowski", "Кіровоградська": "kirowohradzki",
    "Луганська": "ługański", "Львівська": "lwowski", "Миколаївська": "mikołajowski", "Одеська": "odeski",
    "Полтавська": "połtawski", "Рівненська": "rówieński", "Сумська": "sumski", "Тернопільська": "tarnopolski",
    "Харківська": "charkowski", "Херсонська": "chersoński", "Хмельницька": "chmielnicki", "Черкаська": "czerkaski",
    "Чернівецька": "czerniowiecki", "Чернігівська": "czernihowski" };
  var LIT = { а: "a", б: "b", в: "w", г: "h", ґ: "g", д: "d", е: "e", є: "je", ж: "ż", з: "z", и: "y", і: "i",
    ї: "ji", й: "j", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "ch", ц: "c", ч: "cz", ш: "sz", щ: "szcz", ь: "", ю: "ju", я: "ja", "’": "", "ʼ": "", "'": "" };
  var SLOWA = [[/БпЛА/g, "dron"], [/курсом на/g, "kursem na"], [/Підтверджень/g, "Potwierdzeń"],
    [/район/g, "rejon"], [/область/g, "obwód"], [/м\./g, "m."]];
  var TL = {}, slady = {}, BIB = {};
  var widoczne = true;

  // ---------- Tlumaczenie ----------
  function translit(s) {
    return s.replace(/[А-Яа-яІіЇїЄєҐґ’ʼ']+/g, function (w) {
      var out = "";
      for (var i = 0; i < w.length; i++) {
        var c = w[i], m = LIT[c.toLowerCase()];
        if (m === undefined) { out += c; continue; }
        if (c !== c.toLowerCase() && m.length) m = m.charAt(0).toUpperCase() + m.slice(1);
        out += m;
      }
      return out;
    });
  }
  function frazaLokalna(s) {
    var t = s;
    SLOWA.forEach(function (p) { t = t.replace(p[0], p[1]); });
    t = translit(t);
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function miejsceLokalnie(s) {
    s = String(s || "").trim();
    if (/Крим/.test(s)) return "Krym";
    if (/Севастополь/.test(s)) return "Sewastopol";
    if (/^(м\.\s*)?Київ$/.test(s)) return "Kijów";
    for (var k in OBL) { if (s.indexOf(k) === 0 && /область/.test(s)) return "obwód " + OBL[k]; }
    return frazaLokalna(s);
  }
  function pl(oryg, miejsce) {
    oryg = String(oryg || "").trim();
    if (!/[А-Яа-яІіЇїЄєҐґ]/.test(oryg)) return oryg;
    if (miejsce) { var m = miejsceLokalnie(oryg); if (m) return TL[oryg] || m; }
    return TL[oryg] || frazaLokalna(oryg);
  }
  function wczytajTL() {
    fetch("tlumaczenia.json?t=" + Math.floor(Date.now() / 60000))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { TL = d.t || {}; })
      .catch(function () {});
  }
  wczytajTL();
  setInterval(wczytajTL, 5 * 60 * 1000);

  // ---------- Biblioteka zdjec (folder drony/) ----------
  fetch("drony/index.json?t=" + Math.floor(Date.now() / 600000))
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { BIB = d.modele || {}; })
    .catch(function () {});

  function zdjecie(id, kontener) {
    var z = BIB[id];
    if (!z) {
      var b = document.createElement("div");
      b.style.cssText = "font-size:11px;color:#777;margin:4px 0";
      b.textContent = "Brak zdjęcia tego modelu w bibliotece.";
      kontener.appendChild(b);
      return;
    }
    var img = document.createElement("img");
    img.src = "drony/" + z.plik; img.alt = z.tytul;
    img.style.cssText = "width:100%;border-radius:4px;margin:4px 0 0";
    kontener.appendChild(img);
    var c = document.createElement("div");
    c.style.cssText = "font-size:11px;color:#555;margin-bottom:4px";
    c.appendChild(document.createTextNode("Zdjęcie poglądowe: " + z.autor + ", "));
    var l = document.createElement("a");
    l.textContent = z.licencja;
    if (/^https?:\/\//.test(z.licurl || "")) { l.href = z.licurl; l.target = "_blank"; l.rel = "noopener"; }
    c.appendChild(l);
    c.appendChild(document.createTextNode(", "));
    var s = document.createElement("a");
    s.textContent = "źródło (Wikimedia Commons)";
    if (/^https?:\/\//.test(z.zrodlo || "")) { s.href = z.zrodlo; s.target = "_blank"; s.rel = "noopener"; }
    c.appendChild(s);
    kontener.appendChild(c);
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
    var sw = document.getElementById("h-suwak");
    var odtwarzanie = sw && +sw.value !== 0;
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
    function szczegoly(cechy) {
    var p = cechy[0].properties;
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
    w((NAZWY[typ] || NAZWY.unknown) + (model ? " – " + model[2] : " (model nieustalony)"), "font-weight:bold");
    var fotoBox = document.createElement("div");
    box.appendChild(fotoBox);
    if (model) { w(model[3], "font-size:13px"); zdjecie(model[1], fotoBox); }
    else w("Model nie został podany w opisie, więc nie pokazuję zdjęcia.", "font-size:12px;color:#777");

    var cz = [p.locality, p.district, p.region].filter(function (x) { return x; })
      .map(function (x) { return pl(x, true); });
    if (cz.length) w("Miejsce: " + cz.join(", "), "margin-top:8px");
    if (p.title) w("Opis (tłumaczenie automatyczne): " + pl(p.title, false));
    if (p.opis && p.opis !== p.title) w(pl(p.opis, false));
    if (p.count > 0) w("Liczba obiektów: " + p.count);
    if (p.heading !== undefined && p.heading !== null && p.heading !== "") w("Kurs: " + Math.round(p.heading) + "°");
    if (p.speed) w("Prędkość: ok. " + Math.round(p.speed) + " km/h");
    var POW = { low: "niska", medium: "średnia", high: "wysoka" };
    w("Pewność: " + (POW[p.confidence] || "nieznana") + (p.sources ? " (źródeł: " + p.sources + ")" : ""));
    if (p.uncertainty > 0) w("Pozycja przybliżona (±" + p.uncertainty + " km)");
    var sl = slady[String(p.id)];
    if (sl && sl.pkt.length > 1) {
      var dd = 0;
      for (var j = 1; j < sl.pkt.length; j++) dd += km(sl.pkt[j - 1], sl.pkt[j]);
      w("Tor lotu: od " + new Date(sl.pkt[0][2]).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) +
        ", przebyte ok. " + Math.round(dd) + " km (linia zniknie, gdy obiekt zniknie z NEPTUN).");
    }
    w("Nieoficjalny agregator doniesień. Pozycje szacunkowe i bywają spóźnione. Rodzaj obiektu ustalono z opisu źródła, " +
      "zdjęcie jest poglądowe. Nie zastępuje syren ani Alertu RCB.", "font-size:11px;color:#666;margin-top:8px");
    var a = document.createElement("a");
    a.href = "https://neptun.in.ua/"; a.target = "_blank"; a.rel = "noopener";
    a.textContent = "Dane: NEPTUN"; a.style.fontSize = "11px";
    box.appendChild(a);
    if (window.pokazSzczegoly) window.pokazSzczegoly((NAZWY[typ] || "Obiekt") + (model ? " " + model[2] : ""), box);
  }
  // Opoznienie, aby ten panel zawsze byl ostatni (po starym z neptun.js)
  ["neptun-punkt", "neptun-ruch"].forEach(function (id) {
        map.on("click", id, function (e) {
      var cechy = e.features;
      setTimeout(function () { szczegoly(cechy); }, 60);
    });

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