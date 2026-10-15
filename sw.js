// sw.js - Service Worker for PWA
// Copyright (C) 2010-2026 kt9, All rights reserved.

const CACHE_NAME = 'breakout-pwa-v1';

const PRECACHE_ASSETS = [
	'./',
	'./index.html',
	'./style.css',
	'./manifest.json',
	'./icon/16icon.ico',
	'./icon/16icon.png',
	'./icon/32icon.ico',
	'./icon/32icon.png',
	'./icon/128icon.ico',
	'./icon/128icon.png',
	'./icon/192icon.png',
	'./icon/512icon.png',
	'./icon/maskable_icon_512.png',
	'./sound/bar.wav',
	'./sound/block.wav',
	'./sound/bomb.wav',
	'./sound/clear.wav',
	'./sound/fall.wav',
	'./sound/game_over.wav',
	'./sound/gun.wav',
	'./sound/minus_item.wav',
	'./sound/missile.wav',
	'./sound/plus_item.wav',
	'./sound/sp_block.wav',
	'./sound/touch_button.wav',
	'./sound/warp.wav',
	'./presets/common.json',
	'./presets/bar.json',
	'./presets/heart.json',
	'./presets/ball.json',
	'./presets/weapon.json',
	'./presets/item.json',
	'./presets/balloon.json',
	'./presets/block.json',
	'./presets/sound.json',
	'./presets/stage/manifest.json',
	'./presets/stage/default/blockmap.json',
	'./presets/stage/default/block.json',
	'./presets/stage/default/item.json',
	'./presets/stage/default/weapon.json',
	'./presets/stage/default/award.json',
	'./presets/stage/default/ball.json',
	'./presets/stage/default_debug/blockmap.json',
	'./presets/stage/default_debug/block.json',
	'./presets/stage/default_debug/item.json',
	'./presets/stage/default_debug/weapon.json',
	'./presets/stage/default_debug/award.json',
	'./presets/stage/default_debug/ball.json',
	'./src/main.js',
	'./src/const.js',
	'./src/EventBus.js',
	'./src/PresetManage.js',
	'./src/ScoreManage.js',
	'./src/StatusManage.js',
	'./src/ScreenManage.js',
	'./src/InputManage.js',
	'./src/Control.js',
	'./src/ObjectManage.js',
	'./src/GameManage.js',
	'./src/ImageData.js',
	'./src/Sound.js',
	'./src/Bar.js',
	'./src/Ball.js',
	'./src/Block.js',
	'./src/Item.js',
	'./src/Weapon.js',
	'./src/Balloon.js',
	'./src/Heart.js',
	'./src/Cloud.js',
	'./src/MessageBox.js',
	'./src/AutoPlay.js',
	'./src/AutoPlaySimulation.js',
	'./src/workers/autoPlayWorker.js',
	'./src/screens/ScreenControl.js',
	'./src/screens/StartScreenControl.js',
	'./src/screens/SettingScreenControl.js',
	'./src/screens/RecordScreenControl.js',
	'./src/screens/StageClearScreenControl.js',
	'./src/screens/AllClearScreenControl.js',
	'./src/screens/GameOverScreenControl.js',
	'./src/screens/AboutScreenControl.js',
	'./src/screens/BlockScreenControl.js',
	'./src/screens/ItemScreenControl.js',
	'./src/screens/LoadingScreenControl.js'
];

// インストール処理：静的リソースの事前キャッシュ
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(PRECACHE_ASSETS);
		}).then(() => self.skipWaiting())
	);
});

// アクティベート処理：古いキャッシュの破棄
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((name) => {
					if (name !== CACHE_NAME) {
						return caches.delete(name);
					}
				})
			);
		}).then(() => self.clients.claim())
	);
});

// フェッチ処理：Cache First（キャッシュ優先、無ければネットワーク取得＋動的キャッシュ）
self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') {
		return;
	}

	event.respondWith(
		caches.match(event.request, { ignoreSearch: false }).then((cachedResponse) => {
			if (cachedResponse) {
				return cachedResponse;
			}

			return fetch(event.request).then((networkResponse) => {
				if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
					return networkResponse;
				}

				const responseToCache = networkResponse.clone();
				caches.open(CACHE_NAME).then((cache) => {
					cache.put(event.request, responseToCache);
				});

				return networkResponse;
			}).catch(() => {
				// オフライン時のナビゲーションフォールバック
				if (event.request.mode === 'navigate') {
					return caches.match('./index.html');
				}
			});
		})
	);
});

// メッセージハンドラ（SKIP_WAITING等）
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});

