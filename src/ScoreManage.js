import MessageBox from "./MessageBox.js";

//--------------------------------------------------
// 得点管理
//--------------------------------------------------
function ScoreManage()
{
	this.awardNum = new Array();						// アワードポイント
	this.awardPt = new Array();							// アワードカウント

	this.sumPrevClearTime = 0;							// 前ステージまでのクリア時間の総計
	this.sumPrevScore = 0;								// 前ステージまでの総合スコア
	this.hiScore = 0;									// ハイスコア
	this.stageScore = 0;								// ステージ毎の総合スコア
	this.score = 0;										// 総合スコア

	// ハイスコアの取得
	if( storage != null && storage.getItem("record_hiScore") != null ) {
		this.hiScore = storage.getItem("record_hiScore");
	}



	//--------------------------------------------------
	// 得点の集計
	//--------------------------------------------------
	this.calculateAwardPoint = function()
	{
		// 残りライフ数
		if( statusMng.life > 1 )
		{
			this.awardNum.remainderLife = statusMng.life;
			this.awardPt.remainderLife = pointPerLife[ctrl.stageIndex] * statusMng.life;
			this.score += this.awardPt.remainderLife;
		}

		// ボール個数
		var ballNum = balls.length;
		if( ballNum > 1 )
		{
			this.awardNum.ballNum = ballNum;
			this.awardPt.ballNum = (ballNum - 1) * pointPerBall[ctrl.stageIndex];
			this.score += this.awardPt.ballNum;
		}

		// 強化・無敵球でのクリア
		for( var i = 0; i < ballNum; i++ )
		{
			if( balls[i].status != BALL_STATUS.NORMAL )
			{
				this.awardNum.strengClear++;
				this.awardPt.strengClear = strongBallClear[ctrl.stageIndex];
				this.score += this.awardPt.strengClear;
				break;
			}
		}

		// 連続破壊数
		this.awardPt.continuousBreakNum = this.awardNum.continuousBreakNum * pointPerContBreak[ctrl.stageIndex];
		this.score += this.awardPt.continuousBreakNum;

		// 連続破壊クリア
		for( var i = 0; i < ballNum; i++ )
		{
			var ball = balls[i];
			if( ball.breakNum > this.awardNum.continuousBreakClear )
			{
				this.awardNum.continuousBreakClear = ball.breakNum;
			}
		}
		this.awardPt.continuousBreakClear = this.awardNum.continuousBreakClear * pointPerContBreak[ctrl.stageIndex] * 3;
		this.score += this.awardPt.continuousBreakClear;

		// クリア時間
		if( statusMng.isAlive() == true )
		{
			var playTime = statusMng.getPlaySecTime();
			var playTime_min = statusMng.getPlayMinTime();

			// 前ステージまでのクリア時間の総計との差分から算出
			this.awardNum.clearTime = Number(Number(playTime_min * 60) + Number(playTime)) - this.sumPrevClearTime;
			this.sumPrevClearTime += this.awardNum.clearTime;

			// クリア時間の整形
			this.awardNum.clearTime = ~~(this.awardNum.clearTime * 100) / 100;

			// ポイントの算出
			this.awardPt.clearTime = ~~((clearTimeThreashould[ctrl.stageIndex] - this.awardNum.clearTime) * pointPerClearTime[ctrl.stageIndex]);
			if( this.awardPt.clearTime > 0 ) {
				this.score += this.awardPt.clearTime;
			} else {
				this.awardPt.clearTime = 0;
			}
		} else {
			this.awardPt.clearTime = 0;
		}

		// アイテム取得数
		this.awardPt.getItemNum = this.awardNum.getItemNum * pointPerGetItem[ctrl.stageIndex];
		this.score += this.awardPt.getItemNum;

		// 球の落下回数
		this.awardPt.fallBallNum = this.awardNum.fallBallNum * -pointPerFallBall[ctrl.stageIndex];
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
	this.init = function()
	{
		// 変数の初期化
		for( var i = 0, len = awardKeyList.length; i < len; i++ ) {
			var key = awardKeyList[i];
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
	this.recordScore = function(_clearNum)
	{
		if( storage == null ) { return; }

		// 記録用のステージ名を作成
		var stageName = String(stageTitle[ctrl.stageIndex]);
		stageName.replace(/_/g, '__');

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
		for( var i = 0, len = awardKeyList.length; i < len; i++ ) {
			window.recordName;
var recordName = awardKeyList[i]; var awardKey = recordName;

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
			var aveRecord = storage.getItem(aveRecordKey);

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
	this.deleteRecord = function()
	{
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

		// 画面の更新
		printRecordScreen(null, null);
		return 0;
	}
}

export default ScoreManage;
