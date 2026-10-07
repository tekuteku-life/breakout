// src/Bar.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import { DEFAULT_CONFIG, BAR_PARAM, ITEM_TYPE } from "./const.js";
import EventBus from "./EventBus.js";

//--------------------------------------------------
// 反射バー
//--------------------------------------------------
export default class Bar
{
	constructor(game = null)
	{
		this.game = game;

		const cHeight = (this.game && this.game.canvasHeight !== undefined) ? this.game.canvasHeight : DEFAULT_CONFIG.canvasHeight;
		const px = (this.game && this.game.inputManage) ? this.game.inputManage.pointX : (DEFAULT_CONFIG.canvasWidth / 2);
		const bDefHeight = (this.game && this.game.barDefaultHeight !== undefined) ? this.game.barDefaultHeight : DEFAULT_CONFIG.barDefaultHeight;
		const bDefSpeed = (this.game && this.game.barDefaultSpeed !== undefined) ? this.game.barDefaultSpeed : DEFAULT_CONFIG.barDefaultSpeed;
		const bDefWidth = (this.game && this.game.barDefaultWidth !== undefined) ? this.game.barDefaultWidth : DEFAULT_CONFIG.barDefaultWidth;
		const bEdge = (this.game && this.game.barEdge !== undefined) ? this.game.barEdge : DEFAULT_CONFIG.barEdge;
		const bColor = (this.game && this.game.barColor !== undefined) ? this.game.barColor : DEFAULT_CONFIG.barColor;
		const bDefHP = (this.game && this.game.barDefaultHP !== undefined) ? this.game.barDefaultHP : DEFAULT_CONFIG.barDefaultHP;

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
		this.onResetWidthHandler = () => this.resetWidth();
		this.onResetSpeedHandler = () => this.resetSpeed();
		this.onResetWeaponHandler = () => this.resetWeapon();
		this.onResetAbsorptionHandler = () => this.resetAbsorption();
		this.onResetImmortalHandler = () => this.resetImmortal();
		this.onResetDisturbHandler = () => this.resetDisturb();
		this.onResetVibrationHandler = () => this.resetVibration();

		EventBus.addOnEvent('input:pointX', this.onPointXHandler);
		EventBus.addOnEvent('bar:damage', this.onDamageHandler);
		EventBus.addOnEvent('bar:relaunch', this.onRelaunchHandler);
		EventBus.addOnEvent('bar:applyItem', this.onApplyItemHandler);
		EventBus.addOnEvent('bar:resetWidth', this.onResetWidthHandler);
		EventBus.addOnEvent('bar:resetSpeed', this.onResetSpeedHandler);
		EventBus.addOnEvent('bar:resetWeapon', this.onResetWeaponHandler);
		EventBus.addOnEvent('bar:resetAbsorption', this.onResetAbsorptionHandler);
		EventBus.addOnEvent('bar:resetImmortal', this.onResetImmortalHandler);
		EventBus.addOnEvent('bar:resetDisturb', this.onResetDisturbHandler);
		EventBus.addOnEvent('bar:resetVibration', this.onResetVibrationHandler);
	}

	destructor()
	{
		if (this.onPointXHandler) EventBus.removeOnEvent('input:pointX', this.onPointXHandler);
		if (this.onDamageHandler) EventBus.removeOnEvent('bar:damage', this.onDamageHandler);
		if (this.onRelaunchHandler) EventBus.removeOnEvent('bar:relaunch', this.onRelaunchHandler);
		if (this.onApplyItemHandler) EventBus.removeOnEvent('bar:applyItem', this.onApplyItemHandler);
		if (this.onResetWidthHandler) EventBus.removeOnEvent('bar:resetWidth', this.onResetWidthHandler);
		if (this.onResetSpeedHandler) EventBus.removeOnEvent('bar:resetSpeed', this.onResetSpeedHandler);
		if (this.onResetWeaponHandler) EventBus.removeOnEvent('bar:resetWeapon', this.onResetWeaponHandler);
		if (this.onResetAbsorptionHandler) EventBus.removeOnEvent('bar:resetAbsorption', this.onResetAbsorptionHandler);
		if (this.onResetImmortalHandler) EventBus.removeOnEvent('bar:resetImmortal', this.onResetImmortalHandler);
		if (this.onResetDisturbHandler) EventBus.removeOnEvent('bar:resetDisturb', this.onResetDisturbHandler);
		if (this.onResetVibrationHandler) EventBus.removeOnEvent('bar:resetVibration', this.onResetVibrationHandler);

		EventBus.removeTimer('bar:width');
		EventBus.removeTimer('bar:speed');
		EventBus.removeTimer('bar:weapon');
		EventBus.removeTimer('bar:absorption');
		EventBus.removeTimer('bar:immortal');
		EventBus.removeTimer('bar:disturb');
		EventBus.removeTimer('bar:vibration');

		this.onPointXHandler = null;
		this.onDamageHandler = null;
		this.onRelaunchHandler = null;
		this.onApplyItemHandler = null;
		this.onResetWidthHandler = null;
		this.onResetSpeedHandler = null;
		this.onResetWeaponHandler = null;
		this.onResetAbsorptionHandler = null;
		this.onResetImmortalHandler = null;
		this.onResetDisturbHandler = null;
		this.onResetVibrationHandler = null;
		this.game = null;
	}


	getGame() {
		return this.game || null;
	}

	getBalls() {
		if (this.game) {
			if (this.game.objectManage && this.game.objectManage.balls) return this.game.objectManage.balls;
			if (this.game.balls) return this.game.balls;
		}
		return [];
	}

	getPointX() {
		return this.pointX !== undefined ? this.pointX : this.x;
	}

	setPointX(val) {
		this.pointX = val;
		EventBus.emitEvent('input:setPointX', val);
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
		const bStatusDefaultTime = BAR_PARAM.STATUS_TIME_SEC;
		const fps = (this.game && this.game.FPS) || DEFAULT_CONFIG.FPS;

		// バー状態解除前の点滅制御
		if( (this.widthStatusTime != 0 && this.widthStatusTime <= bStatusDefaultTime * fps * BAR_PARAM.BLINK_TIME_RATIO) ||
			(this.absorptionStatusTime != 0 && this.absorptionStatusTime <= bStatusDefaultTime * fps * BAR_PARAM.BLINK_TIME_RATIO)
		) {
			this.alpha -= BAR_PARAM.BLINK_ALPHA_STEP;
			if( this.alpha < BAR_PARAM.BLINK_ALPHA_MIN ) { this.alpha = 1; }
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
					ball.vx = this.vx * BAR_PARAM.SPIN_RATIO;

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
	// 衝突判定（画面端との衝突・位置制限）
	//--------------------------------------------------
	checkCollision()
	{
		const canvasWidth = this.getCanvasWidth();
		const half_barWidth = ~~(this.width / 2);
		if( this.getLeftX() < 0 ) {
			this.vx -= this.getLeftX();
			this.x = half_barWidth;
			return true;
		} else if( this.getRightX() > canvasWidth ) {
			this.vx -= this.getRightX() - canvasWidth;
			this.x = canvasWidth - half_barWidth;
			return true;
		}
		return false;
	}


	//--------------------------------------------------
	//--------------------------------------------------
	// 位置移動と画面端制限
	//--------------------------------------------------
	movePosition()
	{
		const pointX = this.getPointX();

		// バー速度の計算
		this.vx = pointX - this.getCenterX();

		// バー速度の制限
		if( Math.abs(this.vx) > this.vxMax ) { this.vx = this.vxMax * (this.vx < 0 ? -1 : 1); }

		// 位置の移動
		this.x += this.vx;

		// 画面端との衝突判定・位置制限
		this.checkCollision();
	}

	//--------------------------------------------------
	// バーの振動制御
	//--------------------------------------------------
	updateVibration()
	{
		if( this.vibrationTime <= 0 ) { return; }

		const pointX = this.getPointX();
		const canvasWidth = this.getCanvasWidth();
		const vibrationWidth = this.width;

		// 画面端処理
		const half_barWidth = ~~(this.width / 2);
		let edgeBias = 0;
		if( pointX < half_barWidth ) {
			edgeBias = (half_barWidth - pointX) / half_barWidth;
		} else if( pointX > canvasWidth - half_barWidth ) {
			edgeBias = (canvasWidth - half_barWidth - pointX) / half_barWidth;
		}

		this.x += ~~((~~(Math.random() * 2) * 2 - 1 + edgeBias) * Math.random() * vibrationWidth);
		this.checkCollision();
	}

	//--------------------------------------------------
	// 武器発射間隔制御
	//--------------------------------------------------
	updateWeapon()
	{
		// 武器発射間隔の制御
		if( this.weaponInter > 0 ) { this.weaponInter--; }
	}

	//--------------------------------------------------
	// 各状態のリセットメソッド
	//--------------------------------------------------
	resetWidth()
	{
		const bDefaultWidth = (this.game && this.game.barDefaultWidth !== undefined) ? this.game.barDefaultWidth : DEFAULT_CONFIG.barDefaultWidth;
		this.width = bDefaultWidth;
		this.widthStatusTime = 0;
	}

	resetSpeed()
	{
		const bDefaultSpeed = (this.game && this.game.barDefaultSpeed !== undefined) ? this.game.barDefaultSpeed : DEFAULT_CONFIG.barDefaultSpeed;
		const bDefaultHeight = (this.game && this.game.barDefaultHeight !== undefined) ? this.game.barDefaultHeight : DEFAULT_CONFIG.barDefaultHeight;
		this.vxMax = bDefaultSpeed;
		this.height = bDefaultHeight;
		this.speedStatusTime = 0;
	}

	resetWeapon()
	{
		this.weapon = 0;
		this.weaponTime = 0;
	}

	resetAbsorption()
	{
		this.absorptionStatusTime = 0;
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

	resetImmortal()
	{
		const bColor = (this.game && this.game.barColor !== undefined) ? this.game.barColor : DEFAULT_CONFIG.barColor;
		this.immortalStatusTime = 0;
		this.color = bColor;
	}

	resetDisturb()
	{
		this.disturbStatusTime = 0;
	}

	resetVibration()
	{
		this.vibrationTime = 0;
	}

	//--------------------------------------------------
	// 移動・状態遷移
	//--------------------------------------------------
	move()
	{
		this.movePosition();
		this.updateVibration();
		this.updateWeapon();
	}


	//--------------------------------------------------
	// HPの減少
	//--------------------------------------------------
	endamage(_damage)
	{
		const bDefHP = (this.game && this.game.barDefaultHP !== undefined) ? this.game.barDefaultHP : DEFAULT_CONFIG.barDefaultHP;

		// HPの減少
		this.hitPoint = Number(this.hitPoint) - Number(_damage);

		// HPがゼロでライフを1消費
		if( this.hitPoint <= 0 )
		{
			// HPを回復
			this.hitPoint = bDefHP;

			// ライフを消費（EventBus経由で通知）
			EventBus.emitEvent('status:addLife', -1);
		}
	}


	//--------------------------------------------------
	// アイテム効果の適用（EventBusからの通知を受信）
	//--------------------------------------------------
	applyItemEffect(type)
	{
		const fps = (this.game && this.game.FPS !== undefined) ? this.game.FPS : DEFAULT_CONFIG.FPS;
		const barMaxWidth = (this.game && this.game.barMaxWidth !== undefined) ? this.game.barMaxWidth : DEFAULT_CONFIG.barMaxWidth;
		const barMinWidth = (this.game && this.game.barMinWidth !== undefined) ? this.game.barMinWidth : DEFAULT_CONFIG.barMinWidth;
		const barStatusDefaultTime = (this.game && this.game.barStatusDefaultTime !== undefined) ? this.game.barStatusDefaultTime : DEFAULT_CONFIG.barStatusDefaultTime;
		const barWeaponDefaultTime = (this.game && this.game.barWeaponDefaultTime !== undefined) ? this.game.barWeaponDefaultTime : DEFAULT_CONFIG.barWeaponDefaultTime;
		const barMinSpeed = (this.game && this.game.barMinSpeed !== undefined) ? this.game.barMinSpeed : DEFAULT_CONFIG.barMinSpeed;
		const barImmortalColor = (this.game && this.game.barImmortalColor !== undefined) ? this.game.barImmortalColor : DEFAULT_CONFIG.barImmortalColor;

		const statusDurationMs = barStatusDefaultTime * 1000;
		const weaponDurationMs = barWeaponDefaultTime * 1000;

		// バー幅伸長
		if (type === ITEM_TYPE.LONG) {
			this.width = ~~(this.width * BAR_PARAM.LONG_WIDTH_RATIO);
			if (this.width > barMaxWidth) { this.width = barMaxWidth; }
			this.widthStatusTime = barStatusDefaultTime * fps;
			EventBus.addTimer('bar:width', statusDurationMs, () => this.resetWidth(), {
				event: 'bar:resetWidth',
				onTick: (timer) => {
					this.widthStatusTime = Math.ceil(timer.remaining / (1000 / fps));
				}
			});
		// バー幅縮小
		} else if (type === ITEM_TYPE.SHORT) {
			this.width = ~~(this.width * BAR_PARAM.SHORT_WIDTH_RATIO);
			if (this.width < barMinWidth) { this.width = barMinWidth; }
			this.widthStatusTime = barStatusDefaultTime * fps;
			EventBus.addTimer('bar:width', statusDurationMs, () => this.resetWidth(), {
				event: 'bar:resetWidth',
				onTick: (timer) => {
					this.widthStatusTime = Math.ceil(timer.remaining / (1000 / fps));
				}
			});
		// 銃
		} else if (type === ITEM_TYPE.GUN) {
			this.weapon = 1;
			this.weaponTime = barWeaponDefaultTime * fps;
			EventBus.addTimer('bar:weapon', weaponDurationMs, () => this.resetWeapon(), {
				event: 'bar:resetWeapon',
				onTick: (timer) => {
					this.weaponTime = Math.ceil(timer.remaining / (1000 / fps));
				}
			});
		// ミサイル
		} else if (type === ITEM_TYPE.MISSILE) {
			this.weapon = 2;
			this.weaponTime = barWeaponDefaultTime * fps;
			EventBus.addTimer('bar:weapon', weaponDurationMs, () => this.resetWeapon(), {
				event: 'bar:resetWeapon',
				onTick: (timer) => {
					this.weaponTime = Math.ceil(timer.remaining / (1000 / fps));
				}
			});
		// 速度鈍化
		} else if (type === ITEM_TYPE.SLOW) {
			this.vxMax -= ~~(Math.abs(this.vxMax - barMinSpeed) * 0.8);
			if (this.vxMax < barMinSpeed) { this.vxMax = barMinSpeed; }
			const bDefaultHeight = (this.game && this.game.barDefaultHeight !== undefined) ? this.game.barDefaultHeight : DEFAULT_CONFIG.barDefaultHeight;
			this.height = bDefaultHeight * BAR_PARAM.SPEED_DOWN_HEIGHT_RATIO;
			this.speedStatusTime = barStatusDefaultTime * fps;
			EventBus.addTimer('bar:speed', statusDurationMs, () => this.resetSpeed(), {
				event: 'bar:resetSpeed',
				onTick: (timer) => {
					this.speedStatusTime = Math.ceil(timer.remaining / (1000 / fps));
				}
			});
		// 加振
		} else if (type === ITEM_TYPE.VIBRATE) {
			this.vibrationTime = barStatusDefaultTime * fps;
			EventBus.addTimer('bar:vibration', statusDurationMs, () => this.resetVibration(), {
				event: 'bar:resetVibration',
				onTick: (timer) => {
					this.vibrationTime = Math.ceil(timer.remaining / (1000 / fps));
				}
			});
		// 吸着
		} else if (type === ITEM_TYPE.ABSORB) {
			this.absorptionStatusTime = barStatusDefaultTime * fps;
			EventBus.addTimer('bar:absorption', statusDurationMs, () => this.resetAbsorption(), {
				event: 'bar:resetAbsorption',
				onTick: (timer) => {
					this.absorptionStatusTime = Math.ceil(timer.remaining / (1000 / fps));
				}
			});
		// 不死身
		} else if (type === ITEM_TYPE.IMMORTAL) {
			this.color = barImmortalColor;
			this.immortalStatusTime = barStatusDefaultTime * fps;
			EventBus.addTimer('bar:immortal', statusDurationMs, () => this.resetImmortal(), {
				event: 'bar:resetImmortal',
				onTick: (timer) => {
					this.immortalStatusTime = Math.ceil(timer.remaining / (1000 / fps));
				}
			});
		// 画面難視化
		} else if (type === ITEM_TYPE.DISTURB) {
			this.disturbStatusTime = barStatusDefaultTime * fps;
			EventBus.addTimer('bar:disturb', statusDurationMs, () => this.resetDisturb(), {
				event: 'bar:resetDisturb',
				onTick: (timer) => {
					this.disturbStatusTime = Math.ceil(timer.remaining / (1000 / fps));
				}
			});
		}
	}
}
