/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

declare let self: ServiceWorkerGlobalScope;

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
			)
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;

	if (request.method !== 'GET') return;

	const url = new URL(request.url);

	if (url.pathname.startsWith('/api/')) return;

	if (ASSETS.includes(url.pathname)) {
		event.respondWith(
			caches.open(CACHE).then((cache) =>
				cache.match(request).then((cached) => cached ?? fetch(request))
			)
		);
		return;
	}

	event.respondWith(
		fetch(request)
			.then((response) => {
				if (url.origin === self.location.origin && response.ok) {
					caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
				}
				return response;
			})
			.catch(() =>
				caches.open(CACHE).then((cache) =>
					cache
						.match(request)
						.then((cached) => cached ?? (request.mode === 'navigate' ? cache.match('/') : null))
						.then((response) => response ?? new Response('Offline', { status: 503 }))
				)
			)
	);
});
