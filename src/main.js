import Control from "./Control.js";
import StatusManage from "./StatusManage.js";
import Bar from "./Bar.js";
import Ball from "./Ball.js";
import Item from "./Item.js";
import Block from "./Block.js";
import Weapon from "./Weapon.js";
import Sound from "./Sound.js";
import Heart from "./Heart.js";
import Cloud from "./Cloud.js";
import Balloon from "./Balloon.js";
import ScoreManage from "./ScoreManage.js";
import ImageData from "./ImageData.js";
import MessageBox from "./MessageBox.js";

// Copyright (C) 2010-2012 kt9, All rights reserved.
//--------グローバル変数の定義----------
window.dynamicCanvas = null;																// 動的描画用キャンバス
window.staticCanvas = null;																// 静的描画用キャンバス
window.dynamicCtx = null;																	// 動的描画用コンテキスト
window.staticCtx = null;																	// 静的描画用コンテキスト
window.canvasBg = null;																	// キャンバスの背景
window.bar = null;																		// バー
window.balls = new Array();														// ボール
window.items = new Array();														// アイテム
window.balloons = new Array();														// バルーン
window.weapons = new Array();														// 武器
window.sounds = null;																		// サウンド
window.statusMng = null;																	// ステータス計算
window.scoreMng = null;																	// 得点管理
window.ctrl = null;																		// ゲーム制御
window.imgData = null;																	// 画像データ
window.storage = null;																	// Web Storageオブジェクト

window.timer_All = null;																	// 描画と動きのタイマー
window.FRATE = 1000 / FPS;															// 更新間隔

window.pointX = canvasWidth / 2;													// マウスの横方向座標
window.pointY = 0;																	// マウスの縦方向座標
window.mouseDownTime = 0;															// マウスダウン時の時刻

window.keyPressIncr = 0;															// キー長押しによる増加率調整
window.keyStr = '';																// 押下キー文字
window.keyCode = '';																// 押下キーコード

window.awardKeyList = new Array(													// アワードのキー
	'remainderLife',															// 残りライフアワード
	'ballNum',																	// 球数アワード
	'strengClear',																// 強化・無敵状態クリアアワード
	'continuousBreakNum',														// 連続破壊最大数アワード
	'continuousBreakClear',														// 連続破壊クリアアワード
	'clearTime',																// クリア時間アワード
	'getItemNum',																// アイテム取得回数アワード
	'fallBallNum'																// 球の落下回数アワード
);

window.blockMap = null;																	// ブロックマップ
//--------グローバル変数の定義----------

//--------定数の定義----------
//-----システムパラメータ-----
window.SYSTEM_PARAM = {
	BALL_HIST_MAX: 4,			// ボール座標履歴最大数
};
//-----ボールインスタンス生成モード-----
window.BALL_CREATE_MODE = {
	LAUNCH: 1,					// 発射
	OTHER: 0,					// その他
};
//-----ボールコピーモード-----
window.BALL_COPY_MODE = {
	RAND : 0,					// ランダム
	SIMULATE : 1,				// シミュレーション用
};
//-----シミュレーション用パラメータ-----
window.SIMULATE_PARAM = {
	RESOLUTION : 400,			// シミュレーション速度解像度
	TIMES_PER_STEP : 10,		// 1ステップ当たりのシミュレーション回数
	MAX_PREDICT : 50,			// 最大シミュレーション時間（FPS）
};
//-----ブロック機能-----
window.BLOCK_FUNCTION = {
	NORMAL : 0,					// 普通
	EXPLODE : 1,				// 爆発
	FUEL : 2,					// 燃料
	THROUGH : 3,				// 貫通
	ACCELERATION : 4,			// 加速
	DECELERATION : 5,			// 減速
	EXPLODE_STRENGTH : 6,		// 爆発＋貫通弾化
	VERTICAL_MOVE : 7,			// 横移動
	WARP_ENTER : 8,				// ワープ入口
	WARP_EXIT : 9,				// ワープ出口
	MAGNET : 10,				// 引力
	REPULL : 11,				// 斥力
	BLINK : 12,					// 点滅
	ATTACK : 13,				// 攻撃
};
//-----ボール状態-----
window.BALL_STATUS = {
	NORMAL : 0,					// 通常
	STRONG : 1,					// 強化
	ULTIMATE : 2,				// 無敵
};
//--------定数の定義----------

window.appVer = 'v1.7.6';															// アプリケーションバージョン
window.appId = 'breakout';															// アプリケーションID
//--------------------------------------------------
// 初期化
//--------------------------------------------------
function init(offsetStage)
{
	// 描画先canvasのコンテキストを取得
	dynamicCanvas = document.getElementById('dynamic');
	staticCanvas = document.getElementById('static');
	dynamicCtx = dynamicCanvas.getContext('2d');
	staticCtx = staticCanvas.getContext('2d');

	// キャンバスの大きさを設定する
	dynamicCanvas.width = canvasWidth;
	dynamicCanvas.height = canvasHeight;
	staticCanvas.width = canvasWidth;
	staticCanvas.height = canvasHeight;

	// Web Storageオブジェクトの生成
	if( window.localStorage ) {
		storage = window.localStorage;
	}
	else {
		storage = null;
	}

	// ゲーム制御
	ctrl = new Control();

	// ステージインデックスの初期化
	ctrl.setStageIndex(offsetStage);

	// 設定情報の読み込み
	if( storage != null )
	{
		// 音の設定の読み込み
		ctrl.loadSoundSwitch();

		// 画面調整の設定の読み込み
		ctrl.loadSizeFitSwitch();

		// ゲーム開始方法の設定の読み込み
		ctrl.loadContinueSwitch();

		// 操作方法の読み込み
		ctrl.loadCtrlSwitch();

		// ステージ情報の読み込み
		ctrl.loadStageIndex();
	}

	// サイズを変える
	ctrl.fixSize();

	// 描画イメージの準備
	openScreen("screen_loading");
	imgData = new ImageData(dynamicCtx);
	imgData.init();
	closeScreen("screen_loading");

	// ブロック配置の読み込み
	blockMap = blockMapSet[ctrl.stageIndex].copyMap();

	// セッティングセレクタのセット
	ctrl.formSelector["setting"].onchange = function() { changeSetting(this.value); }

	//----------ステージセレクタのセット----------
	// オプションの初期化
	while( ctrl.formSelector["stage"].firstChild ) { ctrl.formSelector["stage"].removeChild( ctrl.formSelector["stage"].firstChild ); }

	for( var i = 0, len = stageTitle.length; i < len; i++ )
	{
		// オプションの作成
		var option = document.createElement('option');
		option.value = i;
		option.innerHTML = stageTitle[i];
		if( ctrl.stageIndex == i ) { option.selected = 'selected'; }

		// オプションの追加
		ctrl.formSelector["stage"].appendChild( option );
	}
	ctrl.formSelector["stage"].onchange = function()
	{
		// 値の設定
		ctrl.setStageIndex(this.value);

		// データの書き込み
		if( storage != null ) { ctrl.recordStageIndex(); }

		// 継続情報のクリア
		if( storage != null )
		{
			storage.setItem("continue_life", defaultLife);
			storage.setItem("continue_time", 0);
			storage.setItem("continue_score", 0);
		}

		// 初期化
		init( this.value );
	}
	//----------ステージセレクタのセット----------

	//----------画面調整セレクタのセット----------
	// オプションの初期化
	while( ctrl.formSelector["sizefit"].firstChild ) { ctrl.formSelector["sizefit"].removeChild( ctrl.formSelector["sizefit"].firstChild ); }

	for( var i = 0; i < 2; i++ )
	{
		// オプションの作成
		var option = document.createElement('option');
		option.value = i;
		if( i == 0 ) { option.innerHTML = 'OFF'; }
		else { option.innerHTML = 'ON'; }
		if( ctrl.sizeFitSwitch == i ) { option.selected = 'selected'; }

		// オプションの追加
		ctrl.formSelector["sizefit"].appendChild( option );
	}
	ctrl.formSelector["sizefit"].onchange = function()
	{
		// 設定
		ctrl.sizeFitSwitch = this.value;

		// データの書き込み
		if( storage != null ) { ctrl.recordSizeFitSwitch(); }

		// 画面調整
		ctrl.fixSize();
	}
	//----------画面調整セレクタのセット----------

	//----------音セレクタのセット----------
	// オプションの初期化
	while( ctrl.formSelector["sound"].firstChild ) { ctrl.formSelector["sound"].removeChild( ctrl.formSelector["sound"].firstChild ); }

	for( var i = 0; i < 2; i++ )
	{
		// オプションの作成
		var option = document.createElement('option');
		option.value = i;
		if( i == 0 ) { option.innerHTML = 'OFF'; }
		else { option.innerHTML = 'ON'; }
		if( ctrl.soundSwitch == i ) { option.selected = 'selected'; }

		// オプションの追加
		ctrl.formSelector["sound"].appendChild( option );
	}
	ctrl.formSelector["sound"].onchange = function()
	{
		// 設定
		ctrl.soundSwitch = this.value;

		// データの書き込み
		if( storage != null ) { ctrl.recordSoundSwitch(); }
	}
	//----------音セレクタのセット----------

	//----------ゲーム開始位置セレクタのセット----------
	// オプションの初期化
	while( ctrl.formSelector["continue"].firstChild ) { ctrl.formSelector["continue"].removeChild( ctrl.formSelector["continue"].firstChild ); }

	for( var i = 0; i < 2; i++ )
	{
		// オプションの作成
		var option = document.createElement('option');
		option.value = i;
		if( i == 0 ) { option.innerHTML = 'New'; }
		else { option.innerHTML = 'Continue'; }
		if( ctrl.continueSwitch == i ) { option.selected = 'selected'; }

		// オプションの追加
		ctrl.formSelector["continue"].appendChild( option );
	}
	ctrl.formSelector["continue"].onchange = function()
	{
		// 設定
		ctrl.continueSwitch = this.value;

		// データの書き込み
		if( storage != null ) { ctrl.recordContinueSwitch(); }
	}
	//----------ゲーム開始位置セレクタのセット----------

	//----------操作方法セレクタのセット----------
	// オプションの初期化
	while( ctrl.formSelector["ctrl"].firstChild ) { ctrl.formSelector["ctrl"].removeChild( ctrl.formSelector["ctrl"].firstChild ); }

	for( var i = 0; i < 2; i++ )
	{
		// オプションの作成
		var option = document.createElement('option');
		option.value = i;
		if( i == 0 ) { option.innerHTML = 'Mouse'; }
		else { option.innerHTML = 'Keyboard'; }
		if( ctrl.ctrlSwitch == i ) { option.selected = 'selected'; }

		// オプションの追加
		ctrl.formSelector["ctrl"].appendChild( option );
	}
	ctrl.formSelector["ctrl"].onchange = function()
	{
		// 設定
		ctrl.ctrlSwitch = this.value;

		// データの書き込み
		if( storage != null ) { ctrl.recordCtrlSwitch(); }
	}
	//----------操作方法セレクタのセット----------

	// 得点管理インスタンスの作成
	scoreMng = new ScoreManage();
	scoreMng.init();

	// 全ボール消去
	balls = new Array();

	// 全アイテムの消去
	items = new Array();

	// バー
	bar = new Bar();

	// 全武器の消去
	weapons = new Array();

	// ステータス
	statusMng = new StatusManage();

	// 破壊可能ブロック数の計算
	statusMng.countBlockNum();

	// ライフのクリア
	if( storage != null && ctrl.continueSwitch == 1 && storage.getItem("continue_life") > 0 ) { statusMng.life = storage.getItem("continue_life"); }
	else { statusMng.life = defaultLife; }

	// 得点及び時間の読み込み
	if( storage != null && ctrl.continueSwitch == 1 )
	{
		if( storage.getItem("continue_time") != null && storage.getItem("continue_score") != null )
		{
			statusMng.playTime = storage.getItem("continue_time");
			scoreMng.score = storage.getItem("continue_score");
		}
	}

	// ステータスの初期化
	statusMng.init();

	// マウスの動作設定
	window.onmousemove = function(event) { getMouseMove(event, dynamicCanvas, 0, ctrl.scale); }
	dynamicCanvas.onmousedown = function()
	{
		// 発射準備
		if( ctrl.ctrlSwitch == 0 ) { mouseDownTime = Date.now(); }

		// 武器の発射
		if( bar.weapon != 0 && weapons.length < weaponMaxNum[bar.weapon - 1] && bar.weaponInter <= 0 ) {
			weapons[weapons.length] = new Weapon(bar.weapon, bar.getCenterX());
		}
	}
	dynamicCanvas.onmouseup = function(e)
	{
		// 発射制御
		if( ctrl.ctrlSwitch == 0 && e.button != 2 && balls.length == 0 && statusMng.isAlive() == true && mouseDownTime != 0 ) {
			balls[0] = new Ball(BALL_CREATE_MODE.LAUNCH);
			mouseDownTime = 0;
		}

		// 吸着状態からの再発射
		if( bar.absorptionNum > 0 ) { bar.relaunch(); }
	}
	window.onclick = function() { }
	window.oncontextmenu = function()
	{
		// 一時停止
		ctrl.pauseSwitchOn();
		return false;
	}

	// タッチの動作設定
	window.ontouchmove = function(event) {
		getMouseMove(event, dynamicCanvas, 1, ctrl.scale);

		event.preventDefault();
	}
	dynamicCanvas.ontouchstart = function(event) {
		// オートプレイの切り替え
		if( event.touches.length == 2 )
		{
			ctrl.autoSwitchToggle();
			return;
		}
		// 一時停止
		else if( event.touches.length == 3 )
		{
			ctrl.pauseSwitchOn();
			return;
		}

		// 発射準備
		if( ctrl.ctrlSwitch == 0 ) { mouseDownTime = Date.now(); }

		// 武器の発射
		if( bar.weapon != 0 && weapons.length < weaponMaxNum[bar.weapon - 1] && bar.weaponInter <= 0 )
		{
			weapons[weapons.length] = new Weapon(bar.weapon, bar.getCenterX());
		}

		event.preventDefault();
	}
	dynamicCanvas.ontouchend = function(event) {
		// 発射制御
		if( ctrl.ctrlSwitch == 0 && balls.length == 0 && statusMng.isAlive() == true && mouseDownTime != 0 )
		{
			balls[0] = new Ball(BALL_CREATE_MODE.LAUNCH);
			mouseDownTime = 0;
		}

		// 吸着状態からの再発射
		if( bar.absorptionNum > 0 ) { bar.relaunch(); }

		event.preventDefault();
	}

	// ウィンドウサイズの変更を検知
	window.onresize = function() { ctrl.fixSize(); }

	// キーボードの動作設定
  	document.onkeydown = function(e) { getKeyPress(e, 'down'); }
	document.onkeyup = function(e) { getKeyPress(e, 'up'); }

	// 音のロード
	sounds = new Sound();

	// 背景の指定
	canvasBg = document.getElementById('canvas_background');
	var canvasBgStyle = canvasBg.style;
	canvasBgStyle.width = canvasWidth + "px";
	canvasBgStyle.height = (canvasHeight - statusBarHeight) + "px";
	canvasBgStyle.backgroundImage = "url(" + backGroundImage[ctrl.stageIndex] + ")";

	//--------------------タイマーの設定--------------------
	clearInterval(timer_All);
	drawAll(dynamicCtx);
	drawOnce(staticCtx);
	var drawTiming = 0;
	timer_All = setInterval(function() {

		// 一時停止制御
		if( ctrl.pauseSwitch == 0 )
		{
			// オートパイロット
			if( ctrl.autoSwitch == 1 ) { bar.auto(); }

			// キー入力によるバー制御
			if( ctrl.autoSwitch == 0 && ctrl.ctrlSwitch == 1 ) {
				if( keyStr == 'Right' ) {
					pointX += keyPressIncr;
					keyPressIncr *= 1.2;
				} else if( keyStr == 'Left' ) {
					pointX -= keyPressIncr;
					keyPressIncr *= 1.2;
				}

				// 座標制限
				if( pointX < 0 ) { pointX = 0; }
				else if( pointX > dynamicCanvas.width ) { pointX = dynamicCanvas.width; }
			}

			// バー
			bar.move();

			// アイテム
			for( var i = 0; i < items.length; i++ ) { items[i].move(); }

			// ブロック
			for( var i = 0, len = blockMap.length; i < len; i++ )
			{
				var blockLine = blockMap[i];
				if( blockLine != null )
				{
					for( var j = 0, len2 = blockLine.length; j < len2; j++ )
					{
						var block = blockLine[j];
						if( block != null )
						{
							block.move();
						}
					}
				}
			}

			// ゲームの終了判定
			if( statusMng.blockNum <= 0 || statusMng.isAlive() == false ) { gameOver(); }

			// ボール
			for( var i = 0; i < balls.length; i++ ) { balls[i].move(); }

			// 武器
			for( var i = 0; i < weapons.length; i++ ) { weapons[i].move(); }
		}

		// FPS，時間の測定
		statusMng.countFPS();
		statusMng.countPlayTime();

		// 設定フォームの制御
		if( balls.length != 0 )
		{
			// プレイ中
			ctrl.formSelector["continue"].disabled = true;
			ctrl.formSelector["stage"].disabled = true;

		} else {
			// プレイ外
			ctrl.formSelector["continue"].disabled = false;
			ctrl.formSelector["stage"].disabled = false;
		}

		// 描画
		drawAll(dynamicCtx);

	}, FRATE);
	//--------------------タイマーの設定--------------------
}







//--------------------------------------------------
// 一度だけ描画
//--------------------------------------------------
function drawOnce(staticCtx)
{
	// 描画の削除
	staticCtx.clearRect(0, 0, canvasWidth, canvasHeight);

	// ブロックの描画
	for( var i = 0, len1 = blockMap.length; i < len1; i++ )
	{
		var blockLine = blockMap[i];
		if( blockLine != null )
		{
			for(var j = 0, len2 = blockLine.length; j < len2; j++)
			{
				var block = blockLine[j];

				// 爆破中か否か
				if( block != null && block.type != 0 )
				{
					block.draw(staticCtx);
				}
			}
		}
	}

	// ライフの表示
	statusMng.drawLife(staticCtx);
}



//--------------------------------------------------
// すべての描画
//--------------------------------------------------
function drawAll(dynamicCtx)
{
	// 描画の削除
	dynamicCtx.clearRect(0, 0, canvasWidth, canvasHeight);

	// バーの描画
	bar.draw(dynamicCtx);

	// 爆破モーションの描画
	for( var i = 0, len1 = blockMap.length; i < len1; i++ )
	{
		var blockLine = blockMap[i];
		if( blockLine != null )
		{
			for(var j = 0, len2 = blockLine.length; j < len2; j++)
			{
				var block = blockLine[j];

				// 爆破中か否か
				if( block != null && block.exploded > 0 )
				{
					Cloud(dynamicCtx, block.x, block.y);
				}
			}
		}
	}

	// アイテムの描画
	for( var i = 0, len = items.length; i < len; i++ ) { items[i].draw(dynamicCtx); }

	// 武器
	for( var i = 0, len = weapons.length; i < len; i++ ) { weapons[i].draw(dynamicCtx); }

	// ボールの描画
	for( var i = 0, len = balls.length; i < len; i++ ) { balls[i].draw(dynamicCtx); }

	// バルーンの描画
	for( var i = 0, len = balloons.length; i < len; i++ )
	{
		var balloon = balloons[i];

		// 表示完了バルーンを削除
		if( balloon.endFlag ) {
			balloons.slice(i, i + 1);

		// 描画
		} else {
			balloon.draw(dynamicCtx);
		}
	}

	// 画面の難視化
	if( bar.disturbStatusTime > 0 )
	{
		var disturbWidth = blockWidth;
		var startPoint = ((Date.now()/6) % disturbWidth)*2 - disturbWidth;

		dynamicCtx.fillStyle = 'rgba(0, 0, 0, 0.85)';
		for( var i = startPoint; i < canvasWidth; )
		{
			dynamicCtx.fillRect(i, 0, disturbWidth, canvasHeight);

			i += disturbWidth*2;
		}
	}

	// ステータスの描画
	statusView(dynamicCtx);
}


//--------------------------------------------------
// ステータス表示
//--------------------------------------------------
function statusView(dynamicCtx)
{
	// プレイ情報用領域の取得
	var playInfo = document.getElementById("play_info");
	
	// 表示用ポイント数の取得
	var displayPoint = statusMng.getDisplayPoint();

	// ゲーム時間の取得
	var playTime = statusMng.getPlaySecTime();
	var playTime_min = statusMng.getPlayMinTime();

	// テキストの作成
	var text = '/ Score:' + displayPoint + ' / Hi-Score:';
	text = text + String(scoreMng.hiScore);
	text += ' / Stage:' + stageTitle[ctrl.stageIndex] + ' / Time:' + playTime_min + '\'' + playTime + ' / Mode:' + (ctrl.autoSwitch == 0 ? 'MP' : 'AP');

	// デバッグ用情報取得
	text += '<span style="font-size: 0.8em; margin-left: 3em;">' + statusMng.getRealFPS() + 'fps / ' + String(balls.length) + '</span>';

	// ライフ分の空白の計算
	var lifeSpaceSize = maxLife*17 + 5;

	// テキストの描画
	playInfo.innerHTML = 'Life' + '<span style="margin-left: ' + lifeSpaceSize + 'px;">' + text + '</span>';
}





//--------------------------------------------------
// ゲーム終了
//--------------------------------------------------
function gameOver()
{
	// 効果音の再生
	if( statusMng.isAlive() == true ) { sounds.play('clear'); }
	else { sounds.play('game_over'); }

	// アワードによる得点加算
	scoreMng.calculateAwardPoint();
	var awardPt = scoreMng.awardPt;
	var awardNum = scoreMng.awardNum;

	// ステージタイトルの取得
	var outputStageTitle = stageTitle[ctrl.stageIndex];

	// スコアの保存
	var isClear = (statusMng.isAlive() == true ? 1 : 0);
	scoreMng.recordScore(isClear);

	// 全ボール消去
	balls = new Array();

	// 全アイテムの消去
	items = new Array();

	// 全バルーンの消去
	balloons = new Array();

	// 全武器の消去
	weapons = new Array();

	// バー状態の解除
	bar = new Bar();

	if( statusMng.isAlive() == true )
	{
		// ライフ回復
		if( blockMapSet.length - 1 > ctrl.stageIndex ) { statusMng.addLife(stageLifeUp[ctrl.stageIndex]); }

		// ステージを進める
		ctrl.forwardStageIndex();
	}

	// 状態の記録
	if( storage != null )
	{
		// ハイスコアの記録
		var hiScore = storage.getItem("record_hiScore");
		if( hiScore == null || hiScore < scoreMng.score ) { storage.setItem("record_hiScore", scoreMng.score); }

		// ゲームクリア
		if( ctrl.stageEnded == 1 )
		{
			// ステージ番号の記録
			ctrl.recordStageIndex(0);
		}
		// ステージクリアまたはゲームオーバー
		else
		{
			// ステージ番号の記録
			ctrl.recordStageIndex(ctrl.stageIndex);

			// 継続情報の記録
			if( statusMng.isAlive() == true )
			{
				// ライフの記録
				storage.setItem("continue_life", statusMng.life);

				// 得点の記録
				storage.setItem("continue_score", scoreMng.score);

				// 時間の記録
				storage.setItem("continue_time", statusMng.playTime);
			}
			else
			{
				// ライフの記録
				storage.setItem("continue_life", defaultLife);

				// 得点の記録
				storage.setItem("continue_score", 0);

				// 時間の記録
				storage.setItem("continue_time", 0);
			}
		}
	}

	// 次のステージへ
	if( ctrl.stageEnded == 0 ) { blockMap = blockMapSet[ctrl.stageIndex].copyMap(); }
	statusMng.countBlockNum();

	// 静的描画用キャンバスの更新
	drawOnce(staticCtx);

	// ゲームオーバー
	if( statusMng.isAlive() == false )
	{
		var sumPoint = 0;
		for( var i = 0, len = awardKeyList.length; i < len; i++ ) { sumPoint += awardPt[awardKeyList[i]]; }

		// ゲームオーバー画面の作成
		var screenData = String(getScreenData('screen_gameOver'));
		screenData = screenData.replace('<!--stage_title-->', outputStageTitle);
		screenData = screenData.replace('<!--remainder_life_pt-->', awardPt.remainderLife);
		screenData = screenData.replace('<!--remainder_life_num-->', awardNum.remainderLife);
		screenData = screenData.replace('<!--ball_number_pt-->', awardPt.ballNum);
		screenData = screenData.replace('<!--ball_number_num-->', awardNum.ballNum);
		screenData = screenData.replace('<!--strengthened_clear_pt-->', awardPt.strengClear);
		screenData = screenData.replace('<!--strengthened_clear_num-->', awardNum.strengClear);
		screenData = screenData.replace('<!--continuous_break_number_pt-->', awardPt.continuousBreakNum);
		screenData = screenData.replace('<!--continuous_break_number_num-->', awardNum.continuousBreakNum);
		screenData = screenData.replace('<!--continuous_break_clear_pt-->', awardPt.continuousBreakClear);
		screenData = screenData.replace('<!--continuous_break_clear_num-->', awardNum.continuousBreakClear);
		screenData = screenData.replace('<!--clear_time_pt-->', awardPt.clearTime);
		screenData = screenData.replace('<!--clear_time_num-->', awardNum.clearTime);
		screenData = screenData.replace('<!--get_item_number_pt-->', awardPt.getItemNum);
		screenData = screenData.replace('<!--get_item_number_num-->', awardNum.getItemNum);
		screenData = screenData.replace('<!--fall_ball_number_pt-->', awardPt.fallBallNum);
		screenData = screenData.replace('<!--fall_ball_number_num-->', awardNum.fallBallNum);
		screenData = screenData.replace('<!--sum_point-->', sumPoint);
		screenData = screenData.replace('<!--point-->', scoreMng.score);

		// ゲームオーバー画面の置き換え
		replaceScreenData('screen_gameOver', screenData);

		// ゲームオーバー画面の表示
		openScreen('screen_gameOver');

		// 初期化
		init(0);

	// ゲームクリア
	} else if( ctrl.stageEnded == 1 )
	{
		var sumPoint = 0;
		for( var i = 0, len = awardKeyList.length; i < len; i++ ) { sumPoint += awardPt[awardKeyList[i]]; }

		// ステージクリア画面の作成
		var screenData = String(getScreenData('screen_allClear'));
		screenData = screenData.replace('<!--remainder_life_pt-->', awardPt.remainderLife);
		screenData = screenData.replace('<!--remainder_life_num-->', awardNum.remainderLife);
		screenData = screenData.replace('<!--ball_number_pt-->', awardPt.ballNum);
		screenData = screenData.replace('<!--ball_number_num-->', awardNum.ballNum);
		screenData = screenData.replace('<!--strengthened_clear_pt-->', awardPt.strengClear);
		screenData = screenData.replace('<!--strengthened_clear_num-->', awardNum.strengClear);
		screenData = screenData.replace('<!--continuous_break_number_pt-->', awardPt.continuousBreakNum);
		screenData = screenData.replace('<!--continuous_break_number_num-->', awardNum.continuousBreakNum);
		screenData = screenData.replace('<!--continuous_break_clear_pt-->', awardPt.continuousBreakClear);
		screenData = screenData.replace('<!--continuous_break_clear_num-->', awardNum.continuousBreakClear);
		screenData = screenData.replace('<!--clear_time_pt-->', awardPt.clearTime);
		screenData = screenData.replace('<!--clear_time_num-->', awardNum.clearTime);
		screenData = screenData.replace('<!--get_item_number_pt-->', awardPt.getItemNum);
		screenData = screenData.replace('<!--get_item_number_num-->', awardNum.getItemNum);
		screenData = screenData.replace('<!--fall_ball_number_pt-->', awardPt.fallBallNum);
		screenData = screenData.replace('<!--fall_ball_number_num-->', awardNum.fallBallNum);
		screenData = screenData.replace('<!--sum_point-->', sumPoint);
		screenData = screenData.replace('<!--point-->', scoreMng.score);

		// ステージクリア画面の置き換え
		replaceScreenData('screen_allClear', screenData);

		// ステージクリア画面の表示
		openScreen('screen_allClear');

		// 初期化
		init(0);

	// ステージクリア
	} else
	{
		var sumPoint = 0;
		for( var i = 0, len = awardKeyList.length; i < len; i++ ) { sumPoint += awardPt[awardKeyList[i]]; }

		// ステージクリア画面の作成
		var screenData = String(getScreenData('screen_stageClear'));
		screenData = screenData.replace('<!--stage_title-->', outputStageTitle);
		screenData = screenData.replace('<!--remainder_life_pt-->', awardPt.remainderLife);
		screenData = screenData.replace('<!--remainder_life_num-->', awardNum.remainderLife);
		screenData = screenData.replace('<!--ball_number_pt-->', awardPt.ballNum);
		screenData = screenData.replace('<!--ball_number_num-->', awardNum.ballNum);
		screenData = screenData.replace('<!--strengthened_clear_pt-->', awardPt.strengClear);
		screenData = screenData.replace('<!--strengthened_clear_num-->', awardNum.strengClear);
		screenData = screenData.replace('<!--continuous_break_number_pt-->', awardPt.continuousBreakNum);
		screenData = screenData.replace('<!--continuous_break_number_num-->', awardNum.continuousBreakNum);
		screenData = screenData.replace('<!--continuous_break_clear_pt-->', awardPt.continuousBreakClear);
		screenData = screenData.replace('<!--continuous_break_clear_num-->', awardNum.continuousBreakClear);
		screenData = screenData.replace('<!--clear_time_pt-->', awardPt.clearTime);
		screenData = screenData.replace('<!--clear_time_num-->', awardNum.clearTime);
		screenData = screenData.replace('<!--get_item_number_pt-->', awardPt.getItemNum);
		screenData = screenData.replace('<!--get_item_number_num-->', awardNum.getItemNum);
		screenData = screenData.replace('<!--fall_ball_number_pt-->', awardPt.fallBallNum);
		screenData = screenData.replace('<!--fall_ball_number_num-->', awardNum.fallBallNum);
		screenData = screenData.replace('<!--sum_point-->', sumPoint);
		screenData = screenData.replace('<!--point-->', scoreMng.score);

		// ステージクリア画面の置き換え
		replaceScreenData('screen_stageClear', screenData);

		// ステージクリア画面の表示
		openScreen('screen_stageClear');

		// 成績データの初期化
		scoreMng.init();
	}
}



//--------------------------------------------------
// マウス位置の取得
//--------------------------------------------------
function getMouseMove(event, canvas, touch, scale)
{
	// オートプレイ中は行わない
	if( ctrl.autoSwitch == 1 || ctrl.ctrlSwitch == 1 ) { return; }

	// マウス座標の取得
	if( event != null )
	{
		if( touch == 0 ) {
			pointX = event.pageX - canvas.offsetLeft;
			pointY = event.pageY - canvas.offsetTop;
		} else {
			pointX = event.touches[0].pageX - canvas.offsetLeft;
			pointY = event.touches[0].pageY - canvas.offsetTop;
		}
	} else {
		pointX = event.offsetX;
		pointY = event.offsetY;
	}

	// 座標修正
	pointX *= canvasWidth / canvas.offsetWidth / scale;
	pointY *= canvasHeight / canvas.offsetHeight / scale;
}



//--------------------------------------------------
// キーボード入力によるカーソル位置の取得
//--------------------------------------------------
function getKeyPress(e, action)
{
	// キー入力履歴の取得
	var keyHist = "";
	if( keyCode != null && action == "up" ) { keyHist = keyCode; }

	// キーの取得
	var evt = e || event;
	keyCode = evt.keyCode || evt.which;

	// 全角入力への対処
	if( ( keyCode != 244 && keyHist == 229 ) ) {
		new MessageBox("全角入力では利用できません。<br>半角入力にしてください。", false, null);
		return 0;
	}

	//----------キーの判別----------
	// 発射（スペース・5）
	if( keyCode == 32 || keyCode == 53 || keyCode == 101 ) { keyStr = 'Launch'; }

	// サウンド（S・1）
	else if( keyCode == 83 || keyCode == 49 || keyCode == 97 ) { keyStr = 'Sound'; }

	// オートプレイ（Z・8）
	else if( keyCode == 90 || keyCode == 56 || keyCode == 104 ) { keyStr = 'Auto'; }

	// 操作切替（C・9）
	else if( keyCode == 67 || keyCode == 57 || keyCode == 105 ) { keyStr = 'Ctrl'; }

	// 一時停止（P・0）
	else if( keyCode == 80 || keyCode == 48 || keyCode == 96 ) { keyStr = 'Pause'; }

	// 右へ移動（L・6）
	else if( keyCode == 76 || keyCode == 54 || keyCode == 102 ) { keyStr = 'Right'; }

	// 左へ移動（A・4）
	else if( keyCode == 65 || keyCode == 52 || keyCode == 100 ) { keyStr = 'Left'; }

	// 画面（F・7）
	else if( keyCode == 70 || keyCode == 55 || keyCode == 103 ) { keyStr = 'sizeFit'; }

	// ステージを進める（U）
	else if( keyCode == 85 ) { keyStr = 'nextStage'; }

	// ステージを戻す（R）
	else if( keyCode == 82 ) { keyStr = 'prevStage'; }

	// その他
	else { keyStr = ''; }

	// 判定を行わない場合
	if( keyStr != '' && (keyStr != 'Auto' && keyStr != 'Ctrl' && keyStr != 'Pause' && keyStr != 'Sound' && keyStr != 'sizeFit' && keyStr != 'nextStage' && keyStr != 'prevStage') && (ctrl.autoSwitch == 1 || ctrl.ctrlSwitch == 0) ) { keyStr = ''; }
	//----------キーの判別----------

	//----------処理の実行----------
	// 発射
	if( keyStr == 'Launch' ) {
		if( action == 'down' ) {
			mouseDownTime = Date.now();

		} else {
			// 球の発射
			if( balls.length == 0 && statusMng.isAlive() == true && mouseDownTime != 0 ) {
				balls[0] = new Ball(BALL_CREATE_MODE.LAUNCH);
				mouseDownTime = 0;

			// 武器の発射
			} else if( bar.weapon != 0 && weapons.length < weaponMaxNum[bar.weapon - 1] && bar.weaponInter <= 0 ) {
				weapons[weapons.length] = new Weapon(bar.weapon, bar.getCenterX());
			}
		}

	// 一時停止
	} else if( keyStr == 'Pause' )
	{
		if( action == 'up' )
		{
			// 一時停止のオンオフ
			ctrl.pauseSwitchToggle();
		}

	// サウンド
	} else if( keyStr == 'Sound' )
	{
		if( action == 'up' )
		{
			// 音のオンオフ
			ctrl.soundSwitchToggle();
		}

	// オートプレイ
	} else if( keyStr == 'Auto' )
	{
		if( action == 'up' )
		{
			// 切り替え
			ctrl.autoSwitchToggle();
		}

	// 操作切替
	} else if( keyStr == 'Ctrl' )
	{
		if( action == 'up' )
		{
			// 制御の切り替え
			ctrl.ctrlSwitchToggle();
		}

	// 画面サイズ
	} else if( keyStr == 'sizeFit' )
	{
		if( action == 'up' )
		{
			// 画面サイズ設定の切り替え
			ctrl.sizefitSwitchToggle();
		}

	// 右へ移動
	} else if( keyStr == 'Right' ) {
		if( action == 'up' ) { keyStr = ''; }
		else { keyPressIncr = 5; }

	// 左へ移動
	} else if( keyStr == 'Left' ) {
		if( action == 'up' ) { keyStr = ''; }
		else { keyPressIncr = 5; }

	// ステージを進める
	} else if( keyStr == 'nextStage' ) {
		if( action == 'down' )
		{
			// ステージを進める
			ctrl.forwardStageIndex();

			// ステージの記録
			if( storage != null ) { ctrl.recordStageIndex(); }

			// 初期化
			init(ctrl.stageIndex);
		} else {
			keyStr = '';
		}

	// ステージを戻す
	} else if( keyStr == 'prevStage' ) {
		if( action == 'down' )
		{
			// ステージを戻す
			ctrl.backwardStageIndex();

			// ステージの記録
			if( storage != null ) { ctrl.recordStageIndex(); }

			// 初期化
			init(ctrl.stageIndex);
		} else {
			keyStr = '';
		}
	}
}























//--------------------------------------------------
// シミュレートのリセット
//--------------------------------------------------
function simulateReset()
{
	for( var i = 0, len1 = blockMap.length; i < len1; i++ ) {
		if( blockMap[i].length ) {
			for( var j = 0, len2 = blockMap[i].length; j < len2; j++ ) {
				var block = blockMap[i][j];
				if( block ) { block.simulateReset(); }
			}
		}
	}
}



























//--------------------------------------------------
// レコード画面の描画
//--------------------------------------------------
function printRecordScreen(recordType, recordStage)
{
	var recordTypeTitle = new Array("Best", "Average", "Worst");
	var recordTypeCtrl = new Array("best", "ave", "worst");

	if( storage == null ) { return; }

	// 選択項目の取得
	if( recordType == null && recordStage == null )
	{
		recordType = document.getElementById('record_type').selectedIndex;
		recordStage = document.getElementById('record_stage').selectedIndex;
	}

	// 記録用のステージ名を作成
	var stageName = stageTitle[recordStage];
	stageName.replace(/_/g, '__');

	// アワードの種類ごとに取得
	var record = new Array();
	for( var i = 0, len = awardKeyList.length; i < len; i++ ) {
		window.recordName;
var recordName = awardKeyList[i]; var awardKey = recordName;

		// アワード名から記録用keyの作成
		recordName.replace(/_/g, '__');
		var recordKey = "record_" + recordTypeCtrl[recordType] + "_" + stageName + "_" + recordName;

		// ベストスコアの書き込み
		if( storage.getItem(recordKey) != null ) {
			record[awardKey] = storage.getItem(recordKey);
		} else {
			record[awardKey] = 0;
		}
	}
	record["stageScore"] = storage.getItem("record_" + recordTypeCtrl[recordType] + "_" + stageName + "_stageScore") || 0;
	record["playNum"] = storage.getItem("record_" + stageName + "_playNum") || 0;
	record["clearNum"] = storage.getItem("record_" + stageName + "_clearNum") || 0;

	// 勝率の計算
	var clearRatio = 0;
	if( record.playNum != 0 ) { clearRatio = Math.floor(record.clearNum / record.playNum * 10000) / 100; }

	// レコード画面の作成
	var screenData = String(getScreenData('screen_record'));
	screenData = screenData.replace('<!--play_num-->', record.playNum);
	screenData = screenData.replace('<!--clear_num-->', record.clearNum);
	screenData = screenData.replace('<!--clear_ratio-->', clearRatio);
	screenData = screenData.replace('<!--remainder_life_num-->', record.remainderLife);
	screenData = screenData.replace('<!--ball_number_num-->', record.ballNum);
	screenData = screenData.replace('<!--strengthened_clear_num-->', record.strengClear);
	screenData = screenData.replace('<!--continuous_break_number_num-->', record.continuousBreakNum);
	screenData = screenData.replace('<!--continuous_break_clear_num-->', record.continuousBreakClear);
	screenData = screenData.replace('<!--clear_time_num-->', record.clearTime);
	screenData = screenData.replace('<!--get_item_number_num-->', record.getItemNum);
	screenData = screenData.replace('<!--fall_ball_number_num-->', record.fallBallNum);
	screenData = screenData.replace('<!--stageScor-->', record.stageScore);

	// ステージクリア画面の置き換え
	replaceScreenData('screen_record', screenData);

	//----------ステージセレクタのセット----------
	// selectエレメントの取得
	var stageSelector = document.getElementById('record_stage');

	// オプションの初期化
	while( stageSelector.firstChild ) { stageSelector.removeChild( stageSelector.firstChild ); }

	for( var i = 0, len = stageTitle.length; i < len; i++ ) {
		// オプションの作成
		var option = document.createElement('option');
		option.value = i;
		option.innerHTML = stageTitle[i];
		if( recordStage == i ) { option.selected = 'selected'; }

		// オプションの追加
		stageSelector.appendChild( option );
	}
	stageSelector.onchange = function() {
		printRecordScreen(recordType, stageSelector.selectedIndex);
		stageSelector.focus();
	}
	//----------ステージセレクタのセット----------

	//----------レコードタイプセレクタのセット----------
	// selectエレメントの取得
	var typeSelector = document.getElementById('record_type');

	// オプションの初期化
	while( typeSelector.firstChild ) { typeSelector.removeChild( typeSelector.firstChild ); }

	for( var i = 0, len = recordTypeTitle.length; i < len; i++ ) {
		// オプションの作成
		var option = document.createElement('option');
		option.value = i;
		option.innerHTML = recordTypeTitle[i];
		if( recordType == i ) { option.selected = 'selected'; }

		// オプションの追加
		typeSelector.appendChild( option );
	}
 	typeSelector.onchange = function() { printRecordScreen(typeSelector.selectedIndex, recordStage); }
	//----------レコードタイプセレクタのセット----------

	//----------レコード関係のボタンのセット----------
	// レコード削除ボタンの設定
	var recordResetButton = document.getElementById('reset_record');
	recordResetButton.onclick = function()
	{
		var msgBox = new MessageBox("プレイ成績をすべて削除します。よろしいですか？", true,
			function()
			{
				// 削除確定
				if( msgBox.value ) {
					scoreMng.deleteRecord();
					return 0;

				// 削除キャンセル
				} else {
					return 0;
				}
			}
		);
	}

	// レコード更新ボタンの設定
	var recordReloadButton = document.getElementById('reload_record');
	recordReloadButton.onclick = function()
	{
		// 画面の更新
		printRecordScreen(null, null);
	}
	//----------レコード関係のボタンのセット----------
}



//--------------------------------------------------
// 配列の中から対象を探して削除
//--------------------------------------------------
Array.prototype.tarRemove = function(tar)
{
	for( var i = 0, len = this.length; i < len; i++ )
	{
		if( this[i] == tar ) { this.splice(i, 1); }
	}
}



//--------------------------------------------------
// ブロック配置のコピーを作る（参照でなく）
//--------------------------------------------------
Array.prototype.copyMap = function()
{
	// ブロックの配置
	var effBlockNum = 0;
	var obj = new Array();
	for(var i = 0, len1 = this.length; i < len1; i++)
	{
		obj[i] = new Array();
		for(var j = 0, len2 = this[i].length; j < len2; j++)
		{
			var block = this[i][j];
			if( block != 0 )
			{
				obj[i][j] = new Block(j, i, block, blockFunction[block], blockLife[block], blockInfinit[block], blockThrough[block]);

				// 破壊可能ブロック数の計算
				effBlockNum++;
			}
		}
	}

	// 必要アイテム数の計算
	var itemStock = new Array();
	for( var i = 0, len1 = itemProb[ctrl.stageIndex].length; i < len1; i++ )
	{
		var Prob = itemProb[ctrl.stageIndex][i] * effBlockNum;

		// 確率が１以上ならその分を追加する
		while( Prob >= 1 )
		{
			itemStock[itemStock.length] = i;
			Prob -= 1;
		}

		// 端数分は確率に任せる
		if( Prob > Math.random() ) { itemStock[itemStock.length] = i; }
	}

	// アイテムの配置
	for( var i = 0, len1 = itemStock.length; i < len1; i++ )
	{
		// 場所の取得
		var pos = ~~(Math.random() * effBlockNum);

		// アイテム代入
		var ct = 0;
		for( var j = 0, len2 = obj.length; j < len2; j++ )
		{
			var hit = 0;
			for( var k = 0, len3 = obj[j].length; k < len3; k++ )
			{
				var block = obj[j][k];
				if( block && block.infinit == 0 )
				{
					if( ct == pos )
					{
						// 代入
						if( block.item == null )
						{
							block.item = itemStock[i];
							hit = 1;
							break;

						// 衝突回避
						} else
						{
							pos += ~~(4 * Math.random()) + 1;
							pos %= effBlockNum;
						}
					}

					// ブロック数をカウント
					ct++;
				}
			}
			if( hit == 1 ) { break; }
		}
	}

	return obj;
}



//--------------------------------------------------
// 配列のコピーを作る
//--------------------------------------------------
Array.prototype.copy = function()
{
	var obj = new Array();

	for( var i = 0, len = this.length; i < len; i++ ) {
		if( this[i].length > 0 && this[i].copy() ) { obj[i] = this[i].copy(); }
		else { obj[i] = this[i]; }
	}

	return obj;
}



//--------------------------------------------------
// 設定ファイルを読み込む
//--------------------------------------------------
function changeSetting(file)
{
	// 古いスクリプトを削除
	var oldScr = document.getElementById('setup');
	oldScr.parentNode.removeChild(oldScr);

	// あたらしいスクリプトを読み込み
	var newScr = document.createElement('script');
	newScr.type = 'text/javascript';
	newScr.src = file;
	newScr.id = 'setup';
	document.getElementsByTagName('head')[0].appendChild(newScr);

	// 初期化（読み込み完了後）
	newScr.onload = function() { init(0); }
}



//--------------------------------------------------
// 更新の確認
//--------------------------------------------------
function versionCheck()
{
	var updateURI = "http://xxxxx.xxx/widget/updates.js";
	var updateVer = appVer;

	// インスタンスの生成
	var xhr = null;
	if( window.XMLHttpRequest )
	{
		xhr = new XMLHttpRequest();
		xhr.overrideMimeType('text/xml');
	}
	else if( window.ActiveXObject )
	{
		// IE用
		try {
			xhr = new ActiveXObject('Msxml2.XMLHTTP');
		} catch (e) {
			xhr = new ActiveXObject('Microsoft.XMLHTTP');
		}
	}

	// 対応ブラウザのみ実行
	if( xhr != null )
	{
		// 接続
		xhr.open("GET", updateURI, true);
		xhr.send();

		// 状態遷移時の動作
		xhr.onreadystatechange = function()
		{
			// 受信完了
			if( this.readyState === 4 )
			{
				if( this.status === 200 || this.status === 201 )
				{
					// 実行
					eval(this.responseText);

					// 要更新メッセージの表示
					updateVer = updateVersion[appId];
					if( updateVer != null && Number(appVer) < Number(updateVer) )
					{
						new MessageBox("更新バージョンがリリースされています。<br><br>" + "現行Version: " + appVer + "<br>" + "最新Version: " + updateVer, false, null);

						// 「ゲームについて」画面でのバージョン表示
						var screenData = String(getScreenData('screen_about'));
						screenData = screenData.replace('<!--version-->', appVer);
						screenData = screenData.replace('<!--last_version-->', updateVer);

						// 「ゲームについて」画面の置き換え
						replaceScreenData('screen_about', screenData);
					}
				}
			}
		}
	}

	// 「ゲームについて」画面でのバージョン表示
	var screenData = String(getScreenData('screen_about'));
	screenData = screenData.replace('<!--version-->', appVer);
	screenData = screenData.replace('<!--last_version-->', updateVer);

	// 「ゲームについて」画面の置き換え
	replaceScreenData('screen_about', screenData);
}



//--------------------------------------------------
// onloadの動作設定
//--------------------------------------------------
window.onload = function()
{
	// 初期化
	init(0);

	// スタート画面の設定
	openScreen('screen_start');

	// 画面内容の保存
	saveScreenData('screen_stageClear');
	saveScreenData('screen_allClear');
	saveScreenData('screen_gameOver');
	saveScreenData('screen_record');
	saveScreenData('screen_about');

	// レコード画面の作成
	printRecordScreen(0, 0);

	// ボタンタッチ音の設定
	var anchors = document.getElementById('screenStock').getElementsByTagName('a');
	for( var i = 0, len = anchors.length; i < len; i++ ) {
		var anc = anchors[i];
		if( anc.className == 'barButton' ) {
			anc.onmouseover = function() { sounds.play('touchButton'); }
		}
	}

	// 更新の確認
	//versionCheck();
	//---------------
	// 「ゲームについて」画面でのバージョン表示
	var screenData = String(getScreenData('screen_about'));
	screenData = screenData.replace('<!--version-->', appVer);

	// 「ゲームについて」画面の置き換え
	replaceScreenData('screen_about', screenData);
	//---------------
}
window.oncontextmenu = function()
{
	return false;
}

// Make functions global
window.init = init;
window.drawOnce = drawOnce;
window.drawAll = drawAll;
window.statusView = statusView;
window.gameOver = gameOver;
window.getMouseMove = getMouseMove;
window.getKeyPress = getKeyPress;
window.simulateReset = simulateReset;
window.printRecordScreen = printRecordScreen;
window.changeSetting = changeSetting;
window.versionCheck = versionCheck;
window.Control = Control;
window.StatusManage = StatusManage;
window.Bar = Bar;
window.Ball = Ball;
window.Item = Item;
window.Block = Block;
window.Weapon = Weapon;
window.Sound = Sound;
window.Heart = Heart;
window.Cloud = Cloud;
window.Balloon = Balloon;
window.ScoreManage = ScoreManage;
window.ImageData = ImageData;
window.MessageBox = MessageBox;
