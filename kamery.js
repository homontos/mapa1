(function () {
  var KAMERA = {
    nazwa: "Gdynia – widok na Zatokę Gdańską",
    lat: 54.5189, lon: 18.5305,
    link: "https://www.youtube.com/live/uxC7Gf0_MwM",
    embed: "https://www.youtube.com/live/uxC7Gf0_MwM"
  }; 
  var PROG_ZOOM = 5;        // tak samo jak pogoda
  var PRZESUNIECIE_X = 60;  // ile pikseli na prawo od etykiety "Gdynia"

  // Zamienia zwykly link do YouTube na odtwarzacz startujacy od razu (bez dzwieku)
  function naEmbed(url) {
    url = (url || "").trim();
    var m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (m) {
      return "https://www.youtube.com/embed/" + m[1] +
        "?autoplay=1&mute=1&playsinline=1&rel=0";
    }
    return /^https:\/\//.test(url) ? url : "";
  }

  var st = document.createElement("style");
  st.textContent =
    "#kamera{position:fixed;top:110px;right:10px;z-index:4;width:300px;" +
    "max-width:calc(100vw - 80px);display:none;background:rgba(255,255,255,0.97);" +
    "border-radius:8px;padding:8px 10px;font:13px sans-serif;color:#222;" +
    "box-shadow:0 1px 4px rgba(0,0,0,0.3)}" +
    "#kamera .k-nag{display:flex;justify-content:space-between;align-items:center;" +
    "font-weight:bold}" +
    "#kamera .k-nag button{border:0;background:none;font-size:20px;cursor:pointer}" +
    "#kamera iframe{width:100%;height:190px;border:0;border-radius:4px;margin-top:6px}" +
    "#kamera .k-link{display:block;text-align:center;margin-top:8px;padding:8px;" +
    "background:#0b7285;color:#fff;border-radius:4px;text-decoration:none}" +
    "#kamera .k-uwaga{font-size:11px;color:#666;margin-top:6px}" +
    ".znacznik-kamery{width:24px;height:24px;border-radius:50%;background:#0b7285;" +
    "border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);display:flex;" +
    "align-items:center;justify-content:center;font-size:12px;cursor:pointer}";
  document.head.appendChild(st);

  var panel = document.createElement("div");
  panel.id = "kamera";
  document.body.appendChild(panel);

  function zamknij() {
    panel.style.display = "none";
    panel.textContent = "";
  }

  function otworz() {
    panel.textContent = "";
    var nag = document.createElement("div");
    nag.className = "k-nag";
    var t = document.createElement("span");
    t.textContent = "📷 " + KAMERA.nazwa;
    var x = document.createElement("button");
    x.textContent = "×";
    x.setAttribute("aria-label", "Zamknij kamerę");
    x.addEventListener("click", zamknij);
    nag.appendChild(t);
    nag.appendChild(x);
    panel.appendChild(nag);

    var adres = naEmbed(KAMERA.embed);
    if (adres) {
      var f = document.createElement("iframe");
      f.src = adres;
      f.allow = "autoplay; fullscreen; picture-in-picture";
      f.referrerPolicy = "strict-origin-when-cross-origin";
      f.setAttribute("allowfullscreen", "");
      f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
      panel.appendChild(f);
    }
    var a = document.createElement("a");
    a.className = "k-link";
    a.href = KAMERA.link;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Otwórz kamerę na żywo";
    panel.appendChild(a);

    var u = document.createElement("div");
    u.className = "k-uwaga";
    u.textContent = "Jeśli obraz się nie pokazuje, autor transmisji zablokował osadzanie. Użyj przycisku.";
    panel.appendChild(u);
    panel.style.display = "block";
  }

  var el = document.createElement("div");
  el.className = "znacznik-kamery";
  el.textContent = "📷";
  el.title = KAMERA.nazwa;
  el.addEventListener("click", function (e) {
    e.stopPropagation();
    otworz();
  });
  new maplibregl.Marker({ element: el, offset: [PRZESUNIECIE_X, 0] })
    .setLngLat([KAMERA.lon, KAMERA.lat])
    .addTo(map);

  function widocznosc() {
    el.style.display = map.getZoom() >= PROG_ZOOM ? "" : "none";
  }
  map.on("zoom", widocznosc);
  widocznosc();

  var btn = document.createElement("button");
  btn.textContent = "📷 Kamery Gdynia";
  btn.style.cssText = "position:fixed;bottom:70px;right:10px;z-index:4;" +
    "padding:8px 10px;border:0;border-radius:6px;background:#0b7285;color:#fff;" +
    "font:13px sans-serif;box-shadow:0 1px 4px rgba(0,0,0,0.3)";
  btn.addEventListener("click", function () {
    map.flyTo({ center: [18.5305, 54.5189], zoom: 12 });
  });
  document.body.appendChild(btn);
})();
