// src/StatusManage.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import Heart from "./Heart.js";
import MessageBox from "./MessageBox.js";
import PresetManage from "./PresetManage.js";
import EventBus from "./EventBus.js";

//--------------------------------------------------
// ステータス計測
//--------------------------------------------------
export default class StatusManage
{
	constructor(game = null)
	{
		this.game = game;
		const def = PresetManage.getDefaultPreset();
		const fps = (this.game && this.game.FPS) || def.FPS;

		this.prevFPSTime = 0;													// 前回FPS計測時刻
		this.realFPS = fps;														// 実際のFPS
		this.FPSCount = 0;														// FPS測定用表示回数カウンタ
		this.lowFPSCount = 0;													// 低FPS回数カウンタ
		this.startTime = 0;														// 測定開始時刻
		this.playTime = 0;														// プレイ時間
		this.displayPoint = 0;													// 表示用ポイント
		this.displayPointStep = 1;												// 表示用ポイント増加幅
		this.blockNum = 0;														// 破壊可能ブロック数
		this.life = 0;															// ライフ
		this.hearts = new Array();												// ライフ表示用ハート
		this.statusElements = null;												// ステータス表示用DOM要素キャッシュ
		this.statusCache = {													// 前回描画値キャッシュ（不要なDOM書き換えをスキップ）
			lifeSpaceSize: null,
			score: null,
			hiScore: null,
			stage: null,
			timeMin: null,
			timeSec: null,
			mode: null,
			fps: null,
			balls: null,
		};

		// EventBus経由でライフ・ブロック数変更要求を購読
		this.onAddLifeHandler = (amount = 1) => {
			this.addLife(amount);
		};
		this.onBlockBreakHandler = (count = 1) => {
			if (this.blockNum !== undefined) {
				this.blockNum -= count;
			}
		};

		EventBus.addOnEvent('status:addLife', this.onAddLifeHandler);
		EventBus.addOnEvent('status:blockBreak', this.onBlockBreakHandler);
	}

	destructor()
	{
		if (this.onAddLifeHandler) EventBus.removeOnEvent('status:addLife', this.onAddLifeHandler);
		if (this.onBlockBreakHandler) EventBus.removeOnEvent('status:blockBreak', this.onBlockBreakHandler);
		this.onAddLifeHandler = null;
		this.onBlockBreakHandler = null;

		for (let i = 0; i < this.hearts.length; i++) {
			if (this.hearts[i] && typeof this.hearts[i].destructor === 'function') {
				this.hearts[i].destructor();
			}
		}
		this.hearts = new Array();
		this.statusElements = null;
		this.statusCache = null;
		this.game = null;
	}

	getBalls() {
		return (this.game && this.game.objectManage && this.game.objectManage.balls) || [];
	}

	getCtrl() {
		return (this.game && this.game.ctrl) || null;
	}

	getScoreMng() {
		return (this.game && this.game.scoreMng) || null;
	}

	getBlockMap() {
		return (this.game && this.game.objectManage && this.game.objectManage.blockMap) || [];
	}

	getStaticCtx() {
		return (this.game && this.game.staticCtx) || null;
	}

	applyPreset(preset = null) {
		this.preset = preset || null;
	}

	//--------------------------------------------------
	// 初期化
	//--------------------------------------------------
	init()
	{
		const maxLife = (this.game && this.game.maxLife) || (this.preset && this.preset.maxLife) || PresetManage.getDefaultPreset().maxLife;
		this.hearts = new Array();
		// ハートインスタンスの生成
		for( var i = 0; i < maxLife; i++ )
		{
			this.hearts[i] = new Heart((i * 17 + 36), 9, ( i < this.life ? 1 : 0 ), this.game);
		}
	}

	//--------------------------------------------------
	// FPSの測定
	//--------------------------------------------------
	countFPS()
	{
		const def = PresetManage.getDefaultPreset();
		const fps = (this.game && this.game.FPS) || (this.preset && this.preset.FPS) || def.FPS;
		const lowFPSAlartRatio = (this.game && this.game.lowFPSAlartRatio !== undefined)
			? this.game.lowFPSAlartRatio
			: ((this.preset && this.preset.lowFPSAlartRatio !== undefined) ? this.preset.lowFPSAlartRatio : def.lowFPSAlartRatio);
		const balls = this.getBalls();
		const ctrl = this.getCtrl();

		// 計算
		this.FPSCount++;

		// 一定間隔で計測
		if( Date.now() - this.prevFPSTime >= 40000 / fps ) {
			// 計算
			this.realFPS = ~~(this.FPSCount * 10000 / (Date.now() - this.prevFPSTime)) / 10;

			// 初期化
			this.prevFPSTime = Date.now();
			this.FPSCount = 0;

			// 低FPS警告
			if( lowFPSAlartRatio > 0 && this.realFPS < fps * lowFPSAlartRatio && balls.length > 0 && ctrl && ctrl.pauseSwitch == 0 && ctrl.autoSwitch == 0 )
			{
				// 低FPSのカウント
				this.lowFPSCount++;

				if( this.lowFPSCount > 5 )
				{
					// 一時停止（EventBus経由で通知）
					if (ctrl && ctrl.pauseSwitch == 0) {
						EventBus.emitEvent('control:togglePause');
					}

					// 警告文の表示
					new MessageBox("FPSが低すぎます。<br>FPS: " + String(this.realFPS), false, null);
				}
			} else
			{
				// 低FPSカウントのリセット
				this.lowFPSCount = 0;
			}
		}
	}

	//--------------------------------------------------
	// 実測FPSの取得
	//--------------------------------------------------
	getRealFPS()
	{
		// 整形
		var measuredFPS = String(this.realFPS);
		if( this.realFPS * 10 % 10 == 0 ) { measuredFPS = String(~~(this.realFPS) + '.0'); }

		return measuredFPS;
	}

	//--------------------------------------------------
	// プレイ時間の計測
	//--------------------------------------------------
	countPlayTime()
	{
		const balls = this.getBalls();
		const ctrl = this.getCtrl();
		var ballNum = balls.length;
		if( (this.startTime == 0 && ballNum != 0) || ballNum == 0 || (ctrl && ctrl.pauseSwitch == 1) ) { this.startTime = Date.now() - this.playTime; }
		if( ballNum > 0 ) { this.playTime = Date.now() - this.startTime; }
	}

	//--------------------------------------------------
	// 表示用プレイ時間の秒数を取得
	//--------------------------------------------------
	getPlaySecTime()
	{
		// プレイ時間の秒数の取得
		var playTime = ~~( ((Date.now() - this.startTime) % 60000) / 100 ) / 10;
		var playTimeStr = String(playTime);

		// 表示用に整形
		if( playTime * 10 % 10 == 0 ) { playTimeStr = String(playTimeStr + '.0'); }
		if( playTime < 10 ) { playTimeStr = String('0' + playTimeStr); }

		return playTimeStr;
	}

	//--------------------------------------------------
	// 表示用プレイ時間の分数を取得
	//--------------------------------------------------
	getPlayMinTime()
	{
		var playTime_min = String(~~(( (Date.now() - this.startTime) / 60000 ) % 60));

		return playTime_min;
	}

	//--------------------------------------------------
	// 表示用ポイント数の取得
	//--------------------------------------------------
	getDisplayPoint()
	{
		const scoreMng = this.getScoreMng();
		const targetScore = scoreMng ? scoreMng.score : 0;

		// 滑らかに増加
		if( this.displayPoint + this.displayPointStep < targetScore ) {
			this.displayPoint += this.displayPointStep;
			this.displayPointStep = Math.ceil((targetScore - this.displayPoint) * 0.3);

		// 真値で停止
		} else {
			this.displayPoint = targetScore;
			this.displayPointStep = 1;
		}

		return this.displayPoint;
	}

	//--------------------------------------------------
	// 破壊可能ブロック数の計算
	//--------------------------------------------------
	countBlockNum()
	{
		this.blockNum = 0;
		const blockMap = this.getBlockMap();
		for( var i = 0, len = blockMap.length; i < len; i++ )
		{
			if( blockMap[i] != null )
			{
				for( var j = 0, len2 = blockMap[i].length; j < len2; j++ )
				{
					var block = blockMap[i][j];
					if( block != null )
					{
						if( block.type != 0 && block.infinit != 1 ) { this.blockNum++; }
					}
				}
			}
		}
	}

	//--------------------------------------------------
	// ライフの加算
	//--------------------------------------------------
	addLife(_incr)
	{
		const maxLife = (this.game && this.game.maxLife) || (this.preset && this.preset.maxLife) || PresetManage.getDefaultPreset().maxLife;
		const staticCtx = this.getStaticCtx();

		// ライフの加算
		this.life = Number(this.life) + Number(_incr);

		// 下限・上限を制限
		if( this.life < 0 ) { this.life = 0; }
		if( this.life > maxLife ) { this.life = maxLife; }

		// ハートインスタンスの生成
		this.hearts = new Array();
		for( var i = 0; i < maxLife; i++ )
		{
			this.hearts[i] = new Heart((i * 17 + 36), 9, ( i < this.life ? 1 : 0 ), this.game);
		}

		// 再描画
		if (staticCtx) this.drawLife(staticCtx);
	}

	//--------------------------------------------------
	// ライフの有無（あればtrue、なければfalse）
	//--------------------------------------------------
	isAlive()
	{
		if( this.life > 0 ) { return true; }
		else { return false; }
	}

	//--------------------------------------------------
	// ライフの描画
	//--------------------------------------------------
	drawLife(ctx)
	{
		const maxLife = (this.game && this.game.maxLife) || (this.preset && this.preset.maxLife) || PresetManage.getDefaultPreset().maxLife;
		for(var i = 0; i < maxLife; i++)
		{
			if (this.hearts[i] && typeof this.hearts[i].draw === 'function') {
				this.hearts[i].draw(ctx);
			}
		}
	}

	//--------------------------------------------------
	// ステータス表示用DOM要素の取得・キャッシュ
	//--------------------------------------------------
	getStatusElements() {
		if (typeof document === 'undefined') { return null; }
		if (this.statusElements && this.statusElements.score) {
			return this.statusElements;
		}
		const scoreEl = document.getElementById("status_score");
		if (!scoreEl) { return null; }
		this.statusElements = {
			body: document.getElementById("status_bar_body"),
			score: scoreEl,
			hiScore: document.getElementById("status_hi_score"),
			stage: document.getElementById("status_stage"),
			timeMin: document.getElementById("status_time_min"),
			timeSec: document.getElementById("status_time_sec"),
			mode: document.getElementById("status_mode"),
			fps: document.getElementById("status_fps"),
			balls: document.getElementById("status_balls"),
		};
		return this.statusElements;
	}

	updateStatusElement(el, cacheKey, value) {
		if (!this.statusCache || this.statusCache[cacheKey] === value) {
			return false;
		}
		this.statusCache[cacheKey] = value;
		if (el) {
			el.textContent = value;
		}
		return true;
	}

	//--------------------------------------------------
	// ステータスの表示（差分のみDOM更新）
	//--------------------------------------------------
	printStatus() {
		if (typeof document === 'undefined' || !this.game || !this.game.scoreMng || !this.game.ctrl) { return; }
		const els = this.getStatusElements();
		if (!els || !this.statusCache) { return; }

		const scoreMng = this.getScoreMng();
		const ctrl = this.getCtrl();
		const maxLife = this.game.maxLife || (this.preset && this.preset.maxLife) || PresetManage.getDefaultPreset().maxLife;
		const lifeSpaceSize = maxLife * 17 + 5;

		if (this.statusCache.lifeSpaceSize !== lifeSpaceSize) {
			this.statusCache.lifeSpaceSize = lifeSpaceSize;
			if (els.body && els.body.style) {
				els.body.style.marginLeft = lifeSpaceSize + 'px';
			}
		}

		const displayPoint = String(this.getDisplayPoint());
		const hiScore = String(scoreMng.hiScore);
		const stageTitles = this.game.stageTitle || (this.preset && this.preset.stageTitle) || [];
		const stageTitleStr = String(stageTitles[ctrl.stageIndex] || '');
		const playTimeMin = this.getPlayMinTime();
		const playTimeSec = this.getPlaySecTime();
		const modeStr = ctrl.autoSwitch === 0 ? 'MP' : 'AP';
		const realFPS = this.getRealFPS();
		const ballCount = String(this.getBalls().length);

		this.updateStatusElement(els.score, 'score', displayPoint);
		this.updateStatusElement(els.hiScore, 'hiScore', hiScore);
		this.updateStatusElement(els.stage, 'stage', stageTitleStr);
		this.updateStatusElement(els.timeMin, 'timeMin', playTimeMin);
		this.updateStatusElement(els.timeSec, 'timeSec', playTimeSec);
		this.updateStatusElement(els.mode, 'mode', modeStr);
		this.updateStatusElement(els.fps, 'fps', realFPS);
		this.updateStatusElement(els.balls, 'balls', ballCount);
	}
}
