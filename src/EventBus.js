// src/EventBus.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

export default class EventBus {
	constructor() {
		this.listeners = new Map();       // eventName -> Set<handler>
		this.cycleEvents = new Map();     // id -> { handler, intervalMs, lastRunTime }
		this.orderHandlers = new Map();   // orderName -> handler
	}

	destructor() {
		this.listeners.clear();
		this.cycleEvents.clear();
		this.orderHandlers.clear();
	}

	/**
	 * イベントリスナーを登録
	 * @param {string} event - イベント名
	 * @param {Function} handler - コールバック関数
	 * @returns {Function} 解除関数
	 */
	addOnEvent(event, handler) {
		if (typeof handler !== 'function') return () => {};
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event).add(handler);
		return () => this.removeOnEvent(event, handler);
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

	/**
	 * イベントを発火
	 * @param {string} event - イベント名
	 * @param {...any} args - 引数
	 * @returns {Array} 各ハンドラーの戻り値配列
	 */
	emitEvent(event, ...args) {
		const set = this.listeners.get(event);
		if (!set || set.size === 0) return [];
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
	addCycleEvent(id, handler, intervalMs = 0) {
		if (typeof handler !== 'function') return;
		this.cycleEvents.set(id, {
			handler,
			intervalMs: Number(intervalMs) || 0,
			lastRunTime: -Infinity,
		});
	}

	/**
	 * 周期/定期イベントを解除
	 * @param {string} id - 識別子
	 */
	removeCycleEvent(id) {
		this.cycleEvents.delete(id);
	}

	/**
	 * フレームごとの周期イベント実行
	 * @param {number} currentTime - 現在時刻(ミリ秒)
	 * @param {number} deltaTime - 前フレームからの差分時間
	 */
	tickCycleEvents(currentTime = Date.now(), deltaTime = 0) {
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

	/**
	 * 単発命令ハンドラを登録
	 * @param {string} orderName - 命令名
	 * @param {Function} handler - ハンドラ関数
	 */
	registerOrder(orderName, handler) {
		if (typeof handler === 'function') {
			this.orderHandlers.set(orderName, handler);
		}
	}

	/**
	 * 単発命令ハンドラを解除
	 * @param {string} orderName - 命令名
	 */
	unregisterOrder(orderName) {
		this.orderHandlers.delete(orderName);
	}

	/**
	 * 単発命令の呼び出し
	 * @param {string} orderName - 命令名
	 * @param {...any} args - 引数
	 * @returns {any} ハンドラの実行結果
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
}

