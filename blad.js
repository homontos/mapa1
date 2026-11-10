window.addEventListener("error", function (e) {
  var d = document.createElement("div");
  d.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99;" +
    "background:#fff0f0;color:#a00;padding:6px;font-size:12px";
  d.textContent = "Błąd: " + e.message + " (" +
    String(e.filename || "").split("/").pop() + ":" + e.lineno + ")";
  document.body.appendChild(d);
});
