// src/Control.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import { DEFAULT_CONFIG } from "./const.js";

//--------------------------------------------------
// ゲーム制御
//--------------------------------------------------
export default class Control
{
	constructor(game = null)
	{
		this.game = game;
		this.autoSwitch = 0;							// 自動プレイスイッチ
		this.pauseSwitch = 0;							// 一時停止スイッチ
		this.soundSwitch = 0;							// 音のスイッチ
		this.sizeFitSwitch = 0;							// 画面調整のスイッチ
		this.continueSwitch = 0;						// ゲーム開始方法スイッチ
		this.ctrlSwitch = 0;							// 操作方法スイッチ
		this.stageIndex = 0;							// ステージインデックス
		this.stageEnded = 0;							// 全ステージ終了フラグ
		this.formSelector = new Array();				// 設定用セレクタ
		this.scale = 1;									// 倍率

		// 設定欄のオブジェクトの取得
		if (typeof document !== 'undefined') {
			this.formSelector["setting"] = document.getElementById('setup_select');
			this.formSelector["stage"] = document.getElementById('stage_select');
			this.formSelector["continue"] = document.getElementById('continue_select');
			this.formSelector["sound"] = document.getElementById('sound_select');
			this.formSelector["sizefit"] = document.getElementById('sizefit_select');
			this.formSelector["ctrl"] = document.getElementById('ctrl_select');
		}
	}

	destructor()
	{
		if (this.formSelector) {
			for (const key of Object.keys(this.formSelector)) {
				this.formSelector[key] = null;
			}
		}
		this.formSelector = null;
		this.game = null;
	}

	getGame() {
		return this.game || null;
	}

	getEventBus() {
		return (this.game && this.game.eventBus) || null;
	}

	getStorage() {
		return (this.game && this.game.storage) || null;
	}

	getBlockMapSet() {
		return (this.game && this.game.blockMapSet) || [];
	}

	getDefaultLife() {
		const g = this.getGame();
		return (g && g.defaultLife) || DEFAULT_CONFIG.defaultLife;
	}

	getCanvasWidth() {
		const g = this.getGame();
		return (g && g.canvasWidth) || DEFAULT_CONFIG.canvasWidth;
	}

	getCanvasHeight() {
		const g = this.getGame();
		return (g && g.canvasHeight) || DEFAULT_CONFIG.canvasHeight;
	}


	//--------------------------------------------------
	// 音の設定の読み書き
	//--------------------------------------------------
	loadSoundSwitch()
	{
		const storage = this.getStorage();
		if( storage && storage.getItem("setting_soundSwitch") != null ) { this.soundSwitch = storage.getItem("setting_soundSwitch"); }
	}
	recordSoundSwitch()
	{
		const storage = this.getStorage();
		if( storage ) { storage.setItem("setting_soundSwitch", this.soundSwitch); }
	}


	//--------------------------------------------------
	// サイズ調整の設定の読み書き
	//--------------------------------------------------
	loadSizeFitSwitch()
	{
		const storage = this.getStorage();
		if( storage && storage.getItem("setting_sizeFitSwitch") != null ) { this.sizeFitSwitch = storage.getItem("setting_sizeFitSwitch"); }
	}
	recordSizeFitSwitch()
	{
		const storage = this.getStorage();
		if( storage ) { storage.setItem("setting_sizeFitSwitch", this.sizeFitSwitch); }
	}


	//--------------------------------------------------
	// ゲーム開始方法の設定の読み書き
	//--------------------------------------------------
	loadContinueSwitch()
	{
		const storage = this.getStorage();
		if( storage && storage.getItem("setting_continueSwitch") != null ) { this.continueSwitch = storage.getItem("setting_continueSwitch"); }
	}
	recordContinueSwitch()
	{
		const storage = this.getStorage();
		if( storage ) { storage.setItem("setting_continueSwitch", this.continueSwitch); }
	}


	//--------------------------------------------------
	// 操作方法の設定の読み書き
	//--------------------------------------------------
	loadCtrlSwitch()
	{
		const storage = this.getStorage();
		if( storage && storage.getItem("setting_ctrlSwitch") != null ) { this.ctrlSwitch = storage.getItem("setting_ctrlSwitch"); }
	}
	recordCtrlSwitch()
	{
		const storage = this.getStorage();
		if( storage ) { storage.setItem("setting_ctrlSwitch", this.ctrlSwitch); }
	}


	//--------------------------------------------------
	// ステージインデックスの設定の読み書き
	//--------------------------------------------------
	loadStageIndex()
	{
		const storage = this.getStorage();
		if( storage && storage.getItem("continue_stageIndex") != null && this.continueSwitch == 1 ) { this.setStageIndex(storage.getItem("continue_stageIndex")); }
	}
	recordStageIndex()
	{
		const storage = this.getStorage();
		if( storage ) { storage.setItem("continue_stageIndex", this.stageIndex); }
	}


	//--------------------------------------------------
	// 自動プレイのトグル
	//--------------------------------------------------
	autoSwitchToggle()
	{
		if( this.autoSwitch == 0 ) { this.autoSwitch = 1; }
		else { this.autoSwitch = 0; }
	}


	//--------------------------------------------------
	// 一時停止のオン・オフ・トグル
	//--------------------------------------------------
	pauseSwitchOn()
	{
		// 画面の切り替え（EventBus経由で通知）
		const bus = this.getEventBus();
		if (bus) {
			bus.emitEvent('screen:allClose');
			bus.emitEvent('screen:open', 'screen_pause');
		}

		// 値の設定
		this.pauseSwitch = 1;
	}
	pauseSwitchOff()
	{
		// 画面の切り替え（EventBus経由で通知）
		const bus = this.getEventBus();
		if (bus) {
			bus.emitEvent('screen:close', 'screen_pause');
		}

		this.pauseSwitch = 0;
	}
	pauseSwitchToggle()
	{
		if( this.pauseSwitch == 0 ) { this.pauseSwitchOn(); }
		else { this.pauseSwitchOff(); }
	}


	//--------------------------------------------------
	// 音の設定のトグル
	//--------------------------------------------------
	soundSwitchToggle()
	{
		const sel = this.formSelector && this.formSelector["sound"];
		// オン
		if( this.soundSwitch == 0 )
		{
			// 値の設定
			this.soundSwitch = 1;

			// セレクタの変更
			if (sel && sel.childNodes && sel.childNodes.length > 1) {
				sel.childNodes[0].selected = '';
				sel.childNodes[1].selected = 'selected';
			}

		// オフ
		} else
		{
			// 値の設定
			this.soundSwitch = 0;

			// セレクタの変更
			if (sel && sel.childNodes && sel.childNodes.length > 1) {
				sel.childNodes[0].selected = 'selected';
				sel.childNodes[1].selected = '';
			}
		}

		// 設定の記録
		this.recordSoundSwitch();
	}


	//--------------------------------------------------
	// 画面調整設定のトグル
	//--------------------------------------------------
	sizefitSwitchToggle()
	{
		const sel = this.formSelector && this.formSelector["sizefit"];
		// オン
		if( this.sizeFitSwitch == 0 )
		{
			// 値の設定
			this.sizeFitSwitch = 1;

			// セレクタの変更
			if( sel && sel.childNodes && sel.childNodes.length > 1 )
			{
				sel.childNodes[0].selected = '';
				sel.childNodes[1].selected = 'selected';
			}

		// オフ
		} else
		{
			// 値の設定
			this.sizeFitSwitch = 0;

			// セレクタの変更
			if( sel && sel.childNodes && sel.childNodes.length > 1 )
			{
				sel.childNodes[0].selected = 'selected';
				sel.childNodes[1].selected = '';
			}
		}

		// 設定の記録
		this.recordSizeFitSwitch();

		// サイズ調整
		this.fixSize();
	}


	//--------------------------------------------------
	// 制御方法の設定のトグル
	//--------------------------------------------------
	ctrlSwitchToggle()
	{
		const sel = this.formSelector && this.formSelector["ctrl"];
		// キーボード制御へ
		if( this.ctrlSwitch == 0 )
		{
			// 値の設定
			this.ctrlSwitch = 1;

			// セレクタの変更
			if (sel && sel.childNodes && sel.childNodes.length > 1) {
				sel.childNodes[0].selected = '';
				sel.childNodes[1].selected = 'selected';
			}

		// マウス制御へ
		} else
		{
			// 値の設定
			this.ctrlSwitch = 0;

			// セレクタの変更
			if (sel && sel.childNodes && sel.childNodes.length > 1) {
				sel.childNodes[0].selected = 'selected';
				sel.childNodes[1].selected = '';
			}
		}

		// 設定の記録
		this.recordCtrlSwitch();
	}


	//--------------------------------------------------
	// ステージインデックスの設定
	//--------------------------------------------------
	setStageIndex(_stage)
	{
		const blockMapSet = this.getBlockMapSet();
		const sel = this.formSelector && this.formSelector["stage"];

		// ステージセレクタのリセット
		if( sel && sel.childNodes && sel.childNodes.length > this.stageIndex && sel.childNodes[this.stageIndex] ) {
			sel.childNodes[this.stageIndex].selected = '';
		}

		// 値の設定
		this.stageIndex = _stage;

		// ステージインデックスの制限
		if( 0 > this.stageIndex ) { this.stageIndex = 0; }
		else if( blockMapSet.length > 0 && this.stageIndex >= blockMapSet.length )
		{
			this.stageIndex = 0;
		}

		// ステージセレクタのセット
		if( sel && sel.childNodes && sel.childNodes.length > this.stageIndex && sel.childNodes[this.stageIndex] ) {
			sel.childNodes[this.stageIndex].selected = 'selected';
		}
	}


	//--------------------------------------------------
	// ステージインデックスを進める
	//--------------------------------------------------
	forwardStageIndex()
	{
		const blockMapSet = this.getBlockMapSet();
		const storage = this.getStorage();
		const defLife = this.getDefaultLife();
		const sel = this.formSelector && this.formSelector["stage"];

		// ステージセレクタのリセット
		if( sel && sel.childNodes && sel.childNodes.length > this.stageIndex && sel.childNodes[this.stageIndex] ) {
			sel.childNodes[this.stageIndex].selected = '';
		}

		// 値の設定
		this.stageIndex++;

		// ステージインデックスの制限
		if( 0 > this.stageIndex ) { this.stageIndex = 0; }
		else if( blockMapSet.length > 0 && this.stageIndex >= blockMapSet.length )
		{
			this.stageIndex = 0;
			this.stageEnded = 1;
		}

		// ステージセレクタのセット
		if( sel && sel.childNodes && sel.childNodes.length > this.stageIndex && sel.childNodes[this.stageIndex] ) {
			sel.childNodes[this.stageIndex].selected = 'selected';
		}

		// 継続情報のクリア
		if( storage != null )
		{
			storage.setItem("continue_life", defLife);
			storage.setItem("continue_time", 0);
			storage.setItem("continue_score", 0);
		}
	}


	//--------------------------------------------------
	// ステージインデックスを戻す
	//--------------------------------------------------
	backwardStageIndex()
	{
		const blockMapSet = this.getBlockMapSet();
		const storage = this.getStorage();
		const defLife = this.getDefaultLife();
		const sel = this.formSelector && this.formSelector["stage"];

		// ステージセレクタのリセット
		if( sel && sel.childNodes && sel.childNodes.length > this.stageIndex && sel.childNodes[this.stageIndex] ) {
			sel.childNodes[this.stageIndex].selected = '';
		}

		// 値の設定
		this.stageIndex--;

		// ステージインデックスの制限
		if( 0 > this.stageIndex ) { this.stageIndex = 0; }
		else if( blockMapSet.length > 0 && this.stageIndex >= blockMapSet.length )
		{
			this.stageIndex = 0;
			this.stageEnded = 1;
		}

		// ステージセレクタのセット
		if( sel && sel.childNodes && sel.childNodes.length > this.stageIndex && sel.childNodes[this.stageIndex] ) {
			sel.childNodes[this.stageIndex].selected = 'selected';
		}

		// 継続情報のクリア
		if( storage != null )
		{
			storage.setItem("continue_life", defLife);
			storage.setItem("continue_time", 0);
			storage.setItem("continue_score", 0);
		}
	}


	//--------------------------------------------------
	// 画面サイズの調整
	//--------------------------------------------------
	fixSize()
	{
		if (typeof document === 'undefined') return;
		const canvasWidth = this.getCanvasWidth();
		const canvasHeight = this.getCanvasHeight();

		// 画面サイズの取得
		let screenWidth = 0;
		let screenHeight = 0;
		if (typeof window !== 'undefined') {
			screenWidth = window.innerWidth;
			screenHeight = window.innerHeight;
		}

		// 倍率の計算
		var horizontalRatio = screenWidth / canvasWidth;
		var verticalRatio = screenHeight / canvasHeight;

		// 倍率の選択
		if( horizontalRatio < verticalRatio ) { this.scale = horizontalRatio; }
		else { this.scale = verticalRatio; }
		this.scale *= 0.98;

		// オフの場合は何もしない
		if( this.sizeFitSwitch == 0 ) { this.scale = 1; }

		// 適用
		const bodyEls = document.getElementsByTagName('body');
		if (bodyEls && bodyEls[0]) {
			var bodyObjStyle = bodyEls[0].style;
			var transform = "scale(" + this.scale + ", " + this.scale + ")";
			var transformOrigin = "top left";
			bodyObjStyle.transform = transform;
			bodyObjStyle.webkitTransform = transform;
			bodyObjStyle.MozTransform = transform;
			bodyObjStyle.msTransform = transform;
			bodyObjStyle.OTransform = transform;

			bodyObjStyle.transformOrigin = transformOrigin;
			bodyObjStyle.webkitTransformOrigin = transformOrigin;
			bodyObjStyle.MozTransformOrigin = transformOrigin;
			bodyObjStyle.msTransformOrigin = transformOrigin;
			bodyObjStyle.OTransformOrigin = transformOrigin;
		}
	}
}

