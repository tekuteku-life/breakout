// Copyright (C) 2010 kt9, All rights reserved.
var title = 'Debug';					// タイトル

var soundFile = {
	'bomb' : './sound/bomb.wav',			// ボム衝突時の音
	'block' : './sound/block.wav',			// ブロック衝突時の音
	'spBlock' : './sound/sp_block.wav',		// 特殊状態でのブロック衝突時の音
	'bar' : './sound/bar.wav',			// バー衝突時の音
	'fall' : './sound/fall.wav',			// 落下時の音
	'clear' : './sound/clear.wav',			// クリア時の音
	'wall' : './sound/bar.wav',			// 壁衝突時の音
	'gun' : './sound/gun.wav',			// 銃発射音
	'missile' : './sound/missile.wav',		// ミサイル発射音
	'plusItem' : './sound/plus_item.wav',		// プラスアイテム取得時
	'minusItem' : './sound/minus_item.wav',		// マイナスアイテム取得時
	'touchButton' : './sound/touch_button.wav',	// ボタンにmouseOver時
};

var backGroundImage = new Array();			// 背景画像

var FPS = 50;						// 更新間隔
var lowFPSAlartRatio = 0;							// 低FPS警告の閾値割り合い（ゼロで無効）

var statusBarHeight = 22;				// ステータスバーの高さ

var defaultLife = 3;					// 初期ライフ
var maxLife = 5;					// 最大ライフ
var lifeColor = '#F00B3F';				// ライフ表示の色

var canvasWidth = 750;					// ステージ幅
var canvasHeight = 530;					// ステージ高

var barDefaultWidth = 80;				// 標準バー幅
var barMaxWidth = 140;					// 最大バー幅
var barMinWidth = 50;					// 最小バー幅
var barHeight = 7;					// バー高
var barColor = '#114400';				// バー色
var barDefaultSpeed = 75;							// バー移動速度
var barMinSpeed = 10;					// バー移動最低速度
var barWeaponColor = '#000000';				// 武器装着時のバー色
var barStatusDefaultTime = 10;				// バー状態持続時間（秒）
var barWeaponDefaultTime = 8;				// バーの武器状態持続時間（秒）
var barEdge = 0.04;					// バー両端の傾き（小さいと急になる）
var barSpin = 0.2;					// バーによる加速率
var barVibrationWidth = 5;							// バーの振動幅

var ballSize = 1;					// ボールサイズ
var ballDefaultSpeed = 5;				// 初期ボールスピード
var ballMaxSpeed = 5;					// 最大ボールスピード
var ballColor = '#1F3145';				// ボール色
var ballStrongColor = '#0CA366';			// 強化球の色
var ballUltimateColor = '#DC210C';			// 無敵球の色
var ballMaxNum = 4000;					// 最大ボール個数
var ballStatusTime = 8;					// ボール状態持続時間（秒）
var ballInfBoundCancel = 0;				// 無限ループ回避（する：1、しない：0）

var popBalloonBackColor = '#B5F002';
var popBalloonFontColor = '#000000';

//--------------------アワード--------------------
var pointPerLife = new Array(				// ライフ１つあたりの得点
	50, 60, 80, 120, 180, 260, 350, 450, 560
);
var pointPerBall = new Array(				// ボール１つあたりの得点
	10, 15, 15, 20, 25, 35, 50, 60, 80
);
var pointPerContBreak = new Array(			// 連続最大破壊数あたりの得点
	10, 12, 12, 15, 20, 28, 40, 55, 80
);
var strongBallClear = new Array(			// 無敵状態でのクリアによる得点
	100, 100, 100, 100, 100, 200, 200, 200, 200
);
var clearTimeThreashould = new Array(			// クリア時間しきい値
	60, 60, 60, 80, 100, 100, 80, 120, 180
);
var pointPerClearTime = new Array(			// クリア時間しきい値との差一秒あたりの得点
	5, 8, 8, 10, 12, 15, 20, 28, 35
);
var pointPerGetItem = new Array(			// 取得アイテム数あたりの得点
	5, 5, 5, 5, 5, 7, 7, 8, 8
);
var pointPerFallBall = new Array(			// 落とした球数あたりの得点（マイナス）
	10, 15, 15, 20, 20, 20, 30, 50, 50
);
//--------------------アワード--------------------


//--------------------アイテム--------------------
var itemFontSize = 14;					// アイテムの文字サイズ
var itemSpeed = new Array(				// アイテムの落下速度
	4, 4, 4, 4, 4, 4, 4, 4, 4
);

// 左から「ボール増殖、強化球、無敵球、反射バーの伸長・短縮、ライフの増加・減少、ボール速度の増加・現象、銃、ミサイル、バー移動速度鈍化」
var itemProb = new Array(				// アイテム発生確率（0～1）
	new Array( 1, 0 ),
	new Array( '0.03', '0.03',  '0.01',  '0.01',  '0.01',  '0',     '0',     '0', '0', '0.006', '0.004', '0.002' ),
	new Array( '0.05', '0.035', '0.009', '0.01',  '0.01',  '0',     '0',     '0', '0', '0.008', '0.005', '0.002' ),
	new Array( '0.06', '0.03',  '0.006', '0.01',  '0.01',  '0',     '0',     '0', '0', '0.003', '0.003', '0.02'  ),
	new Array( '0.05', '0.04',  '0.008', '0.01',  '0.01',  '0',     '0',     '0', '0', '0.005', '0.002', '0.002' ),
	new Array( '0.04', '0.03',  '0.02',  '0.01',  '0.01',  '0',     '0',     '0', '0', '0.006', '0.004', '0.003' ),
	new Array( '0.03', '0.03',  '0.01',  '0.02',  '0.025', '0.001', '0.002', '0', '0', '0.009', '0.003', '0.003' ),
	new Array( '0.03', '0.015', '0.01',  '0.02',  '0.025', '0.003', '0.002', '0', '0', '0.006', '0.001', '0.001' ),
	new Array( '0.03', '0.004', '0',     '0.01',  '0.01',  '0.002', '0.02',  '0', '0', '0.005', '0.001', '0.004' ),
	new Array( '0.03', '0.008', '0',     '0.01',  '0.01',  '0.002', '0.02',  '0', '0', '0.005', '0.001', '0.006' )
	/*new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
	new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
	new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
	new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
	new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
	new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
	new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
	new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)*/
);
var itemColor = new Array(				// アイテム色
	new Array( '#463EDF', '#224442', '#E12F09', '#C0C0C0', '#AFAF61', '#2E9260', '#6B255A', '', '', '#000000', '#ffffff', '#4E5344' ),
	new Array( '#463EDF', '#224442', '#E12F09', '#C0C0C0', '#AFAF61', '#2E9260', '#6B255A', '', '', '#000000', '#ffffff', '#4E5344' ),
	new Array( '#463EDF', '#224442', '#E12F09', '#C0C0C0', '#AFAF61', '#2E9260', '#6B255A', '', '', '#000000', '#ffffff', '#4E5344' ),
	new Array( '#463EDF', '#224442', '#E12F09', '#C0C0C0', '#AFAF61', '#2E9260', '#6B255A', '', '', '#000000', '#ffffff', '#4E5344' ),
	new Array( '#463EDF', '#224442', '#E12F09', '#C0C0C0', '#AFAF61', '#2E9260', '#6B255A', '', '', '#000000', '#ffffff', '#4E5344' ),
	new Array( '#463EDF', '#224442', '#E12F09', '#C0C0C0', '#AFAF61', '#2E9260', '#6B255A', '', '', '#000000', '#ffffff', '#4E5344' ),
	new Array( '#463EDF', '#224442', '#E12F09', '#C0C0C0', '#AFAF61', '#2E9260', '#6B255A', '', '', '#000000', '#ffffff', '#4E5344' ),
	new Array( '#463EDF', '#224442', '#E12F09', '#C0C0C0', '#AFAF61', '#2E9260', '#6B255A', '', '', '#000000', '#ffffff', '#4E5344' ),
	new Array( '#463EDF', '#224442', '#E12F09', '#C0C0C0', '#AFAF61', '#2E9260', '#6B255A', '', '', '#000000', '#ffffff', '#4E5344' )
);
var itemLineColor = new Array(				// アイテムのライン色
	new Array( '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '', '', '#ffffff', '#000000', '#ffffff' ),
	new Array( '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '', '', '#ffffff', '#000000', '#ffffff' ),
	new Array( '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '', '', '#ffffff', '#000000', '#ffffff' ),
	new Array( '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '', '', '#ffffff', '#000000', '#ffffff' ),
	new Array( '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '', '', '#ffffff', '#000000', '#ffffff' ),
	new Array( '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '', '', '#ffffff', '#000000', '#ffffff' ),
	new Array( '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '', '', '#ffffff', '#000000', '#ffffff' ),
	new Array( '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '', '', '#ffffff', '#000000', '#ffffff' ),
	new Array( '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '', '', '#ffffff', '#000000', '#ffffff' )
);
var itemText = new Array(				// アイテム文字
	new Array( 'Double', 'Hard', 'Fire', 'Long', 'Short', 'Life', 'Poison', 'SpeedUp', 'SpeedDown', 'Gun', 'Missile', 'Slow' ),
	new Array( 'Double', 'Hard', 'Fire', 'Long', 'Short', 'Life', 'Poison', 'SpeedUp', 'SpeedDown', 'Gun', 'Missile', 'Slow' ),
	new Array( 'Double', 'Hard', 'Fire', 'Long', 'Short', 'Life', 'Poison', 'SpeedUp', 'SpeedDown', 'Gun', 'Missile', 'Slow' ),
	new Array( 'Double', 'Hard', 'Fire', 'Long', 'Short', 'Life', 'Poison', 'SpeedUp', 'SpeedDown', 'Gun', 'Missile', 'Slow' ),
	new Array( 'Double', 'Hard', 'Fire', 'Long', 'Short', 'Life', 'Poison', 'SpeedUp', 'SpeedDown', 'Gun', 'Missile', 'Slow' ),
	new Array( 'Double', 'Hard', 'Fire', 'Long', 'Short', 'Life', 'Poison', 'SpeedUp', 'SpeedDown', 'Gun', 'Missile', 'Slow' ),
	new Array( 'Double', 'Hard', 'Fire', 'Long', 'Short', 'Life', 'Poison', 'SpeedUp', 'SpeedDown', 'Gun', 'Missile', 'Slow' ),
	new Array( 'Double', 'Hard', 'Fire', 'Long', 'Short', 'Life', 'Poison', 'SpeedUp', 'SpeedDown', 'Gun', 'Missile', 'Slow' ),
	new Array( 'Double', 'Hard', 'Fire', 'Long', 'Short', 'Life', 'Poison', 'SpeedUp', 'SpeedDown', 'Gun', 'Missile', 'Slow' )
);
var itemTextColor = new Array(				// アイテム文字色
	new Array( '#ffffff', '#ffffff', '#000000', '#000000', '#000000', '#ffffff', '#c5c5c5', '', '', '#c0c0c0', '#CC0000', '#cccccc' ),
	new Array( '#ffffff', '#ffffff', '#000000', '#000000', '#000000', '#ffffff', '#c5c5c5', '', '', '#c0c0c0', '#CC0000', '#cccccc' ),
	new Array( '#ffffff', '#ffffff', '#000000', '#000000', '#000000', '#ffffff', '#c5c5c5', '', '', '#c0c0c0', '#CC0000', '#cccccc' ),
	new Array( '#ffffff', '#ffffff', '#000000', '#000000', '#000000', '#ffffff', '#c5c5c5', '', '', '#c0c0c0', '#CC0000', '#cccccc' ),
	new Array( '#ffffff', '#ffffff', '#000000', '#000000', '#000000', '#ffffff', '#c5c5c5', '', '', '#c0c0c0', '#CC0000', '#cccccc' ),
	new Array( '#ffffff', '#ffffff', '#000000', '#000000', '#000000', '#ffffff', '#c5c5c5', '', '', '#c0c0c0', '#CC0000', '#cccccc' ),
	new Array( '#ffffff', '#ffffff', '#000000', '#000000', '#000000', '#ffffff', '#c5c5c5', '', '', '#c0c0c0', '#CC0000', '#cccccc' ),
	new Array( '#ffffff', '#ffffff', '#000000', '#000000', '#000000', '#ffffff', '#c5c5c5', '', '', '#c0c0c0', '#CC0000', '#cccccc' ),
	new Array( '#ffffff', '#ffffff', '#000000', '#000000', '#000000', '#ffffff', '#c5c5c5', '', '', '#c0c0c0', '#CC0000', '#cccccc' )
);

var weaponSpeed = new Array(7, 5);			// 武器の速度（0:銃、1:ミサイル）
var weaponMaxNum = new Array(5, 3);			// 最大連射数（0:銃、1:ミサイル）
var weaponColor = new Array('#000000', '#fefefe');	// 武器の色（0:銃、1:ミサイル）
var weaponLineColor = new Array('#000000', '#000000');	// 武器の線色（0:銃、1:ミサイル）
//--------------------アイテム--------------------


//--------------------ブロック--------------------
var blockWidth = 50;					// ブロック幅
var blockHeight = 20;					// ブロック高
var blockMotionTime = 0.6;				// ブロックのモーション時間
var blockDefaultPoint = 4;				// ブロック破壊による初期ポイント
var blockIncrPoint = 2;					// ブロック連続破壊による増加ポイント
var blockMoveInter = 0.6;				// ブロックの移動間隔（秒）
var blockFontSize = 15;					// ブロックの文字サイズ（px）

var blockColor = new Array(				// ブロック色
	'',
	'#aa5500',
	'#ff0000',
	'#aa9900',
	'#331100',
	'#ff7700',
	'#D7D7D7',
	'#aa0000',
	'#bbbbbb',
	'#408080',
	'#4a4a4a',
	'#4a4a4a'
);
var blockLineColor = new Array(				// ブロックのライン色
	'',
	'#ffffff',
	'#ffffff',
	'#ffffff',
	'#ffffff',
	'#ffffff',
	'#ffffff',
	'#ffffff',
	'#ffffff',
	'#ffffff',
	'#ffffff',
	'#ffffff'
);
var blockText = new Array(				// ブロック文字
	'', '', 'Bomb', '', '', 'Fuel', '', 'Napalm', '', 'Active', '↑↑↑', '↓↓↓'
);
var blockTextColor = new Array(				// ブロック文字色
	'', '', '#000000', '', '', '#000000', '', '#ffffff', '#2f2f00', '#ffffff', '#ffffff', '#ffffff'
);
var blockLife = new Array(				// ブロックの耐久性
	0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0
);
var blockThrough = new Array(				// ブロックの透過方向（0：なし、1～4：上、右、下、左）
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3
);
var blockInfinit = new Array(				// ブロックの破壊の可否（0：破壊可、1：破壊不可）
	0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1
);
var blockBreakLimit = new Array(			// ブロックの破壊制限時間
	0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0
);

// ブロック機能
// 0:普通、1:爆発、2:燃料、3:貫通、4:加速、5:減速、6:爆発＋貫通弾化、7:横移動
var blockFunction = new Array( 0, 0, 1, 0, 0, 2, 3, 6, 0, 7, 0, 0 );
//--------------------ブロック--------------------


//--------ステージ設定----------
var stageTitle = new Array(				// ステージタイトル
	'Beginner', 'Square', 'Fly', 'Poles', 'Practice', 'Practice2', 'Bomb', 'Rush', 'Aim'
);
var stageLifeUp = new Array(				// ステージクリア時のライフ回復量
	0, 1, 0, 1, 0, 1, 1, 0
);


var blockMapSet = new Array(
	// Test Stage
	new Array(
		new Array(6, 6, 6, 6, 6, 6, 6, 6, 6 ,6, 6, 6, 6, 6, 6),
		new Array(6, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6),
		new Array(6, 4, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 4, 6),
		new Array(6, 4, 6, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6, 4, 6),
		new Array(6, 4, 6, 4, 6, 6, 6, 6, 6, 6, 6, 4, 6, 4, 6),
		new Array(6, 4, 6, 4, 6, 4, 4, 4, 4, 4, 6, 4, 6, 4, 6),
		new Array(6, 4, 6, 4, 6, 4, 4, 4, 6, 4, 6, 4, 6, 4, 6),
		new Array(6, 4, 6, 4, 6, 4, 6, 4, 4, 4, 6, 4, 6, 4, 6),
		new Array(6, 4, 6, 4, 6, 4, 4, 6, 6, 4, 6, 4, 6, 4, 6),
		new Array(6, 4, 6, 4, 6, 4, 4, 6, 6, 4, 6, 4, 6, 4, 6),
		new Array(6, 4, 6, 4, 6, 4, 4, 6, 6, 4, 6, 4, 6, 4, 6),
		new Array(6, 4, 6, 4, 6, 4, 4, 6, 6, 4, 6, 4, 6, 4, 6),
		new Array(6, 4, 6, 4, 6, 4, 4, 6, 6, 4, 6, 4, 6, 4, 6),
		new Array(6, 4, 6, 4, 6, 4, 4, 6, 6, 4, 6, 4, 6, 4, 6),
		new Array(6, 4, 6, 4, 6, 4, 4, 6, 6, 4, 6, 4, 6, 4, 6),
		new Array(6, 4, 6, 4, 6, 4, 4, 6, 6, 4, 6, 4, 6, 4, 6),
		new Array(6, 4, 6, 4, 6, 4, 4, 6, 6, 4, 6, 4, 6, 4, 6),
		new Array(6, 4, 6, 4, 6, 4, 4, 6, 6, 4, 6, 4, 6, 4, 6),
		new Array(6, 4, 6, 4, 6, 4, 4, 6, 6, 4, 6, 4, 6, 4, 6),
		new Array(6, 4, 6, 4, 6, 6, 6, 6, 6, 4, 6, 4, 6, 4, 6),
		new Array(6, 4, 6, 4, 4, 4, 4, 4, 4, 4, 6, 4, 6, 4, 6),
		new Array(6, 4, 6, 6, 6, 6, 6, 6, 6, 6, 6, 4, 6, 4, 6),
		new Array(6, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6, 4, 6),
		new Array(6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 4, 6),
		new Array(4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6),
		new Array(4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4)
	),

	new Array(
		new Array(0),
		new Array(0),
		new Array(0),
		new Array(0, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1),
		new Array(0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3),
		new Array(0, 1, 6, 6, 6, 3, 6, 6, 6, 3, 6, 6, 6, 1),
		new Array(0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3),
		new Array(0, 1, 6, 6, 6, 3, 6, 6, 6, 3, 6, 6, 6, 1),
		new Array(0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3),
		new Array(0, 1, 6, 6, 6, 3, 6, 6, 6, 3, 6, 6, 6, 1),
		new Array(0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3),
		new Array(0, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1)
	),

	new Array(
		new Array(0, 4, 0, 0, 4, 0, 0, 4, 0, 0, 4, 0, 0, 4),
		new Array(0),
		new Array(0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1),
		new Array(0, 4, 0, 1, 3, 3, 3, 3, 3, 3, 3, 1, 0, 4),
		new Array(0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 1),
		new Array(0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 1),
		new Array(0, 4, 0, 1, 3, 3, 3, 3, 3, 3, 3, 1, 0, 4),
		new Array(0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 1),
		new Array(0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 1),
		new Array(0, 4, 0, 1, 3, 3, 3, 3, 3, 3, 3, 1, 0, 4),
		new Array(0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 1),
		new Array(0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 1),
		new Array(0, 4, 0, 1, 3, 3, 3, 3, 3, 3, 3, 1, 0, 4),
		new Array(0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1),
		new Array(0),
		new Array(0, 4, 0, 0, 4, 0, 0, 4, 0, 0, 4, 0, 0, 4)
	),

	new Array(
		new Array(0),
		new Array(0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4),
		new Array(0, 1, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 1),
		new Array(0, 1, 3, 4, 0, 0, 0, 0, 0, 0, 0, 4, 3, 1),
		new Array(0, 1, 3, 3, 4, 0, 0, 0, 0, 0, 4, 3, 3, 1),
		new Array(10, 1, 3, 3, 3, 4, 0, 0, 0, 4, 3, 3, 3, 1, 10),
		new Array(0, 4, 3, 3, 3, 1, 0, 0, 0, 1, 3, 3, 3, 4),
		new Array(0, 1, 4, 3, 3, 1, 0, 0, 0, 1, 3, 3, 4, 1),
		new Array(0, 1, 3, 4, 3, 1, 0, 0, 0, 1, 3, 4, 3, 1),
		new Array(0, 1, 3, 3, 4, 1, 0, 0, 0, 1, 4, 3, 3, 1),
		new Array(11, 1, 3, 3, 3, 4, 0, 0, 0, 4, 3, 3, 3, 1, 11),
		new Array(0, 4, 3, 3, 3, 1, 0, 0, 0, 1, 3, 3, 3, 4),
		new Array(0, 1, 4, 3, 3, 1, 0, 0, 0, 1, 3, 3, 4, 1),
		new Array(0, 1, 3, 4, 3, 1, 0, 0, 0, 1, 3, 4, 3, 1),
		new Array(0, 1, 3, 3, 4, 1, 0, 0, 0, 1, 4, 3, 3, 1),
		new Array(11, 1, 3, 3, 3, 4, 0, 0, 0, 4, 3, 3, 3, 1, 11),
		new Array(0, 4, 3, 3, 3, 1, 0, 0, 0, 1, 3, 3, 3, 4),
		new Array(0, 0, 4, 3, 3, 1, 0, 0, 0, 1, 3, 3, 4, 0),
		new Array(0, 0, 0, 4, 3, 1, 0, 0, 0, 1, 3, 4, 0, 0),
		new Array(0, 0, 0, 0, 4, 1, 0, 0, 0, 1, 4, 0, 0, 0),
		new Array(0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0)
	),

	new Array(
		new Array(0),
		new Array(0),
		new Array(0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1),
		new Array(0, 4, 6, 4, 0, 3, 4, 6, 4, 3, 0, 4, 6, 4),
		new Array(0, 3, 1, 3, 0, 3, 1, 1, 1, 3, 0, 3, 1, 3),
		new Array(0, 3, 6, 3, 0, 3, 3, 6, 3, 3, 0, 3, 6, 3),
		new Array(0, 3, 1, 3, 0, 3, 1, 1, 1, 3, 0, 3, 1, 3),
		new Array(0, 4, 6, 4, 0, 3, 4, 6, 4, 3, 0, 4, 6, 4),
		new Array(0, 3, 1, 3, 0, 3, 1, 1, 1, 3, 0, 3, 1, 3),
		new Array(0, 3, 6, 3, 0, 3, 3, 6, 3, 3, 0, 3, 6, 3),
		new Array(0, 3, 1, 3, 0, 3, 1, 1, 1, 3, 0, 3, 1, 3),
		new Array(0, 4, 6, 4, 0, 3, 4, 6, 4, 3, 0, 4, 6, 4),
		new Array(0, 3, 1, 3, 0, 3, 1, 1, 1, 3, 0, 3, 1, 3),
		new Array(0, 3, 6, 3, 0, 3, 3, 6, 3, 3, 0, 3, 6, 3),
		new Array(0, 3, 1, 3, 0, 3, 1, 1, 1, 3, 0, 3, 1, 3),
		new Array(0, 4, 6, 4, 0, 3, 4, 6, 4, 3, 0, 4, 6, 4),
		new Array(0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)
	),

	new Array(
		new Array(0),
		new Array(0),
		new Array(0),
		new Array(0, 1, 3, 3, 1, 3, 1, 3, 1, 3, 1, 3, 3, 1),
		new Array(0, 3, 4, 4, 2, 5, 3, 3, 3, 5, 2, 4, 4, 3),
		new Array(0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1),
		new Array(0, 3, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 3),
		new Array(0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1),
		new Array(0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1),
		new Array(0, 3, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 3),
		new Array(0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1),
		new Array(0, 3, 4, 4, 2, 5, 3, 3, 3, 5, 2, 4, 4, 3),
		new Array(0, 1, 3, 3, 1, 3, 1, 3, 1, 3, 1, 3, 3, 1)
	),

	new Array(
		new Array(0),
		new Array(0),
		new Array(0, 4, 4, 4, 1, 4, 1, 1, 1, 4, 1, 4, 4, 4),
		new Array(0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1),
		new Array(0, 1, 5, 3, 2, 3, 3, 3, 3, 3, 2, 3, 5, 1),
		new Array(0, 2, 4, 4, 3, 4, 3, 3, 3, 4, 3, 4, 4, 2),
		new Array(0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1),
		new Array(0, 1, 3, 3, 3, 3, 2, 3, 2, 3, 3, 3, 3, 1),
		new Array(0, 1, 3, 3, 3, 3, 2, 3, 2, 3, 3, 3, 3, 1),
		new Array(0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1),
		new Array(0, 2, 4, 4, 3, 4, 3, 3, 3, 4, 3, 4, 4, 2),
		new Array(0, 1, 5, 3, 2, 3, 3, 3, 3, 3, 2, 3, 5, 1),
		new Array(0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1),
		new Array(0, 4, 4, 1, 2, 1, 1, 1, 1, 1, 2, 1, 4, 4)
	),

	new Array(
		new Array(0),
		new Array(0),
		new Array(0, 4, 1, 4, 1, 4, 4, 4, 4, 4, 1, 4, 1, 4),
		new Array(0, 4, 2, 3, 2, 1, 1, 1, 1, 1, 2, 3, 2, 4),
		new Array(0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1),
		new Array(0, 1, 7, 3, 4, 4, 3, 3, 3, 4, 4, 3, 7, 1),
		new Array(0, 1, 3, 3, 2, 3, 3, 3, 3, 3, 2, 3, 3, 1),
		new Array(0, 1, 2, 3, 3, 3, 3, 2, 3, 3, 3, 3, 2, 1),
		new Array(0, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4),
		new Array(0, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4),
		new Array(0, 1, 2, 3, 3, 3, 3, 2, 3, 3, 3, 3, 2, 1),
		new Array(0, 1, 3, 3, 2, 3, 3, 3, 3, 3, 2, 3, 3, 1),
		new Array(0, 1, 2, 3, 4, 4, 3, 3, 3, 4, 4, 3, 2, 1),
		new Array(0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1),
		new Array(0, 4, 2, 3, 2, 1, 1, 1, 1, 1, 2, 3, 2, 4),
		new Array(0, 4, 3, 4, 1, 3, 3, 4, 3, 3, 1, 4, 3, 4)
	),

	new Array(
		new Array(0),
		new Array(0),
		new Array(0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1),
		new Array(0, 1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 1),
		new Array(0, 3, 4, 4, 6, 9, 0, 4, 0, 9, 6, 4, 4, 3),
		new Array(0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3),
		new Array(0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3),
		new Array(0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3),
		new Array(0, 1, 8, 8, 3, 8, 8, 8, 8, 8, 3, 8, 8, 1),
		new Array(0, 3, 4, 4, 6, 9, 0, 4, 0, 9, 6, 4, 4, 3),
		new Array(0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3),
		new Array(0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3),
		new Array(0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3),
		new Array(0, 1, 8, 8, 3, 8, 8, 8, 8, 8, 3, 8, 8, 1),
		new Array(0, 3, 4, 4, 6, 9, 0, 4, 0, 9, 6, 4, 4, 3),
		new Array(0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3),
		new Array(0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3),
		new Array(0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3),
		new Array(0, 1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 1)
	),

	new Array(
		new Array(6, 6, 3, 3, 4, 6, 6, 6, 6, 6, 4, 3, 3, 6, 6),
		new Array(6, 6, 3, 3, 4, 6, 6, 6, 6, 6, 4, 3, 3, 6, 6),
		new Array(0, 0, 9, 6, 4, 6, 6, 6, 6, 6, 4, 6, 9, 0, 0),
		new Array(6, 6, 4, 6, 4, 6, 6, 6, 6, 6, 4, 6, 4, 6, 6),
		new Array(6, 6, 4, 6, 4, 6, 6, 6, 6, 6, 4, 6, 4, 6, 6),
		new Array(6, 6, 4, 6, 4, 6, 6, 6, 6, 6, 4, 6, 4, 6, 6),
		new Array(6, 6, 4, 6, 4, 6, 6, 6, 6, 6, 4, 6, 4, 6, 6),
		new Array(6, 6, 4, 6, 4, 6, 6, 6, 6, 6, 4, 6, 4, 6, 6),
		new Array(6, 6, 4, 6, 4, 6, 6, 6, 6, 6, 4, 6, 4, 6, 6),
		new Array(6, 6, 4, 6, 4, 1, 1, 1, 1, 1, 4, 6, 4, 6, 6),
		new Array(6, 6, 4, 6, 4, 1, 1, 1, 1, 1, 4, 6, 4, 6, 6),
		new Array(6, 6, 4, 6, 4, 1, 3, 3, 3, 1, 4, 6, 4, 6, 6),
		new Array(6, 6, 4, 6, 4, 1, 3, 3, 3, 1, 4, 6, 4, 6, 6),
		new Array(6, 6, 4, 6, 4, 1, 3, 3, 3, 1, 4, 6, 4, 6, 6),
		new Array(6, 6, 4, 6, 4, 1, 3, 3, 3, 1, 4, 6, 4, 6, 6),
		new Array(6, 6, 4, 6, 4, 1, 3, 3, 3, 1, 4, 6, 4, 6, 6),
		new Array(6, 6, 4, 6, 4, 1, 3, 3, 3, 1, 4, 6, 4, 6, 6),
		new Array(6, 6, 4, 3, 4, 1, 3, 3, 3, 1, 4, 3, 4, 6, 6),
		new Array(6, 6, 4, 3, 4, 1, 1, 1, 1, 1, 4, 3, 4, 6, 6),
		new Array(8, 8, 4, 4, 9, 0, 0, 0, 0, 0, 9, 4, 4, 8, 8)
	)

	/*new Array(
		new Array(6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6),
		new Array(6, 6, 6, 6, 1, 1, 1, 1, 6, 6, 6, 6),
		new Array(4, 4, 4, 4, 1, 1, 1, 1, 4, 4, 4, 4),
		new Array(6, 6, 6, 6, 1, 3, 3, 1, 6, 6, 6, 6),
		new Array(6, 6, 6, 6, 1, 3, 3, 1, 6, 6, 6, 6),
		new Array(6, 6, 6, 6, 1, 3, 3, 1, 6, 6, 6, 6),
		new Array(1, 1, 1, 1, 1, 3, 3, 1, 1, 1, 1, 1),
		new Array(6, 6, 6, 6, 1, 3, 3, 1, 6, 6, 6, 6),
		new Array(6, 6, 6, 6, 1, 3, 3, 1, 6, 6, 6, 6),
		new Array(6, 6, 6, 6, 1, 3, 3, 1, 6, 6, 6, 6),
		new Array(1, 1, 1, 1, 1, 3, 3, 1, 1, 1, 1, 1),
		new Array(6, 6, 6, 6, 1, 3, 3, 1, 6, 6, 6, 6),
		new Array(6, 6, 6, 6, 1, 3, 3, 1, 6, 6, 6, 6),
		new Array(6, 6, 6, 6, 1, 3, 3, 1, 6, 6, 6, 6),
		new Array(1, 1, 1, 1, 1, 3, 3, 1, 1, 1, 1, 1),
		new Array(6, 6, 6, 6, 1, 3, 3, 1, 6, 6, 6, 6),
		new Array(6, 6, 6, 6, 1, 3, 3, 1, 6, 6, 6, 6),
		new Array(6, 6, 6, 6, 1, 1, 1, 1, 6, 6, 6, 6),
		new Array(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)
	)*/
);
//--------ステージ設定----------