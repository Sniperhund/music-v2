const SHELL_CACHE = "music-pwa-shell-v1"
const ASSET_CACHE = "music-pwa-assets-v1"
const OFFLINE_PAGE = "/offline.html"
const SHELL_ASSETS = [
	OFFLINE_PAGE,
	"/icons/pwa-192.png",
	"/icons/pwa-512.png",
	"/icons/pwa-maskable-512.png",
	"/icons/apple-touch-icon.png",
]
const SHELL_ASSET_PATHS = new Set(SHELL_ASSETS)

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(SHELL_CACHE)
			.then((cache) => cache.addAll(SHELL_ASSETS))
			.then(() => self.skipWaiting()),
	)
})

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then(async (keys) => {
			await Promise.all(
				keys
					.filter(
						(key) =>
							key.startsWith("music-pwa-") &&
							key !== SHELL_CACHE &&
							key !== ASSET_CACHE,
					)
					.map((key) => caches.delete(key)),
			)
			await self.clients.claim()
		}),
	)
})

self.addEventListener("fetch", (event) => {
	const request = event.request
	if (request.method !== "GET") return

	const url = new URL(request.url)
	if (url.origin !== self.location.origin) return

	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request).catch(async () => {
				const offlinePage = await caches.match(OFFLINE_PAGE)
				return offlinePage ?? Response.error()
			}),
		)
		return
	}

	if (SHELL_ASSET_PATHS.has(url.pathname)) {
		event.respondWith(
		caches.match(request).then((cached) => cached ?? fetch(request)),
		)
		return
	}

	if (url.pathname.startsWith("/_nuxt/")) {
		event.respondWith(
			caches.open(ASSET_CACHE).then(async (cache) => {
				const cached = await cache.match(request)
				if (cached) return cached

				const response = await fetch(request)
				if (response.ok) {
					await cache.put(request, response.clone())
					const entries = await cache.keys()
					if (entries.length > 100) await cache.delete(entries[0])
				}
				return response
			}),
		)
	}
})
