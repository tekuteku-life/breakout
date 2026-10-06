// src/Ball.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import {
	SYSTEM_PARAM,
	BALL_CREATE_MODE,
	BALL_COPY_MODE,
	BALL_STATUS,
	BALL_PARAM,
	BAR_PARAM,
	BLOCK_FUNCTION,
	DEFAULT_CONFIG,
} from "./const.js";

//--------------------------------------------------
// ボール
//--------------------------------------------------
export default class Ball
{
	constructor(launch, game = null, initialMouseDownTime = 0)
	{
		this.game = game;
		const bSize = (this.game && this.game.ballSize !== undefined) ? this.game.ballSize : DEFAULT_CONFIG.ballSize;
		const defPoint = (this.game && this.game.blockDefaultPoint !== undefined) ? this.game.blockDefaultPoint : BALL_PARAM.DEFAULT_POINT_INCR;
		const imgSource = (this.game && this.game.imgData) ? this.game.imgData : null;

		this.radius = bSize;									// ボールの半径
		this.x;													// ボール横方向位置
		this.y;													// ボール縦方向位置
		this.vx;												// ボール横方向速度
		this.vy;												// ボール縦方向速度
		this.prevX = this.x;									// 前フレーム横方向座標
		this.prevY = this.y;									// 前フレーム縦方向座標
		this.lastHitAxis = null;								// 直前の衝突軸 ('x' | 'y')
		this.histX = new Array();								// ボール横方向位置履歴
		this.histY = new Array();								// ボール縦方向位置履歴
		this.pointIncr = defPoint;								// ポイント増分
		this.simulate = 0;										// シミュレートフラグ
		this.breakNum = 0;										// ブロック破壊回数
		this.collisionNum = 0;									// ブロック衝突回数
		this.status = 0;										// ボール状態
		this.statusTime = 0;									// ボール状態時間
		this.duaration = 0;										// 滞空時間
		this.isAbsorption = 0;									// 吸着状態フラグ
		this.absorptionPoint = new Array(0, 0);					// 吸着座標（バーからの相対位置）
		this.imgData = (imgSource && typeof imgSource.getDataArr === 'function') ? imgSource.getDataArr("ball") : null;	// 画像データ
		this.inputMouseDownTime = initialMouseDownTime || 0;
		Ball.nextBallId = (Ball.nextBallId || 0) + 1;
		this.ballId = Ball.nextBallId;

		// EventBus経由でマウスダウン時刻の変更を監視
		this.onMouseDownHandler = (time) => {
			this.inputMouseDownTime = time;
		};
		const bus = this.getEventBus();
		if (bus && typeof bus.addOnEvent === 'function') {
			bus.addOnEvent('input:mouseDownTime', this.onMouseDownHandler);
		}


		//--------------------------------------------------
		// 発射
		//--------------------------------------------------
		if( launch == BALL_CREATE_MODE.LAUNCH ) {
			const mdTime = this.inputMouseDownTime || 0;
			const bar = (this.game && this.game.bar) || null;
			const bDefaultSpeed = (this.game && this.game.ballDefaultSpeed) || DEFAULT_CONFIG.ballDefaultSpeed;
			const bMaxSpeed = (this.game && this.game.ballMaxSpeed) || DEFAULT_CONFIG.ballMaxSpeed;


			// ため打ち時間の計算
			var diffTime = 0;
			if( mdTime != 0 )
			{
				diffTime = ( Date.now() - mdTime ) / 1000;
				if( diffTime > 1 ) { diffTime = 1; }
			}

			const barVx = (bar && bar.vx !== undefined) ? bar.vx : 0;

			// 初速度の決定
			this.vx = ((Math.random() + 1) * bDefaultSpeed * 0.5 / (Math.abs(barVx) || 1) + 1) + barVx;
			this.vy = -1 * (bDefaultSpeed + ( bMaxSpeed - bDefaultSpeed ) * diffTime);
			if( Math.abs(this.vy) > bMaxSpeed ) { this.vy = bMaxSpeed * ( this.vy < 0 ? -1 : 1 ); }
			if( Math.abs(this.vx) > bMaxSpeed ) { this.vx = bMaxSpeed * ( this.vx < 0 ? -1 : 1 ); }

			// 初期位置の決定
			if (bar) {
				this.x = bar.getCenterX();
				this.y = bar.getTopY() - this.radius;
			}
		}
	}

	destructor()
	{
		const bus = this.getEventBus();
		if (bus && this.onMouseDownHandler && typeof bus.removeOnEvent === 'function') {
			bus.removeOnEvent('input:mouseDownTime', this.onMouseDownHandler);
			this.onMouseDownHandler = null;
		}
		if (bus && typeof bus.removeTimer === 'function') {
			bus.removeTimer(`ball:${this.ballId}:status`);
		}

		const ballList = this.getBalls();
		if (ballList) {
			const idx = ballList.indexOf(this);
			if (idx >= 0) ballList.splice(idx, 1);
		}
		this.histX = null;
		this.histY = null;
		this.absorptionPoint = null;
		this.imgData = null;
		this.game = null;
	}

	//--------------------------------------------------
	// ボール状態の設定（EventBusタイマーと連携）
	//--------------------------------------------------
	setStatus(status, durationSec = null) {
		const fps = (this.game && this.game.FPS !== undefined) ? this.game.FPS : DEFAULT_CONFIG.FPS;
		const bStatusTime = durationSec !== null
			? durationSec
			: ((this.game && this.game.ballStatusTime !== undefined) ? this.game.ballStatusTime : DEFAULT_CONFIG.ballStatusTime);

		this.status = status;
		this.statusTime = Math.round(bStatusTime * fps);

		const bus = this.getEventBus();
		if (bus && typeof bus.addTimer === 'function') {
			const durationMs = bStatusTime * 1000;
			bus.addTimer(`ball:${this.ballId}:status`, durationMs, () => {
				this.resetStatus();
			}, {
				event: 'ball:resetStatus',
				args: [this],
				onTick: (timer) => {
					this.statusTime = Math.ceil(timer.remaining / (1000 / fps));
				}
			});
		}
	}

	//--------------------------------------------------
	// ボール状態のリセット
	//--------------------------------------------------
	resetStatus() {
		this.status = BALL_STATUS.NORMAL;
		this.statusTime = 0;
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

	getCanvasWidth() {
		return (this.game && this.game.canvasWidth) || DEFAULT_CONFIG.canvasWidth;
	}

	getCanvasHeight() {
		return (this.game && this.game.canvasHeight) || DEFAULT_CONFIG.canvasHeight;
	}

	getStatusBarHeight() {
		return (this.game && this.game.statusBarHeight) || DEFAULT_CONFIG.statusBarHeight;
	}


	//--------------------------------------------------
	// コピー
	//--------------------------------------------------
	copy(mode)
	{
		const bDefaultSpeed = (this.game && this.game.ballDefaultSpeed) || DEFAULT_CONFIG.ballDefaultSpeed;
		var obj = new Ball(BALL_CREATE_MODE.OTHER, this.game);
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
		if (this.histX) { obj.histX = this.histX.copy ? this.histX.copy() : [...this.histX]; }
		if (this.histY) { obj.histY = this.histY.copy ? this.histY.copy() : [...this.histY]; }

		// 速度変更
		if( mode == BALL_COPY_MODE.RAND )
		{
			if( obj.vy > 0 && Math.random() < 0.6 ) { obj.vy *= -1; }
			else { obj.vy = (Math.random() * 0.15 + 0.85) * bDefaultSpeed; }
			obj.vx = (~~(Math.random() * 2) * 2 - 1) * (Math.random() * 0.7 + 0.3) * bDefaultSpeed;

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
	getLeftX() {
		return this.x - this.radius;
	}
	getCenterX() {
		return this.x;
	}
	getRightX() {
		return this.x + this.radius;
	}

	getTopY() {
		return this.y - this.radius;
	}
	getCenterY() {
		return this.y;
	}
	getBottomY() {
		return this.y + this.radius;
	}


	//--------------------------------------------------
	// 落下
	//--------------------------------------------------
	fall()
	{
		const bus = this.getEventBus();
		const game = this.game;
		const bar = (game && game.bar) || null;

		// 落下音（EventBus経由で通知）
		bus?.emitEvent('sound:play', 'fall');

		// 落下数の計算（EventBus経由で通知）
		bus?.emitEvent('award:add', { key: 'fallBallNum', count: 1 });

		// ボール消去（ballListから自身を削除）
		this.destructor();

		// 残りのボール一覧を取得（destructorでthis.gameがnullになるためgame参照を使用）
		const remainingBalls = (game && game.balls) ? game.balls : [];

		// 全てのボールが落ちた場合のみ、EventBus経由でラウンドリセットを通知
		if ((!bar || bar.immortalStatusTime <= 0) && remainingBalls.length === 0) {
			bus?.emitEvent('ball:allLost');
		}
	}

	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	draw(ctx)
	{
		const bColor = (this.game && this.game.ballColor) || DEFAULT_CONFIG.ballColor;
		const bStrongColor = (this.game && this.game.ballStrongColor) || DEFAULT_CONFIG.ballStrongColor;
		const bUltimateColor = (this.game && this.game.ballUltimateColor) || DEFAULT_CONFIG.ballUltimateColor;
		const bStatusTime = (this.game && this.game.ballStatusTime !== undefined) ? this.game.ballStatusTime : DEFAULT_CONFIG.ballStatusTime;
		const fps = (this.game && this.game.FPS) || DEFAULT_CONFIG.FPS;

		// 色の選択
		if( this.status == BALL_STATUS.NORMAL ) { ctx.fillStyle = bColor; }
		else if( this.status == BALL_STATUS.STRONG ) { ctx.fillStyle = bStrongColor; }
		else if( this.status == BALL_STATUS.ULTIMATE ) { ctx.fillStyle = bUltimateColor; }

		// 強化・無敵球の残像
		if( this.status != BALL_STATUS.NORMAL && this.histX )
		{
			// 球の描画
			ctx.beginPath();

			// 残像の描画
			var scale = this.statusTime / bStatusTime / fps + 0.25;
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
	move()
	{
		const bDefaultSpeed = (this.game && this.game.ballDefaultSpeed) || DEFAULT_CONFIG.ballDefaultSpeed;
		const bMaxSpeed = (this.game && this.game.ballMaxSpeed) || DEFAULT_CONFIG.ballMaxSpeed;
		const bar = (this.game && this.game.bar) || null;

		// 移動前の座標を保持
		this.prevX = this.x;
		this.prevY = this.y;
		this.lastHitAxis = null;

		// ボールの速度制限
		if( Math.abs( this.vx ) > bMaxSpeed ) { this.vx = bMaxSpeed * (this.vx < 0 ? -1 : 1); }
		if( Math.abs( this.vy ) > bMaxSpeed ) { this.vy = bMaxSpeed * (this.vy < 0 ? -1 : 1); }
		else if( Math.abs( this.vy ) < bDefaultSpeed * BALL_PARAM.MIN_VY_RATIO ) { this.vy = bMaxSpeed * BALL_PARAM.MIN_VY_RATIO * (this.vy < 0 ? -1 : 1); }

		// 吸着状態の場合，ここで処理終了
		if( this.isAbsorption == 1 && bar )
		{
			this.x = this.absorptionPoint[0] + bar.getCenterX();
			this.y = this.absorptionPoint[1] + bar.getTopY();
			return;
		}

		// ボール位置の決定
		this.x += this.vx;
		this.y += this.vy;

		// ボールの速度制限
		if( Math.abs( this.vx ) > bMaxSpeed ) { this.vx = bMaxSpeed * (this.vx < 0 ? -1 : 1); }
		if( Math.abs( this.vy ) > bMaxSpeed ) { this.vy = bMaxSpeed * (this.vy < 0 ? -1 : 1); }
	}

	//--------------------------------------------------
	// 位置履歴の更新
	//--------------------------------------------------
	updateHistory()
	{
		if( this.isAbsorption == 0 && this.histX && this.histY ) {
			this.histX.unshift(this.x);
			this.histY.unshift(this.y);
			if( this.histX.length > SYSTEM_PARAM.BALL_HIST_MAX ) {
				this.histX.pop();
				this.histY.pop();
			}
		}
	}

	//--------------------------------------------------
	// 速度変化の適用（ブロックの加速・減速効果）
	//--------------------------------------------------
	applySpeedDelta(delta)
	{
		if (!delta) { return; }
		if (this.lastHitAxis === 'x') {
			this.vx += delta * (this.vx < 0 ? -1 : 1);
		} else if (this.lastHitAxis === 'y') {
			this.vy += delta * (this.vy < 0 ? -1 : 1);
		}
	}

	//--------------------------------------------------
	// 壁との衝突判定・反射・落下
	//--------------------------------------------------
	checkCollisionWithWall(cWidth = null, cHeight = null, sBarHeight = null)
	{
		if (this.isAbsorption === 1) { return false; }

		const canvasWidth = cWidth !== null ? cWidth : this.getCanvasWidth();
		const canvasHeight = cHeight !== null ? cHeight : this.getCanvasHeight();
		const statusBarHeight = sBarHeight !== null ? sBarHeight : this.getStatusBarHeight();

		// 左端
		if( this.getLeftX() < 0 )
		{
			this.x = this.radius;
			this.vx *= -1;

			if( this.simulate == 0 ) { this.getEventBus()?.emitEvent('sound:play', 'wall'); }
			return true;
		}
		// 右端
		else if( this.getRightX() > canvasWidth )
		{
			this.x = canvasWidth - this.radius;
			this.vx *= -1;

			if( this.simulate == 0 ) { this.getEventBus()?.emitEvent('sound:play', 'wall'); }
			return true;
		}

		// 上端
		if( this.getTopY() < statusBarHeight )
		{
			this.y = this.radius + statusBarHeight;
			this.vy *= -1;

			if( this.simulate == 0 ) { this.getEventBus()?.emitEvent('sound:play', 'wall'); }
			return true;
		}
		// 下端（落下）
		else if( this.getBottomY() > canvasHeight )
		{
			this.fall();
			return true;
		}

		return false;
	}

	//--------------------------------------------------
	// バーとの衝突判定・反射・吸着
	//--------------------------------------------------
	checkCollisionWithBar(bar)
	{
		if (!bar || this.simulate !== 0 || this.isAbsorption === 1) { return false; }

		const x = this.x;
		const vx = this.vx;
		const vy = this.vy;
		const bDefaultSpeed = (this.game && this.game.ballDefaultSpeed) || DEFAULT_CONFIG.ballDefaultSpeed;
		const bMaxSpeed = (this.game && this.game.ballMaxSpeed) || DEFAULT_CONFIG.ballMaxSpeed;
		const bSpin = (this.game && this.game.barSpin !== undefined) ? this.game.barSpin : ((bar && bar.spin !== undefined) ? bar.spin : BAR_PARAM.SPIN_RATIO);

		if (this.getBottomY() >= bar.getTopY() && Math.abs(x - bar.getCenterX()) <= bar.width / 2)
		{
			// 反射位置の修正（バー表面上に配置）
			this.y = bar.getTopY() - this.radius;
			this.vy = -1 * Math.abs(vy);

			// 吸着
			if( bar.absorptionStatusTime > 0 )
			{
				this.isAbsorption = 1;
				this.absorptionPoint = [ this.getCenterX() - bar.getCenterX(), this.getCenterY() - bar.getTopY() ];
				bar.absorptionNum++;
				this.histX = [];
				this.histY = [];
				return true;
			}

			// 球のスピン処理
			if( Math.abs(bar.vx) > bDefaultSpeed * 0.3 ) {
				this.vx = vx + bar.vx * bSpin;
			} else {
				this.vx += (Math.random() - 0.5) * 0.5;
			}

			// 反射
			this.vy = -1 * Math.abs(vy);

			// 両端の傾斜による速度変化
			const barEdgeWidth = bar.width * ( 0.5 - bar.edge * ~~(bar.height / 2) );
			if( x < bar.getCenterX() - barEdgeWidth && vx > 0 ) { this.vx -= Math.abs( bDefaultSpeed - vx ) * BALL_PARAM.EDGE_ACCEL_RATIO; }
			else if( x > bar.getCenterX() + barEdgeWidth && vx < 0 ) { this.vx += Math.abs( bDefaultSpeed + vx ) * BALL_PARAM.EDGE_ACCEL_RATIO; }

			// 縦方向速度の微調整
			if( vy < -bDefaultSpeed ) { this.vy += BALL_PARAM.VY_UP_STEP; }
			else if( vy > -bDefaultSpeed ) { this.vy -= BALL_PARAM.VY_DOWN_STEP; }

			// 横方向速度の制御
			if( Math.abs(this.vx) > bMaxSpeed ) { this.vx = bMaxSpeed * ( this.vx < 0 ? -1 : 1 ); }
			if( Math.abs(this.vx) < bDefaultSpeed * BALL_PARAM.MIN_VX_RATIO ) { this.vx = bDefaultSpeed * BALL_PARAM.MIN_VX_RATIO; }

			// ポイント増分のリセット
			this.pointIncr = BALL_PARAM.DEFAULT_POINT_INCR;
			this.duaration = 0;

			// 連続衝突回数のリセット
			this.breakNum = 0;
			this.collisionNum = 0;

			// 接触音
			this.getEventBus()?.emitEvent('sound:play', 'bar');
			return true;
		}

		return false;
	}

	//--------------------------------------------------
	// 衝突判定（単一ブロックとの交差・反射判定）
	//--------------------------------------------------
	checkCollision(block)
	{
		if (!block) { return false; }
		if (this.simulate === 0 && block.type === 0) { return false; }
		if (this.simulate === 1 && block.simulate === 0) { return false; }

		// バウンディングボックスによる交差判定
		if (
			this.getRightX() < block.getLeftX() ||
			this.getLeftX() > block.getRightX() ||
			this.getBottomY() < block.getTopY() ||
			this.getTopY() > block.getBottomY()
		) {
			return false;
		}

		//----------衝突方向の判定----------
		let directVectX = 0;
		let directVectY = 0;

		const blockMap = (this.game && this.game.blockMap) || (block.game && block.game.blockMap) || null;
		const blkWidth = block.width || DEFAULT_CONFIG.blockWidth;
		const blkHeight = block.height || DEFAULT_CONFIG.blockHeight;
		const sBarHeight = this.getStatusBarHeight();

		const col = Math.round(block.x / blkWidth);
		const row = Math.round((block.y - sBarHeight) / blkHeight);

		const isBlockActive = (b) => {
			if (!b) { return false; }
			return this.simulate === 0 ? b.type !== 0 : b.simulate !== 0;
		};

		const hasLeftBlock = blockMap && blockMap[row] && isBlockActive(blockMap[row][col - 1]);
		const hasRightBlock = blockMap && blockMap[row] && isBlockActive(blockMap[row][col + 1]);
		const hasTopBlock = blockMap && blockMap[row - 1] && isBlockActive(blockMap[row - 1][col]);
		const hasBottomBlock = blockMap && blockMap[row + 1] && isBlockActive(blockMap[row + 1][col]);

		const prevX = (this.prevX !== undefined) ? this.prevX : (this.histX && this.histX.length > 0 ? this.histX[0] : (this.x - this.vx));
		const prevY = (this.prevY !== undefined) ? this.prevY : (this.histY && this.histY.length > 0 ? this.histY[0] : (this.y - this.vy));

		// 左から衝突（左側に遮蔽ブロックがない場合のみ）
		if (!hasLeftBlock && prevX + this.radius <= block.getLeftX() + 1) {
			directVectX = -1;
		}
		// 右から衝突（右側に遮蔽ブロックがない場合のみ）
		else if (!hasRightBlock && prevX - this.radius >= block.getRightX() - 1) {
			directVectX = 1;
		}

		// 上から衝突（上側に遮蔽ブロックがない場合のみ）
		if (!hasTopBlock && prevY + this.radius <= block.getTopY() + 1) {
			directVectY = -1;
		}
		// 下から衝突（下側に遮蔽ブロックがない場合のみ）
		else if (!hasBottomBlock && prevY - this.radius >= block.getBottomY() - 1) {
			directVectY = 1;
		}

		// 斜めからの衝突（速度成分が大きい方向を優先）
		if (directVectX !== 0 && directVectY !== 0) {
			if (Math.abs(this.vx) > Math.abs(this.vy)) {
				directVectY = 0;
			} else {
				directVectX = 0;
			}
		} else if (directVectX === 0 && directVectY === 0) {
			// めり込み時のフォールバック（進行方向の逆、遮蔽されていない面を優先）
			if (!hasBottomBlock && this.vy < 0) {
				directVectY = 1;
			} else if (!hasTopBlock && this.vy > 0) {
				directVectY = -1;
			} else if (!hasRightBlock && this.vx < 0) {
				directVectX = 1;
			} else if (!hasLeftBlock && this.vx > 0) {
				directVectX = -1;
			} else if (Math.abs(this.vx) > Math.abs(this.vy)) {
				directVectX = this.vx > 0 ? -1 : 1;
			} else {
				directVectY = this.vy > 0 ? -1 : 1;
			}
		}

		//----------透過処理----------
		let throughFlag = 0;
		const throughVect = block.throughVect;
		if (throughVect !== 0) {
			// 1: 上, 2: 右, 3: 下, 4: 左
			if (throughVect === 1 && directVectY >= 1 && directVectX === 0) {
				throughFlag = 1;
				this.x -= this.vx;
			} else if (throughVect === 2 && directVectX <= -1 && directVectY === 0) {
				throughFlag = 1;
				this.y -= this.vy;
			} else if (throughVect === 3 && directVectY <= -1 && directVectX === 0) {
				throughFlag = 1;
				this.x -= this.vx;
			} else if (throughVect === 4 && directVectX >= 1 && directVectY === 0) {
				throughFlag = 1;
				this.y -= this.vy;
			}
		}

		//--------衝突に伴う反射等の処理-------
		if (this.status !== BALL_STATUS.ULTIMATE && block.func !== BLOCK_FUNCTION.THROUGH && throughFlag !== 1) {
			if (directVectX !== 0) {
				// 座標の修正
				if (directVectX < 0) { this.x = block.getLeftX() - this.radius - 1; }
				else { this.x = block.getRightX() + this.radius + 1; }

				// 進行方向の反転
				this.vx = -1 * this.vx;
				this.lastHitAxis = 'x';
			} else {
				// 座標の修正
				if (directVectY < 0) { this.y = block.getTopY() - this.radius - 1; }
				else { this.y = block.getBottomY() + this.radius + 1; }

				// 進行方向の反転
				this.vy = -1 * this.vy;
				this.lastHitAxis = 'y';
			}
		} else {
			this.lastHitAxis = null;
		}

		return true;
	}
}
