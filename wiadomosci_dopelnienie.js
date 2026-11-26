(function () {
  var IKONY = { rakieta: "🚀", dron: "🛸", starcie: "💥", marynarka: "⚓", alarm: "⚠️", inne: "📍" };
  var NEWS = null, T = 0;

  function dane(cb) {
    if (NEWS && Date.now() - T < 300000) { cb(NEWS); return; }
    fetch("swiat.json?t=" + Math.floor(Date.now() / 60000))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { NEWS = d.zdarzenia || []; T = Date.now(); cb(NEWS); })
      .catch(function () { cb(NEWS || []); });
  }
  function region(el) {
    var b = el && el.querySelector("b");
    var m = b && /^📡\s*(.+?)\s*\(\d+\)\s*$/.exec(b.textContent || "");
    return m ? m[1] : "";
  }
  function e(tag, css, txt) {
    var x = document.createElement(tag);
    if (css) x.style.cssText = css;
    if (txt !== undefined) x.textContent = txt;
    return x;
  }
  function buduj(reg, lista) {
    var box = e("div");
    box.className = "news-extra";
    box.setAttribute("data-reg", reg);
    box.appendChild(e("div", "font-weight:bold;font-size:12px;margin:10px 0 2px;border-top:1px solid rgba(255,255,255,0.18);padding-top:6px",
      "Pozostałe regiony"));
    lista.filter(function (z) { return z.reg !== reg; }).slice(0, 30).forEach(function (z) {
      var w = e("div", "margin:4px 0;padding:3px 6px;border-left:3px solid #868e96;cursor:pointer");
      w.appendChild(e("div", "font-size:10px;font-weight:bold;opacity:0.8",
        (IKONY[z.kat] || "📍") + " " + (z.kraj || "").toUpperCase() + " · " + z.reg + " · " +
        new Date(z.t * 1000).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })));
      w.appendChild(document.createTextNode(z.tekst + " "));
      if (/^https?:\/\//.test(z.u || "")) {
        var a = e("a", "font-size:11px", "↗ " + (z.z || "źródło"));
        a.href = z.u; a.target = "_blank"; a.rel = "noopener";
        a.addEventListener("click", function (ev) { ev.stopPropagation(); });
        w.appendChild(a);
      }
      w.addEventListener("click", function () {
        map.flyTo({ center: [z.lon, z.lat], zoom: Math.max(map.getZoom(), 6) });
      });
      box.appendChild(w);
    });
    return box;
  }
  function dopelnij(kontener, po, lista) {
    var reg = region(kontener);
    if (!reg) return;
    var stary = kontener.querySelector(".news-extra");
    if (stary && stary.getAttribute("data-reg") === reg) return;
    if (stary) stary.remove();
    var box = buduj(reg, lista);
    if (po && po.parentNode) po.parentNode.insertBefore(box, po.nextSibling);
    else kontener.appendChild(box);
  }

  function kontrola() {
    var tile = document.querySelector('.kafel[data-typ="news"] .tr');
    var panel = document.getElementById("sw-tytul");
    if (!tile && !panel) return;
    dane(function (lista) {
      var t = document.querySelector('.kafel[data-typ="news"] .tr');
      if (t && t.querySelector("b")) dopelnij(t, null, lista);
      var l = document.getElementById("sw-lista"), p = document.getElementById("wiad");
      if (l && p && region(p)) dopelnij(p, l, lista);
    });
  }
  var timer = null;
  new MutationObserver(function () { clearTimeout(timer); timer = setTimeout(kontrola, 250); })
    .observe(document.body, { childList: true, subtree: true });
})();
