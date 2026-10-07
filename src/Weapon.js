// src/Weapon.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import {
	DEFAULT_CONFIG,
	WEAPON_TYPE,
	WEAPON_PARAM,
} from "./const.js";
import EventBus from "./EventBus.js";

//--------------------------------------------------
// 武器
//--------------------------------------------------
export default class Weapon
{
	constructor(type, x, y, vect, game = null)
	{
		this.game = game;

		this.type = type - 1;							// 武器の種類（0:銃、1：ミサイル）
		this.x = x;										// 横軸座標
		this.y = (y != null) ? y : 0;					// 縦軸座標
		this.vy = 0;									// 縦軸速度
		this.vect = (vect != null) ? vect : 1;			// 進行方向
		this.size = (this.type == WEAPON_TYPE.GUN ? 1 : 4);	// サイズ
		this.setInter = 0;								// 発射間隔制御フラグ
	}

	destructor()
	{
		const weaponList = (this.game && this.game.objectManage && this.game.objectManage.weapons) || null;
		if (weaponList) {
			const idx = weaponList.indexOf(this);
			if (idx >= 0) weaponList.splice(idx, 1);
		}
		this.game = null;
	}

	getCanvasHeight() {
		return (this.game && this.game.canvasHeight) || DEFAULT_CONFIG.canvasHeight;
	}


	//--------------------------------------------------
	// 上下・左右・中央座標取得
	//--------------------------------------------------
	getLeftX() {
		return this.x - this.size *0.5;
	}
	getCenterX() {
		return this.x;
	}
	getRightX() {
		return this.x + this.size *0.5;
	}

	getTopY() {
		return this.y - this.size *0.5;
	}
	getCenterY() {
		return this.y;
	}
	getBottomY() {
		return this.y + this.size *0.5;
	}


	//--------------------------------------------------
	// 位置移動（物理演算）
	//--------------------------------------------------
	movePosition() {
		const weaponSpeedList = (this.game && this.game.weaponSpeed) || WEAPON_PARAM.DEFAULT_SPEED;
		const wSpeed = (weaponSpeedList[this.type] !== undefined) ? weaponSpeedList[this.type] : (WEAPON_PARAM.DEFAULT_SPEED[this.type] !== undefined ? WEAPON_PARAM.DEFAULT_SPEED[this.type] : 6);
		const fps = (this.game && this.game.FPS !== undefined) ? this.game.FPS : DEFAULT_CONFIG.FPS;

		// 座標を進める
		this.y -= this.vy * this.vect;

		// ミサイル風加速モーション
		if( this.vy < wSpeed ) {
			// ミサイル
			if( this.type == WEAPON_TYPE.MISSILE ) {
				this.vy += wSpeed / (fps * WEAPON_PARAM.MISSILE_ACCEL_RATIO);
				if( this.vy > wSpeed ) { this.vy = wSpeed; }

			// 銃
			} else {
				this.vy = wSpeed;
			}
		}
	}

	//--------------------------------------------------
	// 状態更新（発射音、画面外アウト判定・消去）
	//--------------------------------------------------
	updateState() {
		const canvasHeight = this.getCanvasHeight();

		// 発射音（EventBus経由で通知）
		if( this.setInter == 0 ) {
			this.setInter = 1;
			const weaponSound = (this.type == WEAPON_TYPE.GUN) ? 'gun' : 'missile';
			EventBus.emitEvent('sound:play', weaponSound);
		}

		// 画面からアウト
		if( 0 > this.getBottomY() || this.getTopY() > canvasHeight ) {
			this.destructor();
		}
	}

	//--------------------------------------------------
	// 衝突判定（BlockまたはBarとの交差判定）
	//--------------------------------------------------
	checkCollision(target) {
		if (!target) { return false; }

		// バーとの衝突判定（敵武器の場合など）
		if (typeof target.getTopY === 'function' && typeof target.getCenterX === 'function' && target.edge !== undefined) {
			return (
				this.getCenterY() + this.size * 6 >= target.getTopY() &&
				Math.abs(this.getCenterX() - target.getCenterX()) <= target.width / 2
			);
		}

		// ブロックとの衝突判定（自機武器の場合など）
		if (typeof target.getLeftX === 'function' && target.type !== undefined) {
			if (target.type === 0) { return false; }
			return (
				this.getLeftX() <= target.getRightX() &&
				this.getRightX() >= target.getLeftX() &&
				this.getTopY() <= target.getBottomY() &&
				this.getBottomY() >= target.getTopY()
			);
		}

		return false;
	}


	//--------------------------------------------------
	// 描画（静的メソッド）
	//--------------------------------------------------
	static drawWeapon(dynamicCtx, weaponNumber, x, y, game = null)
	{
		if (!dynamicCtx || !weaponNumber) return;
		const type = weaponNumber - 1;
		const size = (type == WEAPON_TYPE.GUN ? 1 : 4);
		const wColor = (game && game.weaponColor) || ['#000', '#000'];
		const wLineColor = (game && game.weaponLineColor) || ['#fff', '#fff'];

		// 銃
		if( type == 0 )
		{
			dynamicCtx.beginPath();
			dynamicCtx.strokeStyle = wColor[type] || '#000';
			dynamicCtx.fillStyle = wLineColor[type] || '#fff';
			dynamicCtx.rect(~~(x - size) + 0.5, ~~(y + size) + 0.5, size, size * 6);
			dynamicCtx.fill();
			dynamicCtx.stroke();

		// ミサイル
		} else if( type == 1 )
		{
			// 弾頭
			if (typeof dynamicCtx.save === 'function') { dynamicCtx.save(); }
			dynamicCtx.beginPath();
			dynamicCtx.scale(1, 1.4);
			dynamicCtx.strokeStyle = wLineColor[type] || '#fff';
			dynamicCtx.fillStyle = wColor[type] || '#000';
			dynamicCtx.arc(x + 0.5, y / 1.4 + 0.5, size, 0, 2 * Math.PI, false);
			dynamicCtx.fill();
			dynamicCtx.stroke();
			if (typeof dynamicCtx.restore === 'function') {
				dynamicCtx.restore();
			} else {
				dynamicCtx.scale(1, 1 / 1.4);
			}

			// 胴体
			dynamicCtx.beginPath();
			dynamicCtx.strokeStyle = wLineColor[type] || '#fff';
			dynamicCtx.fillStyle = wColor[type] || '#000';
			dynamicCtx.rect(~~(x - size) + 0.5, ~~(y), size * 2, size * 3);
			dynamicCtx.fill();
			dynamicCtx.stroke();

			// 帯
			dynamicCtx.beginPath();
			dynamicCtx.fillStyle = '#dd0000';
			dynamicCtx.rect(~~(x - size) + 0.5, ~~(y) + 2.5, size * 2, 2);
			dynamicCtx.fill();
		}
	}

	draw(dynamicCtx)
	{
		Weapon.drawWeapon(dynamicCtx, this.type + 1, this.x, this.y, this.game);
	}
}

