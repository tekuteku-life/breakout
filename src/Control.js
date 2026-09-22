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
			screenWidth = document.clientWidth;
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

export default Control;
