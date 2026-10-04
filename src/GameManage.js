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
import Block from "./Block.js";
import Item from "./Item.js";
import Weapon from "./Weapon.js";
import Balloon from "./Balloon.js";
import Cloud from "./Cloud.js";
import {
	DEFAULT_CONFIG,
	BALL_CREATE_MODE,
	BALL_COPY_MODE,
	BALL_STATUS,
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
		// --- Event Listeners (Receiving actions from other instances) ---
		this.eventBus.addOnEvent('sound:play', (key) => {
			if (this.sounds && typeof this.sounds.play === 'function') {
				this.sounds.play(key);
			}
		});

		this.eventBus.addOnEvent('score:add', (point) => {
			if (this.scoreMng) {
				this.scoreMng.score = (this.scoreMng.score || 0) + point;
			}
		});

		this.eventBus.addOnEvent('award:add', (data) => {
			if (this.scoreMng && this.scoreMng.awardNum && data) {
				const key = typeof data === 'string' ? data : data.key;
				const count = (typeof data === 'object' && data.count != null) ? data.count : 1;
				if (this.scoreMng.awardNum[key] !== undefined) {
					this.scoreMng.awardNum[key] += count;
				}
			}
		});

		this.eventBus.addOnEvent('award:continuousBreak', (data) => {
			if (this.scoreMng && this.scoreMng.awardNum && data) {
				const currentMax = this.scoreMng.awardNum.continuousBreakNum || 0;
				if (data.breakNum > currentMax) {
					this.scoreMng.awardNum.continuousBreakNum = data.breakNum;
					this.eventBus.emitEvent('balloon:spawn', {
						text: data.breakNum,
						x: data.x,
						y: data.y,
						width: 25,
						height: 10,
						alpha: 0.13,
						backColor: data.backColor,
						fontColor: data.fontColor,
						fontSize: 12,
					});
				}
			}
		});

		this.eventBus.addOnEvent('status:addLife', (amount = 1) => {
			if (this.statusMng && typeof this.statusMng.addLife === 'function') {
				this.statusMng.addLife(amount);
			}
		});

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

		this.eventBus.addOnEvent('screen:open', (screenName) => {
			if (this.screenManage && typeof this.screenManage.openScreen === 'function') {
				this.screenManage.openScreen(screenName);
			}
		});

		this.eventBus.addOnEvent('screen:close', (screenName) => {
			if (this.screenManage && typeof this.screenManage.closeScreen === 'function') {
				this.screenManage.closeScreen(screenName);
			}
		});

		this.eventBus.addOnEvent('screen:allClose', () => {
			if (this.screenManage && typeof this.screenManage.allClose === 'function') {
				this.screenManage.allClose();
			}
		});

		this.eventBus.addOnEvent('screen:printRecord', (data) => {
			const type = data ? data.type : null;
			const stage = data ? data.stage : null;
			if (this.screenManage && typeof this.screenManage.printRecordScreen === 'function') {
				this.screenManage.printRecordScreen(type, stage);
			}
		});

		this.eventBus.addOnEvent('input:setMouseDownTime', (time) => {
			if (this.inputManage) {
				this.inputManage.mouseDownTime = time;
			}
		});

		this.eventBus.addOnEvent('input:setPointX', (x) => {
			if (this.inputManage) {
				this.inputManage.pointX = x;
			}
		});

		this.eventBus.addOnEvent('status:blockBreak', (count = 1) => {
			if (this.statusMng && this.statusMng.blockNum !== undefined) {
				this.statusMng.blockNum -= count;
			}
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
			if (this.statusMng && typeof this.statusMng.addLife === 'function') {
				this.statusMng.addLife(-1);
			}
		});

		this.eventBus.addOnEvent('control:togglePause', () => {
			if (this.ctrl && typeof this.ctrl.pauseSwitchToggle === 'function') {
				this.ctrl.pauseSwitchToggle();
			}
		});

		this.eventBus.addOnEvent('control:toggleSound', () => {
			if (this.ctrl && typeof this.ctrl.soundSwitchToggle === 'function') {
				this.ctrl.soundSwitchToggle();
			}
		});

		this.eventBus.addOnEvent('control:toggleAuto', () => {
			if (this.ctrl && typeof this.ctrl.autoSwitchToggle === 'function') {
				this.ctrl.autoSwitchToggle();
			}
		});

		this.eventBus.addOnEvent('control:toggleCtrl', () => {
			if (this.ctrl && typeof this.ctrl.ctrlSwitchToggle === 'function') {
				this.ctrl.ctrlSwitchToggle();
			}
		});

		this.eventBus.addOnEvent('control:toggleSizeFit', () => {
			if (this.ctrl && typeof this.ctrl.sizefitSwitchToggle === 'function') {
				this.ctrl.sizefitSwitchToggle();
			}
		});

		this.eventBus.addOnEvent('control:forwardStage', () => {
			if (this.ctrl) {
				if (typeof this.ctrl.forwardStageIndex === 'function') {
					this.ctrl.forwardStageIndex();
					if (typeof this.ctrl.recordStageIndex === 'function') this.ctrl.recordStageIndex();
				}
				this.init(this.ctrl.stageIndex);
			}
		});

		this.eventBus.addOnEvent('control:backwardStage', () => {
			if (this.ctrl) {
				if (typeof this.ctrl.backwardStageIndex === 'function') {
					this.ctrl.backwardStageIndex();
					if (typeof this.ctrl.recordStageIndex === 'function') this.ctrl.recordStageIndex();
				}
				this.init(this.ctrl.stageIndex);
			}
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
		this.sounds = new Sound(this);

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

		const loop = (timestamp) => {
			if (!this.isRunning) return;
			this.step(timestamp);
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

			// 終了判定
			if (this.statusMng && (this.statusMng.blockNum <= 0 || this.statusMng.isAlive() === false)) {
				this.gameOver();
				return;
			}

			// ボール移動
			for (let i = 0; i < this.balls.length; i++) {
				const b = this.balls[i];
				if (b && typeof b.move === 'function') b.move();
			}

			// 武器移動
			for (let i = 0; i < this.weapons.length; i++) {
				const w = this.weapons[i];
				if (w && typeof w.move === 'function') w.move();
			}
		}

		// FPS, 時間測定
		if (this.statusMng) {
			this.statusMng.countFPS();
			this.statusMng.countPlayTime();
		}

		// 周期イベントの実行
		if (this.eventBus) {
			this.eventBus.tickCycleEvents(currentTime, deltaTime);
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

	drawOnce(staticCtx) {
		if (!staticCtx) return;
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
		if (!dynamicCtx) return;
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
			if (!balloon) continue;
			if (balloon.endFlag) {
				if (typeof balloon.destructor === 'function') balloon.destructor();
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
			dynamicCtx.fillStyle = 'rgba(0, 0, 0, 0.85)';
			for (let i = startPoint; i < this.canvasWidth;) {
				dynamicCtx.fillRect(i, 0, disturbWidth, this.canvasHeight);
				i += disturbWidth * 2;
			}
		}

		// ステータス描画
		this.statusView(dynamicCtx);
	}

	statusView(dynamicCtx) {
		if (typeof document === 'undefined' || !this.statusMng || !this.scoreMng || !this.ctrl) return;
		const playInfo = document.getElementById("play_info");
		if (!playInfo) return;

		const displayPoint = this.statusMng.getDisplayPoint();
		const playTime = this.statusMng.getPlaySecTime();
		const playTime_min = this.statusMng.getPlayMinTime();
		const stageTitles = this.stageTitle || [];
		const stageTitleStr = stageTitles[this.ctrl.stageIndex] || '';

		let text = '/ Score:' + displayPoint + ' / Hi-Score:' + String(this.scoreMng.hiScore);
		text += ' / Stage:' + stageTitleStr + ' / Time:' + playTime_min + '\'' + playTime + ' / Mode:' + (this.ctrl.autoSwitch === 0 ? 'MP' : 'AP');
		text += '<span style="font-size: 0.8em; margin-left: 3em;">' + this.statusMng.getRealFPS() + 'fps / ' + String(this.balls.length) + '</span>';

		const maxLife = this.maxLife || DEFAULT_CONFIG.maxLife;
		const lifeSpaceSize = maxLife * 17 + 5;

		playInfo.innerHTML = 'Life' + '<span style="margin-left: ' + lifeSpaceSize + 'px;">' + text + '</span>';
	}

	gameOver() {
		const isAlive = this.statusMng ? (typeof this.statusMng.isAlive === 'function' ? this.statusMng.isAlive() : this.statusMng.life > 0) : false;

		if (this.sounds && typeof this.sounds.play === 'function') {
			if (isAlive) {
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
				this.scoreMng.recordScore(isAlive ? 1 : 0);
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

		if (isAlive) {
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
			if (isAlive) {
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

		if (this.ctrl.stageEnded === 0 && blockMapSet[this.ctrl.stageIndex] && typeof blockMapSet[this.ctrl.stageIndex].copyMap === 'function') {
			this.blockMap = blockMapSet[this.ctrl.stageIndex].copyMap(this);
		}
		if (this.statusMng && typeof this.statusMng.countBlockNum === 'function') {
			this.statusMng.countBlockNum();
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

		if (!isAlive) {
			this.screenManage.showGameOver(stats);
			this.init(0);
		} else if (this.ctrl.stageEnded === 1) {
			this.screenManage.showAllClear(stats);
			this.init(0);
		} else {
			this.screenManage.showStageClear(stats);
			if (this.scoreMng && typeof this.scoreMng.init === 'function') this.scoreMng.init();
		}
	}

	simulateReset() {
		if (!this.blockMap) return;
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
		if (typeof document === 'undefined') return;
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
		const ballMaxNum = this.ballMaxNum || 4;
		const ballStatusTime = this.ballStatusTime || 8;
		const fps = this.FPS || DEFAULT_CONFIG.FPS;
		const ballNum = this.balls.length;

		// 2倍増殖
		if (type === 0) {
			const diffNum = ballMaxNum - ballNum;
			const len = ballNum > diffNum ? diffNum : ballNum;
			for (let i = 0; i < len; i++) {
				if (this.balls[i] && typeof this.balls[i].copy === 'function') {
					this.balls.push(this.balls[i].copy(BALL_COPY_MODE.RAND));
				}
			}
		// 強化状態
		} else if (type === 1) {
			for (let i = 0; i < ballNum; i++) {
				if (this.balls[i]) {
					this.balls[i].status = BALL_STATUS.STRONG;
					this.balls[i].statusTime = ballStatusTime * fps;
				}
			}
		// 無敵状態
		} else if (type === 2) {
			for (let i = 0; i < ballNum; i++) {
				if (this.balls[i]) {
					this.balls[i].status = BALL_STATUS.ULTIMATE;
					this.balls[i].statusTime = ballStatusTime * fps;
				}
			}
		// ボール速度増加
		} else if (type === 7) {
			for (let i = 0; i < ballNum; i++) {
				if (this.balls[i]) {
					this.balls[i].vx *= 1.3;
					this.balls[i].vy *= 1.3;
				}
			}
		// ボール速度減少
		} else if (type === 8) {
			for (let i = 0; i < ballNum; i++) {
				if (this.balls[i]) {
					this.balls[i].vx *= 0.7;
					this.balls[i].vy *= 0.7;
				}
			}
		}
	}
}

