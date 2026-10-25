(function () {
  var KAMERY = [
    { nazwa: "Skwer Kościuszki / Dar Pomorza", lat: 54.5188, lon: 18.5532,
      link: "https://www.windy.com/webcams/1384053611", embed: "" },
    { nazwa: "Bulwar Nadmorski", lat: 54.5060, lon: 18.5580,
      link: "https://www.windfinder.com/webcams/gdynia-kosakowo-airport", embed: "" },
    { nazwa: "Molo w Orłowie", lat: 54.4770, lon: 18.5770,
      link: "https://www.windfinder.com/webcams/gdynia-kosakowo-airport", embed: "" }
  ];

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
    ".znacznik-kamery{width:30px;height:30px;border-radius:50%;background:#0b7285;" +
    "border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);display:flex;" +
    "align-items:center;justify-content:center;font-size:15px;cursor:pointer}";
  document.head.appendChild(st);

  var panel = document.createElement("div");
  panel.id = "kamera";
  document.body.appendChild(panel);

  function zamknij() {
    panel.style.display = "none";
    panel.textContent = "";
  }

  function otworz(k) {
    panel.textContent = "";
    var nag = document.createElement("div");
    nag.className = "k-nag";
    var t = document.createElement("span");
    t.textContent = "📷 " + k.nazwa;
    var x = document.createElement("button");
    x.textContent = "×";
    x.setAttribute("aria-label", "Zamknij kamerę");
    x.addEventListener("click", zamknij);
    nag.appendChild(t);
    nag.appendChild(x);
    panel.appendChild(nag);

    if (/^https:\/\//.test(k.embed || "")) {
      var f = document.createElement("iframe");
      f.src = k.embed;
      f.allow = "autoplay; fullscreen";
      f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups");
      panel.appendChild(f);
    }
    var a = document.createElement("a");
    a.className = "k-link";
    a.href = k.link;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Otwórz kamerę na żywo";
    panel.appendChild(a);

    var u = document.createElement("div");
    u.className = "k-uwaga";
    u.textContent = k.embed
      ? "Jeśli podgląd w ramce jest pusty, dostawca nie pozwala na osadzenie. Użyj przycisku."
      : "Ten dostawca otwiera kamerę we własnej karcie.";
    panel.appendChild(u);
    panel.style.display = "block";
  }

  KAMERY.forEach(function (k) {
    var el = document.createElement("div");
    el.className = "znacznik-kamery";
    el.textContent = "📷";
    el.title = k.nazwa;
    el.addEventListener("click", function (e) {
      e.stopPropagation();
      otworz(k);
    });
    new maplibregl.Marker({ element: el }).setLngLat([k.lon, k.lat]).addTo(map);
  });
})();
