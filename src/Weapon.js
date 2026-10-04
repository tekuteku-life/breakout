// src/Weapon.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import Balloon from "./Balloon.js";
import { BLOCK_FUNCTION, DEFAULT_CONFIG } from "./const.js";

//--------------------------------------------------
// 武器
//--------------------------------------------------
export default class Weapon
{
	constructor(type, x, y, vect, game = null)
	{
		this.game = game;
		const bar = this.getBar();

		this.type = type - 1;							// 武器の種類（0:銃、1：ミサイル）
		this.x = x;										// 横軸座標
		this.y = 0;										// 縦軸座標
		this.vy = 0;									// 縦軸速度
		this.vect = 0;									// 進行方向
		this.size = (this.type == 0 ? 1 : 4);			// サイズ
		this.setInter = 0;								// 発射間隔制御フラグ

		// 縦軸座標の設定
		if( y != null ) { this.y = y; }
		else { this.y = bar ? ~~(bar.getTopY()) : 0; }

		// 進行方向の設定
		if( vect != null ) { this.vect = vect; }
		else { this.vect = 1; }
	}

	destructor()
	{
		const weaponList = this.getWeapons();
		if (weaponList) {
			const idx = weaponList.indexOf(this);
			if (idx >= 0) weaponList.splice(idx, 1);
		}
		this.game = null;
	}

	getGame() {
		return this.game || null;
	}

	getEventBus() {
		return (this.game && this.game.eventBus) || null;
	}

	getBar() {
		return (this.game && this.game.bar) || null;
	}

	getBlockMap() {
		return (this.game && this.game.blockMap) || [];
	}

	getWeapons() {
		return (this.game && this.game.weapons) || [];
	}

	getCanvasHeight() {
		return (this.game && this.game.canvasHeight) || DEFAULT_CONFIG.canvasHeight;
	}

	getStatusBarHeight() {
		return (this.game && this.game.statusBarHeight) || DEFAULT_CONFIG.statusBarHeight;
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
	// 移動
	//--------------------------------------------------
	move() {
		const bar = this.getBar();
		const blockMap = this.getBlockMap();
		const canvasHeight = this.getCanvasHeight();
		const statusBarHeight = this.getStatusBarHeight();

		const weaponSpeedList = (this.game && this.game.weaponSpeed) || [8, 6];
		const wSpeed = weaponSpeedList[this.type] !== undefined ? weaponSpeedList[this.type] : 6;
		const fps = (this.game && this.game.FPS) || DEFAULT_CONFIG.FPS;
		const blkWidth = (this.game && this.game.blockWidth) || DEFAULT_CONFIG.blockWidth;
		const blkHeight = (this.game && this.game.blockHeight) || DEFAULT_CONFIG.blockHeight;

		// 発射間隔の制御
		if( this.setInter == 0 ) {
			// 発射間隔の設定
			if (bar) bar.weaponInter = 12;

			this.setInter = 1;

			// 発射音（EventBus経由で通知）
			const weaponSound = (this.type == 0) ? 'gun' : 'missile';
			this.getEventBus()?.emitEvent('sound:play', weaponSound);
		}

		// 座標を進める
		this.y -= this.vy * this.vect;

		// 変数の置き換え
		var x = this.x;
		var y = this.y;
		var vy = this.vy;

		// ミサイル風加速モーション
		if( this.vy < wSpeed ) {
			// ミサイル
			if( this.type == 1 ) {
				this.vy += wSpeed / (fps * 0.5);
				if( this.vy > wSpeed ) { this.vy = wSpeed; }

			// 銃
			} else {
				this.vy = wSpeed;
			}
		}

		// 画面からアウト
		if( 0 > this.getBottomY() || this.getTopY() > canvasHeight ) { this.destructor(); }

		// ブロック衝突判定
		if( this.vect > 0 )
		{
			var collisionFlag = 0;

			// 横方向
			var colDetStartX = ~~( this.getLeftX() / blkWidth );
			var colDetEndX = ~~( this.getRightX() / blkWidth );

			// 縦方向
			var colDetStartY = ~~( (this.getTopY() - statusBarHeight) / blkHeight );
			var colDetEndY = ~~( (this.getBottomY() - statusBarHeight) / blkHeight );

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
							// 接触音（EventBus経由で通知）
							if( block.func != BLOCK_FUNCTION.EXPLODE && block.func != BLOCK_FUNCTION.EXPLODE_STRENGTH ) {
								this.getEventBus()?.emitEvent('sound:play', 'block');
							}

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
							this.destructor();

							collisionFlag = 1;
							break;
						}
					}
					if( collisionFlag == 1 ) { break; }
				}
			}
		}
		// バー衝突判定
		else if( 0 > this.vect && bar )
		{
			if( this.getCenterY() + this.size * 6 >= bar.getTopY() && Math.abs(this.getCenterX() - bar.getCenterX()) <= bar.width/2 )
			{
				// バーへのダメージ（EventBus経由で通知）
				this.getEventBus()?.emitEvent('bar:damage', 1);

				// バルーンの追加（EventBus経由で通知）
				const nextHitPoint = Math.max(0, bar.hitPoint - 1);
				this.getEventBus()?.emitEvent('balloon:spawn', {
					text: nextHitPoint,
					x: bar.getCenterX() - 10,
					y: bar.getTopY() - 15,
					width: 25,
					height: 10,
					alpha: 0.13,
					backColor: "#000000",
					fontColor: "#ff0000",
					fontSize: 12,
				});

				// 武器の消去
				this.destructor();
			}
		}
	}


	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	draw(dynamicCtx)
	{
		const wColor = (this.game && this.game.weaponColor) || ['#000', '#000'];
		const wLineColor = (this.game && this.game.weaponLineColor) || ['#fff', '#fff'];

		// 銃
		if( this.type == 0 )
		{
			dynamicCtx.beginPath();
			dynamicCtx.strokeStyle = wColor[this.type];
			dynamicCtx.fillStyle = wLineColor[this.type];
			dynamicCtx.rect(~~(this.x - this.size) + 0.5, ~~(this.y + this.size) + 0.5, this.size, this.size * 6);
			dynamicCtx.fill();
			dynamicCtx.stroke();

		// ミサイル
		} else if( this.type == 1 )
		{
			// 弾頭
			dynamicCtx.beginPath();
			dynamicCtx.scale(1, 1.4);
			dynamicCtx.strokeStyle = wLineColor[this.type];
			dynamicCtx.fillStyle = wColor[this.type];
			dynamicCtx.arc(this.x + 0.5, this.y / 1.4 + 0.5, this.size, 0, 2 * Math.PI, false);
			dynamicCtx.fill();
			dynamicCtx.stroke();
			dynamicCtx.scale(1, 1 / 1.4);

			// 胴体
			dynamicCtx.beginPath();
			dynamicCtx.strokeStyle = wLineColor[this.type];
			dynamicCtx.fillStyle = wColor[this.type];
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

