const CACHE_NAME = "maptiler-pwa-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "https://unpkg.com/@maptiler/sdk/dist/maptiler-sdk.css",
  "https://unpkg.com/@maptiler/sdk/dist/maptiler-sdk.umd.js",
  // Add more assets as needed (e.g., custom styles)
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
