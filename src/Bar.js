// src/Bar.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import Weapon from "./Weapon.js";
import { DEFAULT_CONFIG } from "./const.js";

//--------------------------------------------------
// 反射バー
//--------------------------------------------------
export default class Bar
{
	constructor(game = null)
	{
		this.game = game;

		const cHeight = (this.game && this.game.canvasHeight) ? this.game.canvasHeight : DEFAULT_CONFIG.canvasHeight;
		const px = (this.game && this.game.inputManage) ? this.game.inputManage.pointX : (DEFAULT_CONFIG.canvasWidth / 2);
		const bDefHeight = DEFAULT_CONFIG.barDefaultHeight;
		const bDefSpeed = DEFAULT_CONFIG.barDefaultSpeed;
		const bDefWidth = DEFAULT_CONFIG.barDefaultWidth;
		const bEdge = 0.04;
		const bColor = '#114400';
		const bDefHP = 5;

		this.pointX = px;										// 入力位置（EventBusイベント等で更新）
		this.x = px;											// バー横軸位置
		this.y = cHeight - bDefHeight - 5.5;					// バー縦軸位置
		this.vx = 0;											// バー速度
		this.vxMax = bDefSpeed;									// バー最大速度
		this.width = bDefWidth;									// バー幅
		this.height = bDefHeight;								// バー高
		this.alpha = 1;											// バーの透過率調整
		this.widthStatusTime = 0;								// バー長の状態時間
		this.speedStatusTime = 0;								// バー速度の状態時間
		this.weapon = 0;										// バーの武器状態
		this.weaponTime = 0;									// バーの武器状態時間
		this.weaponInter = 0;									// バーの武器使用間隔
		this.vibrationTime = 0;									// バーの振動状態時間
		this.absorptionStatusTime = 0;							// バーの吸着状態時間
		this.absorptionNum = 0;									// バーの吸着球数
		this.edge = bEdge;										// バーの端の傾斜
		this.color = bColor;									// バーの色
		this.immortalStatusTime = 0;							// 不死身
		this.disturbStatusTime = 0;								// 画面の難視化
		this.hitPoint = bDefHP;									// バーのHP

		// EventBus経由でイベントを購読
		this.onPointXHandler = (x) => {
			this.pointX = x;
			this.hasReceivedInputPointX = true;
		};
		this.onDamageHandler = (damage = 1) => {
			this.endamage(damage);
		};
		this.onRelaunchHandler = () => {
			this.relaunch();
		};
		this.onApplyItemHandler = (itemType) => {
			this.applyItemEffect(itemType);
		};

		const bus = this.getEventBus();
		if (bus && typeof bus.addOnEvent === 'function') {
			bus.addOnEvent('input:pointX', this.onPointXHandler);
			bus.addOnEvent('bar:damage', this.onDamageHandler);
			bus.addOnEvent('bar:endamage', this.onDamageHandler);
			bus.addOnEvent('bar:relaunch', this.onRelaunchHandler);
			bus.addOnEvent('bar:applyItem', this.onApplyItemHandler);
		}
	}

	destructor()
	{
		const bus = this.getEventBus();
		if (bus && typeof bus.removeOnEvent === 'function') {
			if (this.onPointXHandler) bus.removeOnEvent('input:pointX', this.onPointXHandler);
			if (this.onDamageHandler) {
				bus.removeOnEvent('bar:damage', this.onDamageHandler);
				bus.removeOnEvent('bar:endamage', this.onDamageHandler);
			}
			if (this.onRelaunchHandler) bus.removeOnEvent('bar:relaunch', this.onRelaunchHandler);
			if (this.onApplyItemHandler) bus.removeOnEvent('bar:applyItem', this.onApplyItemHandler);
		}
		this.onPointXHandler = null;
		this.onDamageHandler = null;
		this.onRelaunchHandler = null;
		this.onApplyItemHandler = null;
		this.game = null;
	}


	getGame() {
		return this.game || null;
	}

	getEventBus() {
		return (this.game && this.game.eventBus) || null;
	}

	getBalls() {
		return (this.game && this.game.balls) || [];
	}

	getPointX() {
		return this.pointX !== undefined ? this.pointX : this.x;
	}

	setPointX(val) {
		this.pointX = val;
		if (this.getEventBus()) {
			this.getEventBus().emitEvent('input:pointX', val);
			this.getEventBus().emitEvent('input:setPointX', val);
		}
	}

	getCanvasWidth() {
		return (this.game && this.game.canvasWidth) || DEFAULT_CONFIG.canvasWidth;
	}

	getCanvasHeight() {
		return (this.game && this.game.canvasHeight) || DEFAULT_CONFIG.canvasHeight;
	}


	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	draw(ctx)
	{
		const bStatusDefaultTime = 10;
		const fps = (this.game && this.game.FPS) || DEFAULT_CONFIG.FPS;

		// 武器の描画
		if( this.weapon != 0 ) {
			new Weapon(this.weapon, ~~(this.getLeftX()), ~~(this.getTopY()), 1, this.game).draw(ctx);
			new Weapon(this.weapon, ~~(this.getRightX()), ~~(this.getTopY()), 1, this.game).draw(ctx);
		}

		// バー状態解除前の点滅制御
		if( (this.widthStatusTime != 0 && this.widthStatusTime <= bStatusDefaultTime * fps * 0.25) ||
			(this.magnetStatusTime != 0 && this.magnetStatusTime <= bStatusDefaultTime * fps * 0.25)
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
	getLeftX() {
		return this.x - this.width *0.5;
	}
	getCenterX() {
		return this.x;
	}
	getRightX() {
		return this.x + this.width *0.5;
	}

	getTopY() {
		return this.y;
	}
	getCenterY() {
		return this.y + this.height *0.5;
	}
	getBottomY() {
		return this.y + this.height;
	}


	//--------------------------------------------------
	// ボールを再発射
	//--------------------------------------------------
	relaunch()
	{
		const balls = this.getBalls();
		const bDefaultSpeed = (this.game && this.game.ballDefaultSpeed) || DEFAULT_CONFIG.ballDefaultSpeed;
		const bSpin = 0.2;

		// 吸着しているボールを探す
		let found = false;
		for( var i = 0, len = balls.length; i < len; i++ )
		{
			var ball = balls[i];

			if( ball && ball.isAbsorption == 1 )
			{
				// 吸着状態の解除
				ball.isAbsorption = 0;

				// 球速の変更
				if( Math.abs(this.vx) > bDefaultSpeed * 0.3 )
				{
					ball.vx = this.vx * bSpin;

				// ランダムに決定
				} else
				{
					ball.vx *= Math.random()*0.7 + 0.3;
				}

				// 吸着球個数の減少
				this.absorptionNum--;
				found = true;
				break;
			}
		}
		if (!found) {
			this.absorptionNum = 0;
		}
	}


	//--------------------------------------------------
	// 移動・状態遷移
	//--------------------------------------------------
	move()
	{
		const pointX = this.getPointX();
		const canvasWidth = this.getCanvasWidth();
		const bDefaultWidth = DEFAULT_CONFIG.barDefaultWidth;
		const bDefaultSpeed = DEFAULT_CONFIG.barDefaultSpeed;
		const bDefaultHeight = DEFAULT_CONFIG.barDefaultHeight;
		const bColor = '#114400';

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
			if( this.widthStatusTime <= 0 ) { this.width = bDefaultWidth; }
		}

		// バー速度状態の制御
		if( this.speedStatusTime > 0 )
		{
			this.speedStatusTime--;

			// バーサイズの変更
			if( this.vxMax > bDefaultSpeed ) { this.height = bDefaultHeight * 0.6; }
			else { this.height = bDefaultHeight * 1.6; }

			// 状態解除
			if( this.speedStatusTime <= 0 ) {
				this.vxMax = bDefaultSpeed;
				this.height = bDefaultHeight;
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
				while( this.absorptionNum > 0 )
				{
					const prevNum = this.absorptionNum;
					this.relaunch();
					if (this.absorptionNum >= prevNum) {
						this.absorptionNum = 0;
						break;
					}
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
				this.color = bColor;
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
	endamage(_damage)
	{
		const bDefHP = 5;

		// HPの減少
		this.hitPoint = Number(this.hitPoint) - Number(_damage);

		// HPがゼロでライフを1消費
		if( this.hitPoint <= 0 )
		{
			// HPを回復
			this.hitPoint = bDefHP;

			// ライフを消費（EventBus経由で通知）
			this.getEventBus()?.emitEvent('status:addLife', -1);
		}
	}


	//--------------------------------------------------
	// アイテム効果の適用（EventBusからの通知を受信）
	//--------------------------------------------------
	applyItemEffect(type)
	{
		const fps = (this.game && this.game.FPS) || DEFAULT_CONFIG.FPS;
		const barMaxWidth = (this.game && this.game.barMaxWidth) || 140;
		const barMinWidth = (this.game && this.game.barMinWidth) || 50;
		const barStatusDefaultTime = (this.game && this.game.barStatusDefaultTime) || 10;
		const barWeaponDefaultTime = (this.game && this.game.barWeaponDefaultTime) || 8;
		const barMinSpeed = (this.game && this.game.barMinSpeed) || 10;
		const barImmortalColor = (this.game && this.game.barImmortalColor) || '#ffff00';

		// バー幅伸長
		if (type == 3) {
			this.width = ~~(this.width * 1.3);
			if (this.width > barMaxWidth) { this.width = barMaxWidth; }
			this.widthStatusTime = barStatusDefaultTime * fps;
		// バー幅縮小
		} else if (type == 4) {
			this.width = ~~(this.width * 0.7);
			if (this.width < barMinWidth) { this.width = barMinWidth; }
			this.widthStatusTime = barStatusDefaultTime * fps;
		// 銃
		} else if (type == 9) {
			this.weapon = 1;
			this.weaponTime = barWeaponDefaultTime * fps;
		// ミサイル
		} else if (type == 10) {
			this.weapon = 2;
			this.weaponTime = barWeaponDefaultTime * fps;
		// 速度鈍化
		} else if (type == 11) {
			this.vxMax -= ~~(Math.abs(this.vxMax - barMinSpeed) * 0.8);
			if (this.vxMax < barMinSpeed) { this.vxMax = barMinSpeed; }
			this.speedStatusTime = barStatusDefaultTime * fps;
		// 加振
		} else if (type == 12) {
			this.vibrationTime = barStatusDefaultTime * fps;
		// 吸着
		} else if (type == 13) {
			this.absorptionStatusTime = barStatusDefaultTime * fps;
		// 不死身
		} else if (type == 14) {
			this.color = barImmortalColor;
			this.immortalStatusTime = barStatusDefaultTime * fps;
		// 画面難視化
		} else if (type == 15) {
			this.disturbStatusTime = barStatusDefaultTime * fps;
		}
	}


}


