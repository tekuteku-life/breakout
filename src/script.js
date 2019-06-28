// Copyright (C) 2010-2012 kt9, All rights reserved.
//--------グローバル変数の定義----------
var dynamicCanvas;																// 動的描画用キャンバス
var staticCanvas;																// 静的描画用キャンバス
var dynamicCtx;																	// 動的描画用コンテキスト
var staticCtx;																	// 静的描画用コンテキスト
var canvasBg;																	// キャンバスの背景
var bar;																		// バー
var balls = new Array();														// ボール
var items = new Array();														// アイテム
var balloons = new Array();														// バルーン
var weapons = new Array();														// 武器
var sounds;																		// サウンド
var statusMng;																	// ステータス計算
var scoreMng;																	// 得点管理
var ctrl;																		// ゲーム制御
var imgData;																	// 画像データ
var storage;																	// Web Storageオブジェクト

var timer_All;																	// 描画と動きのタイマー
var FRATE = 1000 / FPS;															// 更新間隔

var pointX = canvasWidth / 2;													// マウスの横方向座標
var pointY = 0;																	// マウスの縦方向座標
var mouseDownTime = 0;															// マウスダウン時の時刻

var keyPressIncr = 0;															// キー長押しによる増加率調整
var keyStr = '';																// 押下キー文字
var keyCode = '';																// 押下キーコード

var awardKeyList = new Array(													// アワードのキー
	'remainderLife',															// 残りライフアワード
	'ballNum',																	// 球数アワード
	'strengClear',																// 強化・無敵状態クリアアワード
	'continuousBreakNum',														// 連続破壊最大数アワード
	'continuousBreakClear',														// 連続破壊クリアアワード
	'clearTime',																// クリア時間アワード
	'getItemNum',																// アイテム取得回数アワード
	'fallBallNum'																// 球の落下回数アワード
);

var blockMap;																	// ブロックマップ
//--------グローバル変数の定義----------

//--------定数の定義----------
//-----システムパラメータ-----
var SYSTEM_PARAM = {
	BALL_HIST_MAX: 4,			// ボール座標履歴最大数
};
//-----ボールインスタンス生成モード-----
var BALL_CREATE_MODE = {
	LAUNCH: 1,					// 発射
	OTHER: 0,					// その他
};
//-----ボールコピーモード-----
var BALL_COPY_MODE = {
	RAND : 0,					// ランダム
	SIMULATE : 1,				// シミュレーション用
};
//-----シミュレーション用パラメータ-----
var SIMULATE_PARAM = {
	RESOLUTION : 400,			// シミュレーション速度解像度
	TIMES_PER_STEP : 10,		// 1ステップ当たりのシミュレーション回数
	MAX_PREDICT : 50,			// 最大シミュレーション時間（FPS）
};
//-----ブロック機能-----
var BLOCK_FUNCTION = {
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
var BALL_STATUS = {
	NORMAL : 0,					// 通常
	STRONG : 1,					// 強化
	ULTIMATE : 2,				// 無敵
};
//--------定数の定義----------

var appVer = 'v1.7.6';															// アプリケーションバージョン
var appId = 'breakout';															// アプリケーションID
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
// ゲーム制御
//--------------------------------------------------
function Control()
{
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
	this.formSelector["setting"] = document.getElementById('setup_select');
	this.formSelector["stage"] = document.getElementById('stage_select');
	this.formSelector["continue"] = document.getElementById('continue_select');
	this.formSelector["sound"] = document.getElementById('sound_select');
	this.formSelector["sizefit"] = document.getElementById('sizefit_select');
	this.formSelector["ctrl"] = document.getElementById('ctrl_select');



	//--------------------------------------------------
	// 音の設定の読み書き
	//--------------------------------------------------
	this.loadSoundSwitch = function()
	{
		if( storage.getItem("setting_soundSwitch") != null ) { this.soundSwitch = storage.getItem("setting_soundSwitch"); }
	}
	this.recordSoundSwitch = function()
	{
		storage.setItem("setting_soundSwitch", this.soundSwitch);
	}


	//--------------------------------------------------
	// サイズ調整の設定の読み書き
	//--------------------------------------------------
	this.loadSizeFitSwitch = function()
	{
		if( storage.getItem("setting_sizeFitSwitch") != null ) { this.sizeFitSwitch = storage.getItem("setting_sizeFitSwitch"); }
	}
	this.recordSizeFitSwitch = function()
	{
		storage.setItem("setting_sizeFitSwitch", this.sizeFitSwitch);
	}


	//--------------------------------------------------
	// ゲーム開始方法の設定の読み書き
	//--------------------------------------------------
	this.loadContinueSwitch = function()
	{
		if( storage.getItem("setting_continueSwitch") != null ) { this.continueSwitch = storage.getItem("setting_continueSwitch"); }
	}
	this.recordContinueSwitch = function()
	{
		storage.setItem("setting_continueSwitch", this.continueSwitch);
	}


	//--------------------------------------------------
	// 操作方法の設定の読み書き
	//--------------------------------------------------
	this.loadCtrlSwitch = function()
	{
		if( storage.getItem("setting_ctrlSwitch") != null ) { this.ctrlSwitch = storage.getItem("setting_ctrlSwitch"); }
	}
	this.recordCtrlSwitch = function()
	{
		storage.setItem("setting_ctrlSwitch", this.ctrlSwitch);
	}


	//--------------------------------------------------
	// ステージインデックスの設定の読み書き
	//--------------------------------------------------
	this.loadStageIndex = function()
	{
		if( storage.getItem("continue_stageIndex") != null && this.continueSwitch == 1 ) { this.setStageIndex(storage.getItem("continue_stageIndex")); }
	}
	this.recordStageIndex = function()
	{
		storage.setItem("continue_stageIndex", this.stageIndex);
	}


	//--------------------------------------------------
	// 自動プレイのトグル
	//--------------------------------------------------
	this.autoSwitchToggle = function()
	{
		if( this.autoSwitch == 0 ) { this.autoSwitch = 1; }
		else { this.autoSwitch = 0; }
	}


	//--------------------------------------------------
	// 一時停止のオン・オフ・トグル
	//--------------------------------------------------
	this.pauseSwitchOn = function()
	{
		// 画面の切り替え
		allClose();
		openScreen('screen_pause');

		// 値の設定
		this.pauseSwitch = 1;
	}
	this.pauseSwitchOff = function()
	{
		// 画面の切り替え
		closeScreen('screen_pause');

		this.pauseSwitch = 0;
	}
	this.pauseSwitchToggle = function()
	{
		if( this.pauseSwitch == 0 ) { this.pauseSwitchOn(); }
		else { this.pauseSwitchOff(); }
	}


	//--------------------------------------------------
	// 音の設定のトグル
	//--------------------------------------------------
	this.soundSwitchToggle = function()
	{
		// オン
		if( this.soundSwitch == 0 )
		{
			// 値の設定
			this.soundSwitch = 1;

			// セレクタの変更
			ctrl.formSelector["sound"].childNodes[0].selected = '';
			ctrl.formSelector["sound"].childNodes[1].selected = 'selected';

		// オフ
		} else
		{
			// 値の設定
			this.soundSwitch = 0;

			// セレクタの変更
			ctrl.formSelector["sound"].childNodes[0].selected = 'selected';
			ctrl.formSelector["sound"].childNodes[1].selected = '';
		}

		// 設定の記録
		this.recordSoundSwitch();
	}


	//--------------------------------------------------
	// 制御方法の設定のトグル
	//--------------------------------------------------
	this.ctrlSwitchToggle = function()
	{
		// キーボード制御へ
		if( this.ctrlSwitch == 0 )
		{
			// 値の設定
			this.ctrlSwitch = 1;

			// セレクタの変更
			ctrl.formSelector["ctrl"].childNodes[0].selected = '';
			ctrl.formSelector["ctrl"].childNodes[1].selected = 'selected';

		// マウス制御へ
		} else
		{
			// 値の設定
			this.ctrlSwitch = 0;

			// セレクタの変更
			ctrl.formSelector["ctrl"].childNodes[0].selected = 'selected';
			ctrl.formSelector["ctrl"].childNodes[1].selected = '';
		}

		// 設定の記録
		this.recordCtrlSwitch();
	}


	//--------------------------------------------------
	// ステージインデックスの設定
	//--------------------------------------------------
	this.setStageIndex = function(_stage)
	{
		// ステージセレクタのリセット
		if( this.formSelector["stage"].childNodes.length > 0 ) { this.formSelector["stage"].childNodes[this.stageIndex].selected = ''; }

		// 値の設定
		this.stageIndex = _stage;

		// ステージインデックスの制限
		if( 0 > this.stageIndex ) { this.stageIndex = 0; }
		else if( this.stageIndex >= blockMapSet.length )
		{
			this.stageIndex = 0;
		}

		// ステージセレクタのセット
		if( this.formSelector["stage"].childNodes.length > 0 ) { this.formSelector["stage"].childNodes[this.stageIndex].selected = 'selected'; }
	}


	//--------------------------------------------------
	// ステージインデックスを進める
	//--------------------------------------------------
	this.forwardStageIndex = function()
	{
		// ステージセレクタのリセット
		if( this.formSelector["stage"].childNodes.length > 0 ) { this.formSelector["stage"].childNodes[this.stageIndex].selected = ''; }

		// 値の設定
		this.stageIndex++;

		// ステージインデックスの制限
		if( 0 > this.stageIndex ) { this.stageIndex = 0; }
		else if( this.stageIndex >= blockMapSet.length )
		{
			this.stageIndex = 0;
			this.stageEnded = 1;
		}

		// ステージセレクタのセット
		if( this.formSelector["stage"].childNodes.length > 0 ) { this.formSelector["stage"].childNodes[this.stageIndex].selected = 'selected'; }

		// 継続情報のクリア
		if( storage != null )
		{
			storage.setItem("continue_life", defaultLife);
			storage.setItem("continue_time", 0);
			storage.setItem("continue_score", 0);
		}
	}


	//--------------------------------------------------
	// ステージインデックスを戻す
	//--------------------------------------------------
	this.backwardStageIndex = function()
	{
		// ステージセレクタのリセット
		if( this.formSelector["stage"].childNodes.length > 0 ) { this.formSelector["stage"].childNodes[this.stageIndex].selected = ''; }

		// 値の設定
		this.stageIndex--;

		// ステージインデックスの制限
		if( 0 > this.stageIndex ) { this.stageIndex = 0; }
		else if( this.stageIndex >= blockMapSet.length )
		{
			this.stageIndex = 0;
			this.stageEnded = 1;
		}

		// ステージセレクタのセット
		if( this.formSelector["stage"].childNodes.length > 0 ) { this.formSelector["stage"].childNodes[this.stageIndex].selected = 'selected'; }

		// 継続情報のクリア
		if( storage != null )
		{
			storage.setItem("continue_life", defaultLife);
			storage.setItem("continue_time", 0);
			storage.setItem("continue_score", 0);
		}
	}


	//--------------------------------------------------
	// 画面サイズの調整
	//--------------------------------------------------
	this.fixSize = function()
	{
		// 画面サイズの取得
		var screenWidth = 0;
		var screenHeight = 0;
		if( document.all != null )
		{
			screenWidht = document.clientWidth;
			screenHeight = document.clientHeight;
		} else {
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
		var bodyObjStyle = document.getElementsByTagName('body')[0].style;
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
// 反射バー
//--------------------------------------------------
function Bar()
{
	this.x = pointX;										// バー横軸位置
	this.y = canvasHeight - barDefaultHeight - 5.5;			// バー縦軸位置
	this.vx = 0;											// バー速度
	this.vxMax = barDefaultSpeed;							// バー最大速度
	this.width = barDefaultWidth;							// バー幅
	this.height = barDefaultHeight;							// バー高
	this.alpha = 1;											// バーの透過率調整
	this.widthStatusTime = 0;								// バー長の状態時間
	this.speedStatusTime = 0;								// バー速度の状態時間
	this.weapon = 0;										// バーの武器状態
	this.weaponTime = 0;									// バーの武器状態時間
	this.weaponInter = 0;									// バーの武器使用間隔
	this.vibrationTime = 0;									// バーの振動状態時間
	this.absorptionStatusTime = 0;							// バーの吸着状態時間
	this.absorptionNum = 0;									// バーの吸着球数
	this.edge = barEdge;									// バーの端の傾斜
	this.color = barColor;									// バーの色
	this.simuData = new Array();							// シミュレーションの引き継ぎ情報
	this.immortalStatusTime = 0;							// 不死身
	this.disturbStatusTime = 0;								// 画面の難視化
	this.hitPoint = barDefaultHP;							// バーのHP



	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	this.draw = function(ctx)
	{
		// 武器の描画
		if( this.weapon != 0 ) {
			new Weapon(this.weapon, ~~(this.getLeftX()), ~~(this.getTopY())).draw(ctx);
			new Weapon(this.weapon, ~~(this.getRightX()), ~~(this.getTopY())).draw(ctx);
		}

		// バー状態解除前の点滅制御
		if( (this.widthStatusTime != 0 && this.widthStatusTime <= barStatusDefaultTime * FPS * 0.25) || 
			(this.magnetStatusTime != 0 && this.magnetStatusTime <= barStatusDefaultTime * FPS * 0.25)
		) {
			this.alpha -= 0.05;
			if( this.alpha < 0.1 ) { this.alpha = 1; }
		} else {
			this.alpha = 1;
		}

		// 描画開始
		ctx.beginPath();
		ctx.globalAlpha = this.alpha;
		ctx.fillStyle = this.color;

		// 吸着状態の描画
		if( this.absorptionStatusTime > 0 )
		{
			var barEdgeX = this.getLeftX();
			var absArcInterDistance = this.width/10;
			var absArcSize = this.width/6;
			for( var i = 0; i < 10; i++ )
			{
				var absArcRadius = absArcSize * (0.2 * Math.random() + 0.2);
				ctx.arc(barEdgeX + (i + 0.5)*absArcInterDistance, this.getTopY() + absArcSize*0.4, absArcRadius, 0, Math.PI * 2, false);
			}
			ctx.fill();
		}

		// 本体の描画
		var shortHalfWidth = this.width * (0.5 - this.edge * this.height/2);
		var longHalfWidth = this.width / 2;
		ctx.beginPath();
		ctx.moveTo( ~~(this.getCenterX() + shortHalfWidth) - 0.5	, ~~this.getTopY() - 0.5 );
		ctx.lineTo( ~~(this.getCenterX() - shortHalfWidth) - 0.5	, ~~this.getTopY() - 0.5 );
		ctx.lineTo( ~~(this.getCenterX() - longHalfWidth) - 0.5	, ~~(this.getBottomY()) - 0.5 );
		ctx.lineTo( ~~(this.getCenterX() + longHalfWidth) - 0.5	, ~~(this.getBottomY()) - 0.5 );
		ctx.closePath();
		ctx.fill();

		ctx.globalAlpha = 1;
	}


	//--------------------------------------------------
	// 上下・左右・中央座標取得
	//--------------------------------------------------
	this.getLeftX = function() {
		return this.x - this.width *0.5;
	}
	this.getCenterX = function() {
		return this.x;
	}
	this.getRightX = function() {
		return this.x + this.width *0.5;
	}
	
	this.getTopY = function() {
		return this.y;
	}
	this.getCenterY = function() {
		return this.y + this.height *0.5;
	}
	this.getBottomY = function() {
		return this.y + this.height;
	}


	//--------------------------------------------------
	// 吸着ボールの再発射
	//--------------------------------------------------
	this.relaunch = function()
	{
		// 吸着しているボールを探す
		for( var i = 0, len = balls.length; i < len; i++ )
		{
			var ball = balls[i];

			if( ball.isAbsorption == 1 )
			{
				// 吸着状態の解除
				ball.isAbsorption = 0;

				// 球速の変更
				if( Math.abs(this.vx) > ballDefaultSpeed*0.3 )
				{
					ball.vx = this.vx * barSpin;

				// ランダムに決定
				} else
				{
					ball.vx *= Math.random()*0.7 + 0.3;
				}

				// 吸着球個数の減少
				this.absorptionNum--;
				break;
			}
		}
	}


	//--------------------------------------------------
	// 移動・状態遷移
	//--------------------------------------------------
	this.move = function()
	{
		// バー速度の計算
		this.vx = pointX - this.getCenterX();

		// バー速度の制限
		if( Math.abs(this.vx) > this.vxMax ) { this.vx = this.vxMax * (this.vx < 0 ? -1 : 1); }

		// 位置の移動
		this.x += this.vx;

		// バーの振動
		if( this.vibrationTime > 0 )
		{
			this.vibrationTime--;

			// 振動幅の計算
			var vibrationWidth = this.width;

			// 画面端処理
			var half_barWidth = ~~(this.width / 2);
			var edgeBias = 0;
			if( pointX < half_barWidth ) {
				edgeBias = (half_barWidth - pointX)/half_barWidth;
			} else if( pointX > canvasWidth - half_barWidth ) {
				edgeBias = (canvasWidth - half_barWidth - pointX)/half_barWidth;
			}

			this.x += ~~((~~(Math.random() * 2) * 2 - 1 + edgeBias) * Math.random() * vibrationWidth);
		}

		// バー位置の制限
		var half_barWidth = ~~(this.width / 2);
		if( this.getLeftX() < 0 ) {
			this.vx -= this.getLeftX();
			this.x = half_barWidth;
		} else if( this.getRightX() > canvasWidth ) {
			this.vx -= this.getRightX() - canvasWidth;
			this.x = canvasWidth - half_barWidth;
		}

		// 武器発射間隔の制御
		if( this.weaponInter > 0 ) { this.weaponInter--; }

		// バー長状態の制御
		if( this.widthStatusTime > 0 ) {
			this.widthStatusTime--;

			// 状態解除
			if( this.widthStatusTime <= 0 ) { this.width = barDefaultWidth; }
		}

		// バー速度状態の制御
		if( this.speedStatusTime > 0 )
		{
			this.speedStatusTime--;

			// バーサイズの変更
			if( this.vxMax > barDefaultSpeed ) { this.height = barDefaultHeight * 0.6; }
			else { this.height = barDefaultHeight * 1.6; }

			// 状態解除
			if( this.speedStatusTime <= 0 ) {
				this.vxMax = barDefaultSpeed;
				this.height = barDefaultHeight;
			}
		}

		// 武器状態の制御
		if( this.weaponTime > 0 )
		{
			this.weaponTime--;

			// 状態解除
			if( this.weaponTime <= 0 ) { this.weapon = 0; }
		}

		// 吸着状態の制御
		if( this.absorptionStatusTime > 0 )
		{
			this.absorptionStatusTime--;

			// 吸着状態解除
			if( this.absorptionStatusTime <= 0 )
			{
				for( ; this.absorptionNum > 0; )
				{
					this.relaunch();
				}
			}
		}

		// 不死身状態の制御
		if( this.immortalStatusTime > 0 )
		{
			this.immortalStatusTime--;

			// 不死身状態の解除
			if( this.immortalStatusTime <= 0 )
			{
				this.immortalStatusTime = 0;

				// バー色を戻す
				this.color = barColor;
			}
		}

		// 画面の難視化状態の制御
		if( this.disturbStatusTime > 0 )
		{
			this.disturbStatusTime--;

			// 画面の難視化状態の解除
			if( this.disturbStatusTime <= 0 )
			{
				this.disturbStatusTime = 0;
			}
		}
	}


	//--------------------------------------------------
	// HPの減少
	//--------------------------------------------------
	this.endamage = function(_damage)
	{
		// HPの減少
		this.hitPoint = Number(this.hitPoint) - Number(_damage);

		// HPがゼロでライフを1消費
		if( this.hitPoint <= 0 )
		{
			// HPを回復
			this.hitPoint = barDefaultHP;

			// ライフを消費
			statusMng.addLife(-1);
		}
	}


	//--------------------------------------------------
	// 自動プレイ
	//--------------------------------------------------
	this.auto = function()
	{
		// 最大予測数の計算
		var MAX_PREDICT = SIMULATE_PARAM.MAX_PREDICT * FPS;

		var targetX = -1;
		var fallBall = null;
		var fallBallI;
		var fallBallTime = MAX_PREDICT;
		var fallItemTime = MAX_PREDICT;
		var fallItemX = -1;
		var fallWeaponTime = MAX_PREDICT;
		var plusSpeed = 0;
		var ballNum = balls.length;
		var moveSpeed = this.vxMax;

		//----------発射制御及び初期化----------
		if( ballNum == 0 )
		{
			// スタート画面の終了
			allClose();

			// 初期位置及び初速度の決定
			this.x = ~~( canvasWidth / 2 * (1 + (~~(Math.random() * 2) * 2 - 1) * Math.random()) );
			this.vx = ballDefaultSpeed * (Math.random() * 0.5 + 0.8) * (~~(Math.random() * 2) * 2 - 1);

			// 球発射
			mouseDownTime = Date.now() - 1000;
			balls[0] = new Ball(BALL_CREATE_MODE.LAUNCH);
		}
		//----------発射制御及び初期化----------

		// 吸着状態解除
		if( this.absorptionNum > 0 )
		{
			for( var i = 0; i < this.absorptionNum; i++ ) {
				this.relaunch();
			}
		}

		//----------落下が近い球の選択----------
		var fallSimulate = new Array();
		for( var i = 0; i < ballNum; i++ ) { fallSimulate[i] = balls[i].copy(BALL_COPY_MODE.SIMULATE); }

		// ボールの動きのシミュレート
		simulateReset();
		for( var t = 0; t < fallBallTime; t++ )
		{
			for( var i = 0; i < ballNum; i++ )
			{
				var ball = fallSimulate[i];

				// 選択
				if( ball.vy > 0 && ball.getBottomY() >= this.y )
				{
					// 到達可能範囲内
					if( Math.abs( this.getCenterX() - ball.getCenterX() ) - this.width / 2 <= moveSpeed * t )
					{
						fallBall = ball;
						fallBallTime = t;
						fallBallI = i;
						break;
					}

				// 実行
				} else {
					ball.move();
				}
			}
		}
		//----------落下が近い球の選択----------

		//----------落下が近いアイテムの選択----------
		for( var i = 0, len = items.length; i < len; i++ )
		{
			var item = items[i];

			// 一番落下が近いアイテムを選択
			var tmpFallItemTime = (this.y - item.getBottomY()) / itemSpeed[ctrl.stageIndex];
			if( fallItemTime > tmpFallItemTime && (Math.abs(this.getCenterX() - item.getCenterX()) - (blockWidth + this.width) / 2) / moveSpeed <= fallItemTime )
			{
				// 落下時刻の取得
				fallItemTime = tmpFallItemTime;

				// アイテム落下位置の決定
				fallItemX = item.getCenterX();
				targetX = fallItemX;

				// 不利益アイテムの接近
				if( item.type == 4 || item.type == 6 || item.type == 11 || item.type == 12 || item.type == 15 || ( itemProb[ctrl.stageIndex][5] > 0.1 && item.type == 3 ) )
				{
					// 衝突回避（アイテム接近）
					if( fallItemTime * moveSpeed <= (blockWidth + this.width) * 2 && Math.abs(targetX - this.getCenterX()) <= (blockWidth + this.width) / 2 + 2 )
					{
						// 左へ回避
						if( ( this.width < item.getLeftX() && item.getLeftX() > this.getCenterX() ) || canvasWidth <= item.getRightX() + this.width ) {
							targetX -= (this.width + blockWidth) / 2 + 1;

						// 右へ回避
						} else {
							targetX += (this.width + blockWidth) / 2 + 1;
						}

					// 無視
					} else {
						fallItemTime = MAX_PREDICT;
						targetX = -1;
					}
				}
			}
		}
		//----------落下が近いアイテムの選択----------

		//----------落下が近い攻撃の選択----------
		for( var i = 0, len = weapons.length; i < len; i++ )
		{
			var weapon = weapons[i];

			// ブロックの攻撃の衝突危険性のあるものを選択
			if( weapon.vect < 0 && (this.y - weapon.y) / weapon.vy < fallWeaponTime && Math.abs(weapon.x - this.getCenterX()) <= this.width/2 + 3 )
			{
				// 落下時間の更新
				fallWeaponTime = (this.y - weapon.y) / weapon.vy;

				// ボール側に移動
				if( (fallBall.getCenterX() > weapon.x && weapon.x + this.width + 3 <= canvasWidth) || (weapon.x - this.width - 3 < 0) ) { targetX = weapon.x + this.width/2 + 3; }
				else { targetX = weapon.x - this.width/2 - 3; }
			}
		}
		//----------落下が近い攻撃の選択----------

		//----------最適経路の選択----------
		if( fallBall != null )
		{
			// 球優先
			if( targetX == -1 || (Math.abs( targetX - fallBall.getCenterX() ) > ( fallBallTime - fallItemTime ) * moveSpeed && Math.abs( targetX - fallBall.getCenterX() ) > ( fallBallTime - fallWeaponTime ) * moveSpeed ))
			{
				targetX = fallBall.getCenterX();
			}
			else if( fallItemX == targetX )
			{
				// 球にできるだけ近づく
				if( Math.abs( fallBall.getCenterX() - targetX ) > (blockWidth + this.width) / 2 )
				{
					// 球が左側
					if( item.getCenterX() > fallBall.getCenterX() ) { targetX -= (blockWidth + this.width) / 2 - 1; }

					// 球が右側
					else { targetX += (blockWidth + this.width) / 2 - 1; }

				// 球と十分に近い場合
				} else {
					fallItemTime = MAX_PREDICT;
				}
			}

			// 一時変数へ落とす
			var fallBallX = fallBall.getCenterX();
			var fallBallVX = fallBall.vx;
			var sim = this.simuData;

			// シミュレート情報の更新
			if( sim == null || sim["x"] != fallBallX || sim["vx"] != fallBallVX || sim["status"] != fallBall.status || sim["statusTime"] != fallBall.statusTime )
			{
				// 補正最大速度の算出
				var leftSpeed = (fallBallX - canvasWidth - this.width / 2) * barSpin;
				var rightSpeed = (fallBallX - this.width / 2) * barSpin;
				if( Math.abs( leftSpeed + fallBallVX ) > ballMaxSpeed ) { leftSpeed = ballMaxSpeed * ( leftSpeed < 0 ? -1 : 1 ) - fallBallVX; }
				if( Math.abs( rightSpeed + fallBallVX ) > ballMaxSpeed ) { rightSpeed = ballMaxSpeed * ( rightSpeed < 0 ? -1 : 1 ) - fallBallVX; }
				if( Math.abs( leftSpeed ) > moveSpeed * barSpin ) { leftSpeed = moveSpeed * barSpin * ( leftSpeed < 0 ? -1 : 1 ); }
				if( Math.abs( rightSpeed ) > moveSpeed * barSpin ) { rightSpeed = moveSpeed * barSpin * ( rightSpeed < 0 ? -1 : 1 ); }
				if( leftSpeed > rightSpeed ) {
					var tmp = leftSpeed;
					leftSpeed = rightSpeed;
					rightSpeed = tmp;
				}

				// 落下球情報の加工
				fallBall.vy *= -1;
				fallBall.y = this.getTopY() - ballSize;
				fallBall.breakNum = 0;
				fallBall.collisionNum = 0;

				// 情報の更新
				sim["stDvx"] = leftSpeed;
				sim["enDvx"] = rightSpeed;
				sim["x"] = fallBallX;
				sim["vx"] = fallBallVX;
				sim["status"] = fallBall.status;
				sim["statusTime"] = fallBall.statusTime;
				sim["self"] = fallBall.copy();
				sim["breakMaxNum"] = 0;
				sim["collisionMaxNum"] = 0;
				sim["returnTime"] = MAX_PREDICT;
				sim["dvx"] = 0;
				sim["step"] = ballMaxSpeed * 2 / SIMULATE_PARAM.RESOLUTION;

				// シミュレート時間の短縮（落下までに間に合う回数にする）
				if( fallBallTime < (SIMULATE_PARAM.RESOLUTION / SIMULATE_PARAM.TIMES_PER_STEP)*0.9 ) { sim["step"] = ballMaxSpeed * 2 / (fallBallTime - 2); }

			// シミュレート情報の引き継ぎ
			} else if( fallBallTime <= 2 ) {
				plusSpeed = sim["dvx"];
			}

			// 最適経路の探索
			if( sim["stDvx"] <= sim["enDvx"] )
			{
				var maxBreakNum = sim["breakMaxNum"];
				var maxCollisionNum = sim["collisionMaxNum"];
				var returnTime = sim["returnTime"];
				var fallBall = sim["self"];

				// 速度の準備
				var dvx;
				var dvxStep = sim["step"];
				var stDvx = sim["stDvx"];
				var enDvx = sim["enDvx"];
				for( dvx = stDvx, ct = 0; dvx <= enDvx && ct < SIMULATE_PARAM.TIMES_PER_STEP; dvx += dvxStep, ct++ )
				{
					// シミュレート準備
					var simulate = new Array();
					for( var i = 0; i < ballNum; i++ )
					{
						// 速度変更
						if( fallBallI == i ) { simulate[i] = fallBall.copy(BALL_COPY_MODE.SIMULATE); }

						// その他
						else { simulate[i] = fallSimulate[i].copy(BALL_COPY_MODE.SIMULATE); }
					}
					simulate[fallBallI].vx += dvx;

					// ボールの動きのシミュレート
					simulateReset();
					var t;
					for( t = 0; simulate[fallBallI].getBottomY() <= this.getTopY() && t <= MAX_PREDICT; t++ )
					{
						for( var i = 0; i < ballNum; i++ ) {
							var ball = simulate[i];
							if( ball.getBottomY() <= this.getTopY() ) { ball.move(); }
						}
					}

					// 速度の選択
					var checkBreakNum = simulate[fallBallI].breakNum;
					var checkCollisionNum = simulate[fallBallI].collisionNum;
					if( (maxBreakNum + maxCollisionNum) / returnTime < (checkBreakNum + checkCollisionNum) / t )
					{
						maxBreakNum = checkBreakNum;
						maxCollisionNum = checkCollisionNum;
						returnTime = t;
						sim["dvx"] = dvx;
					}
				}

				// 次回へのデータの引き継ぎ
				sim["breakMaxNum"] = maxBreakNum;
				sim["collisionMaxNum"] = maxCollisionNum;
				sim["returnTime"] = returnTime;
				sim["stDvx"] = dvx;
			}
			
			// 衝突見込みなしの場合の探索
			if( fallBallTime <= 2 && sim["breakMaxNum"] == 0 && sim["collisionNum"] == 0 && Math.random() > 0.3 )
			{
				var dx = canvasWidth;
				plusSpeed = ballDefaultSpeed * ( 0.8 + Math.random() * 0.4 ) * ( ~~(Math.random() * 2) * 2 - 1 ) - fallBallVX;

				// 位置・速度を変更
				for( var x = 0; x < canvasWidth; x += barDefaultSpeed * (Math.random() * 0.3 + 0.7) )
				{
					for( var vx = -ballMaxSpeed; vx < ballMaxSpeed; vx += ballMaxSpeed / 10 * (Math.random() + 1) * 0.5 )
					{
						// シミュレート
						var check = fallBall.copy(BALL_COPY_MODE.SIMULATE);
						check.x = x;
						check.vx = vx;
						simulateReset();
						for( var t = 0; check.getBottomY() <= this.getTopY() && t <= MAX_PREDICT; t++ ) { check.move(); }

						// 目的地に応じた速度選択
						if( check.breakNum > 0 && dx > Math.abs( x - fallBallX ) ) {
							dx = Math.abs( x - fallBallX );
							plusSpeed = ballDefaultSpeed * (x - fallBallX) / canvasWidth * 10 - fallBallVX;
						}
					}
				}

				// 速度の制限
				if( Math.abs(plusSpeed + fallBallVX) > ballMaxSpeed ) { plusSpeed = ballMaxSpeed * (plusSpeed < 0 ? -1 : 1) - fallBallVX; }
			}
		}
		//----------最適経路の選択----------

		//----------武器使用及び移動----------
		if( this.weapon != 0 ) {
			var blockLine = new Array();

			// ブロックマッピングの初期化
			for( var i = 0, len = ~~(canvasWidth / blockWidth); i < len; i++ ) {
				blockLine[i] = 0;
			}

			// 発射済み武器の考慮
			for( var i = 0; i < weapons.length; i++ ) {
				var weapX = ~~(weapons[i].x / blockWidth);

				// 武器の考慮
				if( weapons[i].vect > 0 ) { blockLine[weapX]--; }
			}

			// ブロックの存在を確認
			for( var i = blockMap.length; i >= 0; i-- )
			{
				if( blockMap[i] != null )
				{
					for( var j = 0, len2 = blockMap[i].length; j < len2; j++ )
					{
						var block = blockMap[i][j];

						// マッピング
						if( block != null && block.type != 0 )
						{
							// 破壊不可
							if( block.infinit == 1 && this.weapon == 1 && blockLine[j] == 0 ) {
								blockLine[j] = -10000;

							// 破壊可
							} else if( blockLine[j] != -10000 ) {
								blockLine[j] += 1 + (this.weapon != 1 ? 0 : block.life);
							}
						}
					}
				}
			}

			// 移動を確認
			var breakX = -1;
			var breakDx = canvasWidth;
			var checkX = (targetX == -1 ? this.getCenterX() : targetX);
			for( var i = 0, len = blockLine.length; i < len; i++ )
			{
				// 破壊ブロックの選択
				if( blockLine[i] > 0 )
				{
					// 効率の良い場所を選ぶ
					if( breakDx > Math.abs(checkX - (i + 0.5) * blockWidth) )
					{
						breakX = (i + 0.5) * blockWidth;
						breakDx = Math.abs(checkX - breakX);
					}
				}
			}

			// 発射
			if( breakX != -1 && Math.abs(this.getCenterX() - breakX) <= blockWidth*0.5 && weapons.length < weaponMaxNum[this.weapon - 1] && this.weaponInter <= 0 ) {
				weapons[weapons.length] = new Weapon(this.weapon, this.getCenterX());
			}

			// 移動
			if( breakX != -1 && (fallItemX == -1 || (Math.abs(fallItemX - breakX) + Math.abs(breakX - this.getCenterX()) <= (fallItemTime - 3) * moveSpeed)) &&
				(fallBall == null || (Math.abs(fallBall.getCenterX() - breakX) + Math.abs(breakX - this.getCenterX()) <= (fallBallTime - 3) * moveSpeed))
			) {
				// 次の移動に備える（ブロック端に寄る）
				if( Math.abs(breakX - targetX) > blockWidth / 2 ) {
					breakX += (blockWidth * 0.35) * (targetX > breakX ? 1 : -1);
				}

				targetX = breakX;
			}
		}
		//----------武器使用及び移動----------

		// バーの移動
		if( targetX != -1 )
		{
			// バー速度へ変換
			if( fallBallTime > 1 ) { plusSpeed /= barSpin; }
			else { plusSpeed = 0; }

			// 移動
			pointX = targetX - plusSpeed;
		}
	}
}



//--------------------------------------------------
// ボール
//--------------------------------------------------
function Ball(launch)
{
	this.radius = ballSize;									// ボールの半径
	this.x;													// ボール横方向位置
	this.y;													// ボール縦方向位置
	this.vx;												// ボール横方向速度
	this.vy;												// ボール縦方向速度
	this.histX = new Array();								// ボール横方向位置履歴
	this.histY = new Array();								// ボール縦方向位置履歴
	this.pointIncr = blockDefaultPoint;						// ポイント増分
	this.simulate = 0;										// シミュレートフラグ
	this.breakNum = 0;										// ブロック破壊回数
	this.collisionNum = 0;									// ブロック衝突回数
	this.status = 0;										// ボール状態
	this.statusTime = 0;									// ボール状態時間
	this.duaration = 0;										// 滞空時間
	this.isAbsorption = 0;									// 吸着状態フラグ
	this.absorptionPoint = new Array(0, 0);					// 吸着座標（バーからの相対位置）
	this.imgData = imgData.getDataArr("ball");				// 画像データ



	//--------------------------------------------------
	// 発射
	//--------------------------------------------------
	if( launch == BALL_CREATE_MODE.LAUNCH ) {
		// ため打ち時間の計算
		var diffTime = 0;
		if( mouseDownTime != 0 )
		{
			diffTime = ( Date.now() - mouseDownTime ) / 1000;
			if( diffTime > 1 ) { diffTime = 1; }
		}

		// 初速度の決定
		this.vx = ((Math.random() + 1) * ballDefaultSpeed * 0.5 / Math.abs(bar.vx) + 1) + bar.vx;
		this.vy = -1 * (ballDefaultSpeed + ( ballMaxSpeed - ballDefaultSpeed ) * diffTime);
		if( Math.abs(this.vy) > ballMaxSpeed ) { this.vy = ballMaxSpeed * ( this.vy < 0 ? -1 : 1 ); }
		if( Math.abs(this.vx) > ballMaxSpeed ) { this.vx = ballMaxSpeed * ( this.vx < 0 ? -1 : 1 ); }

		// 初期位置の決定
		this.x = bar.getCenterX();
		this.y = bar.getTopY() - this.radius;
	}



	//--------------------------------------------------
	// コピー
	//--------------------------------------------------
	this.copy = function(mode)
	{
		var obj = new Ball(BALL_CREATE_MODE.OTHER);
		obj.x = this.x;
		obj.y = this.y;
		obj.vx = this.vx;
		obj.vy = this.vy;
		obj.histX = new Array();
		obj.histY = new Array();
		obj.status = this.status;
		obj.statusTime = this.statusTime;
		obj.simulate = 0;
		obj.collisionNum = 0;
		obj.breakNum = 0;
		obj.pointIncr = 10;
		obj.duaration = this.duaration;

		// 誤作動防止用データの追加
		obj.histX = this.histX.copy();
		obj.histY = this.histY.copy();

		// 速度変更
		if( mode == BALL_COPY_MODE.RAND )
		{
			if( obj.vy > 0 && Math.random() < 0.6 ) { obj.vy *= -1; }
			else { obj.vy = (Math.random() * 0.15 + 0.85) * ballDefaultSpeed; }
			obj.vx = (~~(Math.random() * 2) * 2 - 1) * (Math.random() * 0.7 + 0.3) * ballDefaultSpeed;

		// シミュレート用
		} else if( mode == BALL_COPY_MODE.SIMULATE )
		{
			obj.simulate = 1;
		}

		return obj;
	}


	//--------------------------------------------------
	// 上下・左右・中央座標取得
	//--------------------------------------------------
	this.getLeftX = function() {
		return this.x - this.radius;
	}
	this.getCenterX = function() {
		return this.x;
	}
	this.getRightX = function() {
		return this.x + this.radius;
	}
	
	this.getTopY = function() {
		return this.y - this.radius;
	}
	this.getCenterY = function() {
		return this.y;
	}
	this.getBottomY = function() {
		return this.y + this.radius;
	}


	//--------------------------------------------------
	// 落下
	//--------------------------------------------------
	this.fall = function()
	{
		// 落下音
		sounds.play('fall');

		// ボール消去
		balls.tarRemove(this);

		// 落下数の計算
		scoreMng.awardNum.fallBallNum++;

		// ボール無し
		if( bar.immortalStatusTime <= 0 && balls.length == 0 )
		{
			// 全アイテムの消去
			items = new Array();

			// 全武器の消去
			weapons = new Array();

			// バー状態の解除
			bar = new Bar();

			// ライフ減少
			statusMng.addLife(-1);
		}
	}



	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	this.draw = function(ctx)
	{
		// 色の選択
		if( this.status == BALL_STATUS.NORMAL ) { ctx.fillStyle = ballColor; }
		else if( this.status == BALL_STATUS.STRONG ) { ctx.fillStyle = ballStrongColor; }
		else if( this.status == BALL_STATUS.ULTIMATE ) { ctx.fillStyle = ballUltimateColor; }

		// 強化・無敵球の残像
		if( this.status != BALL_STATUS.NORMAL )
		{
			// 球の描画
			ctx.beginPath();

			// 残像の描画
			var scale = this.statusTime / ballStatusTime / FPS + 0.25;
			var len = (this.histX.length < 4 ? this.histX.length : 4) * (scale > 1 ? 1 : scale);
			for( var i = 0; i < len; i++ )
			{
				var radius = this.radius * (1 - 0.08 * i);
				ctx.globalAlpha = 1 - i * 0.2;
				ctx.arc(this.histX[i], this.histY[i], radius, Math.PI * 2, false);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
		}

		// 球の描画
		ctx.beginPath();
		ctx.arc(this.getCenterX(), this.getCenterY(), this.radius, 0, Math.PI * 2, false);
		ctx.fill();
	}



	//--------------------------------------------------
	// 移動
	//--------------------------------------------------
	this.move = function()
	{
		// ボールの速度制限
		if( Math.abs( this.vx ) > ballMaxSpeed ) { this.vx = ballMaxSpeed * (this.vx < 0 ? -1 : 1); }
		if( Math.abs( this.vy ) > ballMaxSpeed ) { this.vy = ballMaxSpeed * (this.vy < 0 ? -1 : 1); }
		else if( Math.abs( this.vy ) < ballDefaultSpeed * 0.8 ) { this.vy = ballMaxSpeed * 0.8 * (this.vy < 0 ? -1 : 1); }

		// 状態時間の減少
		if( this.statusTime > 0 ) {
			this.statusTime--;

			// 状態の解除
			if( this.statusTime == 0 ) { this.status = BALL_STATUS.NORMAL; }
		}

		// 吸着状態の場合，ここで処理終了
		if( this.isAbsorption == 1 )
		{
			// 吸着位置を保持
			this.x = this.absorptionPoint[0] + bar.getCenterX();
			this.y = this.absorptionPoint[1] + bar.getTopY();
			return;
		}

		// ボール位置の決定
		this.x += this.vx;
		this.y += this.vy;

		// 一時変数
		var x = this.x;
		var y = this.y;
		var vx = this.vx;
		var vy = this.vy;
		var simulate = this.simulate;

		//-------ボール位置の制限及び壁・バーによる反射-------
		// 左端
		if( this.getLeftX() < 0 )
		{
			// 跳ね返り計算
			this.x = this.radius;
			this.vx *= -1;

			// 接触音
			if( simulate == 0 ) { sounds.play('wall'); }

		// 右端
		} else if( this.getRightX() > canvasWidth )
		{
			// 跳ね返り計算
			this.x = canvasWidth - this.radius - 1;
			this.vx *= -1;

			// 接触音
			if( simulate == 0 ) { sounds.play('wall'); }
		}

		// 上端
		if( this.getTopY() < statusBarHeight )
		{
			// 跳ね返り計算
			this.y = this.radius + statusBarHeight + 1;
			this.vy *= -1;

			// 接触音
			if( simulate == 0 ) { sounds.play('wall'); }

		// バー接触
		} else if( simulate == 0 && this.getBottomY() >= bar.getTopY() && Math.abs(x - bar.getCenterX()) <= bar.width / 2 )
		{
			// 跳ね返り計算
			this.y = bar.getTopY() - this.radius;
			this.vy *= -1;
			vy = this.vy;

			// 吸着状態へ遷移
			if( bar.absorptionStatusTime > 0 )
			{
				this.isAbsorption = 1;

				// 吸着座標の取得
				this.absorptionPoint = new Array( this.getCenterX() - bar.getCenterX(), this.getCenterY() - bar.getTopY() );

				// 吸着球数を増加
				bar.absorptionNum++;

				// 移動履歴の削除
				this.histX = new Array();
				this.histY = new Array();
			}

			// バーによるスピン
			this.vx += bar.vx * barSpin;

			// 両端の傾斜による速度変化
			var barEdgeWidth = bar.width * ( 0.5 - bar.edge * ~~(bar.height / 2) );
			if( x < bar.getCenterX() - barEdgeWidth && vx > 0 ) { this.vx -= Math.abs( ballDefaultSpeed - vx ) * 0.4; }
			else if( x > bar.getCenterX() + barEdgeWidth && vx < 0 ) { this.vx += Math.abs( ballDefaultSpeed + vx ) * 0.4; }

			// ボールの縦方向速度の制御（速度が上方向が前提）
			if( vy < -ballDefaultSpeed ) { this.vy += 0.05; }
			else if( vy > -ballDefaultSpeed ) { this.vy -= 0.4; }

			// ボールの横方向速度の制御
			if( Math.abs(this.vx) > ballMaxSpeed ) { this.vx = ballMaxSpeed * ( this.vx < 0 ? -1 : 1 ); }
			if( Math.abs(this.vx) < ballDefaultSpeed * 0.01 ) { this.vx = ballDefaultSpeed * 0.01; }

			// ポイント増分のリセット
			this.pointIncr = 10;

			// 固定ブロック衝突回数のリセット
			this.duaration = 0;

			// 連続衝突回数のリセット
			this.breakNum = 0;
			this.collisionNum = 0;

			// 接触音
			if( simulate == 0 ) { sounds.play('bar'); }

		// 下端
		} else if( this.getBottomY() > canvasHeight )
		{
			this.y = canvasHeight + this.radius + 1;

			// ボール落下
			this.fall();
			return;
		}
		//-------ボール位置の制限及び壁・バーによる反射-------

		// 一時変数
		x = this.x;
		y = this.y;
		vx = this.vx;
		vy = this.vy;

		//-------ブロック衝突判定-------
		var collisionFlag = 0;

		// 検査範囲の選別（ボールの飛来方向から順に判定）
		var stepX = vx < 0 ? -1 : 1;
		var stepY = vy < 0 ? -1 : 1;

		// 横方向
		var colDetStartX = ~~( (x - this.radius * stepX) / blockWidth );
		var colDetEndX = ~~( (x + this.radius * stepX) / blockWidth );

		// 縦方向
		var colDetStartY = ~~( (y - this.radius * stepY - statusBarHeight) / blockHeight );
		var colDetEndY = ~~( (y + this.radius * stepY - statusBarHeight) / blockHeight );

		// ボールが存在するエリア内を検査
		var throughFlag = 0;
		for( var i = colDetStartY; ( i <= colDetEndY && stepY > 0 ) || ( i >= colDetEndY && stepY < 0 ); i += stepY )
		{
			if( blockMap[i] != null ) {
				for( var j = colDetStartX; ( j <= colDetEndX && stepX > 0 ) || ( j >= colDetEndX && stepX < 0 ); j += stepX )
				{
					var block = blockMap[i][j];

					// 衝突検出
					if( block != null && (( simulate == 0 && block.type != 0 ) || ( simulate == 1 && block.simulate != 0 )) )
					{
						// 衝突検出
						collisionFlag = 1;

						//----------衝突方向の判定----------
						var directVectX = 0, directVectY = 0;

						// 左から衝突
						if( this.histX[0] + this.radius <= block.getLeftX() && ( blockMap[i][j - 1] == null || (( simulate == 0 && blockMap[i][j - 1].type == 0 ) || ( simulate == 1 && blockMap[i][j - 1].simulate == 0 )) ) ) {
							directVectX = -1;
						}
						// 右から衝突
						else if( this.histX[0] - this.radius > block.getRightX() && ( blockMap[i][j + 1] == null || (( simulate == 0 && blockMap[i][j + 1].type == 0 ) || ( simulate == 1 && blockMap[i][j + 1].simulate == 0 )) ) ) {
							directVectX = 1;
						}

						// 上から衝突
						if( this.histY[0] + this.radius <= block.getTopY() && ( blockMap[i - 1] == null || blockMap[i - 1][j] == null || (( simulate == 0 && blockMap[i - 1][j].type == 0 ) || ( simulate == 1 && blockMap[i - 1][j].simulate == 0 )) ) ) {
							directVectY = -1;
						}
						// 下から衝突
						else if( this.histY[0] - this.radius > block.getBottomY() && ( blockMap[i + 1] == null || blockMap[i + 1][j] == null || (( simulate == 0 && blockMap[i + 1][j].type == 0 ) || ( simulate == 1 && blockMap[i + 1][j].simulate == 0 )) ) ) {
							directVectY = 1;
						}

						// 塞ぐブロックなしで、斜めからの衝突（速度の速い方向で判定）
						if( directVectX != 0 && directVectY != 0 ) {
							if( vx > vy ) { directVectY = 0; }
							else { directVectX = 0; }
						}
						// 塞ぐブロックありで、斜めからの衝突（移動履歴から判定）
						else if( directVectX == 0 && directVectY == 0 )
						{
							for( var k = 0, len = this.histX.length; k < len; k++ )
							{
								directVectX = ~~( this.histX[k] / blockWidth ) - j;
								directVectY = ~~( (this.histY[k] - statusBarHeight) / blockHeight ) - i;

								if( Math.abs(directVectX) >= 1 ) { directVectX = 1 * (directVectX < 0 ? -1 : 1); }
								if( Math.abs(directVectY) >= 1 ) { directVectY = 1 * (directVectY < 0 ? -1 : 1); }

								if( directVectX != 0 || directVectY != 0 ) { break; }
							}
						}
						//----------衝突方向の判定----------

						//----------透過処理----------
						var throughVect = block.throughVect;
						if( throughVect != 0 ) {
							// 上
							if( throughVect == 1 && directVectY >= 1 && directVectX == 0 ) {
								throughFlag = 1;
								this.x -= this.vx;
							}
							// 右
							else if( throughVect == 2 && directVectX <= -1 && directVectY == 0 ) {
								throughFlag = 1;
								this.y -= this.vy;
							}
							// 下
							else if( throughVect == 3 && directVectY <= -1 && directVectX == 0 ) {
								throughFlag = 1;
								this.x -= this.vx;
							}
							// 左
							else if( throughVect == 4 && directVectX >= 1 && directVectY == 0 ) {
								throughFlag = 1;
								this.y -= this.vy;
							}
						}
						//----------透過処理----------

						//--------衝突に伴う反射等の処理-------
						// 貫通ブロック・無敵状態
						if( this.status == BALL_STATUS.ULTIMATE || block.func == BLOCK_FUNCTION.THROUGH || throughFlag == 1 ) {
							if( throughFlag != 1 ) { block.action(this, 0); }

						// 斜めからの衝突
						} else if( directVectX != 0 && directVectY != 0 ) {
							var verBlock1 = blockMap[i + directVectY];
							var horBlock = blockMap[i][j + directVectX];

							// 横方向
							if( horBlock && horBlock.type != 0 && horBlock.func != BLOCK_FUNCTION.THROUGH ) {
								// 座標の修正
								if( directVectY < 0 ) { this.y = horBlock.getTopY() - ballSize - 1; }
								else { this.y = horBlock.getBottomY() + ballSize + 1; }

								// 進行方向の反転及び，加減速
								this.vy = -1 * (vy + horBlock.action(this, 1) * (vy < 0 ? -1 : 1));
							}

							// 縦方向
							if( verBlock1 && verBlock1[j] && verBlock1[j].type != 0 && verBlock1[j].func != BLOCK_FUNCTION.THROUGH ) {
								verBlock = verBlock1[j];

								// 座標の修正
								if( directVectX < 0 ) { this.x = verBlock.getLeftX() - ballSize - 1; }
								else { this.x = verBlock.getRightX() + ballSize + 1; }

								// 進行方向の反転及び，加減速
								this.vx = -1 * (vx + verBlock.action(this, 0) * (vx < 0 ? -1 : 1));
							}

						// 通常の衝突
						} else {
							if( directVectX != 0 ) {
								// 座標の修正
								if( directVectX < 0 ) { this.x = block.getLeftX() - ballSize - 1; }
								else { this.x = block.getRightX() + ballSize + 1; }

								// 進行方向の反転及び，加減速
								 this.vx = -1 * (vx + block.action(this, 0) * (vx < 0 ? -1 : 1));

							} else {
								// 座標の修正
								if( directVectY < 0 ) { this.y = block.getTopY() - ballSize - 1; }
								else { this.y = block.getBottomY() + ballSize + 1; }

								// 進行方向の反転及び，加減速
								this.vy = -1 * (vy + block.action(this, 1) * (vy < 0 ? -1 : 1));
							}
						}
						//--------衝突に伴う反射等の処理-------
						break;
					}
				}
				if( collisionFlag != 0 ) { break; }
			}
		}
		//-------ブロック衝突判定-------

		// ボールの速度制限
		if( Math.abs( this.vx ) > ballMaxSpeed ) { this.vx = ballMaxSpeed * (this.vx < 0 ? -1 : 1); }
		if( Math.abs( this.vy ) > ballMaxSpeed ) { this.vy = ballMaxSpeed * (this.vy < 0 ? -1 : 1); }

		// 位置履歴の管理
		if( throughFlag == 0 && this.isAbsorption == 0 ) {
			this.histX.unshift(this.x);
			this.histY.unshift(this.y);
			if( this.histX.length > SYSTEM_PARAM.BALL_HIST_MAX ) {
				this.histX.pop();
				this.histY.pop();
			}
		}
	}
}



//--------------------------------------------------
// アイテム
//--------------------------------------------------
function Item(type, x, y, lcolor, color)
{
	this.width = blockWidth;									// アイテムの横幅
	this.height = blockHeight;									// アイテムの縦幅
	this.type = type;											// アイテムの種類
	this.x = x;													// アイテムの横方向位置
	this.y = y;													// アイテムの縦方向位置
	this.color = color;											// アイテムの色
	this.lineColor = lcolor;									// アイテムの線色
	this.text = itemText[ctrl.stageIndex][this.type];			// アイテムの文字
	this.imgData = imgData.getData("item", this.type);			// 描画イメージ


	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	this.draw = function(ctx)
	{
		// アイテムを描画
		ctx.putImageData(this.imgData, ~~this.x - 0.5, ~~this.y - 0.5);
	}


	//--------------------------------------------------
	// 上下・左右・中央座標取得
	//--------------------------------------------------
	this.getLeftX = function() {
		return this.x;
	}
	this.getCenterX = function() {
		return this.x + this.width *0.5;
	}
	this.getRightX = function() {
		return this.x + this.width;
	}
	
	this.getTopY = function() {
		return this.y;
	}
	this.getCenterY = function() {
		return this.y + this.height *0.5;
	}
	this.getBottomY = function() {
		return this.y + this.height;
	}


	//--------------------------------------------------
	// 移動
	//--------------------------------------------------
	this.move = function()
	{
		var i;
		var ballNum = balls.length;

		// 位置の決定
		this.y += itemSpeed[ctrl.stageIndex];

		// 未取得のまま落下
		if( this.y > canvasHeight ) {
			// アイテムの消去
			items.tarRemove(this);

		// バー接触（アイテム取得）
		} else if( this.getBottomY() > bar.getTopY() && bar.getLeftX() <= this.getRightX() && bar.getRightX() >= this.getLeftX() )
		{
			// アイテム取得数の計算
			scoreMng.awardNum.getItemNum++;

			// 取得音
			if( this.type == 4 || this.type == 6 || this.type == 11 || this.type == 12 ) { sounds.play('minusItem'); }
			else { sounds.play('plusItem'); }

			// 2倍増殖
			if( this.type == 0 ) {
				var diffNum = ballMaxNum - ballNum;
				var len = ballNum > diffNum ? diffNum : ballNum;
				for( i = 0; i < len; i++ ) { balls[balls.length] = balls[i].copy(BALL_COPY_MODE.RAND); }

			// 強化状態
			} else if( this.type == 1 ) {
				// 状態の設定
				for( i = 0; i < ballNum; i++ ) {
					balls[i].status = BALL_STATUS.STRONG;
					balls[i].statusTime = ballStatusTime * FPS;
				}

			// 無敵状態
			} else if( this.type == 2 ) {
				// 状態の設定
				for( i = 0; i < ballNum; i++ ) {
					balls[i].status = BALL_STATUS.ULTIMATE;
					balls[i].statusTime = ballStatusTime * FPS;
				}

			// バー幅伸長
			} else if( this.type == 3 ) {
				// 状態の設定
				bar.width = ~~( bar.width * 1.3 );
				if( bar.width > barMaxWidth ) { bar.width = barMaxWidth; }

				// タイマーのセット
				bar.widthStatusTime = barStatusDefaultTime * FPS;

			// バー幅縮小
			} else if( this.type == 4 ) {
				// 状態の設定
				bar.width = ~~( bar.width * 0.7 );
				if( bar.width < barMinWidth ) { bar.width = barMinWidth; }

				// タイマーのセット
				bar.widthStatusTime = barStatusDefaultTime * FPS;

			// ライフの回復
			} else if( this.type == 5 ) {
				statusMng.addLife(1);

			// ライフの減少
			} else if( this.type == 6 ) {
				statusMng.addLife(-1);

			// ボール速度の増加
			} else if( this.type == 7 ) {
				for( i = 0; i < ballNum; i++ ) {
					balls[i].vx *= 1 + ~~(Math.random() * 30) / 100;
					balls[i].vy *= 1 + ~~(Math.random() * 30) / 100;
				}

			// ボール速度の減少
			} else if( this.type == 8 ) {
				for( i = 0; i < ballNum; i++ ) {
					balls[i].vx *= 1 - ~~(Math.random() * 30) / 100;
					balls[i].vy *= 1 - ~~(Math.random() * 30) / 100;
				}

			// バーに銃を設定
			} else if( this.type == 9 ) {
				// 状態の設定
				bar.weapon = 1;

				// タイマーのセット
				bar.weaponTime = barWeaponDefaultTime * FPS;

			// バーにミサイルを設定
			} else if( this.type == 10 ) {
				// 状態の設定
				bar.weapon = 2;

				// タイマーのセット
				bar.weaponTime = barWeaponDefaultTime * FPS;

			// バー移動速度の鈍化
			} else if( this.type == 11 ) {
				// 状態の設定
				bar.vxMax -= ~~(Math.abs(bar.vxMax - barMinSpeed) * 0.8);
				if( bar.vxMax < barMinSpeed ) { bar.vxMax = barMinSpeed; }

				// タイマーのセット
				bar.speedStatusTime = barStatusDefaultTime * FPS;

			// バーの振動
			} else if( this.type == 12 ) {
				bar.vibrationTime = barStatusDefaultTime * FPS;

			// バーの吸着状態化
			} else if( this.type == 13 ) {
				// タイマーのセット
				bar.absorptionStatusTime = barStatusDefaultTime * FPS*1.1;

			// 不死身状態化
			} else if( this.type == 14 ) {

				// タイマーのセット
				bar.immortalStatusTime = barStatusDefaultTime * FPS;

				// 色の設定
				bar.color = barImmortalColor;

			// 画面の難視化
			} else if( this.type == 15 ) {
				// タイマーのセット
				bar.disturbStatusTime = barStatusDefaultTime * FPS;
			}

			// アイテムの消去
			items.tarRemove(this);
		}
	}
}



//--------------------------------------------------
// ブロック
//--------------------------------------------------
function Block(x, y, type, func, life, infinit, through)
{
	this.width = blockWidth;								// ブロックの横幅
	this.height = blockHeight;								// ブロックの縦幅
	this.x = x * this.width;								// ブロックの横軸座標
	this.y = y * this.height + statusBarHeight;				// ブロックの縦軸座標
	this.type = type;										// ブロックの種類
	this.func = func;										// ブロックの機能
	this.text = null;										// ブロックの文字
	this.infinit = infinit;									// 破壊の可否
	this.life = life;										// 残り衝突可能回数
	this.item = null;										// アイテム
	this.explode = 0;										// 爆発
	this.simulate = 0;										// シミュレート用
	this.breakLimit = 0;									// 破壊制限時間
	this.moveInter = 0;										// 移動間隔
	this.moveVect = 0;										// 移動方向（0:右、1：左）
	this.blinkInter = 0;									// 点滅用カウント
	this.blinkSwitch = 0;									// 点灯・消灯の判別（-1:消灯、1:点灯、0:停止）
	this.blinkType = 0;										// 種類保持用変数
	this.throughVect = through;								// 透過方向（0：なし、1～4：上、右、下、左）
	this.attackInter = 0;									// 攻撃間隔
	this.imgData = imgData.getData("block", type);			// 描画イメージ


	// 移動ブロックの設定
	if( this.func == BLOCK_FUNCTION.VERTICAL_MOVE )
	{
		this.moveInter = Math.random() * blockMoveInter * FPS;
		this.moveVect = (~~(Math.random() * 2) * 2 - 1);
	}
	// 点滅ブロックの設定
	else if( this.func == BLOCK_FUNCTION.BLINK )
	{
		this.blinkInter = Math.random() * blockBlinkInter * FPS;
		this.blinkSwitch = (~~(Math.random() * 2) * 2 - 1);
		this.blinkType = this.type;
	}
	// 攻撃ブロックの設定
	else if( this.func == BLOCK_FUNCTION.ATTACK )
	{
		this.attackInter = Math.random() * blockAttackInter * FPS;
	}


	//--------------------------------------------------
	// コピー
	//--------------------------------------------------
	this.copy = function()
	{
		var obj = new Block(this.x / this.width, (this.y - statusBarHeight) / this.height, this.type, this.func, this.life, this.infinit, this.throughVect);
		obj.item = this.item;
		obj.explode = this.explode;
		obj.simulate = this.simulate;
		obj.breakLimit = this.breakLimit;
		obj.moveInter = this.moveInter;
		obj.moveVect = this.moveVect;

		return obj;
	}


	//--------------------------------------------------
	// 上下・左右・中央座標取得
	//--------------------------------------------------
	this.getLeftX = function() {
		return this.x;
	}
	this.getCenterX = function() {
		return this.x + this.width *0.5;
	}
	this.getRightX = function() {
		return this.x + this.width;
	}
	
	this.getTopY = function() {
		return this.y;
	}
	this.getCenterY = function() {
		return this.y + this.height *0.5;
	}
	this.getBottomY = function() {
		return this.y + this.height;
	}
	
	
	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	this.draw = function(ctx)
	{
		// ブロックを描画
		ctx.putImageData(this.imgData, this.x - 0.5, this.y - 0.5);

		// ブロックの文字を描画
		var text = this.text;
		if( text != null )
		{
			ctx.textBaseline = 'middle';
			ctx.textAlign = 'center';
			ctx.font = blockFontSize + "px 'ＭＳ Ｐゴシック'";
			ctx.fillStyle = blockTextColor[this.type];
			ctx.fillText(text, this.getCenterX() - 0.5, this.getCenterY() - 0.5, this.width);
		}

		// 耐久性を透過率で表現
		if( this.life < blockLife[this.type] )
		{
			ctx.globalAlpha = ( this.life + 1 ) / ( blockLife[this.type] + 1 );
			ctx.beginPath();
			ctx.strokeStyle = "#ffffff";
			ctx.fillStyle = "#ffffff";
			ctx.rect(this.x - 0.5, this.y - 0.5, this.width, this.height);
			ctx.fill();
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}


	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	this.clear = function(ctx)
	{
		ctx.clearRect(this.x - 0.5, this.y - 0.5, this.width, this.height);
	}


	//--------------------------------------------------
	// 動き・状態遷移
	//--------------------------------------------------
	this.move = function()
	{
		// 爆発モーションのカウントダウン
		if( this.exploded > 0 ) { this.exploded--; }

		// カウントダウン文字の表示
		if( this.breakLimit > 0 )
		{
			// カウントダウンのリセット
			if( balls.length == 0 ) { this.breakLimit = 1; }

			// 残り時間の計算
			var countDownTime = ~~(this.breakLimit / FPS * 10) / 10;

			// 出力文字の作成
			if( countDownTime * 10 % 10 == 0 ) { this.text = String(~~countDownTime + ".0"); }
			else { this.text = countDownTime; }
			this.text += ' s';

			// 時間の減少
			this.breakLimit--;

			// 時間切れ
			if( this.breakLimit <= 0 )
			{
				this.life = blockLife[this.type];
				this.text = null;
			}

			// 描画
			this.draw(staticCtx);
		}

		if( this.type != 0 )
		{
			// 移動処理
			if( this.func == BLOCK_FUNCTION.VERTICAL_MOVE )
			{
				this.moveInter--;

				if( this.moveInter <= 0 )
				{
					var i = (this.getTopY() - statusBarHeight) / this.height;
					var j = this.getLeftX() / this.width;
					var forBlock = blockMap[i][j + this.moveVect];

					// 移動
					if( (!forBlock || forBlock.type == 0) && (j + this.moveVect) < canvasWidth / this.width && j + this.moveVect >= 0 )
					{
						// 描画を消去
						this.clear(staticCtx);

						// 移動
						blockMap[i][j + this.moveVect] = this.copy();
						forBlock = blockMap[i][j + this.moveVect];
						forBlock.x += this.width * this.moveVect;
						forBlock.moveInter = blockMoveInter * FPS + (this.moveVect == 1 ? 1 : 0);

						// 再描画
						forBlock.draw(staticCtx);

						// 無効化
						this.type = 0;

					// 反転
					} else {
						this.moveVect *= -1;
					}
				}
			}
			// 引力処理
			else if( this.func == BLOCK_FUNCTION.MAGNET || this.func == BLOCK_FUNCTION.REPULL )
			{
				// 引力・斥力の判別
				var powVect = 1;
				if( this.func == BLOCK_FUNCTION.MAGNET ) { powVect = -1; }
				else { powVect = 1; }

				for( var i = 0, len = balls.length; i < len; i++ ) {
					var ball = balls[i];

					// 相対座標の取得
					var relX = ball.getCenterX() - this.getCenterX();
					var relY = ball.getCenterY() - this.getCenterY();

					// 引力影響範囲内の球のみ対象
					var dist = Math.sqrt(Math.pow(relX, 2) + Math.pow(relY, 2));
					if( dist <= blockDrawingDistance ) {

						// 加速度の計算
						var acceleration = ballDefaultSpeed * 25 / Math.pow(dist, 1.8);

						// 横方向の球速の変更
						ball.vx += acceleration * 1.6 * (relX < 0 ? -1 : 1) * powVect;
						if( Math.abs(ball.vx) <= ballDefaultSpeed * 0.1 ) { ball.vx = ballDefaultSpeed * 0.1 * (ball.vx >= 0 ? 1 : -1); }

						// 縦方向の球速の変更
						if( ball.vy * relY < 0 ) {
							ball.vy += acceleration * 0.4 * (relY < 0 ? -1 : 1) * powVect;
						} else {
							ball.vy += acceleration * 0.2 * (relY < 0 ? -1 : 1) * powVect;
						}
					}
				}
			}
			// 攻撃処理
			else if( this.func == BLOCK_FUNCTION.ATTACK && balls.length > 0 )
			{
				// 経過時間のカウント
				this.attackInter--;

				// 攻撃
				if( this.attackInter <= 0 )
				{
					// タイマーのリセット
					this.attackInter = blockAttackInter * FPS * (Math.random()*0.2 + 0.8);

					// 武器の発射
					weapons[weapons.length] = new Weapon(1, this.getCenterX(), this.getBottomY() + 1, -1);
				}
			}
		}
		// 点滅処理
		if( this.func == BLOCK_FUNCTION.BLINK && this.blinkSwitch != 0 )
		{
			// 経過時間のカウント
			this.blinkInter--;

			if( this.blinkInter <= 0 ) {
				// カウントの初期化
				this.blinkInter = blockBlinkInter * FPS * (0.7 + Math.random()*0.3);

				// スイッチの反転
				this.blinkSwitch *= -1;

				// 消灯・点灯の切り替え
				if( this.blinkSwitch == -1 )
				{
					this.type = 0;
					this.clear(staticCtx);

				} else
				{
					this.type = this.blinkType;
					this.draw(staticCtx);
				}
			}
		}
	}



	//--------------------------------------------------
	// アクション
	//--------------------------------------------------
	this.action = function(ball, isChangedVY)
	{
		var addSpeed = 0;

		// 接触音
		if( ball != null && ball.simulate == 0 )
		{
			// ワープブロック
			if( this.func == BLOCK_FUNCTION.WARP_ENTER ) {
				sounds.play('warp');

			// 通常ブロック
			} else if( this.func != BLOCK_FUNCTION.NORMAL && this.func != BLOCK_FUNCTION.EXPLODE_STRENGTH ) {
				if( ball.status == BALL_STATUS.NORMAL ) { sounds.play('block'); }
				else { sounds.play('spBlock'); }
			}
		}

		// 武器による破壊
		if( ball == null )
		{
			// ワープブロックは破壊不可
			if( this.func != BLOCK_FUNCTION.WARP_ENTER && this.func != BLOCK_FUNCTION.WARP_EXIT )
			{
				// 爆発モーションのセット
				this.exploded = blockMotionTime * FPS;

				// ブロックの削除
				this.break(null);

				// ポイントの付与
				scoreMng.score = Number(scoreMng.score) + blockDefaultPoint;
			}

			return;
		}

		// 爆発
		if( this.func == BLOCK_FUNCTION.EXPLODE || this.func == BLOCK_FUNCTION.EXPLODE_STRENGTH )
		{
			// シミュレートの確認
			if( !ball.simulate ) {
				// 爆発モーションのセット
				this.exploded = blockMotionTime * FPS;
			}

			// 短期間の貫通弾化
			if( this.func == BLOCK_FUNCTION.EXPLODE_STRENGTH ) {
				ball.status = BALL_STATUS.ULTIMATE;
				ball.statusTime = ~~(ballStatusTime * 0.3 * FPS);
			}

			// 周りのブロックを破壊
			this.explode(this.getLeftX() / this.width, (this.getTopY() - statusBarHeight) / this.height, 1, ball);

			// 爆発による速度の増加
			addSpeed = ballDefaultSpeed;

		// 強化球
		} else if( ball.status == BALL_STATUS.STRONG && this.func != BLOCK_FUNCTION.WARP_ENTER ) {
			addSpeed = ballMaxSpeed - Math.abs(ballDefaultSpeed);

		// 加速
		} else if( this.func == BLOCK_FUNCTION.ACCELERATION ) {
			addSpeed = ballDefaultSpeed * 0.2;

		// 減速
		} else if( this.func == BLOCK_FUNCTION.DECELERATION ) {
			addSpeed = -ballDefaultSpeed * 0.2;

		// ワープ
		} else if( this.func == BLOCK_FUNCTION.WARP_ENTER )
		{
			var randSeed = ~~(Math.random()*100);

			// ワープブロックの検索
			var warpBlockIJ = new Array();
			for( var i = 0, len = blockMap.length; i < len; i++ ) {
				if( blockMap[i] ) {
					for( var j = 0, len2 = blockMap[i].length; j < len2; j++ ) {
						var block = blockMap[i][j];
						if( block && block.type != 0 && block.func == BLOCK_FUNCTION.WARP_EXIT && block != this ) {
							warpBlockIJ[warpBlockIJ.length] = new Array(i, j);
						}
					}
				}
			}

			if( warpBlockIJ.length != 0 ) {
				// ワープ先の決定
				var toWarpBlockIJ = warpBlockIJ[randSeed%warpBlockIJ.length];
				var toWarpBlockI = toWarpBlockIJ[0];
				var toWarpBlockJ = toWarpBlockIJ[1];
				var toWarpBlock = blockMap[toWarpBlockI][toWarpBlockJ];

				// 隣接ブロックの存在確認
				var sideNumToVect = new Array( new Array(-1, 0), new Array(1, 0));
				var warpSide = new Array();
				for( var i = 0; i < 2; i++ ) {
					var warpSideI = toWarpBlockI + sideNumToVect[i][0];
					var warpSideJ = toWarpBlockJ + sideNumToVect[i][1];

					// 有効範囲の限定
					if( warpSideI >= 0 && warpSideJ >= 0 ) {
						if( blockMap[warpSideI] ) {
							var neighborBlock = blockMap[warpSideI][warpSideJ];

							// 隣接ブロックの存在確認
							if( !neighborBlock || neighborBlock.type == 0 ) {
								warpSide[warpSide.length] = i;
							}
						} else {
							warpSide[warpSide.length] = i;
						}
					}
				}

				if( warpSide.length != 0 ) {
					// ワープ先隣接の決定
					var toWarpSide = warpSide[randSeed%warpSide.length];

					// ボールを移動
					var toWarpXY = new Array( new Array(0, -this.height/2 - 1 - ballSize), new Array(0, this.height/2 + 1 + ballSize) );
					ball.x = toWarpBlock.getCenterX() + toWarpXY[toWarpSide][0];
					ball.y = toWarpBlock.getCenterY() + toWarpXY[toWarpSide][1];

					// ボール速度の変更
					if( isChangedVY == 1 ) { ball.vy *= -1; }
					ball.vy *= ((ball.vy > 0 && toWarpSide == 0) || (ball.vy < 0 && toWarpSide == 1) ? -1 : 1);
				}
			}
		}

		// 破壊
		if( (this.infinit != 1 || ball.status == BALL_STATUS.ULTIMATE || (ball.status == BALL_STATUS.STRONG && this.infinit != 1)) && this.func != BLOCK_FUNCTION.WARP_ENTER && this.func != BLOCK_FUNCTION.WARP_EXIT )
		{
			// 衝突回数の計算
			ball.collisionNum++;

			// シミュレートでない場合
			if( ball.simulate == 0 ) {
				// 破壊
				if( this.life < 1 || ball.status != BALL_STATUS.NORMAL ) {
					this.break(ball);

				// 耐久性減少
				} else {
					this.decreaseLife();
				}

				// ポイント計算
				scoreMng.score = Number(scoreMng.score) + ball.pointIncr;
				ball.pointIncr = Number(ball.pointIncr) + blockIncrPoint;

				// 連続破壊数の表示
				if( ball.breakNum > scoreMng.awardNum.continuousBreakNum )
				{
					// 最大数の更新
					scoreMng.awardNum.continuousBreakNum = ball.breakNum;

					// バルーンの追加
					var bx = ball.getCenterX();
					var by = ball.getCenterY();
					if( bx > canvasWidth - 30 ) { bx = canvasWidth - 30; }
					if( by > canvasHeight - 15 ) { by = canvasHeight - 15; }
					balloons[balloons.length] = new Balloon(scoreMng.awardNum.continuousBreakNum, bx, by, 25, 10, 0.13, popBalloonBackColor, popBalloonFontColor, 12);
				}

			// シミュレートの場合
			} else {
				// 破壊
				if( ball.status != BALL_STATUS.NORMAL || this.simulate <= 1 ) {
					this.break(ball);

				// 耐久性減少
				} else {
					this.simulate--;
				}
			}

		// 破壊不可ブロック
		} else if( this.infinit == 1 && ball.simulate == 0 ) {
			scoreMng.score = Number(scoreMng.score) + ball.pointIncr;
			ball.pointIncr = Number(ball.pointIncr) + ~~(blockIncrPoint / 2);
		}

		// 無限ループ回避
		if( this.infinit == 1 || blockBreakLimit[this.type] > 0 )
		{
			// 固定ブロック衝突回数の増加
			ball.duaration++;

			// 無限ループ回避
			var duaration = ball.duaration;
			if( ballInfBoundCancel == 1 && duaration > 80 )
			{
				// 速度を変更
				ball.vx += ~~((Math.random()*2)*2 - 1) * (Math.random()*0.5 + 0.5) * ballDefaultSpeed / 10;
				ball.vy += ~~((Math.random()*2)*2 - 1) * (Math.random()*0.5 + 0.5) * ballDefaultSpeed / 10;

				// ボール得点増加率の操作
				ball.pointIncr = ~~( ball.pointIncr * 0.8 );

				// 衝突回数の減少
				ball.duaration = ~~(duaration / 1.05);
			}
		} else {
			// 衝突回数の減少
			ball.duaration = ~~(duaration / 4);
		}

		return addSpeed;
	}



	//--------------------------------------------------
	// 破壊処理
	//--------------------------------------------------
	this.break = function(ball)
	{
		// シミュレートの場合
		if( ball != null && ball.simulate == 1 ) {
			// 破壊処理
			this.simulate = 0;
		}
		// シミュレートでない場合
		else
		{
			// 破壊処理
			this.type = 0;
			this.breakLimit = 0;

			// 描画の削除
			this.clear(staticCtx);

			// 点滅の停止
			this.blinkSwitch = 0;

			// ブロック数の減少
			if( this.infinit == 0 ) { statusMng.blockNum--; }

			// アイテム出現
			if( this.item != null ) { items[items.length] = new Item(this.item, this.getLeftX(), this.getTopY(), itemLineColor[ctrl.stageIndex][this.item], itemColor[ctrl.stageIndex][this.item]); }
		}

		// 破壊回数の計算
		if( ball != null ) { ball.breakNum++; }
	}


	//--------------------------------------------------
	// 耐久性の減少
	//--------------------------------------------------
	this.decreaseLife = function()
	{
		// 耐久性の減少
		this.life--;

		// 描画
		this.draw(staticCtx);

		// 制限時間のセット
		if( blockBreakLimit[this.type] > 0 ) { this.breakLimit = blockBreakLimit[this.type] * FPS; }
	}


	//--------------------------------------------------
	// 爆弾による巻き込み破壊
	//--------------------------------------------------
	this.explode = function(x, y, area, ball)
	{
		for(var i = -area + y; i <= area + y; i++)
		{
			if( blockMap[i] != null ) {
				for(var j = -area + x; j <= area + x; j++) {
					var block = blockMap[i][j];

					// 破壊可能ブロックのみ対象
					if( block != null && block != this && ( ( ball.simulate == 0 && block.type != 0 ) || ( ball.simulate != 0 && block.simulate != 0 ) ) && block.infinit != 1 )
					{
						// 燃料・爆薬引火
						if( block.func == BLOCK_FUNCTION.FUEL || block.func == BLOCK_FUNCTION.EXPLODE || block.func == BLOCK_FUNCTION.EXPLODE_STRENGTH )
						{
							// シミュレートでない場合
							if( ball.simulate == 0 )
							{
								// 爆発モーションのセット
								block.exploded = 60;
							}

							// 破壊処理
							block.break(ball);

							// さらに巻き込み破壊
							this.explode(j, i, 1, ball);

						// 通常
						} else {
							block.break(ball);
						}

						// シミュレートでない場合
						if( ball.simulate == 0 ) {
							// 爆発音
							sounds.play('bomb');

							// ポイント計算
							scoreMng.score += ~~(blockDefaultPoint * 1.5);
							ball.pointIncr += ~~(blockIncrPoint / 2);
						}
					}
				}
			}
		}
	}



	//--------------------------------------------------
	// シミュレート値のリセット
	//--------------------------------------------------
	this.simulateReset = function()
	{
		if( this.type ) { this.simulate = this.life + 1; }
		else { this.simulate = 0; }
	}
}



//--------------------------------------------------
// 武器
//--------------------------------------------------
function Weapon(type, x, y, vect)
{
	this.type = type - 1;							// 武器の種類（0:銃、1：ミサイル）
	this.x = x;										// 横軸座標
	this.y = 0;										// 縦軸座標
	this.vy = 0;									// 縦軸速度
	this.vect = 0;									// 進行方向
	this.size = (this.type == 0 ? 1 : 4);			// サイズ
	this.setInter = 0;								// 発射間隔制御フラグ


	// 縦軸座標の設定
	if( y != null ) { this.y = y; }
	else { this.y = ~~(bar.getTopY()); }

	// 進行方向の設定
	if( vect != null ) { this.vect = vect; }
	else { this.vect = 1; }

	

	//--------------------------------------------------
	// 上下・左右・中央座標取得
	//--------------------------------------------------
	this.getLeftX = function() {
		return this.x - this.size *0.5;
	}
	this.getCenterX = function() {
		return this.x;
	}
	this.getRightX = function() {
		return this.x + this.size *0.5;
	}
	
	this.getTopY = function() {
		return this.y - this.size *0.5;
	}
	this.getCenterY = function() {
		return this.y;
	}
	this.getBottomY = function() {
		return this.y + this.size *0.5;
	}


	//--------------------------------------------------
	// 移動
	//--------------------------------------------------
	this.move = function() {
		// 発射間隔の制御
		if( this.setInter == 0 ) {
			// 発射間隔の設定
			bar.weaponInter = 12;

			this.setInter = 1;

			// 発射音
			if( this.type == 0 ) {
				// 銃
				sounds.play('gun');
			} else {
				// ミサイル
				sounds.play('missile');
			}
		}

		// 座標を進める
		this.y -= this.vy * this.vect;

		// 変数の置き換え
		var x = this.x;
		var y = this.y;
		var vy = this.vy;

		// ミサイル風加速モーション
		if( this.vy < weaponSpeed[this.type] ) {
			// ミサイル
			if( this.type == 1 ) {
				this.vy += weaponSpeed[this.type] / (FPS * 0.5);
				if( this.vy > weaponSpeed[this.type] ) { this.vy = weaponSpeed[this.type]; }

			// 銃
			} else {
				this.vy = weaponSpeed[this.type];
			}
		}

		// 画面からアウト
		if( 0 > this.getBottomY() || this.getTopY() > canvasHeight ) { weapons.tarRemove(this); }

		// ブロック衝突判定
		if( this.vect > 0 )
		{
			var collisionFlag = 0;

			// 横方向
			var colDetStartX = ~~( this.getLeftX() / blockWidth );
			var colDetEndX = ~~( this.getRightX() / blockWidth );

			// 縦方向
			var colDetStartY = ~~( (this.getTopY() - statusBarHeight) / blockHeight );
			var colDetEndY = ~~( (this.getBottomY() - statusBarHeight) / blockHeight );

			// ボールが存在するエリア内を検査
			for( var i = colDetEndY; i >= colDetStartY; i-- )
			{
				var blockLine = blockMap[i];
				if( blockLine != null ){
					for( var j = colDetStartX; j <= colDetEndX; j++ )
					{
						var block = blockLine[j];

						// 衝突検出
						if( block != null && block.type != 0 )
						{
							// 接触音
							if( block.func != BLOCK_FUNCTION.EXPLODE && block.func != BLOCK_FUNCTION.EXPLODE_STRENGTH ) { sounds.play('block'); }

							// ミサイル
							if( this.type == 1 ) {
								block.action(null, 0);

							// 銃
							} else if( block.infinit != 1 )
							{
								// 破壊
								if( block.life < 1 ) {
									block.action(null, 0);

								// ライフの減少
								} else {
									block.decreaseLife();
								}
							}

							// 武器の消去
							weapons.tarRemove(this);

							collisionFlag = 1;
							break;
						}
					}
					if( collisionFlag == 1 ) { break; }
				}
			}
		}
		// バー衝突判定
		else if( 0 > this.vect )
		{
			if( this.getCenterY() + this.size * 6 >= bar.getTopY() && Math.abs(this.getCenterX() - bar.getCenterX()) <= bar.width/2 )
			{
				// バーへのダメージ
				bar.endamage(1);

				// 武器の消去
				weapons.tarRemove(this);

				// バルーンの追加
				balloons[balloons.length] = new Balloon(bar.hitPoint, bar.getCenterX() - 10, bar.getTopY() - 15, 25, 10, 0.13, "#000000", "#ff0000", 12);
			}
		}
	}



	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	this.draw = function(dynamicCtx)
	{
		// 銃
		if( this.type == 0 )
		{
			dynamicCtx.beginPath();
			dynamicCtx.strokeStyle = weaponColor[this.type];
			dynamicCtx.fillStyle = weaponLineColor[this.type];
			dynamicCtx.rect(~~(this.x - this.size) + 0.5, ~~(this.y + this.size) + 0.5, this.size, this.size * 6);
			dynamicCtx.fill();
			dynamicCtx.stroke();

		// ミサイル
		} else if( this.type == 1 )
		{
			// 弾頭
			dynamicCtx.beginPath();
			dynamicCtx.scale(1, 1.4);
			dynamicCtx.strokeStyle = weaponLineColor[this.type];
			dynamicCtx.fillStyle = weaponColor[this.type];
			dynamicCtx.arc(this.x + 0.5, this.y / 1.4 + 0.5, this.size, 0, 2 * Math.PI, false);
			dynamicCtx.fill();
			dynamicCtx.stroke();
			dynamicCtx.scale(1, 1 / 1.4);

			// 胴体
			dynamicCtx.beginPath();
			dynamicCtx.strokeStyle = weaponLineColor[this.type];
			dynamicCtx.fillStyle = weaponColor[this.type];
			dynamicCtx.rect(~~(this.x - this.size) + 0.5, ~~(this.y), this.size * 2, this.size * 3);
			dynamicCtx.fill();
			dynamicCtx.stroke();

			// 帯
			dynamicCtx.beginPath();
			dynamicCtx.fillStyle = '#dd0000';
			dynamicCtx.rect(~~(this.x - this.size) + 0.5, ~~(this.y) + 2.5, this.size * 2, 2);
			dynamicCtx.fill();
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
// 効果音
//--------------------------------------------------
function Sound()
{
	this.soundKeys = new Array('bomb', 'block', 'spBlock', 'bar', 'fall', 'wall', 'warp', 'clear', 'gun', 'missile', 'plusItem', 'minusItem', 'touchButton', 'game_over');
	this.soundObj = new Array();
	this.soundTurn = new Array();

	// 音源の準備
	var bufSize = ballMaxNum * 4;
	if( bufSize > 10 ) { bufSize = 10; }
	for( var i = 0, len = this.soundKeys.length; i < len; i++ ) {
		var key = this.soundKeys[i];
		if( soundFile[key] ) {
			this.soundTurn[key] = 0;
			this.soundObj[key] = new Array();

			// ロード
			for( var j = 0; j < bufSize; j ++ ) {
				this.soundObj[key][j] = new Audio(soundFile[key]);
				this.soundObj[key][j].load();
			}
		}
	}



	//--------------------------------------------------
	// 再生
	//--------------------------------------------------
	this.play = function(key) {
		if( ctrl.soundSwitch == 1 && this.soundObj[key] != null ) {
			var turn = this.soundTurn[key];

			// 再生
			this.soundObj[key][turn].play();

			// 順序の計算
			this.soundTurn[key] = (turn + 1) % bufSize;
		}
	}
}



//--------------------------------------------------
// ハート
//--------------------------------------------------
function Heart(x, y, fill) 
{
	this.x = x;
	this.y = y;
	this.imgData = imgData.getData("heart", fill);


	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	this.draw = function(dynamicCtx)
	{
		dynamicCtx.putImageData(this.imgData, this.x - heartWidth, this.y - heartHeight);
	}
}



//--------------------------------------------------
// 雲
//--------------------------------------------------
function Cloud(dynamicCtx, x, y)
{
	var NumX = 10;
	var NumY = 8;
	var Size = 6;

	for( var i = 0; i < NumX; i++ )
	{
		for( var j = 0; j < NumY; j++ )
		{
			var cloudX = x + (blockWidth / NumX) * i + Math.random() * blockWidth * 0.7;
			var cloudY = y + (blockHeight / NumY) * j + Math.random() * blockHeight * 0.7;
			dynamicCtx.beginPath();
			dynamicCtx.fillStyle = 'rgb(' + Number( ~~(Math.random() * 185) + 70 ) + ', 0, 0)';
			var rSize = Size * (Math.random() * 0.7 + 0.8);
			dynamicCtx.rect(cloudX - rSize, cloudY - rSize, rSize, rSize);
			dynamicCtx.fill();
		}
	}
}



//--------------------------------------------------
// ポップアップバルーン
//--------------------------------------------------
function Balloon(text, x, y, width, height, step, bcolor, fcolor, fsize)
{
	this.arcPos = new Array();
	this.arcNumX = 5;
	this.arcNumY = 3;
	this.arcSize = width / this.arcNumX * 1.8;
	this.x = x;
	this.y = y;
	this.boxWidth = width;
	this.boxHeight = height;
	this.text = text;
	this.alpha = 1;
	this.decrStep = step;
	this.endFlag = 0;
	this.backColor = bcolor;
	this.fontColor = fcolor;
	this.fontSize = fsize;

	// モコモコ位置の決定
	for( var i = 1; i <= this.arcNumX; i++ ) {
		for( var j = 1; j <= this.arcNumY; j++ ) {
			this.arcPos[this.arcPos.length] = new Array(
				i * this.boxWidth / this.arcNumX * (0.85 + 0.15 * Math.random()),
				j * this.boxHeight / this.arcNumY * (0.85 + 0.15 * Math.random())
			);
		}
	}


	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	this.draw = function(dynamicCtx)
	{
		// 実行判定
		if( this.endFlag ) { return; }

		// 四角とモコモコ
		dynamicCtx.beginPath();
		dynamicCtx.globalAlpha = this.alpha;
		dynamicCtx.fillStyle = this.backColor;
		dynamicCtx.rect(~~(x), ~~(y), this.boxWidth, this.boxHeight);
		for( var i = 0, len = this.arcNumX * this.arcNumY; i < len; i++ ) {
			dynamicCtx.arc(this.x + this.arcPos[i][0], this.y + this.arcPos[i][1], this.arcSize, 0, 2 * Math.PI, false);
		}
		dynamicCtx.fill();

		// 文字
		dynamicCtx.fillStyle = this.fontColor;
		dynamicCtx.font = this.fontSize + "px 'ＭＳ Ｐゴシック', 'Osaka'";
		dynamicCtx.textBaseline = "middle";
		dynamicCtx.textAlign = "center";
		dynamicCtx.fillText(this.text, this.x + this.boxWidth / 2, this.y + this.boxHeight / 2, this.boxWidth);
		dynamicCtx.globalAlpha = 1;

		// 透明度の増加
		this.alpha -= (1 + this.decrStep - this.alpha) * this.decrStep;

		// 終了判定
		if( this.alpha < 0 ) { this.endFlag = 1; }
	}
}



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
			var awardKey = recordName = awardKeyList[i];

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



//--------------------------------------------------
// 描画イメージ
//--------------------------------------------------
function ImageData(dynamicCtx)
{
	this.imgData = new Array();
	this.dynamicCtx = dynamicCtx;


	//--------------------------------------------------
	// コンストラクタ
	//--------------------------------------------------
	// 各種の描画イメージデータ用配列を用意
	this.imgData["ball"] = new Array(												// ボール
		"normal",																	// 通常状態
		"hard",																		// 強化状態
		"hard_tail0",																// 強化状態の残像１
		"hard_tail1",																// 強化状態の残像２
		"hard_tail2",																// 強化状態の残像３
		"hard_tail3",																// 強化状態の残像４
		"fire",																		// 無敵状態
		"fire_tail0",																// 無敵状態の残像１
		"fire_tail1",																// 無敵状態の残像２
		"fire_tail2",																// 無敵状態の残像３
		"fire_tail3"																// 無敵状態の残像４
	);
	this.imgData["block"] = new Array();											// ブロック
	this.imgData["item"] = new Array();												// アイテム
	this.imgData["heart"] = new Array();											// ハート
	this.imgData["bar"] = new Array(												// バー
		"normal"																	// 通常状態
	);
	this.imgData["weapon"] = new Array();											// 武器



	//--------------------------------------------------
	// 初期化
	//--------------------------------------------------
	this.init = function()
	{
		var dynamicCtx = this.dynamicCtx;

		//----------描画イメージを取得----------
		// ボール
		var imgDataBall = this.imgData["ball"];
		for( var stat = 0; stat < 3; stat++ )
		{
			for( var i = -1; i < 4; i++ )
			{
				// 名前の決定
				var dataName = "";
				if( stat == 0 ) { dataName = "normal"; }
				else if( stat == 1 ) { dataName = "hard"; }
				else if( stat == 2 ) { dataName = "fire"; }
				if( stat > 0 && i >= 0 ) { dataName += "_tail" + String(i); }

				// イメージの取得
				var radius = ballSize * (1 - 0.08 * i);
				this.drawBall(stat, i);
				imgDataBall[dataName] = dynamicCtx.getImageData(0, 0, radius*2, radius*2);
				dynamicCtx.clearRect(0, 0, canvasWidth, canvasHeight);

				// 通常の場合は残像を作らない
				if( stat == 0 ) { break; }
			}
		}

		// ブロック
		var imgDataBlock = this.imgData["block"];
		for( var i = 0, len = blockText.length; i < len; i++ )
		{
			this.drawBlock(i);
			imgDataBlock[i] = dynamicCtx.getImageData(0.5, 0.5, blockWidth + 0.5, blockHeight + 0.5);
			dynamicCtx.clearRect(0, 0, canvasWidth, canvasHeight);
		}

		// アイテム
		var imgDataItem = this.imgData["item"];
		for( var i = 0, len = itemText[ctrl.stageIndex].length; i < len; i++ )
		{
			this.drawItem(i);
			imgDataItem[i] = dynamicCtx.getImageData(0.5, 0.5, blockWidth + 0.5, blockHeight + 0.5);
			dynamicCtx.clearRect(0, 0, canvasWidth, canvasHeight);
		}

		// ハート
		var imgDataHeart = this.imgData["heart"];
		for( var i = 0; i < 2; i++ )
		{
			this.drawHeart(i);
			imgDataHeart[i] = dynamicCtx.getImageData(0, 0, heartWidth*3.5, heartHeight*2.3);
			dynamicCtx.clearRect(0, 0, canvasWidth, canvasHeight);
		}
	}


	//--------------------------------------------------
	// 描画イメージの取得
	//--------------------------------------------------
	this.getData = function(kind, stat)
	{
		return this.imgData[kind][stat];
	}


	//--------------------------------------------------
	// 描画イメージ配列の取得
	//--------------------------------------------------
	this.getDataArr = function(kind)
	{
		return this.imgData[kind];
	}


	//--------------------------------------------------
	// ボールの描画
	//--------------------------------------------------
	this.drawBall = function(stat, i)
	{
		var dynamicCtx = this.dynamicCtx;

		// iの補正
		if( i < 0 ) { i = 0; }

		// 強化・無敵球
		if( stat != 0 )
		{
			// 球の描画
			dynamicCtx.beginPath();

			// 色の選択
			if( stat == 1 ) { dynamicCtx.fillStyle = ballStrongColor; }
			else if( stat == 2 ) { dynamicCtx.fillStyle = ballUltimateColor; }

			// 透過率，半径の決定
			dynamicCtx.globalAlpha = 1 - i * 0.2;
			var radius = ballSize * (1 - 0.08 * i);

			dynamicCtx.arc(radius, radius, radius, 0, Math.PI * 2, false);
			dynamicCtx.fill();
			dynamicCtx.globalAlpha = 1;

		// 通常弾
		} else
		{
			dynamicCtx.beginPath();
			dynamicCtx.fillStyle = ballColor;
			dynamicCtx.arc(ballSize, ballSize, ballSize, 0, Math.PI * 2, false);
			dynamicCtx.fill();
		}
	}


	//--------------------------------------------------
	// ブロックの描画
	//--------------------------------------------------
	this.drawBlock = function(_type)
	{
		var dynamicCtx = this.dynamicCtx;

		// 矩形を描画
		dynamicCtx.beginPath();
		dynamicCtx.strokeStyle = blockLineColor[_type];
		dynamicCtx.fillStyle = blockColor[_type];
		dynamicCtx.rect(0.5, 0.5, blockWidth, blockHeight);
		dynamicCtx.fill();
		dynamicCtx.stroke();

		// ブロックの文字を描画
		var text = blockText[_type];
		if( text != null )
		{
			dynamicCtx.textBaseline = 'middle';
			dynamicCtx.textAlign = 'center';
			dynamicCtx.font = blockFontSize + "px 'ＭＳ Ｐゴシック'";
			dynamicCtx.fillStyle = blockTextColor[_type];
			dynamicCtx.fillText(text, 0.5 * blockWidth, 0.5 * blockHeight, blockWidth);
		}
	}


	//--------------------------------------------------
	// アイテムの描画
	//--------------------------------------------------
	this.drawItem = function(_type)
	{
		var dynamicCtx = this.dynamicCtx;

		// 矩形を描画
		dynamicCtx.beginPath();
		dynamicCtx.strokeStyle = itemLineColor[ctrl.stageIndex][_type];
		dynamicCtx.fillStyle = itemColor[ctrl.stageIndex][_type];
		dynamicCtx.rect(0.5, 0.5, blockWidth, blockHeight);
		dynamicCtx.fill();
		dynamicCtx.stroke();

		// アイテムの文字を描画
		dynamicCtx.beginPath();
		dynamicCtx.textBaseline = 'middle';
		dynamicCtx.textAlign = 'center';
		dynamicCtx.font = itemFontSize + "px 'ＭＳ Ｐゴシック'";
		dynamicCtx.fillStyle = itemTextColor[ctrl.stageIndex][_type];
		dynamicCtx.fillText(itemText[ctrl.stageIndex][_type], 0.5 * blockWidth, 0.5 * blockHeight, blockWidth * 0.95);
	}


	//--------------------------------------------------
	// ハートの描画
	//--------------------------------------------------
	this.drawHeart = function(stat)
	{
		var dynamicCtx = this.dynamicCtx;

		// Circle
		dynamicCtx.beginPath();
		dynamicCtx.strokeStyle = heartColor;
		dynamicCtx.scale(1, 3/2);
		if( stat == 1 ) { dynamicCtx.fillStyle = heartColor; }
		else { dynamicCtx.fillStyle = '#ffffff'; }

		dynamicCtx.arc(heartWidth*1.2 - heartWidth / 2 - 0.5, heartHeight / 1.5, heartWidth / 2 + 0.5, -Math.PI * 0.01, Math.PI, true);
		dynamicCtx.arc(heartWidth*1.2 + heartWidth / 2 + 0.5, heartHeight / 1.5, heartWidth / 2 + 0.5, Math.PI, Math.PI * 0.02, false);

		dynamicCtx.fill();
		dynamicCtx.scale(1, 2/3);

		// line
		dynamicCtx.moveTo(0.5, heartHeight + 0.5);
		dynamicCtx.lineTo(heartWidth + 1, heartHeight*2 + 0.5);

		dynamicCtx.moveTo(heartWidth*2.3, heartHeight + 0.5);
		dynamicCtx.lineTo(heartWidth*1.1, heartHeight*2 + 1.5);
		dynamicCtx.stroke();

		// fill
		dynamicCtx.beginPath();
		if( stat == 1 ) { dynamicCtx.strokeStyle = heartColor; }
		else { dynamicCtx.strokeStyle = '#ffffff'; }
		for( var i = heartHeight - 0.5; i < heartHeight*2; i += 1 )
		{
			dynamicCtx.moveTo(-heartWidth / heartHeight * ( i - heartHeight - heartWidth ) + heartWidth + 3, i);
			dynamicCtx.lineTo(heartWidth / heartHeight * ( i - heartHeight - heartWidth ) + heartWidth - 0.5, i);
			dynamicCtx.closePath();
		}
		dynamicCtx.stroke();
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
		var awardKey = recordName = awardKeyList[i];

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
