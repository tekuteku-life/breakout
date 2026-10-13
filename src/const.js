// src/const.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

// プリセットパス・ファイル定義
export const PRESET_PARAM = Object.freeze({
	BASE_PATH: './presets',
	DEFAULT_PRESET_KEY: 'default',
	DEFAULT_PRESET_TITLE: 'Default',
	DEFAULT_STAGE_DIR: './default',
	STAGE_DIR_NAME: 'stage',
	STAGE_MANIFEST_PATH: 'stage/manifest.json',
	COMMON_FILES: Object.freeze({
		common: 'common.json',
		bar: 'bar.json',
		heart: 'heart.json',
		ball: 'ball.json',
		weapon: 'weapon.json',
		item: 'item.json',
		balloon: 'balloon.json',
		block: 'block.json',
		sound: 'sound.json',
	}),
	STAGE_OBJECT_FILES: Object.freeze({
		block: 'block.json',
		item: 'item.json',
		weapon: 'weapon.json',
		award: 'award.json',
		ball: 'ball.json',
		blockmap: 'blockmap.json',
	}),
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

// 武器種別
export const WEAPON_TYPE = Object.freeze({
	GUN: 0,						// 銃
	MISSILE: 1,					// ミサイル
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
