// 離線使用：安裝時快取全部檔案。有網路時先抓新版（3 秒逾時就用快取），沒網路時用快取。
// 更新遊戲檔案後，把 VERSION 加一，舊快取會在啟用時清掉。
const VERSION = "kmgbf-v3";
const FILES = [
  "./", "index.html", "game.css", "manifest.json",
  "js/ui.js", "js/engine.js", "js/ai.js", "js/data.js", "js/i18n.js", "js/sound.js",
  "data/board.json", "data/roles.json", "data/funds.json", "data/scenarios.json", "data/events.json",
  "data/targets.json", "data/facts.json", "data/en.json",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("kmgbf-") && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const res = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(() => no(new Error("timeout")), 3000))]);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      return (await cache.match(req, { ignoreSearch: true })) || Response.error();
    }
  })());
});
