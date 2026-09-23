import Heart from "./Heart.js";
import MessageBox from "./MessageBox.js";

//--------------------------------------------------
// ステータス計測
//--------------------------------------------------
function StatusManage()
{
	this.prevFPSTime = 0;													// 前回FPS計測時刻
	this.realFPS = FPS;														// 実際のFPS
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



	//--------------------------------------------------
	// 初期化
	//--------------------------------------------------
	this.init = function()
	{
		// ハートインスタンスの生成
		for( var i = 0; i < maxLife; i++ )
		{
			this.hearts[i] = new Heart((i * 17 + 36), 9, ( i < this.life ? 1 : 0 ));
		}
	}


	//--------------------------------------------------
	// FPSの測定
	//--------------------------------------------------
	this.countFPS = function()
	{
		// 計算
		this.FPSCount++;

		// 一定間隔で計測
		if( Date.now() - this.prevFPSTime >= 40000 / FPS ) {
			// 計算
			this.realFPS = ~~(this.FPSCount * 10000 / (Date.now() - this.prevFPSTime)) / 10;

			// 初期化
			this.prevFPSTime = Date.now();
			this.FPSCount = 0;

			// 低FPS警告
			if( lowFPSAlartRatio > 0 && this.realFPS < FPS*lowFPSAlartRatio && balls.length > 0 && ctrl.pauseSwitch == 0 && ctrl.autoSwitch == 0 )
			{
				// 低FPSのカウント
				this.lowFPSCount++;

				if( this.lowFPSCount > 5 )
				{
					// 一時停止
					ctrl.pauseSwitchOn();

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
	this.getRealFPS = function()
	{
		// 整形
		var measuredFPS = String(this.realFPS);
		if( this.realFPS * 10 % 10 == 0 ) { measuredFPS = String(~~(this.realFPS) + '.0'); }

		return measuredFPS;
	}


	//--------------------------------------------------
	// プレイ時間の計測
	//--------------------------------------------------
	this.countPlayTime = function()
	{
		var ballNum = balls.length
		if( (this.startTime == 0 && ballNum != 0) || ballNum == 0 || ctrl.pauseSwitch == 1 ) { this.startTime = Date.now() - this.playTime; }
		if( ballNum > 0 ) { this.playTime = Date.now() - this.startTime; }
	}


	//--------------------------------------------------
	// 表示用プレイ時間の秒数を取得
	//--------------------------------------------------
	this.getPlaySecTime = function()
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
	this.getPlayMinTime = function()
	{
		var playTime_min = String(~~(( (Date.now() - this.startTime) / 60000 ) % 60));

		return playTime_min;
	}


	//--------------------------------------------------
	// 表示用ポイント数の取得
	//--------------------------------------------------
	this.getDisplayPoint = function()
	{
		// 滑らかに増加
		if( this.displayPoint + this.displayPointStep < scoreMng.score ) {
			this.displayPoint += this.displayPointStep;
			this.displayPointStep = Math.ceil((scoreMng.score - this.displayPoint) * 0.3);

		// 真値で停止
		} else {
			this.displayPoint = scoreMng.score;
			this.displayPointStep = 1;
		}

		return this.displayPoint;
	}


	//--------------------------------------------------
	// 破壊可能ブロック数の計算
	//--------------------------------------------------
	this.countBlockNum = function()
	{
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
	this.addLife = function (_incr)
	{
		// ライフの加算
		this.life = Number(this.life) + Number(_incr);

		// 最大を制限
		if( this.life > maxLife ) { this.life = maxLife; }

		// ハートインスタンスの生成
		for( var i = 0; i < maxLife; i++ )
		{
			this.hearts[i] = new Heart((i * 17 + 36), 9, ( i < this.life ? 1 : 0 ));
		}

		// 再描画
		this.drawLife(staticCtx);
	}


	//--------------------------------------------------
	// ライフの有無（あればtrue、なければfalse）
	//--------------------------------------------------
	this.isAlive = function()
	{
		if( this.life > 0 ) { return true; }
		else { return false; }
	}


	//--------------------------------------------------
	// ライフの描画
	//--------------------------------------------------
	this.drawLife = function(ctx)
	{
		for(var i = 0; i < maxLife; i++)
		{
			this.hearts[i].draw(ctx);
		}
	}
}

export default StatusManage;
