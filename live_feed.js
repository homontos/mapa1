(function () {
  const style = document.createElement("style");
  style.textContent = `
    #live-feed-panel {
      position: fixed;
      top: 8px;
      left: 52px;
      right: 56px;
      max-width: 420px;
      max-height: calc(100dvh - 110px);
      z-index: 7;
      background: rgba(20, 22, 27, 0.94);
      backdrop-filter: blur(4px);
      color: #f1f3f5;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.45);
      display: none;
      flex-direction: column;
      overflow: hidden;
      font: 13px sans-serif;
    }
    .feed-header {
      padding: 8px 12px;
      background: rgba(0,0,0,0.4);
      font-weight: bold;
      font-size: 13px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #2c2e33;
    }
    .feed-filtry {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      padding: 6px 10px;
      background: rgba(255,255,255,0.04);
      border-bottom: 1px solid #2c2e33;
    }
    .feed-filtry button {
      flex: 1 1 auto;
      background: #25262b;
      color: #ccc;
      border: 1px solid #373a40;
      border-radius: 6px;
      font-size: 11px;
      padding: 4px 6px;
      cursor: pointer;
    }
    .feed-filtry button.aktywny-filtr {
      background: #e03131;
      color: #fff;
      border-color: #e03131;
      font-weight: bold;
    }
    #feed-list {
      overflow-y: auto;
      padding: 8px 10px;
    }
    .feed-card {
      background: #25262b;
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 8px;
      border-left: 3px solid #e03131;
      cursor: pointer;
    }
    .feed-card:hover { background: #2c2e33; }
    .feed-card img {
      width: 100%;
      max-height: 150px;
      object-fit: cover;
      border-radius: 4px;
      margin: 6px 0;
    }
    .feed-meta { font-size: 10px; color: #909296; display: flex; justify-content: space-between; }
    .feed-title { font-weight: bold; font-size: 13px; margin: 4px 0; color: #fff; }
    .feed-desc { font-size: 12px; color: #c1c2c5; line-height: 1.35; }
    .feed-link { display: inline-block; margin-top: 5px; font-size: 11px; color: #4dabf7; text-decoration: none; }
    .osint-marker { font-size: 22px; cursor: pointer; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.8)); }
  `;
  document.head.appendChild(style);

  // Tworzymy przycisk w stylu ikony_menu.js i doklejamy do #lewa
  const lewa = document.getElementById("lewa");
  const fireBtn = document.createElement("button");
  fireBtn.id = "fire-btn";
  fireBtn.className = "ikona-menu";
  fireBtn.textContent = "🔥";
  fireBtn.title = "Live OSINT Feed";
  fireBtn.setAttribute("aria-label", "Live OSINT Feed");

  if (lewa) {
    lewa.appendChild(fireBtn);
  } else {
    fireBtn.style.cssText = "position:fixed;top:10px;right:10px;z-index:15;";
    document.body.appendChild(fireBtn);
  }

  // Panel raportow
  const feedPanel = document.createElement("div");
  feedPanel.id = "live-feed-panel";
  feedPanel.innerHTML = `
    <div class="feed-header">
      <span>🔥 LIVE OSINT FEED</span>
      <button id="close-feed" style="background:none;border:0;color:#aaa;font-size:20px;line-height:1;cursor:pointer;">×</button>
    </div>
    <div class="feed-filtry">
      <button data-region="ALL" class="aktywny-filtr">Wszystkie</button>
      <button data-region="Bałtyk">Bałtyk</button>
      <button data-region="Izrael">Izrael</button>
      <button data-region="Ormuz">Ormuz</button>
      <button data-region="Morze Czerwone">Huti</button>
      <button data-region="Ukraina">Ukraina</button>
    </div>
    <div id="feed-list">Ładowanie raportów...</div>
  `;
  document.body.appendChild(feedPanel);

  const feedList = document.getElementById("feed-list");
  let feedActive = false;
  let allEvents = [];
  let activeRegion = "ALL";
  let osintMarkers = [];

  function clearMarkers() {
    osintMarkers.forEach(m => m.remove());
    osintMarkers = [];
  }

  function zamknijFeed() {
    feedActive = false;
    fireBtn.classList.remove("akt");
    feedPanel.style.display = "none";
    clearMarkers();
  }

  function renderFeed() {
    clearMarkers();
    feedList.innerHTML = "";

    const filtered = activeRegion === "ALL"
      ? allEvents
      : allEvents.filter(ev => ev.region && ev.region.includes(activeRegion));

    if (!filtered.length) {
      feedList.innerHTML = '<p style="font-size:12px;color:#888;padding:6px;">Brak raportów dla wybranego regionu.</p>';
      return;
    }

    filtered.forEach(ev => {
      if (typeof map !== "undefined" && ev.lon && ev.lat) {
        const el = document.createElement("div");
        el.className = "osint-marker";
        el.textContent = "🔥";

        const popupHtml = `
          <div style="color:#222;max-width:240px;font-family:sans-serif;">
            <div style="font-weight:bold;margin-bottom:4px;">${ev.title}</div>
            ${ev.image ? `<img src="${ev.image}" style="width:100%;max-height:130px;object-fit:cover;border-radius:4px;margin:4px 0;">` : ""}
            <div style="font-size:12px;line-height:1.35;">${ev.summary}</div>
            <div style="margin-top:5px;font-size:11px;">
              <a href="${ev.url}" target="_blank" rel="noopener" style="color:#1c7ed6;">Źródło: ${ev.source}</a>
            </div>
          </div>
        `;

        const popup = new maplibregl.Popup({ offset: 16, maxWidth: "260px" }).setHTML(popupHtml);
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([ev.lon, ev.lat])
          .setPopup(popup)
          .addTo(map);

        osintMarkers.push(marker);
      }

      const card = document.createElement("div");
      card.className = "feed-card";
      const timeStr = ev.date ? new Date(ev.date).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";

      card.innerHTML = `
        <div class="feed-meta">
          <span>${ev.source} · <b>${ev.region}</b></span>
          <span>${timeStr}</span>
        </div>
        <div class="feed-title">${ev.title}</div>
        ${ev.image ? `<img src="${ev.image}" loading="lazy" alt="OSINT">` : ""}
        <div class="feed-desc">${ev.summary}</div>
        <a class="feed-link" href="${ev.url}" target="_blank" rel="noopener">Otwórz post źródłowy ↗</a>
      `;

      card.addEventListener("click", (e) => {
        if (e.target.tagName === "A") return;
        if (typeof map !== "undefined" && ev.lon && ev.lat) {
          map.flyTo({ center: [ev.lon, ev.lat], zoom: 7.5 });
        }
      });

      feedList.appendChild(card);
    });
  }

  async function loadOsintFeed() {
    try {
      const res = await fetch("feed.json?t=" + Date.now());
      if (!res.ok) throw new Error("Brak pliku feed.json");
      allEvents = await res.json();
      renderFeed();
    } catch (e) {
      feedList.innerHTML = '<p style="font-size:12px;color:#ff8787;padding:6px;">Brak pliku <b>feed.json</b>.</p>';
    }
  }

  fireBtn.addEventListener("click", () => {
    if (feedActive) {
      zamknijFeed();
    } else {
      // Zamykamy ewentualnie otwarty panel z ikony_menu.js
      const goraX = document.getElementById("gora-x");
      if (goraX) goraX.click();

      feedActive = true;
      fireBtn.classList.add("akt");
      feedPanel.style.display = "flex";
      loadOsintFeed();
    }
  });

  // Jesli uzytkownik kliknie inna ikone w #lewa, chowamy panel Live Feed
  if (lewa) {
    lewa.addEventListener("click", (e) => {
      if (e.target !== fireBtn && feedActive) zamknijFeed();
    });
  }

  document.getElementById("close-feed").addEventListener("click", zamknijFeed);

  document.querySelectorAll(".feed-filtry button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".feed-filtry button").forEach(b => b.classList.remove("aktywny-filtr"));
      btn.classList.add("aktywny-filtr");
      activeRegion = btn.dataset.region;
      renderFeed();
    });
  });
})();
