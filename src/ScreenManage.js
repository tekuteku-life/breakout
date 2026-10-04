// src/ScreenManage.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import StartScreenControl from "./screens/StartScreenControl.js";
import SettingScreenControl from "./screens/SettingScreenControl.js";
import RecordScreenControl from "./screens/RecordScreenControl.js";
import StageClearScreenControl from "./screens/StageClearScreenControl.js";
import AllClearScreenControl from "./screens/AllClearScreenControl.js";
import GameOverScreenControl from "./screens/GameOverScreenControl.js";
import AboutScreenControl from "./screens/AboutScreenControl.js";
import ScreenControl from "./screens/ScreenControl.js";
import { DEFAULT_CONFIG } from "./const.js";

export default class ScreenManage {
	constructor(game = null) {
		this.game = game;
		this.screenData = new Array();
		this.controllers = new Map();

		// デフォルトコントローラーの初期登録
		this.registerController('screen_start', new StartScreenControl(this, 'screen_start'));
		this.registerController('screen_setting', new SettingScreenControl(this, 'screen_setting'));
		this.registerController('screen_record', new RecordScreenControl(this, 'screen_record'));
		this.registerController('screen_stageClear', new StageClearScreenControl(this, 'screen_stageClear'));
		this.registerController('screen_allClear', new AllClearScreenControl(this, 'screen_allClear'));
		this.registerController('screen_gameOver', new GameOverScreenControl(this, 'screen_gameOver'));
		this.registerController('screen_about', new AboutScreenControl(this, 'screen_about'));
	}

	destructor() {
		for (const ctrl of this.controllers.values()) {
			if (ctrl && typeof ctrl.destructor === 'function') {
				ctrl.destructor();
			}
		}
		this.controllers.clear();
		this.screenData = new Array();
		this.game = null;
	}

	registerController(screenId, controller) {
		this.controllers.set(screenId, controller);
	}

	getController(screenId) {
		return this.controllers.get(screenId) || null;
	}

	//----------------------------------------
	// 画面を開く
	//----------------------------------------
	openScreen(screenName) {
		if (typeof document === 'undefined') return;
		const screen = document.getElementById(screenName);
		if (screen) {
			const dynamicCanvas = (this.game && this.game.dynamicCanvas) || (typeof document !== 'undefined' ? document.getElementById('dynamic') : null);
			const canvasWidth = (this.game && this.game.canvasWidth) || DEFAULT_CONFIG.canvasWidth;
			const canvasHeight = (this.game && this.game.canvasHeight) || DEFAULT_CONFIG.canvasHeight;

			screen.style.display = 'block';
			if (dynamicCanvas) {
				screen.style.top = dynamicCanvas.offsetTop + 'px';
				screen.style.left = dynamicCanvas.offsetLeft + 'px';
			}
			screen.style.width = canvasWidth + 'px';
			screen.style.height = canvasHeight + 'px';
			screen.style.zIndex = 100;

			const ctrl = this.getController(screenName);
			if (ctrl && typeof ctrl.onOpen === 'function') {
				ctrl.onOpen();
			}
		} else {
			if (typeof alert === 'function') {
				alert("Not Found Screen");
			}
		}
	}

	//----------------------------------------
	// 画面を閉じる
	//----------------------------------------
	closeScreen(screenName) {
		if (typeof document === 'undefined') return;
		const screen = document.getElementById(screenName);
		if (screen) {
			screen.style.display = 'none';
			screen.style.zIndex = 0;

			const ctrl = this.getController(screenName);
			if (ctrl && typeof ctrl.onClose === 'function') {
				ctrl.onClose();
			}
		} else {
			if (typeof alert === 'function') {
				alert("Not Found Screen");
			}
		}
	}

	//----------------------------------------
	// 画面を開閉（トグルタイプ）
	//----------------------------------------
	toggleScreen(screenName) {
		if (typeof document === 'undefined') return;
		const screen = document.getElementById(screenName);
		if (screen != null) {
			if (screen.style.display !== 'block') {
				this.openScreen(screenName);
			} else {
				this.closeScreen(screenName);
			}
		} else {
			if (typeof alert === 'function') {
				alert("Not Found Screen");
			}
		}
	}

	//----------------------------------------
	// 画面内容の保存
	//----------------------------------------
	saveScreenData(screenName) {
		if (typeof document === 'undefined') return;
		const screen = document.getElementById(screenName);
		if (screen != null) {
			this.screenData[screenName] = screen.innerHTML;
		} else {
			this.screenData[screenName] = null;
		}
	}

	//----------------------------------------
	// 画面内容の取得
	//----------------------------------------
	getScreenData(screenName) {
		if (this.screenData[screenName] != null && this.screenData[screenName] !== undefined) {
			return this.screenData[screenName];
		}
		if (typeof document !== 'undefined') {
			const screen = document.getElementById(screenName);
			if (screen != null) {
				this.screenData[screenName] = screen.innerHTML;
				return this.screenData[screenName];
			}
		}
		return undefined;
	}

	//----------------------------------------
	// 画面内容の置き換え
	//----------------------------------------
	replaceScreenData(screenName, data) {
		if (typeof document === 'undefined') return;
		const screen = document.getElementById(screenName);
		if (screen != null) {
			screen.innerHTML = data;
		}
	}

	//----------------------------------------
	// 全て閉じる
	//----------------------------------------
	allClose() {
		if (typeof document === 'undefined') return;
		const stock = document.getElementById('screenStock');
		if (!stock) return;
		const screens = stock.getElementsByTagName('div');
		for (let i = 0, len = screens.length; i < len; i++) {
			const screen = screens[i];
			if (String(screen.id).indexOf('screen_') >= 0) {
				screen.style.display = 'none';
			}
		}
	}

	// コントローラーへの委譲メソッド群
	showGameOver(stats) {
		const ctrl = this.getController('screen_gameOver');
		if (ctrl) ctrl.render(stats);
		this.openScreen('screen_gameOver');
	}

	showStageClear(stats) {
		const ctrl = this.getController('screen_stageClear');
		if (ctrl) ctrl.render(stats);
		this.openScreen('screen_stageClear');
	}

	showAllClear(stats) {
		const ctrl = this.getController('screen_allClear');
		if (ctrl) ctrl.render(stats);
		this.openScreen('screen_allClear');
	}

	showRecord(recordType, recordStage) {
		const ctrl = this.getController('screen_record');
		if (ctrl) ctrl.render(recordType, recordStage);
	}

	printRecordScreen(recordType = null, recordStage = null) {
		const ctrl = this.getController('screen_record');
		if (ctrl && typeof ctrl.printRecordScreen === 'function') {
			ctrl.printRecordScreen(recordType, recordStage);
		}
	}

	checkVersion() {
		const ctrl = this.getController('screen_about');
		if (ctrl && typeof ctrl.versionCheck === 'function') {
			ctrl.versionCheck();
		}
	}

	setupButtonSounds() {
		const ctrl = this.getController('screen_start');
		if (ctrl && typeof ctrl.setupButtonSounds === 'function') {
			ctrl.setupButtonSounds();
		}
	}
}


