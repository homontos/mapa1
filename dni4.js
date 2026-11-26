(function () {
  var DNI = 4;
  if (!window.fetch) return;
  var f0 = window.fetch.bind(window);
  window.fetch = function (u, o) {
    var url = typeof u === "string" ? u : ((u && u.url) || "");
    if (!/(^|\/)swiat\.json(\?|$)/.test(url)) return f0(u, o);
    return f0(u, o).then(function (r) {
      if (!r.ok) return r;
      return r.clone().json().then(function (d) {
        var od = Date.now() / 1000 - DNI * 86400;
        d.zdarzenia = (d.zdarzenia || []).filter(function (z) { return z.t >= od; });
        return new Response(JSON.stringify(d), { status: 200, headers: { "Content-Type": "application/json" } });
      }).catch(function () { return r; });
    });
  };
})();
