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
import AutoPlay from "./AutoPlay.js";
import ObjectManage from "./ObjectManage.js";
import {
	DEFAULT_CONFIG,
	GAME_LOOP_PARAM,
	SYSTEM_PARAM,
	AWARD_KEY_LIST,
} from "./const.js";

export default class GameManage {
	constructor(options = {}) {
		this.screenManage = options.screenManage || new ScreenManage(this);
		this.inputManage = options.inputManage || new InputManage(this);
		this.autoPlay = options.autoPlay || new AutoPlay(this);
		this.objectManage = options.objectManage || new ObjectManage(this);

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

		this.options = options;
		this.animFrameId = null;
		this.isRunning = false;

		// 設定変数のロード（options、windowおよびDEFAULT_CONFIG）
		this.loadSetupVariables(options);

		// EventBusへの基本イベント登録
		this.setupEventBus();
	}

	destructor() {
		this.stop();

		if (this.objectManage && typeof this.objectManage.destructor === 'function') {
			this.objectManage.destructor();
		}
		this.objectManage = null;

		if (this.inputManage) {
			this.inputManage.destructor();
		}
		if (this.screenManage) {
			this.screenManage.destructor();
		}
		this.removeEventBus();
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
		this.eventBusSetup = false;
		if (typeof window !== 'undefined' && window.gameManage === this) {
			window.gameManage = null;
		}
	}

	setupEventBus() {
		if (this.eventBusSetup) return;
		this.eventBusSetup = true;

		// --- Event Listeners (GameManage固有のゲームサイクル管理) ---
		this.onGameOverHandler = () => {
			this.gameOver();
		};
		this.onSimulateResetHandler = () => {
			this.simulateReset();
		};
		this.onGameInitHandler = (stage = 0) => {
			this.init(stage);
		};
		this.onSettingChangeHandler = (settingPath) => {
			this.changeSetting(settingPath);
		};

		EventBus.addOnEvent('game:over', this.onGameOverHandler);
		EventBus.addOnEvent('game:simulateReset', this.onSimulateResetHandler);
		EventBus.addOnEvent('game:init', this.onGameInitHandler);
		EventBus.addOnEvent('setting:change', this.onSettingChangeHandler);
	}

	removeEventBus() {
		if (!this.eventBusSetup) return;
		if (this.onGameOverHandler) EventBus.removeOnEvent('game:over', this.onGameOverHandler);
		if (this.onSimulateResetHandler) EventBus.removeOnEvent('game:simulateReset', this.onSimulateResetHandler);
		if (this.onGameInitHandler) EventBus.removeOnEvent('game:init', this.onGameInitHandler);
		if (this.onSettingChangeHandler) EventBus.removeOnEvent('setting:change', this.onSettingChangeHandler);

		this.onGameOverHandler = null;
		this.onSimulateResetHandler = null;
		this.onGameInitHandler = null;
		this.onSettingChangeHandler = null;
		this.eventBusSetup = false;
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

		this.screenManage.openScreen("screen_loading");
		this.screenManage.setLoadingMessage("Initializing...");
		this.setupBasics(offsetStage);
		this.setupSound();
		this.screenManage.setLoadingMessage("Generating graphics...");
		this.setupImageData();
		this.screenManage.setLoadingMessage("Preparing stage data...");
		this.setupEntities();
		this.screenManage.setLoadingMessage("Preparing game screen...");
		this.setupDrawAndLoop();
		this.screenManage.setLoadingMessage("Setup complete");
		this.screenManage.closeScreen("screen_loading");
	}

	setupBasics(offsetStage) {
		if (this.statusMng && typeof this.statusMng.destructor === 'function') {
			this.statusMng.destructor();
		}
		if (this.imgData && typeof this.imgData.destructor === 'function') {
			this.imgData.destructor();
		}

		if (!this.eventBusSetup) {
			this.setupEventBus();
			this.eventBusSetup = true;
		}
		if (!this.screenManage) {
			this.screenManage = new ScreenManage(this);
		}
		if (!this.inputManage) {
			this.inputManage = new InputManage(this);
		}
		if (!this.objectManage) {
			this.objectManage = new ObjectManage(this);
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
			this.ctrl.loadPointerLockSwitch();
			this.ctrl.loadStageIndex();
		}

		this.ctrl.fixSize();
	}

	setupSound() {
		if (!this.sounds || !(this.sounds instanceof Sound)) {
			this.sounds = new Sound(this);
		} else {
			this.sounds.game = this;
		}
	}

	setupImageData() {
		if (this.dynamicCtx) {
			this.imgData = new ImageData(this.dynamicCtx, this);
			this.imgData.init();
		}
	}

	setupEntities() {
		// オブジェクト管理の初期化（ブロック配置の読み込み、Barの生成、エンティティクリア）
		this.objectManage.init(this.ctrl.stageIndex);

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
	}

	setupDrawAndLoop() {
		// 初回描画
		if (this.staticCtx) this.drawOnce(this.staticCtx);
		if (this.dynamicCtx) this.drawAll(this.dynamicCtx);

		// ゲームループの開始
		this.start();
	}

	async initAsync(offsetStage = 0, onProgress = null) {
		const updateProgress = (ratio, text) => {
			this.screenManage.setLoadingMessage(text);
			if (typeof onProgress === 'function') {
				onProgress(ratio, text);
			}
		};

		this.screenManage.openScreen("screen_loading");
		updateProgress(0.05, "Initializing...");
		await new Promise(resolve => setTimeout(resolve, 10));

		this.setupBasics(offsetStage);
		this.setupSound();

		updateProgress(0.15, "Loading audio data...");
		await new Promise(resolve => setTimeout(resolve, 10));

		// サウンドの非同期プリロード（進捗 15% -> 55%）
		if (this.sounds && typeof this.sounds.preloadAudioBuffers === 'function') {
			await this.sounds.preloadAudioBuffers((soundRatio) => {
				const current = 0.15 + soundRatio * 0.40;
				updateProgress(current, "Loading audio data...");
			});
		}

		updateProgress(0.55, "Generating graphics...");
		await new Promise(resolve => setTimeout(resolve, 10));

		// 画像データの初期化（進捗 55% -> 75%）
		this.setupImageData();
		updateProgress(0.75, "Preparing stage data...");
		await new Promise(resolve => setTimeout(resolve, 10));

		// オブジェクト管理・エンティティの初期化（進捗 75% -> 90%）
		this.setupEntities();
		updateProgress(0.90, "Preparing game screen...");
		await new Promise(resolve => setTimeout(resolve, 10));

		// 描画とゲームループの開始（進捗 90% -> 100%）
		this.setupDrawAndLoop();
		updateProgress(1.0, "Setup complete");
		await new Promise(resolve => setTimeout(resolve, 50));

		this.screenManage.closeScreen("screen_loading");
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

			// オブジェクト管理によるエンティティ更新・物理演算・衝突解決
			if (this.objectManage) {
				this.objectManage.step(currentTime, deltaTime);
			}

			// 終了判定
			// ステージクリア判定（破壊可能ブロック全滅）
			if (this.statusMng && this.statusMng.blockNum <= 0) {
				this.gameOver();
				return;
			}
			// ゲームオーバー判定（ボール全滅 かつ ライフなし）
			if (this.statusMng && this.statusMng.isAlive() === false && (!this.objectManage || this.objectManage.balls.length === 0)) {
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
		const isPaused = Boolean(this.ctrl && this.ctrl.pauseSwitch !== 0);
		EventBus.tickCycleEvents(currentTime, deltaTime, isPaused);

		// 設定フォームの制御
		if (this.ctrl && this.ctrl.formSelector) {
			const playing = Boolean(this.objectManage && this.objectManage.balls.length !== 0);
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
		if (!staticCtx) { return; }
		staticCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

		if (this.objectManage) {
			this.objectManage.drawStatic(staticCtx);
		}

		if (this.statusMng && typeof this.statusMng.drawLife === 'function') {
			this.statusMng.drawLife(staticCtx);
		}
	}

	drawAll(dynamicCtx) {
		if (!dynamicCtx) { return; }
		dynamicCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

		if (this.objectManage) {
			this.objectManage.drawDynamic(dynamicCtx);
		}

		// 画面の難視化
		if (this.objectManage && this.objectManage.bar && this.objectManage.bar.disturbStatusTime > 0) {
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
		if (this.statusMng) {
			this.statusMng.printStatus(dynamicCtx);
		}
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

		// オブジェクトの消去とBarの初期化
		if (this.objectManage) {
			this.objectManage.clearEntities();
			this.objectManage.initBar();
		}

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
			if (this.ctrl.stageEnded === 0 && this.objectManage) {
				this.objectManage.loadBlockMap(this.ctrl.stageIndex);
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
		if (this.objectManage) {
			this.objectManage.simulateReset();
		}
	}

	changeSetting(file) {
		if (typeof document === 'undefined') { return; }
		if (this.screenManage) {
			this.screenManage.openScreen('screen_loading');
			this.screenManage.setLoadingMessage('Loading script...');
		}
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
			this.initAsync(0);
		};
	}


}
