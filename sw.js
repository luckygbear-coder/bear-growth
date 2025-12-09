// ---- 熊麻吉 PWA 版 Service Worker ----
const CACHE_NAME = "bear-cache-v1";

// 需要快取的檔案（你可以補充自己的路徑）
const ASSETS_TO_CACHE = [
  "index.html",
  "style.css",
  "script.js",
  "manifest.json",

  // 圖片
  "images/bear_idle1.png",
  "images/bear_reading.png",
  "images/bear_sport.png",
  "images/bear_skill.png",
  "images/bear_sleep.gif",

  // icons
  "icons/icon-192.png",
  "icons/icon-512.png"
];

// -------------------- 安裝階段：寫入快取 --------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // 讓 SW 立即啟用
});

// -------------------- 啟用階段：清除舊版快取 --------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// -------------------- Fetch：先讀快取，沒有再抓網路 --------------------
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((resp) => {
      return (
        resp ||
        fetch(event.request)
          .then((networkResp) => {
            // 自動把新檔案塞回快取
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResp.clone());
              return networkResp;
            });
          })
          .catch(() => {
            // 若完全沒網路、沒快取 → 可以放 fallback 頁面（可選）
          })
      );
    })
  );
});
