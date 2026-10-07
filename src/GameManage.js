// src/GameManage.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import EventBus from "./EventBus.js";
import ScreenManage from "./ScreenManage.js";
import InputManage from "./InputManage.js";
import Control from "./Control.js";
import StatusManage from "./StatusManage.js";
import ScoreManage from "./ScoreManage.js";
import Sound from "./Sound.js";
import ImageData from "./ImageData.js";
import Bar from "./Bar.js";
import AutoPlay from "./AutoPlay.js";
import Ball from "./Ball.js";
import Item from "./Item.js";
import Weapon from "./Weapon.js";
import Balloon from "./Balloon.js";
import Cloud from "./Cloud.js";
import {
	DEFAULT_CONFIG,
	GAME_LOOP_PARAM,
	SYSTEM_PARAM,
	BALL_CREATE_MODE,
	BALL_COPY_MODE,
	BALL_STATUS,
	ITEM_TYPE,
	BALL_PARAM,
	BLOCK_FUNCTION,
	WEAPON_TYPE,
	WEAPON_PARAM,
	BALLOON_PARAM,
	AWARD_KEY_LIST,
	APP_VER,
	APP_ID,
} from "./const.js";

export default class GameManage {
	constructor(options = {}) {
		this.eventBus = options.eventBus || new EventBus();
		this.screenManage = options.screenManage || new ScreenManage(this);
		this.inputManage = options.inputManage || new InputManage(this);
		this.autoPlay = options.autoPlay || new AutoPlay(this);

		this.dynamicCanvas = null;
		this.staticCanvas = null;
		this.dynamicCtx = null;
		this.staticCtx = null;
		this.canvasBg = null;

		this.storage = null;
		this.ctrl = null;
		this.statusMng = null;
		this.scoreMng = null;
		this.imgData = null;
		this.sounds = null;

		this.bar = null;
		this.balls = [];
		this.items = [];
		this.weapons = [];
		this.balloons = [];
		this.blockMap = [];

		this.options = options;
		this.animFrameId = null;
		this.isRunning = false;
		this.appVer = APP_VER;
		this.appId = APP_ID;

		// 設定変数のロード（options、windowおよびDEFAULT_CONFIG）
		this.loadSetupVariables(options);

		// EventBusへの基本イベント登録
		this.setupEventBus();
	}

	destructor() {
		this.stop();

		// 子オブジェクトの破棄
		for (let i = 0; i < this.balls.length; i++) {
			if (this.balls[i] && typeof this.balls[i].destructor === 'function') {
				this.balls[i].destructor();
			}
		}
		this.balls = [];

		for (let i = 0; i < this.items.length; i++) {
			if (this.items[i] && typeof this.items[i].destructor === 'function') {
				this.items[i].destructor();
			}
		}
		this.items = [];

		for (let i = 0; i < this.weapons.length; i++) {
			if (this.weapons[i] && typeof this.weapons[i].destructor === 'function') {
				this.weapons[i].destructor();
			}
		}
		this.weapons = [];

		for (let i = 0; i < this.balloons.length; i++) {
			if (this.balloons[i] && typeof this.balloons[i].destructor === 'function') {
				this.balloons[i].destructor();
			}
		}
		this.balloons = [];

		if (this.bar && typeof this.bar.destructor === 'function') {
			this.bar.destructor();
		}
		this.bar = null;

		if (this.blockMap) {
			for (let i = 0; i < this.blockMap.length; i++) {
				if (this.blockMap[i]) {
					for (let j = 0; j < this.blockMap[i].length; j++) {
						const b = this.blockMap[i][j];
						if (b && typeof b.destructor === 'function') {
							b.destructor();
						}
					}
				}
			}
			this.blockMap = [];
		}

		if (this.inputManage) {
			this.inputManage.destructor();
		}
		if (this.screenManage) {
			this.screenManage.destructor();
		}
		if (this.eventBus) {
			this.eventBus.destructor();
		}
		if (this.sounds && typeof this.sounds.destructor === 'function') {
			this.sounds.destructor();
		}
		if (this.statusMng && typeof this.statusMng.destructor === 'function') {
			this.statusMng.destructor();
		}
		if (this.scoreMng && typeof this.scoreMng.destructor === 'function') {
			this.scoreMng.destructor();
		}
		if (this.imgData && typeof this.imgData.destructor === 'function') {
			this.imgData.destructor();
		}
		if (this.ctrl && typeof this.ctrl.destructor === 'function') {
			this.ctrl.destructor();
		}
		if (this.autoPlay && typeof this.autoPlay.destructor === 'function') {
			this.autoPlay.destructor();
		}

		this.autoPlay = null;
		this.ctrl = null;
		this.statusMng = null;
		this.scoreMng = null;
		this.imgData = null;
		this.sounds = null;
		this.storage = null;
		this.screenManage = null;
		this.inputManage = null;
		this.eventBus = null;
		if (typeof window !== 'undefined' && window.gameManage === this) {
			window.gameManage = null;
		}
	}

	setupEventBus() {
		// --- Event Listeners (GameManage固有のライフサイクル・エンティティ統括管理) ---
		this.eventBus.addOnEvent('game:over', () => {
			this.gameOver();
		});

		this.eventBus.addOnEvent('game:simulateReset', () => {
			this.simulateReset();
		});

		this.eventBus.addOnEvent('game:init', (stage = 0) => {
			this.init(stage);
		});

		this.eventBus.addOnEvent('setting:change', (settingPath) => {
			this.changeSetting(settingPath);
		});

		this.eventBus.addOnEvent('item:spawn', (data) => {
			if (data) this.spawnItem(data);
		});

		this.eventBus.addOnEvent('weapon:spawn', (data) => {
			if (data) this.spawnWeapon(data.type, data.x, data.y, data.vect);
		});

		this.eventBus.addOnEvent('balloon:spawn', (data) => {
			if (data) this.spawnBalloon(data);
		});

		this.eventBus.addOnEvent('ball:launch', (data) => {
			this.launchBall(data ? data.mouseDownTime : 0);
		});

		this.eventBus.addOnEvent('ball:applyItem', (type) => {
			this.applyBallItem(type);
		});

		this.eventBus.addOnEvent('ball:allLost', () => {
			// 全アイテムの消去
			for (let i = 0; i < this.items.length; i++) {
				if (this.items[i] && typeof this.items[i].destructor === 'function') {
					this.items[i].destructor();
				}
			}
			this.items = [];

			// 全武器の消去
			for (let i = 0; i < this.weapons.length; i++) {
				if (this.weapons[i] && typeof this.weapons[i].destructor === 'function') {
					this.weapons[i].destructor();
				}
			}
			this.weapons = [];

			// バー状態の解除と再生成
			if (this.bar && typeof this.bar.destructor === 'function') {
				this.bar.destructor();
			}
			this.bar = new Bar(this);

			// ライフ減少
			this.eventBus.emitEvent('status:addLife', -1);
		});
	}

	//--------------------------------------------------
	// 設定変数の読み込み
	//--------------------------------------------------
	loadSetupVariables(options = {}) {
		const opts = options || this.options || {};
		const configKeys = [
			'canvasWidth', 'canvasHeight', 'statusBarHeight', 'FPS', 'lowFPSAlartRatio',
			'defaultLife', 'maxLife', 'heartColor', 'heartWidth', 'heartHeight',
			'barDefaultWidth', 'barMaxWidth', 'barMinWidth', 'barDefaultHeight',
			'barColor', 'barDefaultSpeed', 'barMinSpeed', 'barStatusDefaultTime',
			'barWeaponDefaultTime', 'barEdge', 'barSpin', 'barImmortalColor', 'barDefaultHP',
			'ballSize', 'ballDefaultSpeed', 'ballMaxSpeed', 'ballColor', 'ballStrongColor',
			'ballUltimateColor', 'ballMaxNum', 'ballStatusTime', 'ballInfBoundCancel',
			'popBalloonBackColor', 'popBalloonFontColor',
			'pointPerLife', 'pointPerBall', 'pointPerContBreak', 'strongBallClear',
			'clearTimeThreashould', 'pointPerClearTime', 'pointPerGetItem', 'pointPerFallBall',
			'itemFontSize', 'itemSpeed', 'itemProb', 'itemColor', 'itemTextColor',
			'itemLineColor', 'itemText',
			'weaponSpeed', 'weaponMaxNum', 'weaponColor', 'weaponLineColor',
			'blockWidth', 'blockHeight', 'blockMotionTime', 'blockDefaultPoint',
			'blockIncrPoint', 'blockMoveInter', 'blockFontSize', 'blockBlinkInter',
			'blockDrawingDistance', 'blockAttackInter', 'blockColor', 'blockLineColor',
			'blockText', 'blockTextColor', 'blockLife', 'blockThrough', 'blockInfinit',
			'blockBreakLimit', 'blockFunction',
			'stageTitle', 'stageLifeUp', 'blockMapSet', 'backGroundImage', 'soundFile'
		];
		for (const key of configKeys) {
			if (opts && opts[key] !== undefined) {
				this[key] = opts[key];
			} else if (typeof window !== 'undefined' && window[key] !== undefined) {
				this[key] = window[key];
			} else if (this[key] === undefined && DEFAULT_CONFIG[key] !== undefined) {
				this[key] = DEFAULT_CONFIG[key];
			}
		}
	}

	//--------------------------------------------------
	// 初期化
	//--------------------------------------------------
	init(offsetStage = 0) {
		if (this.ctrl && typeof this.ctrl.destructor === 'function') {
			this.ctrl.destructor();
		}
		if (this.statusMng && typeof this.statusMng.destructor === 'function') {
			this.statusMng.destructor();
		}
		if (this.scoreMng && typeof this.scoreMng.destructor === 'function') {
			this.scoreMng.destructor();
		}
		if (this.autoPlay && typeof this.autoPlay.destructor === 'function') {
			this.autoPlay.destructor();
		}
		if (this.imgData && typeof this.imgData.destructor === 'function') {
			this.imgData.destructor();
		}

		if (!this.eventBus) {
			this.eventBus = new EventBus();
			this.setupEventBus();
		}
		if (!this.screenManage) {
			this.screenManage = new ScreenManage(this);
		}
		if (!this.inputManage) {
			this.inputManage = new InputManage(this);
		}

		if (typeof document !== 'undefined') {
			this.dynamicCanvas = document.getElementById('dynamic');
			this.staticCanvas = document.getElementById('static');
			if (this.dynamicCanvas) this.dynamicCtx = this.dynamicCanvas.getContext('2d');
			if (this.staticCanvas) this.staticCtx = this.staticCanvas.getContext('2d');
		}

		this.loadSetupVariables(this.options);

		if (this.dynamicCanvas) {
			this.dynamicCanvas.width = this.canvasWidth;
			this.dynamicCanvas.height = this.canvasHeight;
		}
		if (this.staticCanvas) {
			this.staticCanvas.width = this.canvasWidth;
			this.staticCanvas.height = this.canvasHeight;
		}

		// Web Storage
		if (typeof window !== 'undefined' && window.localStorage !== undefined) {
			this.storage = window.localStorage;
		} else if (typeof localStorage !== 'undefined') {
			this.storage = localStorage;
		} else if (this.options && this.options.storage) {
			this.storage = this.options.storage;
		} else {
			this.storage = null;
		}

		// ゲーム制御
		this.ctrl = new Control(this);
		this.ctrl.setStageIndex(offsetStage);

		if (this.storage != null) {
			this.ctrl.loadSoundSwitch();
			this.ctrl.loadSizeFitSwitch();
			this.ctrl.loadContinueSwitch();
			this.ctrl.loadCtrlSwitch();
			this.ctrl.loadStageIndex();
		}

		this.ctrl.fixSize();

		// 描画イメージの準備
		this.screenManage.openScreen("screen_loading");
		if (this.dynamicCtx) {
			this.imgData = new ImageData(this.dynamicCtx, this);
			this.imgData.init();
		}
		this.screenManage.closeScreen("screen_loading");

		// ブロック配置の読み込み
		const blockMapSet = this.blockMapSet || [];
		if (blockMapSet[this.ctrl.stageIndex] && typeof blockMapSet[this.ctrl.stageIndex].copyMap === 'function') {
			this.blockMap = blockMapSet[this.ctrl.stageIndex].copyMap(this);
		} else {
			this.blockMap = [];
		}

		// セッティングコントロールの関連付け
		const settingControl = this.screenManage.getController('screen_setting');
		if (settingControl) {
			settingControl.ctrl = this.ctrl;
			settingControl.storage = this.storage;
			settingControl.gameManage = this;
			settingControl.bindControls();
		}

		// 得点管理
		this.scoreMng = new ScoreManage(this);
		this.scoreMng.init();

		// オブジェクトの破棄と初期化
		this.clearEntities();

		this.bar = new Bar(this);
		this.autoPlay = new AutoPlay(this);

		// ステータス管理
		this.statusMng = new StatusManage(this);
		this.statusMng.countBlockNum();

		const defaultLife = this.defaultLife || DEFAULT_CONFIG.defaultLife;
		if (this.storage != null && this.ctrl.continueSwitch == 1 && this.storage.getItem("continue_life") > 0) {
			this.statusMng.life = this.storage.getItem("continue_life");
		} else {
			this.statusMng.life = defaultLife;
		}

		if (this.storage != null && this.ctrl.continueSwitch == 1) {
			if (this.storage.getItem("continue_time") != null && this.storage.getItem("continue_score") != null) {
				this.statusMng.playTime = this.storage.getItem("continue_time");
				this.scoreMng.score = this.storage.getItem("continue_score");
			}
		}

		this.statusMng.init();

		// 入力管理の初期化
		this.inputManage.game = this;
		this.inputManage.pointX = this.canvasWidth / 2;
		this.inputManage.bind(this.dynamicCanvas);

		// サウンド
		if (!this.sounds || !(this.sounds instanceof Sound)) {
			this.sounds = new Sound(this);
		} else {
			this.sounds.game = this;
		}

		// 背景
		if (typeof document !== 'undefined') {
			this.canvasBg = document.getElementById('canvas_background');
			if (this.canvasBg) {
				const bgList = this.backGroundImage || [];
				this.canvasBg.style.width = this.canvasWidth + "px";
				this.canvasBg.style.height = (this.canvasHeight - this.statusBarHeight) + "px";
				if (bgList[this.ctrl.stageIndex]) {
					this.canvasBg.style.backgroundImage = "url(" + bgList[this.ctrl.stageIndex] + ")";
				}
			}
		}

		// 初回描画
		if (this.staticCtx) this.drawOnce(this.staticCtx);
		if (this.dynamicCtx) this.drawAll(this.dynamicCtx);

		// ゲームループの開始
		this.start();
	}

	clearEntities() {
		for (let i = 0; i < this.balls.length; i++) {
			if (this.balls[i] && typeof this.balls[i].destructor === 'function') {
				this.balls[i].destructor();
			}
		}
		this.balls = [];

		for (let i = 0; i < this.items.length; i++) {
			if (this.items[i] && typeof this.items[i].destructor === 'function') {
				this.items[i].destructor();
			}
		}
		this.items = [];

		for (let i = 0; i < this.weapons.length; i++) {
			if (this.weapons[i] && typeof this.weapons[i].destructor === 'function') {
				this.weapons[i].destructor();
			}
		}
		this.weapons = [];

		for (let i = 0; i < this.balloons.length; i++) {
			if (this.balloons[i] && typeof this.balloons[i].destructor === 'function') {
				this.balloons[i].destructor();
			}
		}
		this.balloons = [];
	}

	start() {
		this.stop();
		this.isRunning = true;
		this.lastFrameTime = null;
		this.accumulator = 0;

		const stepTime = GAME_LOOP_PARAM.STEP_TIME;
		const maxAccumulator = GAME_LOOP_PARAM.MAX_ACCUMULATOR;

		const loop = (timestamp) => {
			if (!this.isRunning) { return; }

			if (this.lastFrameTime === null) {
				this.lastFrameTime = timestamp - stepTime;
			}
			let elapsed = timestamp - this.lastFrameTime;
			this.lastFrameTime = timestamp;

			if (elapsed > maxAccumulator) {
				elapsed = maxAccumulator;
			}

			this.accumulator += elapsed;

			while (this.accumulator >= stepTime) {
				this.step(timestamp, stepTime);
				this.accumulator -= stepTime;
			}

			if (typeof requestAnimationFrame === 'function') {
				this.animFrameId = requestAnimationFrame(loop);
			}
		};

		if (typeof requestAnimationFrame === 'function') {
			this.animFrameId = requestAnimationFrame(loop);
		}
	}

	stop() {
		this.isRunning = false;
		this.lastFrameTime = null;
		this.accumulator = 0;
		if (this.animFrameId !== null) {
			if (typeof cancelAnimationFrame === 'function') {
				cancelAnimationFrame(this.animFrameId);
			}
			this.animFrameId = null;
		}
	}

	step(currentTime = Date.now(), deltaTime = 0) {
		// 一時停止制御
		if (this.ctrl && this.ctrl.pauseSwitch === 0) {
			// オートパイロット
			if (this.ctrl.autoSwitch === 1 && this.autoPlay) {
				this.autoPlay.step();
			}

			// キーボード入力によるバー制御
			if (this.inputManage) {
				this.inputManage.updateKeyboardBarMove(this.canvasWidth);
			}

			// 1. 移動フェーズ（全エンティティのmove）
			this.updateEntities();

			// 2. 場の効果フェーズ（引力・斥力ブロックの磁力適用）
			this.applyFieldEffects();

			// 3. 衝突解決フェーズ（上位による衝突判定と調停）
			this.resolveCollisions();

			// 4. 終了判定
			// ステージクリア判定（破壊可能ブロック全滅）
			if (this.statusMng && this.statusMng.blockNum <= 0) {
				this.gameOver();
				return;
			}
			// ゲームオーバー判定（ボール全滅 かつ ライフなし）
			if (this.statusMng && this.statusMng.isAlive() === false && this.balls.length === 0) {
				this.gameOver();
				return;
			}
		}

		// FPS, 時間測定
		if (this.statusMng) {
			this.statusMng.countFPS();
			this.statusMng.countPlayTime();
		}

		// 周期イベントの実行
		if (this.eventBus) {
			const isPaused = Boolean(this.ctrl && this.ctrl.pauseSwitch !== 0);
			this.eventBus.tickCycleEvents(currentTime, deltaTime, isPaused);
		}

		// 設定フォームの制御
		if (this.ctrl && this.ctrl.formSelector) {
			const playing = this.balls.length !== 0;
			if (this.ctrl.formSelector["continue"]) {
				this.ctrl.formSelector["continue"].disabled = playing;
			}
			if (this.ctrl.formSelector["stage"]) {
				this.ctrl.formSelector["stage"].disabled = playing;
			}
		}

		// 描画
		if (this.dynamicCtx) {
			this.drawAll(this.dynamicCtx);
		}
	}

	//--------------------------------------------------
	// 近傍ブロックの探索
	//--------------------------------------------------
	getNearbyBlocks(x, y, radius, vx = 0, vy = 0) {
		if (!this.blockMap) { return []; }
		const blkWidth = this.blockWidth || DEFAULT_CONFIG.blockWidth;
		const blkHeight = this.blockHeight || DEFAULT_CONFIG.blockHeight;
		const sBarHeight = this.statusBarHeight || 0;

		const stepX = vx < 0 ? -1 : 1;
		const stepY = vy < 0 ? -1 : 1;

		const startX = Math.floor((x - radius * stepX) / blkWidth);
		const endX = Math.floor((x + radius * stepX) / blkWidth);
		const startY = Math.floor((y - radius * stepY - sBarHeight) / blkHeight);
		const endY = Math.floor((y + radius * stepY - sBarHeight) / blkHeight);

		const minX = Math.max(0, Math.min(startX, endX));
		const maxX = Math.max(startX, endX);
		const minY = Math.max(0, Math.min(startY, endY));
		const maxY = Math.max(startY, endY);

		const candidates = [];
		for (let i = minY; i <= maxY; i++) {
			const row = this.blockMap[i];
			if (!row) { continue; }
			for (let j = minX; j <= maxX; j++) {
				const block = row[j];
				if (block && block.type !== 0) {
					candidates.push(block);
				}
			}
		}
		return candidates;
	}

	//--------------------------------------------------
	// 移動フェーズ（全エンティティの位置・状態更新）
	//--------------------------------------------------
	updateEntities() {
		// バー移動
		if (this.bar) {
			this.bar.move();
		}

		// アイテム移動
		for (let i = 0; i < this.items.length; i++) {
			const it = this.items[i];
			if (it) { it.move(); }
		}

		// ブロック移動
		if (this.blockMap) {
			for (let i = 0, len1 = this.blockMap.length; i < len1; i++) {
				const blockLine = this.blockMap[i];
				if (blockLine) {
					for (let j = 0, len2 = blockLine.length; j < len2; j++) {
						const block = blockLine[j];
						if (block && typeof block.move === 'function') {
							block.move();
						}
					}
				}
			}
		}

		// ボール移動
		for (let i = 0; i < this.balls.length; i++) {
			const b = this.balls[i];
			if (b && typeof b.move === 'function') { b.move(); }
		}

		// 武器移動
		for (let i = 0; i < this.weapons.length; i++) {
			const w = this.weapons[i];
			if (w && typeof w.move === 'function') { w.move(); }
		}
	}

	//--------------------------------------------------
	// 場の効果フェーズ（引力・斥力ブロックの力適用）
	//--------------------------------------------------
	applyFieldEffects() {
		if (!this.blockMap || this.balls.length === 0) { return; }
		for (let i = 0, len1 = this.blockMap.length; i < len1; i++) {
			const row = this.blockMap[i];
			if (!row) { continue; }
			for (let j = 0, len2 = row.length; j < len2; j++) {
				const block = row[j];
				if (!block || block.type === 0) { continue; }
				if (block.func === BLOCK_FUNCTION.MAGNET || block.func === BLOCK_FUNCTION.REPULL) {
					for (let k = 0; k < this.balls.length; k++) {
						const ball = this.balls[k];
						if (ball) { block.applyMagneticForce(ball); }
					}
				}
			}
		}
	}

	//--------------------------------------------------
	// 衝突解決フェーズ（上位による衝突判定と調停）
	//--------------------------------------------------
	resolveCollisions() {
		// 1. ボール vs バー・壁・ブロック
		for (let i = this.balls.length - 1; i >= 0; i--) {
			const ball = this.balls[i];
			if (!ball) { continue; }

			// 吸着状態のボールはバーに追従固定されているため衝突判定をスキップ
			if (ball.isAbsorption === 1) {
				continue;
			}

			// バーとの衝突・吸着（画面下端より手前にあるバーとの接触を先に判定）
			let hitBar = false;
			if (this.bar && typeof ball.checkCollisionWithBar === 'function') {
				hitBar = ball.checkCollisionWithBar(this.bar);
			}

			// バーに当たって吸着状態へ遷移した場合は以降の判定を行わない
			if (ball.isAbsorption === 1) {
				continue;
			}

			// バーと衝突しなかった場合のみ、壁・天井・画面下端（落下）との衝突を判定
			if (!hitBar && typeof ball.checkCollisionWithWall === 'function') {
				ball.checkCollisionWithWall(this.canvasWidth, this.canvasHeight, this.statusBarHeight);
			}

			// 落下して消滅したボールは以降の衝突判定を行わない
			if (!ball.game || this.balls.indexOf(ball) === -1) {
				continue;
			}

			// ブロックとの衝突
			if (typeof ball.checkCollision === 'function') {
				const nearBlocks = this.getNearbyBlocks(ball.x, ball.y, ball.radius, ball.vx, ball.vy);
				for (let k = 0; k < nearBlocks.length; k++) {
					const blk = nearBlocks[k];
					if (ball.checkCollision(blk) === true) {
						const isChangedVY = (ball.lastHitAxis === 'y') ? 1 : 0;
						const addSpeed = blk.action(ball, isChangedVY);
						if (addSpeed && typeof ball.applySpeedDelta === 'function') {
							ball.applySpeedDelta(addSpeed);
						}
						break;
					}
				}
			}

			// 位置履歴の更新
			if (typeof ball.updateHistory === 'function') {
				ball.updateHistory();
			}
		}

		// 2. アイテム vs バー
		if (this.bar) {
			for (let i = this.items.length - 1; i >= 0; i--) {
				const item = this.items[i];
				if (!item) { continue; }
				if (item.checkCollision(this.bar) === true) {
					item.applyEffect();
					item.destructor();
				}
			}
		}

		// 3. 武器 vs ブロック（自機武器） / 武器 vs バー（敵武器）
		for (let i = this.weapons.length - 1; i >= 0; i--) {
			const weapon = this.weapons[i];
			if (!weapon) { continue; }

			// 自機武器 vs ブロック
			if (weapon.vect > 0) {
				const nearBlocks = this.getNearbyBlocks(weapon.x, weapon.y, weapon.size * 4, 0, -weapon.vy);
				for (let k = 0; k < nearBlocks.length; k++) {
					const blk = nearBlocks[k];
					if (weapon.checkCollision(blk) === true) {
						if (blk.func !== BLOCK_FUNCTION.EXPLODE && blk.func !== BLOCK_FUNCTION.EXPLODE_STRENGTH) {
							this.eventBus?.emitEvent('sound:play', 'block');
						}
						if (weapon.type === WEAPON_TYPE.MISSILE) {
							blk.action(null, 0);
						} else if (blk.infinit !== 1) {
							if (blk.life < 1) {
								blk.action(null, 0);
							} else {
								blk.decreaseLife();
							}
						}
						weapon.destructor();
						break;
					}
				}
			// 敵武器 vs バー
			} else if (weapon.vect < 0 && this.bar) {
				if (weapon.checkCollision(this.bar) === true) {
					this.bar.endamage(1);
					const balloonCfg = BALLOON_PARAM.DAMAGE_BALLOON;
					this.eventBus?.emitEvent('balloon:spawn', {
						text: Math.max(0, this.bar.hitPoint),
						x: this.bar.getCenterX() + balloonCfg.OFFSET_X,
						y: this.bar.getTopY() + balloonCfg.OFFSET_Y,
						width: balloonCfg.WIDTH,
						height: balloonCfg.HEIGHT,
						alpha: balloonCfg.ALPHA,
						backColor: balloonCfg.BACK_COLOR,
						fontColor: balloonCfg.FONT_COLOR,
						fontSize: balloonCfg.FONT_SIZE,
					});
					weapon.destructor();
				}
			}
		}
	}

	drawOnce(staticCtx) {
		if (!staticCtx) { return; }
		staticCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

		if (this.blockMap) {
			for (let i = 0, len1 = this.blockMap.length; i < len1; i++) {
				const blockLine = this.blockMap[i];
				if (blockLine) {
					for (let j = 0, len2 = blockLine.length; j < len2; j++) {
						const block = blockLine[j];
						if (block && block.type !== 0 && typeof block.draw === 'function') {
							block.draw(staticCtx);
						}
					}
				}
			}
		}

		if (this.statusMng && typeof this.statusMng.drawLife === 'function') {
			this.statusMng.drawLife(staticCtx);
		}
	}

	drawAll(dynamicCtx) {
		if (!dynamicCtx) { return; }
		dynamicCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

		if (this.bar && typeof this.bar.draw === 'function') {
			this.bar.draw(dynamicCtx);
		}

		// 爆破モーション
		if (this.blockMap) {
			for (let i = 0, len1 = this.blockMap.length; i < len1; i++) {
				const blockLine = this.blockMap[i];
				if (blockLine) {
					for (let j = 0, len2 = blockLine.length; j < len2; j++) {
						const block = blockLine[j];
						if (block && block.exploded > 0) {
							Cloud(dynamicCtx, block.x, block.y);
						}
					}
				}
			}
		}

		// アイテム
		for (let i = 0, len = this.items.length; i < len; i++) {
			if (this.items[i] && typeof this.items[i].draw === 'function') {
				this.items[i].draw(dynamicCtx);
			}
		}

		// 武器
		for (let i = 0, len = this.weapons.length; i < len; i++) {
			if (this.weapons[i] && typeof this.weapons[i].draw === 'function') {
				this.weapons[i].draw(dynamicCtx);
			}
		}

		// ボール
		for (let i = 0, len = this.balls.length; i < len; i++) {
			if (this.balls[i] && typeof this.balls[i].draw === 'function') {
				this.balls[i].draw(dynamicCtx);
			}
		}

		// バルーン
		for (let i = 0; i < this.balloons.length; i++) {
			const balloon = this.balloons[i];
			if (!balloon) { continue; }
			if (balloon.endFlag) {
				if (typeof balloon.destructor === 'function') { balloon.destructor(); }
				this.balloons.splice(i, 1);
				i--;
			} else if (typeof balloon.draw === 'function') {
				balloon.draw(dynamicCtx);
			}
		}

		// 画面の難視化
		if (this.bar && this.bar.disturbStatusTime > 0) {
			const blockWidth = this.blockWidth || DEFAULT_CONFIG.blockWidth;
			const disturbWidth = blockWidth;
			const startPoint = ((Date.now() / 6) % disturbWidth) * 2 - disturbWidth;
			dynamicCtx.fillStyle = SYSTEM_PARAM.DISTURB_OVERLAY_COLOR;
			for (let i = startPoint; i < this.canvasWidth;) {
				dynamicCtx.fillRect(i, 0, disturbWidth, this.canvasHeight);
				i += disturbWidth * 2;
			}
		}

		// ステータス描画
		this.statusMng.printStatus(dynamicCtx);
	}

	gameOver() {
		const isAlive = this.statusMng ? (typeof this.statusMng.isAlive === 'function' ? this.statusMng.isAlive() : this.statusMng.life > 0) : false;
		const isBlockCleared = this.statusMng ? (this.statusMng.blockNum <= 0) : false;
		const isClear = isBlockCleared || isAlive;

		if (this.sounds && typeof this.sounds.play === 'function') {
			if (isClear) {
				this.sounds.play('clear');
			} else {
				this.sounds.play('game_over');
			}
		}

		if (this.scoreMng) {
			if (typeof this.scoreMng.calculateAwardPoint === 'function') {
				this.scoreMng.calculateAwardPoint();
			}
			if (typeof this.scoreMng.recordScore === 'function') {
				this.scoreMng.recordScore(isClear ? 1 : 0);
			}
		}

		const stageTitles = this.stageTitle || [];
		const outputStageTitle = stageTitles[this.ctrl.stageIndex] || '';

		const awardPt = (this.scoreMng && this.scoreMng.awardPt) ? this.scoreMng.awardPt : {};
		const awardNum = (this.scoreMng && this.scoreMng.awardNum) ? this.scoreMng.awardNum : {};
		let sumPoint = 0;
		for (let i = 0; i < AWARD_KEY_LIST.length; i++) {
			sumPoint += Number(awardPt[AWARD_KEY_LIST[i]] || 0);
		}

		// オブジェクトの消去
		this.clearEntities();

		if (this.bar && typeof this.bar.destructor === 'function') {
			this.bar.destructor();
		}
		this.bar = new Bar(this);

		const blockMapSet = this.blockMapSet || [];
		const stageLifeUp = this.stageLifeUp || [];

		if (isClear) {
			if (blockMapSet.length - 1 > this.ctrl.stageIndex) {
				const lifeUp = stageLifeUp[this.ctrl.stageIndex] || 0;
				this.statusMng.addLife(lifeUp);
			}
			if (this.ctrl && typeof this.ctrl.forwardStageIndex === 'function') {
				this.ctrl.forwardStageIndex();
			}
		}

		// ストレージへの記録
		if (this.storage != null) {
			const hiScore = this.storage.getItem("record_hiScore");
			if (hiScore == null || hiScore < this.scoreMng.score) {
				this.storage.setItem("record_hiScore", this.scoreMng.score);
			}

			if (this.ctrl && typeof this.ctrl.recordStageIndex === 'function') {
				if (this.ctrl.stageEnded === 1) {
					this.ctrl.recordStageIndex(0);
				} else {
					this.ctrl.recordStageIndex(this.ctrl.stageIndex);
				}
			}
			if (isClear) {
				this.storage.setItem("continue_life", this.statusMng.life);
				this.storage.setItem("continue_score", this.scoreMng.score);
				this.storage.setItem("continue_time", this.statusMng.playTime);
			} else {
				const defaultLife = this.defaultLife || DEFAULT_CONFIG.defaultLife;
				this.storage.setItem("continue_life", defaultLife);
				this.storage.setItem("continue_score", 0);
				this.storage.setItem("continue_time", 0);
			}
		}

		if (isClear) {
			if (this.ctrl.stageEnded === 0 && blockMapSet[this.ctrl.stageIndex] && typeof blockMapSet[this.ctrl.stageIndex].copyMap === 'function') {
				this.blockMap = blockMapSet[this.ctrl.stageIndex].copyMap(this);
			}
			if (this.statusMng && typeof this.statusMng.countBlockNum === 'function') {
				this.statusMng.countBlockNum();
			}
		}

		if (this.staticCtx) {
			this.drawOnce(this.staticCtx);
		}

		const stats = {
			stageTitle: outputStageTitle,
			awardPt,
			awardNum,
			sumPoint,
			score: this.scoreMng ? this.scoreMng.score : 0,
		};

		if (!isClear) {
			this.stop();
			this.screenManage.showGameOver(stats);
		} else if (this.ctrl.stageEnded === 1) {
			this.screenManage.showAllClear(stats);
			this.init(0);
		} else {
			this.screenManage.showStageClear(stats);
			if (this.scoreMng && typeof this.scoreMng.init === 'function') this.scoreMng.init();
		}
	}

	simulateReset() {
		if (!this.blockMap) { return; }
		for (let i = 0, len1 = this.blockMap.length; i < len1; i++) {
			if (this.blockMap[i] && this.blockMap[i].length) {
				for (let j = 0, len2 = this.blockMap[i].length; j < len2; j++) {
					const block = this.blockMap[i][j];
					if (block && typeof block.simulateReset === 'function') {
						block.simulateReset();
					}
				}
			}
		}
	}

	changeSetting(file) {
		if (typeof document === 'undefined') { return; }
		const oldScr = document.getElementById('setup');
		if (oldScr && oldScr.parentNode) {
			oldScr.parentNode.removeChild(oldScr);
		}

		const newScr = document.createElement('script');
		newScr.type = 'text/javascript';
		newScr.src = file;
		newScr.id = 'setup';
		const head = document.getElementsByTagName('head')[0];
		if (head) {
			head.appendChild(newScr);
		}
		newScr.onload = () => {
			this.init(0);
		};
	}

	launchBall(mouseDownTime = 0) {
		const b = new Ball(BALL_CREATE_MODE.LAUNCH, this, mouseDownTime);
		this.balls.push(b);
		return b;
	}

	spawnWeapon(type, x, y = null, vect = null) {
		const w = new Weapon(type, x, y, vect, this);
		this.weapons.push(w);
		if (this.bar && (vect === null || vect > 0)) {
			this.bar.weaponInter = WEAPON_PARAM.FIRE_INTERVAL;
		}
		return w;
	}

	spawnItem(data) {
		if (!data) return null;
		const item = new Item(data.type, data.x, data.y, data.lineColor, data.color, this);
		this.items.push(item);
		return item;
	}

	spawnBalloon(data) {
		if (!data) return null;
		const balloon = new Balloon(
			data.text,
			data.x,
			data.y,
			data.width,
			data.height,
			data.alpha,
			data.backColor,
			data.fontColor,
			data.fontSize
		);
		this.balloons.push(balloon);
		return balloon;
	}

	applyBallItem(type) {
		const ballMaxNum = this.ballMaxNum || DEFAULT_CONFIG.ballMaxNum;
		const ballStatusTime = this.ballStatusTime || BALL_PARAM.STATUS_TIME_SEC;
		const ballNum = this.balls.length;

		// 2倍増殖
		if (type === ITEM_TYPE.DOUBLE) {
			const diffNum = ballMaxNum - ballNum;
			const len = ballNum > diffNum ? diffNum : ballNum;
			for (let i = 0; i < len; i++) {
				if (this.balls[i] && typeof this.balls[i].copy === 'function') {
					this.balls.push(this.balls[i].copy(BALL_COPY_MODE.RAND));
				}
			}
		// 強化状態
		} else if (type === ITEM_TYPE.HARD) {
			for (let i = 0; i < ballNum; i++) {
				if (this.balls[i]) {
					this.balls[i].setStatus(BALL_STATUS.STRONG, ballStatusTime);
				}
			}
		// 無敵状態
		} else if (type === ITEM_TYPE.FIRE) {
			for (let i = 0; i < ballNum; i++) {
				if (this.balls[i]) {
					this.balls[i].setStatus(BALL_STATUS.ULTIMATE, ballStatusTime);
				}
			}
		// ボール速度増加
		} else if (type === ITEM_TYPE.SPEED_UP) {
			for (let i = 0; i < ballNum; i++) {
				if (this.balls[i]) {
					this.balls[i].vx *= BALL_PARAM.SPEED_UP_RATIO;
					this.balls[i].vy *= BALL_PARAM.SPEED_UP_RATIO;
				}
			}
		// ボール速度減少
		} else if (type === ITEM_TYPE.SPEED_DOWN) {
			for (let i = 0; i < ballNum; i++) {
				if (this.balls[i]) {
					this.balls[i].vx *= BALL_PARAM.SPEED_DOWN_RATIO;
					this.balls[i].vy *= BALL_PARAM.SPEED_DOWN_RATIO;
				}
			}
		}
	}
}

