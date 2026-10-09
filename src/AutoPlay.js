// src/AutoPlay.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import {
	DEFAULT_CONFIG,
	BAR_PARAM,
	WEAPON_PARAM,
} from "./const.js";
import EventBus from "./EventBus.js";
import { runAutoPlaySimulation, cloneBlockMap, evaluateWeaponFire, isHarmfulItem } from "./AutoPlaySimulation.js";

//--------------------------------------------------
// 自動プレイ（オートパイロット制御）
// Web Worker を活用した非同期高精度軌道予測 & 複数ボール全体最適化
//--------------------------------------------------
export default class AutoPlay
{
	constructor(game = null)
	{
		this.game = game;
		this.simuData = [];
		this.worker = null;
		this.requestId = 0;
		this.latestResult = null;
		this.workerIsBusy = false;
		this.pendingSnapshot = null;
		this.initWorker();
	}

	initWorker()
	{
		if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
			try {
				const workerUrl = new URL('./workers/autoPlayWorker.js', import.meta.url);
				this.worker = new Worker(workerUrl, { type: 'module' });
				this.worker.onmessage = (e) => {
					if (e && e.data && e.data.result) {
						this.latestResult = e.data.result;
					}
					this.workerIsBusy = false;
					if (this.pendingSnapshot && this.worker) {
						const snapshot = this.pendingSnapshot;
						this.pendingSnapshot = null;
						this.workerIsBusy = true;
						this.requestId++;
						this.worker.postMessage({ id: this.requestId, snapshot });
					}
				};
				this.worker.onerror = () => {
					if (this.worker) {
						this.worker.terminate();
						this.worker = null;
					}
					this.workerIsBusy = false;
				};
			} catch (_) {
				this.worker = null;
				this.workerIsBusy = false;
			}
		}
	}

	destructor()
	{
		if (this.worker) {
			try {
				this.worker.terminate();
			} catch (_) {}
			this.worker = null;
		}
		this.workerIsBusy = false;
		this.pendingSnapshot = null;
		this.latestResult = null;
		this.simuData = null;
		this.game = null;
	}

	getObjectManage() {
		return (this.game && this.game.objectManage) || null;
	}

	getBar() {
		const om = this.getObjectManage();
		return om ? om.bar : null;
	}

	getBalls() {
		const om = this.getObjectManage();
		return om ? om.balls : [];
	}

	getItems() {
		const om = this.getObjectManage();
		return om ? om.items : [];
	}

	getWeapons() {
		const om = this.getObjectManage();
		return om ? om.weapons : [];
	}

	getBlockMap() {
		const om = this.getObjectManage();
		return om ? om.blockMap : [];
	}

	getCtrl() {
		return (this.game && this.game.ctrl) || null;
	}

	getCanvasWidth() {
		return (this.game && this.game.canvasWidth) || DEFAULT_CONFIG.canvasWidth;
	}

	captureSnapshot() {
		const bar = this.getBar();
		if (!bar) { return null; }

		const fps = (this.game && this.game.FPS) || DEFAULT_CONFIG.FPS;
		const canvasWidth = this.getCanvasWidth();
		const canvasHeight = (this.game && this.game.canvasHeight) || DEFAULT_CONFIG.canvasHeight;
		const statusBarHeight = (this.game && this.game.statusBarHeight) || DEFAULT_CONFIG.statusBarHeight;
		const bDefaultSpeed = (this.game && this.game.ballDefaultSpeed) || DEFAULT_CONFIG.ballDefaultSpeed;
		const bMaxSpeed = (this.game && this.game.ballMaxSpeed) || DEFAULT_CONFIG.ballMaxSpeed;
		const bDefaultSpeedBar = (this.game && this.game.barDefaultSpeed) || DEFAULT_CONFIG.barDefaultSpeed;
		const bSpin = (this.game && this.game.barSpin !== undefined) ? this.game.barSpin : ((bar && bar.spin !== undefined) ? bar.spin : BAR_PARAM.SPIN_RATIO);
		const blkWidth = (this.game && this.game.blockWidth) || DEFAULT_CONFIG.blockWidth;
		const blkHeight = (this.game && this.game.blockHeight) || DEFAULT_CONFIG.blockHeight;
		const bSize = (this.game && this.game.ballSize) || DEFAULT_CONFIG.ballSize;

		const balls = this.getBalls();
		const items = this.getItems();
		const weapons = this.getWeapons();
		const blockMap = this.getBlockMap();

		return {
			canvasWidth,
			canvasHeight,
			statusBarHeight,
			fps,
			bDefaultSpeed,
			bMaxSpeed,
			bDefaultSpeedBar,
			bSpin,
			blkWidth,
			blkHeight,
			bSize,
			bar: {
				x: typeof bar.getCenterX === 'function' ? bar.getCenterX() : (bar.x || 0),
				y: typeof bar.getTopY === 'function' ? bar.getTopY() : (bar.y || 0),
				width: bar.width,
				height: bar.height,
				vx: bar.vx || 0,
				vxMax: bar.vxMax || bDefaultSpeedBar,
				spin: bSpin,
				weapon: bar.weapon || 0,
				weaponInter: bar.weaponInter || 0,
				absorptionNum: bar.absorptionNum || 0,
			},
			balls: balls.map((b, idx) => ({
				id: b.ballId !== undefined ? b.ballId : idx,
				x: typeof b.getCenterX === 'function' ? b.getCenterX() : b.x,
				y: typeof b.getCenterY === 'function' ? b.getCenterY() : b.y,
				vx: b.vx,
				vy: b.vy,
				radius: b.radius || bSize,
				status: b.status || 0,
				statusTime: b.statusTime || 0,
				isAbsorption: b.isAbsorption || 0,
				absorptionPoint: b.absorptionPoint || [0, 0],
			})),
			blocks: cloneBlockMap(blockMap),
			items: items.map(it => ({
				x: typeof it.getCenterX === 'function' ? it.getCenterX() : it.x,
				y: typeof it.getCenterY === 'function' ? it.getCenterY() : it.y,
				type: it.type,
				speed: it.speed,
			})),
			weapons: weapons.map(w => ({
				x: w.x,
				y: w.y,
				vy: w.vy,
				vect: w.vect,
				type: w.type,
			})),
			simuData: this.simuData || {},
		};
	}

	//--------------------------------------------------
	// 自動プレイの1ステップ実行
	//--------------------------------------------------
	step()
	{
		const bar = this.getBar();
		if (!bar) { return; }

		const canvasWidth = this.getCanvasWidth();
		const bDefaultSpeed = (this.game && this.game.ballDefaultSpeed) || DEFAULT_CONFIG.ballDefaultSpeed;
		const balls = this.getBalls();
		let ballNum = balls.length;

		//----------発射制御及び初期化----------
		if( ballNum === 0 )
		{
			// スタート画面の終了
			EventBus.emitEvent('screen:allClose');

			// 初期位置及び初速度の決定
			bar.x = ~~( canvasWidth / 2 * (1 + (~~(Math.random() * 2) * 2 - 1) * Math.random()) );
			bar.vx = bDefaultSpeed * (Math.random() * 0.5 + 0.8) * (~~(Math.random() * 2) * 2 - 1);

			// 球発射
			const mdTime = Date.now() - 1000;
			EventBus.emitEvent('input:setMouseDownTime', mdTime);
			EventBus.emitEvent('ball:launch', { mouseDownTime: mdTime });
			ballNum = balls.length;
		}

		// スナップショットの作成
		const snapshot = this.captureSnapshot();
		if (!snapshot) { return; }

		// Workerへの非同期リクエスト制御（処理中は最新スナップショットを1件保持）
		if (this.worker) {
			if (!this.workerIsBusy) {
				this.workerIsBusy = true;
				this.requestId++;
				this.worker.postMessage({ id: this.requestId, snapshot });
			} else {
				this.pendingSnapshot = snapshot;
			}
		}

		// 最適化結果の取得（Workerの最新結果がある場合はそれを利用、未取得時やWorker無しの場合は同期シミュレーション）
		let result = this.latestResult;
		if (!result) {
			result = runAutoPlaySimulation(snapshot);
			if (this.worker) {
				this.latestResult = result;
			}
		}

		if (result && result.simuData) {
			this.simuData = result.simuData;
		}

		//----------吸着状態の戦略的リローンチ（狙い撃ち）制御 (A-3)----------
		if (bar.absorptionNum > 0) {
			const blockMap = this.getBlockMap();
			const hasBlocks = blockMap && blockMap.some((row) => row && row.some((b) => b && b.type !== 0));

			// 本番の吸着アイテム効果中（absorptionStatusTime > 0）かつブロックが存在する場合:
			// ブロック密集地・爆発ブロック列へ移動してから発射する戦略的リローンチ
			if (bar.absorptionStatusTime !== undefined && bar.absorptionStatusTime > 0 && hasBlocks) {
				const bestAbsorbX = (result && result.bestAbsorbX !== undefined && result.bestAbsorbX !== -1)
					? result.bestAbsorbX
					: (canvasWidth / 2);

				// 他に緊急で落下してくるボールがなければ、密集地・爆発ブロック列へバーを移動
				const hasUrgentFallingBall = balls.some((b) => b && b.vy > 0 && b.isAbsorption !== 1 && (bar.y - (b.y || 0)) <= 150);
				if (!hasUrgentFallingBall && result) {
					result.targetX = bestAbsorbX;
				}

				// 目標列に接近した、または吸着時間の終了直前（30フレーム以内）なら一気に狙い撃ち発射！
				const reachedTarget = Math.abs(bar.x - bestAbsorbX) <= bar.width * 0.35;
				const isTimeExpiring = (bar.absorptionStatusTime <= 30);
				if (reachedTarget || isTimeExpiring || !result) {
					const count = bar.absorptionNum;
					for (let i = 0; i < count; i++) {
						bar.relaunch();
					}
				}
			} else {
				// 単体テストまたは通常解除時: 即時リローンチ
				const count = bar.absorptionNum;
				for (let i = 0; i < count; i++) {
					bar.relaunch();
				}
			}
		}

		if (result && result.targetX !== undefined && result.targetX !== -1) {
			let targetX = result.targetX;
			const bSpin = (this.game && this.game.barSpin !== undefined)
				? this.game.barSpin
				: ((bar && bar.spin !== undefined) ? bar.spin : BAR_PARAM.SPIN_RATIO);

			// 最優先ボールのバー到達予測（残りフレーム数）
			let minTimeToBar = Infinity;
			const barTopY = typeof bar.getTopY === 'function' ? bar.getTopY() : (bar.y || 0);

			for (let i = 0; i < balls.length; i++) {
				const b = balls[i];
				if (b && b.vy > 0 && b.isAbsorption !== 1) {
					const by = typeof b.getCenterY === 'function' ? b.getCenterY() : b.y;
					const br = b.radius || 5;
					if (by + br <= barTopY) {
						const t = (barTopY - (by + br)) / Math.max(0.1, b.vy);
						if (t < minTimeToBar) {
							minTimeToBar = t;
						}
					}
				}
			}

			// スピン用オフセット速度の計算
			let plusSpeed = 0;
			const spinOffset = result.spinOffset !== undefined
				? result.spinOffset
				: (result.plusSpeed !== undefined ? result.plusSpeed : ((result.bestDvx || 0) / (bSpin || BAR_PARAM.SPIN_RATIO)));

			// 元コード準拠: 接触直前（残り1.0〜2.5フレーム）にバーを加速させてスピン速度を生み出し、接触時（残り1フレーム以下）は落下位置中心で受ける
			if (minTimeToBar <= 2.5 && minTimeToBar > 1.0) {
				plusSpeed = spinOffset;
			}

			// 落下中の有害アイテムとの干渉チェック（plusSpeedによる危険ゾーンへの踏み込み・かすり被弾を絶対防止）
			if (plusSpeed !== 0) {
				const items = this.getItems();
				if (items.length > 0) {
					const barW = bar.width || 100;
					for (let i = 0; i < items.length; i++) {
						const it = items[i];
						if (!it || !isHarmfulItem(it.type)) continue;
						const itY = typeof it.getCenterY === 'function' ? it.getCenterY() : it.y;
						if (itY >= barTopY) continue;
						const itX = typeof it.getCenterX === 'function' ? it.getCenterX() : (it.width ? (it.x + it.width / 2) : it.x);
						const hitRadius = (barW + (it.width || 50)) / 2;
						if (Math.abs((targetX - plusSpeed) - itX) < hitRadius + 18) {
							plusSpeed = 0;
							break;
						}
					}
				}
			}

			// バーの移動目標を設定
			bar.setPointX(targetX - plusSpeed);
		}

		//----------武器使用（リアルタイム即時判定＆発射）----------
		if (bar && bar.weapon > 0) {
			// 1) Workerシミュレーションからの発射指示があれば即座に発射
			if (result && result.fireWeapon) {
				EventBus.emitEvent('weapon:spawn', result.fireWeapon);
				result.fireWeapon = null;
			}
			// 2) メインスレッドでのリアルタイム即時発射判定（バーがブロック直下を通過した一瞬を逃さず発射）
			else if (bar.weaponInter <= 0) {
				const weapons = this.getWeapons();
				const weaponMaxNum = (this.game && this.game.weaponMaxNum) || WEAPON_PARAM.MAX_NUM;
				if (weapons.length < weaponMaxNum[bar.weapon - 1]) {
					const fireImmediate = evaluateWeaponFire(
						bar,
						weapons,
						this.getBlockMap(),
						{
							blkWidth: (this.game && this.game.blockWidth) || DEFAULT_CONFIG.blockWidth,
							canvasWidth: canvasWidth,
							weaponMaxNum: weaponMaxNum,
						}
					);
					if (fireImmediate) {
						EventBus.emitEvent('weapon:spawn', fireImmediate);
					}
				}
			}
		}
	}
}
