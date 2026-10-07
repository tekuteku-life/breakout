// src/ScoreManage.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import MessageBox from "./MessageBox.js";
import {
	BALL_STATUS,
	AWARD_KEY_LIST,
} from "./const.js";
import EventBus from "./EventBus.js";

//--------------------------------------------------
// 得点管理
//--------------------------------------------------
export default class ScoreManage
{
	constructor(game = null)
	{
		this.game = game;
		this.awardNum = new Array();						// アワードポイント
		this.awardPt = new Array();							// アワードカウント

		this.sumPrevClearTime = 0;							// 前ステージまでのクリア時間の総計
		this.sumPrevScore = 0;								// 前ステージまでの総合スコア
		this.hiScore = 0;									// ハイスコア
		this.stageScore = 0;								// ステージ毎の総合スコア
		this.score = 0;										// 総合スコア

		// ハイスコアの取得
		const storage = this.getStorage();
		if( storage != null && storage.getItem("record_hiScore") != null ) {
			this.hiScore = storage.getItem("record_hiScore");
		}

		// EventBus経由でスコア・アワード追加要求を購読
		this.onScoreAddHandler = (point) => {
			this.score = (this.score || 0) + Number(point || 0);
		};
		this.onAwardAddHandler = (data) => {
			if (!this.awardNum || !data) { return; }
			const key = typeof data === 'string' ? data : data.key;
			const count = (typeof data === 'object' && data.count != null) ? data.count : 1;
			if (this.awardNum[key] !== undefined) {
				this.awardNum[key] += count;
			}
		};
		this.onContinuousBreakHandler = (data) => {
			if (!this.awardNum || !data) { return; }
			const currentMax = this.awardNum.continuousBreakNum || 0;
			if (data.breakNum > currentMax) {
				this.awardNum.continuousBreakNum = data.breakNum;
				const balloonData = {
					text: data.breakNum,
					x: data.x,
					y: data.y,
					width: 25,
					height: 10,
					alpha: 0.13,
					fontSize: 12,
				};
				if (data.backColor !== undefined) balloonData.backColor = data.backColor;
				if (data.fontColor !== undefined) balloonData.fontColor = data.fontColor;
				EventBus.emitEvent('balloon:spawn', balloonData);
			}
		};

		EventBus.addOnEvent('score:add', this.onScoreAddHandler);
		EventBus.addOnEvent('award:add', this.onAwardAddHandler);
		EventBus.addOnEvent('award:continuousBreak', this.onContinuousBreakHandler);
	}

	destructor()
	{
		if (this.onScoreAddHandler) EventBus.removeOnEvent('score:add', this.onScoreAddHandler);
		if (this.onAwardAddHandler) EventBus.removeOnEvent('award:add', this.onAwardAddHandler);
		if (this.onContinuousBreakHandler) EventBus.removeOnEvent('award:continuousBreak', this.onContinuousBreakHandler);
		this.onScoreAddHandler = null;
		this.onAwardAddHandler = null;
		this.onContinuousBreakHandler = null;

		this.awardNum = new Array();
		this.awardPt = new Array();
		this.game = null;
	}

	getStorage() {
		return (this.game && this.game.storage) || null;
	}

	getStatusMng() {
		return (this.game && this.game.statusMng) || null;
	}

	getCtrl() {
		return (this.game && this.game.ctrl) || null;
	}

	getBalls() {
		return (this.game && this.game.objectManage && this.game.objectManage.balls) || [];
	}


	//--------------------------------------------------
	// 得点の集計
	//--------------------------------------------------
	calculateAwardPoint()
	{
		const statusMng = this.getStatusMng();
		const ctrl = this.getCtrl();
		const balls = this.getBalls();
		const stageIdx = ctrl ? ctrl.stageIndex : 0;

		const pointPerLife = (this.game && this.game.pointPerLife) || [];
		const pointPerBall = (this.game && this.game.pointPerBall) || [];
		const strongBallClear = (this.game && this.game.strongBallClear) || [];
		const pointPerContBreak = (this.game && this.game.pointPerContBreak) || [];
		const clearTimeThreashould = (this.game && this.game.clearTimeThreashould) || [];
		const pointPerClearTime = (this.game && this.game.pointPerClearTime) || [];
		const pointPerGetItem = (this.game && this.game.pointPerGetItem) || [];
		const pointPerFallBall = (this.game && this.game.pointPerFallBall) || [];

		// 残りライフ数
		if( statusMng && typeof statusMng.isAlive === 'function' ? statusMng.isAlive() && statusMng.life > 1 : (statusMng && statusMng.life > 1) )
		{
			const ptLife = pointPerLife[stageIdx] !== undefined ? pointPerLife[stageIdx] : 50;
			this.awardNum.remainderLife = statusMng.life;
			this.awardPt.remainderLife = ptLife * statusMng.life;
			this.score += this.awardPt.remainderLife;
		} else {
			this.awardNum.remainderLife = 0;
			this.awardPt.remainderLife = 0;
		}

		// ボール個数
		var ballNum = balls.length;
		if( ballNum > 1 )
		{
			const ptBall = pointPerBall[stageIdx] !== undefined ? pointPerBall[stageIdx] : 100;
			this.awardNum.ballNum = ballNum;
			this.awardPt.ballNum = (ballNum - 1) * ptBall;
			this.score += this.awardPt.ballNum;
		}

		// 強化・無敵球でのクリア
		for( var i = 0; i < ballNum; i++ )
		{
			if( balls[i].status != BALL_STATUS.NORMAL )
			{
				const ptStrong = strongBallClear[stageIdx] !== undefined ? strongBallClear[stageIdx] : 100;
				this.awardNum.strengClear++;
				this.awardPt.strengClear = ptStrong;
				this.score += this.awardPt.strengClear;
				break;
			}
		}

		// 連続破壊数
		const ptContBreak = pointPerContBreak[stageIdx] !== undefined ? pointPerContBreak[stageIdx] : 10;
		this.awardPt.continuousBreakNum = (this.awardNum.continuousBreakNum || 0) * ptContBreak;
		this.score += this.awardPt.continuousBreakNum;

		// 連続破壊クリア
		for( var i = 0; i < ballNum; i++ )
		{
			var ball = balls[i];
			if( ball.breakNum > (this.awardNum.continuousBreakClear || 0) )
			{
				this.awardNum.continuousBreakClear = ball.breakNum;
			}
		}
		this.awardPt.continuousBreakClear = (this.awardNum.continuousBreakClear || 0) * ptContBreak * 3;
		this.score += this.awardPt.continuousBreakClear;

		// クリア時間
		const isAlive = statusMng ? (typeof statusMng.isAlive === 'function' ? statusMng.isAlive() : statusMng.life > 0) : false;
		if( isAlive )
		{
			var playTime = statusMng.getPlaySecTime();
			var playTime_min = statusMng.getPlayMinTime();

			// 前ステージまでのクリア時間の総計との差分から算出
			this.awardNum.clearTime = Number(Number(playTime_min * 60) + Number(playTime)) - this.sumPrevClearTime;
			this.sumPrevClearTime += this.awardNum.clearTime;

			// クリア時間の整形
			this.awardNum.clearTime = ~~(this.awardNum.clearTime * 100) / 100;

			// ポイントの算出
			const thresh = clearTimeThreashould[stageIdx] !== undefined ? clearTimeThreashould[stageIdx] : 90;
			const ptTime = pointPerClearTime[stageIdx] !== undefined ? pointPerClearTime[stageIdx] : 8;
			this.awardPt.clearTime = ~~((thresh - this.awardNum.clearTime) * ptTime);
			if( this.awardPt.clearTime > 0 ) {
				this.score += this.awardPt.clearTime;
			} else {
				this.awardPt.clearTime = 0;
			}
		} else {
			this.awardPt.clearTime = 0;
		}

		// アイテム取得数
		const ptGetItem = pointPerGetItem[stageIdx] !== undefined ? pointPerGetItem[stageIdx] : 5;
		this.awardPt.getItemNum = (this.awardNum.getItemNum || 0) * ptGetItem;
		this.score += this.awardPt.getItemNum;

		// 球の落下回数
		const ptFallBall = pointPerFallBall[stageIdx] !== undefined ? pointPerFallBall[stageIdx] : 30;
		this.awardPt.fallBallNum = (this.awardNum.fallBallNum || 0) * -ptFallBall;
		this.score += this.awardPt.fallBallNum;

		// ステージスコアを正数に制限
		if( this.sumPrevScore > this.score )
		{
			// ステージ毎のスコア
			this.stageScore = 0;

			// スコアの巻き戻し
			this.score = this.sumPrevScore;
		} else
		{
			// ステージ毎のスコア
			this.stageScore = this.score - this.sumPrevScore;

			// 前ステージスコアの更新
			this.sumPrevScore = this.score;
		}
	}


	//--------------------------------------------------
	// データの初期化
	//--------------------------------------------------
	init()
	{
		const storage = this.getStorage();
		// 変数の初期化
		for( var i = 0, len = AWARD_KEY_LIST.length; i < len; i++ ) {
			var key = AWARD_KEY_LIST[i];
			this.awardNum[key] = 0;
			this.awardPt[key] = 0;
		}

		// ハイスコアの取得
		if( storage != null && storage.getItem("record_hiScore") != null ) {
			this.hiScore = storage.getItem("record_hiScore");
		}
	}


	//--------------------------------------------------
	// 成績の記録
	//--------------------------------------------------
	recordScore(_clearNum)
	{
		const storage = this.getStorage();
		const ctrl = this.getCtrl();
		if( storage == null || !ctrl ) { return; }

		const stageTitles = (this.game && this.game.stageTitle) || [];
		// 記録用のステージ名を作成
		var stageName = String(stageTitles[ctrl.stageIndex] || ('Stage_' + ctrl.stageIndex));
		stageName = stageName.replace(/_/g, '__');

		//----------アワード以外の記録を保存----------
		// プレイ回数
		var playNumKey = "record_" + stageName + "_playNum";
		var playNum = storage.getItem(playNumKey);
		if( playNum == null ) { playNum = 0; }
		playNum++;
		storage.setItem(playNumKey, playNum);

		// クリア回数
		var clearNumKey = "record_" + stageName + "_clearNum";
		var clearNum = storage.getItem(clearNumKey);
		if( clearNum == null ) { clearNum = 0; }
		clearNum = Number(clearNum) + Number(_clearNum);
		storage.setItem(clearNumKey, clearNum);

		// ステージスコア
		var bestStageScoreKey = "record_best_" + stageName + "_stageScore";
		var aveStageScoreKey = "record_ave_" + stageName + "_stageScore";
		var worstStageScoreKey = "record_worst_" + stageName + "_stageScore";
		var bestOldStageScore = storage.getItem(bestStageScoreKey);
		var aveOldStageScore = storage.getItem(aveStageScoreKey);
		var worstOldStageScore = storage.getItem(worstStageScoreKey);
		if( bestOldStageScore == null || this.stageScore > bestOldStageScore ) {
			// ベストスコア
			storage.setItem(bestStageScoreKey, this.stageScore);
		}
		if( worstOldStageScore == null || this.stageScore < worstOldStageScore ) {
			// ワーストスコア
			storage.setItem(worstStageScoreKey, this.stageScore);
		}
		// 平均スコア
		storage.setItem(aveStageScoreKey, ~~(((playNum - 1) * aveOldStageScore + this.stageScore) / playNum * 100)/100);
		//----------アワード以外の記録を保存----------


		// アワードの種類ごとに保存
		for( var i = 0, len = AWARD_KEY_LIST.length; i < len; i++ ) {
			var recordName = AWARD_KEY_LIST[i];
			var awardKey = recordName;

			// アワード名から記録用keyの作成
			recordName.replace(/_/g, '__');
			var bestRecordKey = "record_best_" + stageName + "_" + recordName;
			var aveRecordKey = "record_ave_" + stageName + "_" + recordName;
			var worstRecordKey = "record_worst_" + stageName + "_" + recordName;

			// 新旧データの取得
			var newRecord = this.awardNum[awardKey];
			var bestOldRecord = storage.getItem(bestRecordKey);
			var aveOldRecord = storage.getItem(aveRecordKey);
			var worstOldRecord = storage.getItem(worstRecordKey);

			// ベストスコアの書き込み
			if( bestOldRecord == null
				|| ((awardKey == 'clearTime' || awardKey == 'fallBallNum') && bestOldRecord > newRecord)
				|| ((awardKey != 'clearTime' && awardKey != 'fallBallNum') && bestOldRecord < newRecord)
			) {
				storage.setItem(bestRecordKey, newRecord);
			}

			// 平均スコアの書き込み
			storage.setItem(aveRecordKey, ~~(((playNum - 1) * aveOldRecord + newRecord) / playNum * 100)/100);

			// ワーストスコアの書き込み
			if( worstOldRecord == null
				|| ((awardKey == 'clearTime' || awardKey == 'fallBallNum') && worstOldRecord < newRecord)
				|| ((awardKey != 'clearTime' && awardKey != 'fallBallNum') && worstOldRecord > newRecord)
			) {
				storage.setItem(worstRecordKey, newRecord);
			}
		}
	}


	//--------------------------------------------------
	// 成績の消去
	//--------------------------------------------------
	deleteRecord()
	{
		const storage = this.getStorage();
		if (!storage) return 0;

		for( var i = 0; i < storage.length; i++ ) {
			var key = storage.key(i);

			// 「record_」を含むデータを削除
			if( String(key).indexOf('record_') >= 0 ) {
				storage.removeItem(key);
				i--;
			}
		}

		// 完了メッセージの表示
		new MessageBox("プレイ成績を全消去しました。", false, null);

		// 画面の更新（EventBus経由で通知）
		EventBus.emitEvent('screen:printRecord', { stageIdx: null, mode: null });
		return 0;
	}
}

