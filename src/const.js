// src/const.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

// システムパラメータ
export const SYSTEM_PARAM = Object.freeze({
	BALL_HIST_MAX: 4,			// ボール座標履歴最大数
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

// デフォルトゲーム定数
export const DEFAULT_CONFIG = Object.freeze({
	FPS: 50,
	canvasWidth: 750,
	canvasHeight: 530,
	statusBarHeight: 22,
	blockWidth: 50,
	blockHeight: 20,
	defaultLife: 3,
	maxLife: 5,
	ballSize: 5,
	ballDefaultSpeed: 3.5,
	ballMaxSpeed: 5,
	ballColor: '#1F3145',
	ballStrongColor: '#0CA366',
	ballUltimateColor: '#DC210C',
	ballMaxNum: 4,
	heartColor: '#F00B3F',
	heartWidth: 7,
	heartHeight: 9,
	barDefaultWidth: 80,
	barDefaultHeight: 7,
	barDefaultSpeed: 75,
	itemFontSize: 14,
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
		Object.freeze(['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '', '', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff']),
	]),
	itemTextColor: Object.freeze([
		Object.freeze(['#ffffff', '#ffffff', '#000000', '#000000', '#000000', '#FF0000', '#c5c5c5', '', '', '#c0c0c0', '#CC0000', '#cccccc', '#000000', '#FFFF00', '#ffffff', '#ffffff']),
	]),
	itemText: Object.freeze([
		Object.freeze(['Double', 'Hard', 'Fire', 'Long', 'Short', 'Life', 'Poison', 'SpeedUp', 'SpeedDown', 'Gun', 'Missile', 'Slow', 'Vibrate', 'Absorb', 'Immortal', 'Disturb']),
	]),
});

