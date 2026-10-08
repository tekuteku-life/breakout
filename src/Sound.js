// src/Sound.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import { DEFAULT_CONFIG } from "./const.js";
import EventBus from "./EventBus.js";

//--------------------------------------------------
// 効果音管理（Web Audio API / HTML Audio ハイブリッドエンジン）
//--------------------------------------------------
export default class Sound
{
	constructor(game = null)
	{
		this.game = game;
		this.soundKeys = [
			'bomb', 'block', 'spBlock', 'bar', 'fall', 'wall',
			'warp', 'clear', 'gun', 'missile', 'plusItem', 'minusItem',
			'touchButton', 'game_over'
		];
		this.soundFiles = (this.game && this.game.soundFile) || DEFAULT_CONFIG.soundFile || {};

		// Web Audio API の初期化（利用可能な場合）
		const AudioContextClass = typeof window !== 'undefined'
			? (window.AudioContext || window.webkitAudioContext)
			: (typeof AudioContext !== 'undefined' ? AudioContext : null);

		this.audioCtx = null;
		this.audioBuffers = new Map();
		this.gainNode = null;

		if (AudioContextClass) {
			try {
				this.audioCtx = new AudioContextClass();
				if (typeof this.audioCtx.createGain === 'function') {
					this.gainNode = this.audioCtx.createGain();
					if (this.gainNode && typeof this.gainNode.connect === 'function' && this.audioCtx.destination) {
						this.gainNode.connect(this.audioCtx.destination);
					}
				}
			} catch (_) {}
		}

		// HTML Audio フォールバック用
		this.soundObj = {};
		this.soundTurn = {};
		this.bufSize = 4; // 同時再生バッファサイズ（過剰な10個プールを廃止し適正化）

		const AudioCtor = typeof Audio !== 'undefined' ? Audio : null;
		for (let i = 0; i < this.soundKeys.length; i++) {
			const key = this.soundKeys[i];
			if (this.soundFiles[key]) {
				this.soundTurn[key] = 0;
				this.soundObj[key] = [];
				if (AudioCtor) {
					try {
						const audio = new AudioCtor(this.soundFiles[key]);
						if (typeof audio.load === 'function') { audio.load(); }
						this.soundObj[key].push(audio);
					} catch (_) {}
				}
			}
		}

		// Web Audio 用の音声プリロード（非同期）
		this.preloadAudioBuffers();

		// EventBus経由で再生要求を購読
		this.onPlayHandler = (key) => this.play(key);
		EventBus.addOnEvent('sound:play', this.onPlayHandler);
	}

	/**
	 * Web Audio API 用に音声バッファを事前ロード・デコード
	 * @param {Function} [onProgress] - 進捗コールバック (ratio: 0.0 ~ 1.0)
	 */
	async preloadAudioBuffers(onProgress = null) {
		const total = this.soundKeys.length;
		if (total === 0 || !this.audioCtx || typeof fetch === 'undefined') {
			if (typeof onProgress === 'function') onProgress(1.0);
			return;
		}

		let processed = 0;
		for (const key of this.soundKeys) {
			const url = this.soundFiles[key];
			if (url && !this.audioBuffers.has(key)) {
				try {
					const response = await fetch(url);
					if (response.ok) {
						const arrayBuffer = await response.arrayBuffer();
						if (this.audioCtx && typeof this.audioCtx.decodeAudioData === 'function') {
							const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
							this.audioBuffers.set(key, audioBuffer);
						}
					}
				} catch (_) {
					// CORS制限やネットワーク失敗時はHTML Audioフォールバックを使用
				}
			}
			processed++;
			if (typeof onProgress === 'function') {
				onProgress(processed / total);
			}
		}
	}

	destructor() {
		if (this.onPlayHandler) {
			EventBus.removeOnEvent('sound:play', this.onPlayHandler);
			this.onPlayHandler = null;
		}

		// Web Audio API のクローズ
		if (this.audioCtx && typeof this.audioCtx.close === 'function') {
			try {
				this.audioCtx.close().catch(() => {});
			} catch (_) {}
			this.audioCtx = null;
		}
		this.audioBuffers.clear();
		this.gainNode = null;

		// HTML Audio 要素の解放
		for (const key of Object.keys(this.soundObj)) {
			const list = this.soundObj[key];
			if (Array.isArray(list)) {
				for (const audio of list) {
					if (audio) {
						try {
							if (typeof audio.pause === 'function') { audio.pause(); }
							if (typeof audio.removeAttribute === 'function') { audio.removeAttribute('src'); }
							if (typeof audio.load === 'function') { audio.load(); }
						} catch (_) {}
					}
				}
			}
		}
		this.game = null;
	}

	/**
	 * 効果音の再生
	 * @param {string} key - 再生する効果音のキー
	 */
	play(key) {
		const ctrl = (this.game && this.game.ctrl) || null;
		if (!ctrl || ctrl.soundSwitch != 1) { return; }

		// ユーザー操作による AudioContext のアンロック（Autoplay policy対応）
		if (this.audioCtx && this.audioCtx.state === 'suspended' && typeof this.audioCtx.resume === 'function') {
			this.audioCtx.resume().catch(() => {});
		}

		// 1. Web Audio API で再生（デコード済みバッファがある場合）
		if (this.audioCtx && this.audioBuffers.has(key) && typeof this.audioCtx.createBufferSource === 'function') {
			try {
				const source = this.audioCtx.createBufferSource();
				source.buffer = this.audioBuffers.get(key);
				const dest = this.gainNode || this.audioCtx.destination;
				source.connect(dest);
				source.start(0);
				return;
			} catch (_) {
				// 失敗時はフォールバックへ
			}
		}

		// 2. HTML Audio フォールバック再生
		if (this.soundObj[key] != null) {
			const list = this.soundObj[key];
			const turn = this.soundTurn[key] || 0;

			// 必要に応じてオンデマンド生成（最大 bufSize まで）
			if (!list[turn] && list.length < this.bufSize) {
				const AudioCtor = typeof Audio !== 'undefined' ? Audio : null;
				if (AudioCtor && this.soundFiles[key]) {
					try {
						const newAudio = new AudioCtor(this.soundFiles[key]);
						if (typeof newAudio.load === 'function') { newAudio.load(); }
						list[turn] = newAudio;
					} catch (_) {}
				}
			}

			const audio = list[turn] || list[0];
			if (audio && typeof audio.play === 'function') {
				try {
					if (audio.currentTime !== 0) { audio.currentTime = 0; }
					const p = audio.play();
					if (p && typeof p.catch === 'function') {
						p.catch(() => {});
					}
				} catch (_) {}
			}

			this.soundTurn[key] = (turn + 1) % this.bufSize;
		}
	}
}
