// src/EventBus.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

export default class EventBus {
	static #defaultInstance = null;

	static get defaultInstance() {
		if (!EventBus.#defaultInstance) {
			EventBus.#defaultInstance = new EventBus();
		}
		return EventBus.#defaultInstance;
	}

	static get listeners() {
		return EventBus.defaultInstance.listeners;
	}

	static get cycleEvents() {
		return EventBus.defaultInstance.cycleEvents;
	}

	static get orderHandlers() {
		return EventBus.defaultInstance.orderHandlers;
	}

	static get timers() {
		return EventBus.defaultInstance.timers;
	}

	constructor() {
		this.listeners = new Map();       // eventName -> Set<handler>
		this.cycleEvents = new Map();     // id -> { handler, intervalMs, lastRunTime }
		this.orderHandlers = new Map();   // orderName -> handler
		this.timers = new Map();          // id -> TimerEntry
	}

	/**
	 * 全リスナー、サイクルイベント、オーダー、タイマーをリセット
	 */
	destructor() {
		this.listeners.clear();
		this.cycleEvents.clear();
		this.orderHandlers.clear();
		this.timers.clear();
	}

	static destructor() {
		EventBus.defaultInstance.destructor();
	}

	/**
	 * イベントリスナーを登録
	 * @param {string} event - イベント名
	 * @param {Function} handler - コールバック関数
	 * @returns {Function} 解除関数
	 */
	addOnEvent(event, handler) {
		if (typeof handler !== 'function') { return () => {}; }
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event).add(handler);
		return () => this.removeOnEvent(event, handler);
	}

	static addOnEvent(event, handler) {
		return EventBus.defaultInstance.addOnEvent(event, handler);
	}

	/**
	 * イベントリスナーを解除
	 * @param {string} event - イベント名
	 * @param {Function} handler - コールバック関数
	 */
	removeOnEvent(event, handler) {
		const set = this.listeners.get(event);
		if (set) {
			set.delete(handler);
			if (set.size === 0) {
				this.listeners.delete(event);
			}
		}
	}

	static removeOnEvent(event, handler) {
		EventBus.defaultInstance.removeOnEvent(event, handler);
	}

	/**
	 * イベントを発火
	 * @param {string} event - イベント名
	 * @param {...any} args - 引数
	 * @returns {Array} 各ハンドラーの戻り値配列
	 */
	emitEvent(event, ...args) {
		const set = this.listeners.get(event);
		if (!set || set.size === 0) { return []; }
		const results = [];
		for (const handler of Array.from(set)) {
			try {
				results.push(handler(...args));
			} catch (err) {
				console.error(`[EventBus] Error in event listener for "${event}":`, err);
			}
		}
		return results;
	}

	static emitEvent(event, ...args) {
		return EventBus.defaultInstance.emitEvent(event, ...args);
	}

	/**
	 * 周期/定期イベントを登録
	 * @param {string} id - 一意の識別子
	 * @param {Function} handler - 実行関数
	 * @param {number} intervalMs - 実行間隔(ミリ秒)。0の場合は毎フレーム実行
	 */
	addCycleEvent(id, handler, intervalMs = 0) {
		if (typeof handler !== 'function') { return; }
		this.cycleEvents.set(id, {
			handler,
			intervalMs: Number(intervalMs) || 0,
			lastRunTime: -Infinity,
		});
	}

	static addCycleEvent(id, handler, intervalMs = 0) {
		EventBus.defaultInstance.addCycleEvent(id, handler, intervalMs);
	}

	/**
	 * 周期/定期イベントを解除
	 * @param {string} id - 識別子
	 */
	removeCycleEvent(id) {
		this.cycleEvents.delete(id);
	}

	static removeCycleEvent(id) {
		EventBus.defaultInstance.removeCycleEvent(id);
	}

	/**
	 * 遅延タイマーを登録
	 */
	addTimer(id, delayMs, callbackOrEvent, options = {}) {
		if (id === undefined || id === null) { return null; }
		const strId = String(id);
		const delay = Math.max(0, Number(delayMs) || 0);

		const callback = typeof callbackOrEvent === 'function'
			? callbackOrEvent
			: (typeof options.callback === 'function' ? options.callback : null);

		const event = typeof callbackOrEvent === 'string'
			? callbackOrEvent
			: (typeof options.event === 'string' ? options.event : null);

		const timer = {
			id: strId,
			delay,
			remaining: delay,
			elapsed: 0,
			callback,
			event,
			args: Array.isArray(options.args) ? options.args : [],
			repeat: Boolean(options.repeat),
			onTick: typeof options.onTick === 'function' ? options.onTick : null,
			pauseable: options.pauseable !== false,
			isPaused: false,
			cancel: () => this.removeTimer(strId),
			pause: () => this.pauseTimer(strId),
			resume: () => this.resumeTimer(strId),
			get progress() {
				return this.delay > 0 ? Math.min(1, Math.max(0, this.elapsed / this.delay)) : 1;
			}
		};

		this.timers.set(strId, timer);
		return timer;
	}

	static addTimer(id, delayMs, callbackOrEvent, options = {}) {
		return EventBus.defaultInstance.addTimer(id, delayMs, callbackOrEvent, options);
	}

	/**
	 * タイマーを解除
	 */
	removeTimer(id) {
		if (id === undefined || id === null) { return false; }
		return this.timers.delete(String(id));
	}

	static removeTimer(id) {
		return EventBus.defaultInstance.removeTimer(id);
	}

	/**
	 * タイマーの存在確認
	 */
	hasTimer(id) {
		if (id === undefined || id === null) { return false; }
		return this.timers.has(String(id));
	}

	static hasTimer(id) {
		return EventBus.defaultInstance.hasTimer(id);
	}

	/**
	 * タイマー情報の取得
	 */
	getTimer(id) {
		if (id === undefined || id === null) { return null; }
		return this.timers.get(String(id)) || null;
	}

	static getTimer(id) {
		return EventBus.defaultInstance.getTimer(id);
	}

	/**
	 * タイマーの一時停止
	 */
	pauseTimer(id) {
		const t = this.getTimer(id);
		if (t) {
			t.isPaused = true;
			return true;
		}
		return false;
	}

	static pauseTimer(id) {
		return EventBus.defaultInstance.pauseTimer(id);
	}

	/**
	 * タイマーの再開
	 */
	resumeTimer(id) {
		const t = this.getTimer(id);
		if (t) {
			t.isPaused = false;
			return true;
		}
		return false;
	}

	static resumeTimer(id) {
		return EventBus.defaultInstance.resumeTimer(id);
	}

	/**
	 * 全タイマーの解除
	 */
	clearAllTimers() {
		this.timers.clear();
	}

	static clearAllTimers() {
		EventBus.defaultInstance.clearAllTimers();
	}

	/**
	 * タイマーの時間を進め、完了したタイマーの処理またはイベントを実行
	 */
	tickTimers(deltaTime = 0, isPaused = false) {
		const dt = Number(deltaTime) || 0;
		if (dt <= 0 || this.timers.size === 0) { return; }

		const entries = Array.from(this.timers.values());
		for (const timer of entries) {
			if (!this.timers.has(timer.id)) { continue; }
			if (timer.isPaused || (isPaused && timer.pauseable)) { continue; }

			timer.remaining -= dt;
			timer.elapsed += dt;

			if (timer.onTick) {
				try {
					timer.onTick(timer, dt);
				} catch (err) {
					console.error(`[EventBus] Error in timer onTick for "${timer.id}":`, err);
				}
			}

			if (timer.remaining <= 0) {
				const { callback, event, args, repeat, delay } = timer;

				if (repeat) {
					timer.remaining = Math.max(0, timer.remaining + delay);
					timer.elapsed = 0;
				} else {
					this.timers.delete(timer.id);
				}

				if (callback) {
					try {
						callback(...args);
					} catch (err) {
						console.error(`[EventBus] Error in timer callback for "${timer.id}":`, err);
					}
				}

				if (event) {
					this.emitEvent(event, ...args);
				}
			}
		}
	}

	static tickTimers(deltaTime = 0, isPaused = false) {
		EventBus.defaultInstance.tickTimers(deltaTime, isPaused);
	}

	/**
	 * フレームごとの周期イベント実行およびタイマー更新
	 */
	tickCycleEvents(currentTime = Date.now(), deltaTime = 0, isPaused = false) {
		this.tickTimers(deltaTime, isPaused);

		for (const [id, entry] of this.cycleEvents.entries()) {
			const { handler, intervalMs, lastRunTime } = entry;
			if (intervalMs <= 0 || currentTime - lastRunTime >= intervalMs) {
				try {
					handler(currentTime, deltaTime);
				} catch (err) {
					console.error(`[EventBus] Error in cycle event "${id}":`, err);
				}
				entry.lastRunTime = currentTime;
			}
		}
	}

	static tickCycleEvents(currentTime = Date.now(), deltaTime = 0, isPaused = false) {
		EventBus.defaultInstance.tickCycleEvents(currentTime, deltaTime, isPaused);
	}

	/**
	 * 単発命令ハンドラを登録
	 */
	registerOrder(orderName, handler) {
		if (typeof handler === 'function') {
			this.orderHandlers.set(orderName, handler);
		}
	}

	static registerOrder(orderName, handler) {
		EventBus.defaultInstance.registerOrder(orderName, handler);
	}

	/**
	 * 単発命令ハンドラを解除
	 */
	unregisterOrder(orderName) {
		this.orderHandlers.delete(orderName);
	}

	static unregisterOrder(orderName) {
		EventBus.defaultInstance.unregisterOrder(orderName);
	}

	/**
	 * 単発命令の呼び出し
	 */
	callSingleOrder(orderName, ...args) {
		const handler = this.orderHandlers.get(orderName);
		if (typeof handler === 'function') {
			try {
				return handler(...args);
			} catch (err) {
				return undefined;
			}
		}
		return undefined;
	}

	static callSingleOrder(orderName, ...args) {
		return EventBus.defaultInstance.callSingleOrder(orderName, ...args);
	}
}
