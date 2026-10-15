// test/unit/Pwa.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { setupEnvironment } from '../helpers/setupEnv.js';
import { registerServiceWorker } from '../../src/main.js';

test('PWA configuration and Service Worker unit tests', async (t) => {
	setupEnvironment();

	await t.test('manifest.json has valid structure, required PWA fields and icons', () => {
		const manifestPath = path.resolve('manifest.json');
		assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');

		const content = fs.readFileSync(manifestPath, 'utf8');
		const manifest = JSON.parse(content);

		assert.equal(typeof manifest.name, 'string');
		assert.ok(manifest.name.length > 0);
		assert.equal(typeof manifest.short_name, 'string');
		assert.ok(manifest.short_name.length > 0);
		assert.equal(manifest.start_url, './index.html');
		assert.equal(manifest.display, 'standalone');
		assert.ok(manifest.theme_color);
		assert.ok(manifest.background_color);

		assert.ok(Array.isArray(manifest.icons), 'icons must be an array');
		assert.ok(manifest.icons.length >= 4, 'icons should include multiple sizes');

		const sizes = manifest.icons.map(icon => icon.sizes);
		assert.ok(sizes.includes('192x192'), 'Must include 192x192 icon');
		assert.ok(sizes.includes('512x512'), 'Must include 512x512 icon');

		const hasMaskable = manifest.icons.some(icon => icon.purpose === 'maskable');
		assert.ok(hasMaskable, 'Must include maskable icon');

		// All icon files referenced in manifest must exist on disk
		for (const icon of manifest.icons) {
			const iconRelPath = icon.src.replace(/^\.\//, '');
			const iconFullPath = path.resolve(iconRelPath);
			assert.ok(fs.existsSync(iconFullPath), `Icon file must exist: ${icon.src}`);
			const stat = fs.statSync(iconFullPath);
			assert.ok(stat.size > 0, `Icon file must not be empty: ${icon.src}`);
		}
	});

	await t.test('sw.js exists, has valid syntax, and all precached assets exist', () => {
		const swPath = path.resolve('sw.js');
		assert.ok(fs.existsSync(swPath), 'sw.js must exist');

		const swContent = fs.readFileSync(swPath, 'utf8');
		assert.doesNotThrow(() => {
			new vm.Script(swContent);
		}, 'sw.js must be syntactically valid JavaScript');

		// Extract PRECACHE_ASSETS array
		const match = swContent.match(/const PRECACHE_ASSETS = \[\s*([\s\S]*?)\s*\];/);
		assert.ok(match, 'sw.js must define PRECACHE_ASSETS');

		const assets = vm.runInNewContext(`[${match[1]}]`);
		assert.ok(Array.isArray(assets));
		assert.ok(assets.length > 30, 'Should precache core game assets');

		// Check all referenced files exist
		for (const asset of assets) {
			if (asset === './') continue;
			const relPath = asset.replace(/^\.\//, '');
			const fullPath = path.resolve(relPath);
			assert.ok(fs.existsSync(fullPath), `Precached asset must exist on disk: ${asset}`);
		}
	});

	await t.test('sw.js service worker lifecycle events simulate cache-first and fallback', async () => {
		const swContent = fs.readFileSync(path.resolve('sw.js'), 'utf8');

		const listeners = {};
		const mockCaches = new Map();

		const mockCacheStorage = {
			open: async (name) => {
				if (!mockCaches.has(name)) {
					const store = new Map();
					mockCaches.set(name, {
						addAll: async (urls) => {
							for (const u of urls) store.set(u, new Response('cached:' + u));
						},
						put: async (req, res) => {
							const url = typeof req === 'string' ? req : req.url;
							store.set(url, res);
						},
						match: async (req) => {
							const url = typeof req === 'string' ? req : req.url;
							return store.get(url) || null;
						},
						_store: store
					});
				}
				return mockCaches.get(name);
			},
			match: async (req) => {
				const url = typeof req === 'string' ? req : req.url;
				for (const c of mockCaches.values()) {
					if (c._store.has(url)) return c._store.get(url);
				}
				return null;
			},
			keys: async () => Array.from(mockCaches.keys()),
			delete: async (name) => mockCaches.delete(name)
		};

		let skipWaitingCalled = false;
		let clientsClaimCalled = false;

		const sandbox = {
			self: {
				addEventListener: (event, handler) => {
					listeners[event] = handler;
				},
				skipWaiting: () => { skipWaitingCalled = true; },
				clients: {
					claim: async () => { clientsClaimCalled = true; }
				}
			},
			caches: mockCacheStorage,
			fetch: async (req) => {
				return new Response('network-response', { status: 200 });
			},
			Response: globalThis.Response || class { constructor(b) { this.body = b; this.status = 200; this.type = 'basic'; } clone() { return this; } },
			console: { warn: () => {}, log: () => {} }
		};

		vm.createContext(sandbox);
		vm.runInContext(swContent, sandbox);

		assert.ok(typeof listeners.install === 'function', 'install listener registered');
		assert.ok(typeof listeners.activate === 'function', 'activate listener registered');
		assert.ok(typeof listeners.fetch === 'function', 'fetch listener registered');
		assert.ok(typeof listeners.message === 'function', 'message listener registered');

		// 1. Simulate install event
		let installPromise = null;
		listeners.install({
			waitUntil: (p) => { installPromise = p; }
		});
		await installPromise;
		assert.equal(skipWaitingCalled, true, 'skipWaiting called on install');
		assert.ok(mockCaches.has('breakout-pwa-v1'), 'Cache created');

		// 2. Simulate activate event with old cache cleanup
		mockCaches.set('breakout-pwa-old', { _store: new Map() });
		let activatePromise = null;
		listeners.activate({
			waitUntil: (p) => { activatePromise = p; }
		});
		await activatePromise;
		assert.equal(clientsClaimCalled, true, 'clients.claim called on activate');
		assert.equal(mockCaches.has('breakout-pwa-old'), false, 'Old cache removed');
		assert.equal(mockCaches.has('breakout-pwa-v1'), true, 'Current cache kept');

		// 3. Simulate fetch event for cached asset
		let fetchResultPromise = null;
		listeners.fetch({
			request: { method: 'GET', url: './index.html' },
			respondWith: (p) => { fetchResultPromise = p; }
		});
		const res = await fetchResultPromise;
		assert.ok(res, 'Cached response returned');

		// 4. Simulate message SKIP_WAITING
		skipWaitingCalled = false;
		listeners.message({
			data: { type: 'SKIP_WAITING' }
		});
		assert.equal(skipWaitingCalled, true, 'SKIP_WAITING message handled');
	});

	await t.test('index.html contains all PWA meta tags and links', () => {
		const htmlPath = path.resolve('index.html');
		const html = fs.readFileSync(htmlPath, 'utf8');

		assert.ok(html.includes('manifest.json'), 'index.html must link to manifest.json');
		assert.ok(html.includes('theme-color'), 'index.html must have theme-color meta tag');
		assert.ok(html.includes('viewport'), 'index.html must have viewport meta tag');
		assert.ok(html.includes('apple-mobile-web-app-capable'), 'index.html must have iOS web app capable meta tag');
		assert.ok(html.includes('apple-touch-icon'), 'index.html must link apple-touch-icon');
		assert.ok(html.includes('serviceWorker'), 'index.html must register service worker');
	});

	await t.test('registerServiceWorker in src/main.js handles environments safely', async () => {
		// In node environment without navigator.serviceWorker
		const resNull = await registerServiceWorker();
		assert.equal(resNull, null, 'Resolves to null safely when serviceWorker not in navigator');

		// Mock navigator with serviceWorker using Object.defineProperty
		const origDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
		let registeredPath = null;
		const mockNavigator = {
			serviceWorker: {
				register: async (path) => {
					registeredPath = path;
					return { scope: './' };
				}
			}
		};

		Object.defineProperty(globalThis, 'navigator', {
			configurable: true,
			enumerable: true,
			value: mockNavigator,
			writable: true
		});

		try {
			const reg = await registerServiceWorker();
			assert.equal(registeredPath, './sw.js');
			assert.deepEqual(reg, { scope: './' });

			// When registration rejects
			mockNavigator.serviceWorker.register = async () => {
				throw new Error('registration failed');
			};
			const failedReg = await registerServiceWorker();
			assert.equal(failedReg, null, 'Catches registration error and returns null');
		} finally {
			if (origDesc) {
				Object.defineProperty(globalThis, 'navigator', origDesc);
			}
		}
	});
});
