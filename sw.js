const CACHE_NAME = "maptiler-pwa-v1";
const TILE_CACHE_NAME = "maptiler-tiles-v1";
const MAX_TILE_CACHE_SIZE = 2500; // Limit number of cached tiles (~75-200MB for several farms)

const urlsToCache = [
  "/",
  "/index.html",
  "https://cdn.maptiler.com/maptiler-sdk-js/v3.9.0/maptiler-sdk.css",
  "https://cdn.maptiler.com/maptiler-sdk-js/v3.9.0/maptiler-sdk.umd.min.js",
  "https://unpkg.com/@turf/turf@7/turf.min.js",
  // Add more assets as needed (e.g., custom styles)
];

// Helper function to check if URL is a map tile
function isMapTileRequest(url) {
  return (
    url.includes("api.maptiler.com/tiles") ||
    url.includes("api.maptiler.com/maps") ||
    url.includes("api.maptiler.com/fonts")
  );
}

// Trim cache to prevent unlimited growth
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    // Remove oldest entries
    await cache.delete(keys[0]);
    await trimCache(cacheName, maxItems); // Recursive until under limit
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = event.request.url;

  // Different strategy for map tiles
  if (isMapTileRequest(requestUrl)) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then(async (cache) => {
        // Try cache first
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Fetch from network and cache
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
            // Trim cache in the background
            trimCache(TILE_CACHE_NAME, MAX_TILE_CACHE_SIZE);
          }
          return networkResponse;
        } catch (error) {
          console.log("Tile fetch failed:", error);
          // Return cached version or fail gracefully
          return new Response("Tile not available offline", { status: 503 });
        }
      })
    );
  } else {
    // Standard cache-first strategy for other assets
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          // Cache successful responses for non-tile assets
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
    );
  }
});
