// src/StatusManage.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import Heart from "./Heart.js";
import MessageBox from "./MessageBox.js";
import { DEFAULT_CONFIG } from "./const.js";

//--------------------------------------------------
// ステータス計測
//--------------------------------------------------
export default class StatusManage
{
	constructor(game = null)
	{
		this.game = game;
		const fps = (this.game && this.game.FPS) || DEFAULT_CONFIG.FPS;

		this.prevFPSTime = 0;													// 前回FPS計測時刻
		this.realFPS = fps;														// 実際のFPS
		this.FPSCount = 0;														// FPS測定用表示回数カウンタ
		this.lowFPSCount = 0;													// 低FPS回数カウンタ
		this.startTime = 0;														// 測定開始時刻
		this.playTime = 0;														// プレイ時間
		this.displayPoint = 0;													// 表示用ポイント
		this.displayPointStep = 1;												// 表示用ポイント増加幅
		this.hiScore = 0;														// ハイスコア
		this.blockNum = 0;														// 破壊可能ブロック数
		this.life = 0;															// ライフ
		this.hearts = new Array();												// ライフ表示用ハート
	}

	destructor()
	{
		for (let i = 0; i < this.hearts.length; i++) {
			if (this.hearts[i] && typeof this.hearts[i].destructor === 'function') {
				this.hearts[i].destructor();
			}
		}
		this.hearts = new Array();
		this.game = null;
	}

	getGame() {
		return this.game || null;
	}

	getEventBus() {
		return (this.game && this.game.eventBus) || null;
	}

	getBalls() {
		return (this.game && this.game.balls) || [];
	}

	getCtrl() {
		return (this.game && this.game.ctrl) || null;
	}

	getScoreMng() {
		return (this.game && this.game.scoreMng) || null;
	}

	getBlockMap() {
		return (this.game && this.game.blockMap) || [];
	}

	getStaticCtx() {
		return (this.game && this.game.staticCtx) || null;
	}


	//--------------------------------------------------
	// 初期化
	//--------------------------------------------------
	init()
	{
		const maxLife = (this.game && this.game.maxLife) || DEFAULT_CONFIG.maxLife;
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
		const fps = (this.game && this.game.FPS) || DEFAULT_CONFIG.FPS;
		const lowFPSAlartRatio = (this.game && this.game.lowFPSAlartRatio !== undefined) ? this.game.lowFPSAlartRatio : DEFAULT_CONFIG.lowFPSAlartRatio;
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
					const bus = this.getEventBus();
					if (bus && ctrl && ctrl.pauseSwitch == 0) {
						bus.emitEvent('control:togglePause');
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
		const maxLife = (this.game && this.game.maxLife) || DEFAULT_CONFIG.maxLife;
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
		const maxLife = (this.game && this.game.maxLife) || DEFAULT_CONFIG.maxLife;
		for(var i = 0; i < maxLife; i++)
		{
			if (this.hearts[i] && typeof this.hearts[i].draw === 'function') {
				this.hearts[i].draw(ctx);
			}
		}
	}

	//--------------------------------------------------
	// ステータスの表示
	//--------------------------------------------------
	printStatus(dynamicCtx) {
		if (typeof document === 'undefined' || !this.game || !this.game.scoreMng || !this.game.ctrl) { return; }
		const playInfo = document.getElementById("play_info");
		if (!playInfo) { return; }

		const scoreMng = this.getScoreMng();
		const ctrl = this.getCtrl();
		const displayPoint = this.getDisplayPoint();
		const playTime = this.getPlaySecTime();
		const playTime_min = this.getPlayMinTime();
		const stageTitles = this.stageTitle || [];
		const stageTitleStr = stageTitles[ctrl.stageIndex] || '';

		let text = '/ Score:' + displayPoint + ' / Hi-Score:' + String(scoreMng.hiScore);
		text += ' / Stage:' + stageTitleStr + ' / Time:' + playTime_min + '\'' + playTime + ' / Mode:' + (ctrl.autoSwitch === 0 ? 'MP' : 'AP');
		text += '<span style="font-size: 0.8em; margin-left: 3em;">' + this.getRealFPS() + 'fps / ' + String(this.game.balls.length) + '</span>';

		const maxLife = this.game.maxLife || DEFAULT_CONFIG.maxLife;
		const lifeSpaceSize = maxLife * 17 + 5;

		playInfo.innerHTML = 'Life' + '<span style="margin-left: ' + lifeSpaceSize + 'px;">' + text + '</span>';
	}
}

