// src/EventBus.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

export default class EventBus {
	static listeners = new Map();       // eventName -> Set<handler>
	static cycleEvents = new Map();     // id -> { handler, intervalMs, lastRunTime }
	static orderHandlers = new Map();   // orderName -> handler
	static timers = new Map();          // id -> TimerEntry

	/**
	 * 全リスナー、サイクルイベント、オーダー、タイマーをリセット
	 */
	static destructor() {
		EventBus.listeners.clear();
		EventBus.cycleEvents.clear();
		EventBus.orderHandlers.clear();
		EventBus.timers.clear();
	}

	/**
	 * イベントリスナーを登録
	 * @param {string} event - イベント名
	 * @param {Function} handler - コールバック関数
	 * @returns {Function} 解除関数
	 */
	static addOnEvent(event, handler) {
		if (typeof handler !== 'function') { return () => {}; }
		if (!EventBus.listeners.has(event)) {
			EventBus.listeners.set(event, new Set());
		}
		EventBus.listeners.get(event).add(handler);
		return () => EventBus.removeOnEvent(event, handler);
	}

	/**
	 * イベントリスナーを解除
	 * @param {string} event - イベント名
	 * @param {Function} handler - コールバック関数
	 */
	static removeOnEvent(event, handler) {
		const set = EventBus.listeners.get(event);
		if (set) {
			set.delete(handler);
			if (set.size === 0) {
				EventBus.listeners.delete(event);
			}
		}
	}

	/**
	 * イベントを発火
	 * @param {string} event - イベント名
	 * @param {...any} args - 引数
	 * @returns {Array} 各ハンドラーの戻り値配列
	 */
	static emitEvent(event, ...args) {
		const set = EventBus.listeners.get(event);
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

	/**
	 * 周期/定期イベントを登録
	 * @param {string} id - 一意の識別子
	 * @param {Function} handler - 実行関数
	 * @param {number} intervalMs - 実行間隔(ミリ秒)。0の場合は毎フレーム実行
	 */
	static addCycleEvent(id, handler, intervalMs = 0) {
		if (typeof handler !== 'function') { return; }
		EventBus.cycleEvents.set(id, {
			handler,
			intervalMs: Number(intervalMs) || 0,
			lastRunTime: -Infinity,
		});
	}

	/**
	 * 周期/定期イベントを解除
	 * @param {string} id - 識別子
	 */
	static removeCycleEvent(id) {
		EventBus.cycleEvents.delete(id);
	}

	/**
	 * 遅延タイマー（指定時間後に処理またはイベントを実行）を登録
	 * @param {string|number} id - タイマーの一意の識別子
	 * @param {number} delayMs - 遅延時間（ミリ秒）
	 * @param {Function|string} [callbackOrEvent] - 完了時のコールバック関数、または発火するイベント名
	 * @param {Object} [options={}] - オプション設定
	 * @param {Function} [options.callback] - 完了時コールバック
	 * @param {string} [options.event] - 発火イベント名
	 * @param {Array} [options.args=[]] - コールバックまたはイベントに渡す引数配列
	 * @param {boolean} [options.repeat=false] - 繰り返し実行するかどうか
	 * @param {Function} [options.onTick] - 毎フレーム呼び出されるハンドラ (timer, deltaTime) => {}
	 * @param {boolean} [options.pauseable=true] - ポーズ時にタイマー進行を停止するか
	 * @returns {Object|null} 登録されたタイマーオブジェクト
	 */
	static addTimer(id, delayMs, callbackOrEvent, options = {}) {
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
			cancel: () => EventBus.removeTimer(strId),
			pause: () => EventBus.pauseTimer(strId),
			resume: () => EventBus.resumeTimer(strId),
			get progress() {
				return this.delay > 0 ? Math.min(1, Math.max(0, this.elapsed / this.delay)) : 1;
			}
		};

		EventBus.timers.set(strId, timer);
		return timer;
	}

	/**
	 * タイマーを解除
	 * @param {string|number} id - タイマー識別子
	 * @returns {boolean} 削除できたかどうか
	 */
	static removeTimer(id) {
		if (id === undefined || id === null) { return false; }
		return EventBus.timers.delete(String(id));
	}

	/**
	 * タイマーの存在確認
	 * @param {string|number} id - タイマー識別子
	 * @returns {boolean}
	 */
	static hasTimer(id) {
		if (id === undefined || id === null) { return false; }
		return EventBus.timers.has(String(id));
	}

	/**
	 * タイマー情報の取得
	 * @param {string|number} id - タイマー識別子
	 * @returns {Object|null}
	 */
	static getTimer(id) {
		if (id === undefined || id === null) { return null; }
		return EventBus.timers.get(String(id)) || null;
	}

	/**
	 * タイマーの一時停止
	 * @param {string|number} id - タイマー識別子
	 * @returns {boolean}
	 */
	static pauseTimer(id) {
		const t = EventBus.getTimer(id);
		if (t) {
			t.isPaused = true;
			return true;
		}
		return false;
	}

	/**
	 * タイマーの再開
	 * @param {string|number} id - タイマー識別子
	 * @returns {boolean}
	 */
	static resumeTimer(id) {
		const t = EventBus.getTimer(id);
		if (t) {
			t.isPaused = false;
			return true;
		}
		return false;
	}

	/**
	 * 全タイマーの解除
	 */
	static clearAllTimers() {
		EventBus.timers.clear();
	}

	/**
	 * タイマーの時間を進め、完了したタイマーの処理またはイベントを実行
	 * @param {number} deltaTime - 経過時間（ミリ秒）
	 * @param {boolean} [isPaused=false] - ゲーム全体が一時停止中かどうか
	 */
	static tickTimers(deltaTime = 0, isPaused = false) {
		const dt = Number(deltaTime) || 0;
		if (dt <= 0 || EventBus.timers.size === 0) { return; }

		const entries = Array.from(EventBus.timers.values());
		for (const timer of entries) {
			if (!EventBus.timers.has(timer.id)) { continue; }
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
					EventBus.timers.delete(timer.id);
				}

				if (callback) {
					try {
						callback(...args);
					} catch (err) {
						console.error(`[EventBus] Error in timer callback for "${timer.id}":`, err);
					}
				}

				if (event) {
					EventBus.emitEvent(event, ...args);
				}
			}
		}
	}

	/**
	 * フレームごとの周期イベント実行およびタイマー更新
	 * @param {number} currentTime - 現在時刻(ミリ秒)
	 * @param {number} deltaTime - 前フレームからの差分時間
	 * @param {boolean} [isPaused=false] - 一時停止中かどうか
	 */
	static tickCycleEvents(currentTime = Date.now(), deltaTime = 0, isPaused = false) {
		EventBus.tickTimers(deltaTime, isPaused);

		for (const [id, entry] of EventBus.cycleEvents.entries()) {
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

	/**
	 * 単発命令ハンドラを登録
	 * @param {string} orderName - 命令名
	 * @param {Function} handler - ハンドラ関数
	 */
	static registerOrder(orderName, handler) {
		if (typeof handler === 'function') {
			EventBus.orderHandlers.set(orderName, handler);
		}
	}

	/**
	 * 単発命令ハンドラを解除
	 * @param {string} orderName - 命令名
	 */
	static unregisterOrder(orderName) {
		EventBus.orderHandlers.delete(orderName);
	}

	/**
	 * 単発命令の呼び出し
	 * @param {string} orderName - 命令名
	 * @param {...any} args - 引数
	 * @returns {any} ハンドラの実行結果
	 */
	static callSingleOrder(orderName, ...args) {
		const handler = EventBus.orderHandlers.get(orderName);
		if (typeof handler === 'function') {
			try {
				return handler(...args);
			} catch (err) {
				return undefined;
			}
		}
		return undefined;
	}
}
