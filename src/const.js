// src/const.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

// システムパラメータ
export const SYSTEM_PARAM = Object.freeze({
	BALL_HIST_MAX: 4,			// ボール座標履歴最大数
	DISTURB_OVERLAY_COLOR: 'rgba(0, 0, 0, 0.85)', // 画面難視化オーバーレイ色
});

// ゲームループ・タイムステップ制御用パラメータ
export const GAME_LOOP_PARAM = Object.freeze({
	BASE_FPS: 50,				// 基準フレームレート（FPS）
	STEP_TIME: 1000 / 50,		// 1ステップ当たりの基準ミリ秒 (20ms)
	MAX_ACCUMULATOR: 200,		// スパイラル防止用最大蓄積ミリ秒 (200ms)
});

// ボールインスタンス生成モード
export const BALL_CREATE_MODE = Object.freeze({
	LAUNCH: 1,					// 発射
	OTHER: 0,					// その他
});

// ボールコピーモード
export const BALL_COPY_MODE = Object.freeze({
	RAND: 0,					// ランダム
	SIMULATE: 1,				// シミュレーション用
});

// シミュレーション用パラメータ
export const SIMULATE_PARAM = Object.freeze({
	RESOLUTION: 400,			// シミュレーション速度解像度
	TIMES_PER_STEP: 10,			// 1ステップ当たりのシミュレーション回数
	MAX_PREDICT: 50,			// 最大シミュレーション時間（FPS）
});

// ブロック機能
export const BLOCK_FUNCTION = Object.freeze({
	NORMAL: 0,					// 普通
	EXPLODE: 1,					// 爆発
	FUEL: 2,					// 燃料
	THROUGH: 3,					// 貫通
	ACCELERATION: 4,			// 加速
	DECELERATION: 5,			// 減速
	EXPLODE_STRENGTH: 6,		// 爆発＋貫通弾化
	VERTICAL_MOVE: 7,			// 横移動
	WARP_ENTER: 8,				// ワープ入口
	WARP_EXIT: 9,				// ワープ出口
	MAGNET: 10,					// 引力
	REPULL: 11,					// 斥力
	BLINK: 12,					// 点滅
	ATTACK: 13,					// 攻撃
});

// ボール状態
export const BALL_STATUS = Object.freeze({
	NORMAL: 0,					// 通常
	STRONG: 1,					// 強化
	ULTIMATE: 2,				// 無敵
});

// アイテム種別
export const ITEM_TYPE = Object.freeze({
	DOUBLE: 0,					// 球2倍増殖
	HARD: 1,					// 球強化
	FIRE: 2,					// 球無敵
	LONG: 3,					// バー延長
	SHORT: 4,					// バー短縮
	LIFE: 5,					// ライフ+1
	POISON: 6,					// ライフ-1
	SPEED_UP: 7,				// バー高速化
	SPEED_DOWN: 8,				// バー低速化
	GUN: 9,						// 銃
	MISSILE: 10,				// ミサイル
	SLOW: 11,					// 球減速
	VIBRATE: 12,				// バー振動
	ABSORB: 13,					// 球吸着
	IMMORTAL: 14,				// バー無敵
	DISTURB: 15,				// 操作反転
});

// アイテム関連パラメータ
export const ITEM_PARAM = Object.freeze({
	DEFAULT_SPEED: Object.freeze([4, 4, 4]),	// ステージ毎のデフォルト落下速度
	STATUS_TIME_SEC: 10,						// 状態変化系アイテムの継続時間（秒）
	DEFAULT_FONT_SIZE: 14,						// アイテム表示フォントサイズ
});

// 武器種別
export const WEAPON_TYPE = Object.freeze({
	GUN: 0,						// 銃
	MISSILE: 1,					// ミサイル
});

// 武器パラメータ
export const WEAPON_PARAM = Object.freeze({
	DEFAULT_SPEED: Object.freeze([7, 5]),		// 武器デフォルト速度 [銃, ミサイル] (setup/default.jsと一致)
	MAX_NUM: Object.freeze([5, 3]),				// 武器最大発射数 [銃, ミサイル] (setup/default.jsと一致)
	FIRE_INTERVAL: 12,							// 武器発射間隔（フレーム数）
	MISSILE_ACCEL_RATIO: 0.5,					// ミサイル加速時間比率 (fps * 0.5)
});

// 反射バー用パラメータ
export const BAR_PARAM = Object.freeze({
	DEFAULT_COLOR: '#114400',					// デフォルトバー色
	IMMORTAL_COLOR: '#ffff00',					// 不死身時バー色 (setup/default.jsと一致)
	DEFAULT_HP: 5,								// デフォルト耐久値
	DEFAULT_EDGE: 0.04,							// バー端部傾斜係数
	SPIN_RATIO: 0.2,							// バー移動による球へのスピン係数
	STATUS_TIME_SEC: 10,						// 状態変化の継続時間（秒）
	WEAPON_TIME_SEC: 8,							// 武器装備継続時間（秒）
	SPEED_UP_RATIO: 1.6,						// バー速度アップ時の倍率
	SPEED_DOWN_RATIO: 0.6,						// バー速度ダウン時の倍率
	SPEED_UP_HEIGHT_RATIO: 0.6,					// バー速度アップ時の高さ倍率
	SPEED_DOWN_HEIGHT_RATIO: 1.6,				// バー速度ダウン時の高さ倍率
	LONG_WIDTH_RATIO: 1.3,						// バー延長時の幅倍率
	SHORT_WIDTH_RATIO: 0.7,						// バー短縮時の幅倍率
	BLINK_TIME_RATIO: 0.25,						// 終了予告点滅開始時間比率 (statusTime * 0.25)
	BLINK_ALPHA_STEP: 0.05,						// 点滅時のアルファ増減ステップ
	BLINK_ALPHA_MIN: 0.1,						// 点滅時の最小アルファ値
	VIBRATION_TIME_RATIO: 4,					// 振動継続時間（秒）
	MAX_WIDTH: 140,								// 最大バー幅 (setup/default.jsと一致)
	MIN_WIDTH: 50,								// 最小バー幅 (setup/default.jsと一致)
	MIN_SPEED: 10,								// バー移動最低速度 (setup/default.jsと一致)
});

// ボール用パラメータ
export const BALL_PARAM = Object.freeze({
	DEFAULT_POINT_INCR: 10,						// 連続ブロック破壊ポイント初期増分
	STATUS_TIME_SEC: 8,							// 強化・無敵状態の継続時間（秒）
	SPIN_RATIO: 0.2,							// バーからのスピン影響係数
	LAUNCH_CHARGE_MAX_SEC: 1.0,					// 発射ため撃ち最大時間（秒）
	MIN_VY_RATIO: 0.8,							// 最小縦方向速度比率 (defaultSpeed * 0.8)
	MIN_VX_RATIO: 0.01,							// 最小横方向速度比率 (defaultSpeed * 0.01)
	EDGE_ACCEL_RATIO: 0.4,						// バー端衝突時の加速係数
	VY_UP_STEP: 0.05,							// バー接触時の上昇速度補正微調整
	VY_DOWN_STEP: 0.4,							// バー接触時の下降速度補正微調整
	SPEED_UP_RATIO: 1.3,						// 速度アップアイテム適用倍率
	SPEED_DOWN_RATIO: 0.7,						// 速度ダウンアイテム適用倍率
});

// バルーン表示用パラメータ
export const BALLOON_PARAM = Object.freeze({
	FLOAT_SPEED: 1,								// 上昇速度
	FADE_SPEED: 0.02,							// フェードアウト速度
	DAMAGE_BALLOON: Object.freeze({				// バー被弾時のダメージ表示バルーン
		WIDTH: 25,
		HEIGHT: 10,
		ALPHA: 0.13,
		BACK_COLOR: '#000000',
		FONT_COLOR: '#ff0000',
		FONT_SIZE: 12,
		OFFSET_X: -10,
		OFFSET_Y: -15,
	}),
});

// ブロック用パラメータ
export const BLOCK_PARAM = Object.freeze({
	DRAWING_DISTANCE: 125,						// 引力・斥力影響最大距離 (setup/default.jsと一致)
	MAGNET_ACCEL_BASE: 25,						// 引力加速度計算基準値
	MAGNET_DIST_POW: 1.8,						// 引力距離減衰指数
	MAGNET_VX_RATIO: 1.6,						// 引力横方向補正比率
	MAGNET_VY_REL_NEG_RATIO: 0.4,				// 引力縦方向補正比率（異符号時）
	MAGNET_VY_REL_POS_RATIO: 0.2,				// 引力縦方向補正比率（同符号時）
	DEFAULT_MOVE_INTER_SEC: 0.6,				// 移動ブロック移動間隔（秒）(setup/default.jsと一致)
	DEFAULT_ATTACK_INTER_SEC: 2.8,				// 攻撃ブロック発射間隔（秒）(setup/default.jsと一致)
	DEFAULT_BLINK_INTER_SEC: 1.2,				// 点滅ブロック点滅間隔（秒）(setup/default.jsと一致)
	DEFAULT_MOTION_TIME_SEC: 0.6,				// 爆発モーション時間（秒）(setup/default.jsと一致)
	DEFAULT_POINT: 4,							// ブロック基本破壊ポイント (setup/default.jsと一致)
	DEFAULT_INCR_POINT: 2,						// 連続破壊追加ポイント (setup/default.jsと一致)
	BALLOON_BACK_COLOR: '#B5F002',				// 連続破壊バルーン背景色
	BALLOON_FONT_COLOR: '#000000',				// 連続破壊バルーン文字色
	MAX_DUARATION_LIMIT: 80,					// 無限バウンド防止衝突回数上限
});

// アワードのキー
export const AWARD_KEY_LIST = Object.freeze([
	'remainderLife',			// 残りライフアワード
	'ballNum',					// 球数アワード
	'strengClear',				// 強化・無敵状態クリアアワード
	'continuousBreakNum',		// 連続破壊最大数アワード
	'continuousBreakClear',		// 連続破壊クリアアワード
	'clearTime',				// クリア時間アワード
	'getItemNum',				// アイテム取得回数アワード
	'fallBallNum',				// 球の落下回数アワード
]);

// アプリケーション情報
export const APP_VER = 'v1.7.6';
export const APP_ID = 'breakout';

// デフォルトゲーム定数（setup/default.jsと完全同期）
export const DEFAULT_CONFIG = Object.freeze({
	FPS: 50,
	lowFPSAlartRatio: 0.8,
	statusBarHeight: 22,
	defaultLife: 3,
	maxLife: 5,
	heartColor: '#F00B3F',
	heartWidth: 7,
	heartHeight: 9,
	canvasWidth: 750,
	canvasHeight: 530,
	barDefaultWidth: 80,
	barMaxWidth: 140,
	barMinWidth: 50,
	barDefaultHeight: 7,
	barColor: '#114400',
	barDefaultSpeed: 75,
	barMinSpeed: 10,
	barStatusDefaultTime: 10,
	barWeaponDefaultTime: 8,
	barEdge: 0.04,
	barSpin: 0.2,
	barImmortalColor: '#ffff00',
	barDefaultHP: 5,
	pointerLockSwitch: 1,
	ballSize: 5,
	ballDefaultSpeed: 3.5,
	ballMaxSpeed: 5,
	ballColor: '#1F3145',
	ballStrongColor: '#0CA366',
	ballUltimateColor: '#DC210C',
	ballMaxNum: 4,
	ballStatusTime: 8,
	ballInfBoundCancel: 1,
	popBalloonBackColor: '#B5F002',
	popBalloonFontColor: '#000000',
	itemFontSize: 14,
	weaponSpeed: Object.freeze([7, 5]),
	weaponMaxNum: Object.freeze([5, 3]),
	weaponColor: Object.freeze(['#000000', '#fefefe']),
	weaponLineColor: Object.freeze(['#000000', '#000000']),
	blockWidth: 50,
	blockHeight: 20,
	blockMotionTime: 0.6,
	blockDefaultPoint: 4,
	blockIncrPoint: 2,
	blockMoveInter: 0.6,
	blockFontSize: 15,
	blockBlinkInter: 1.2,
	blockDrawingDistance: 125,
	blockAttackInter: 2.8,
	soundFile: Object.freeze({
		'bomb': './sound/bomb.wav',
		'block': './sound/block.wav',
		'spBlock': './sound/sp_block.wav',
		'bar': './sound/bar.wav',
		'fall': './sound/fall.wav',
		'clear': './sound/clear.wav',
		'wall': './sound/bar.wav',
		'warp': './sound/warp.wav',
		'gun': './sound/gun.wav',
		'missile': './sound/missile.wav',
		'plusItem': './sound/plus_item.wav',
		'minusItem': './sound/minus_item.wav',
		'touchButton': './sound/touch_button.wav',
		'game_over': './sound/game_over.wav',
	}),
	blockColor: Object.freeze([
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
		'#4a4a4a',
		'#660099',
		'#663366',
		'#72009D',
		'#72009D',
		'#efefef',
		'#000000',
	]),
	blockLineColor: Object.freeze([
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
		'#ffffff',
		'#ffffff',
		'#ffffff',
		'#ffffff',
		'#ffffff',
		'#ffffff',
		'#ffffff',
	]),
	itemColor: Object.freeze([
		Object.freeze(['#463EDF', '#224442', '#E12F09', '#C0C0C0', '#AFAF61', '#FFD1E9', '#6B255A', '', '', '#000000', '#ffffff', '#4E5344', '#ffff00', '#92D050', '#2E9260', '#4F6228']),
	]),
	itemLineColor: Object.freeze([
		Object.freeze(['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '', '', '#ffffff', '#000000', '#ffffff', '#000000', '#000000', '#ffffff', '#ffffff']),
	]),
	itemTextColor: Object.freeze([
		Object.freeze(['#ffffff', '#ffffff', '#000000', '#000000', '#000000', '#FF0000', '#c5c5c5', '', '', '#c0c0c0', '#CC0000', '#cccccc', '#000000', '#FFFF00', '#ffffff', '#ffffff']),
	]),
	itemText: Object.freeze([
		Object.freeze(['Double', 'Hard', 'Fire', 'Long', 'Short', 'Life', 'Poison', 'SpeedUp', 'SpeedDown', 'Gun', 'Missile', 'Slow', 'Vibrate', 'Absorb', 'Immortal', 'Disturb']),
	]),
	blockText: Object.freeze([
		'', '', 'Bomb', '', '', 'Fuel', '', 'Napalm', '', 'Active', '▲▲▲', '▼▼▼', 'In', 'Out', 'Magnet', 'Repull', 'Blink', 'Attack'
	]),
	blockTextColor: Object.freeze([
		'', '', '#000000', '', '', '#000000', '', '#ffffff', '#2f2f00', '#ffffff', '#ffffff', '#ffffff', '#dfdfdf', '#dfdfdf', '#FF1A1F', '#FF1A1F', '#bfbfbf', '#ff0000'
	]),
	blockLife: Object.freeze([
		0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0
	]),
	blockThrough: Object.freeze([
		0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 0, 0, 0, 0, 0, 0
	]),
	blockInfinit: Object.freeze([
		0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1
	]),
	blockBreakLimit: Object.freeze([
		0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0
	]),
	blockFunction: Object.freeze([
		0, 0, 1, 0, 0, 2, 3, 6, 0, 7, 0, 0, 8, 9, 10, 11, 12, 13
	]),
});

