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
import EventBus from "./EventBus.js";

//--------------------------------------------------
// ボール
//--------------------------------------------------
export default class Ball
{
	constructor(launch, game = null, initialMouseDownTime = 0, origin = null)
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
		this.lastHitAxis = null;								// 直前の衝突軸 ('x' | 'y' | 'both' | null)
		this.imgData = (imgSource && typeof imgSource.getDataArr === 'function') ? imgSource.getDataArr("ball") : null;	// 画像データ
		this.inputMouseDownTime = initialMouseDownTime || 0;
		Ball.nextBallId = (Ball.nextBallId || 0) + 1;
		this.ballId = Ball.nextBallId;

		// EventBus経由でマウスダウン時刻の変更を監視、および状態リセット要求を購読
		this.onMouseDownHandler = (time) => {
			this.inputMouseDownTime = time;
		};
		this.onResetStatusHandler = (ball) => {
			if (!ball || ball === this) {
				this.resetStatus();
			}
		};
		EventBus.addOnEvent('input:mouseDownTime', this.onMouseDownHandler);
		EventBus.addOnEvent('ball:resetStatus', this.onResetStatusHandler);


		//--------------------------------------------------
		// 発射
		//--------------------------------------------------
		if( launch == BALL_CREATE_MODE.LAUNCH ) {
			const mdTime = this.inputMouseDownTime || 0;
			const bar = origin || (this.game && this.game.objectManage && this.game.objectManage.bar) || null;
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
				const cx = typeof bar.getCenterX === 'function' ? bar.getCenterX() : (bar.x !== undefined ? bar.x : 0);
				const topY = typeof bar.getTopY === 'function' ? bar.getTopY() : (bar.y !== undefined ? bar.y : 0);
				this.x = cx;
				this.y = topY - this.radius;
			}
		}
	}

	destructor()
	{
		if (this.onMouseDownHandler) { EventBus.removeOnEvent('input:mouseDownTime', this.onMouseDownHandler); }
		if (this.onResetStatusHandler) { EventBus.removeOnEvent('ball:resetStatus', this.onResetStatusHandler); }
		this.onMouseDownHandler = null;
		this.onResetStatusHandler = null;
		EventBus.removeTimer(`ball:${this.ballId}:status`);

		const ballList = (this.game && this.game.objectManage && this.game.objectManage.balls) || null;
		if (ballList) {
			const idx = ballList.indexOf(this);
			if (idx >= 0) ballList.splice(idx, 1);
		}
		this.histX = null;
		this.histY = null;
		this.absorptionPoint = null;
		this.lastHitAxis = null;
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

		const durationMs = bStatusTime * 1000;
		EventBus.addTimer(`ball:${this.ballId}:status`, durationMs, () => {
			this.resetStatus();
		}, {
			event: 'ball:resetStatus',
			args: [this],
			onTick: (timer) => {
				this.statusTime = Math.ceil(timer.remaining / (1000 / fps));
			}
		});
	}

	//--------------------------------------------------
	// ボール状態のリセット
	//--------------------------------------------------
	resetStatus() {
		this.status = BALL_STATUS.NORMAL;
		this.statusTime = 0;
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

		// 特殊状態のタイマー設定（シミュレート以外で特殊状態の場合）
		if (obj.simulate === 0 && this.status !== BALL_STATUS.NORMAL) {
			const timer = EventBus.getTimer(`ball:${this.ballId}:status`);
			const fps = (this.game && this.game.FPS !== undefined) ? this.game.FPS : DEFAULT_CONFIG.FPS;
			let remainingSec = null;
			if (timer) {
				remainingSec = Math.max(0, timer.remaining) / 1000;
			} else if (this.statusTime !== undefined && this.statusTime !== null) {
				remainingSec = Math.max(0, this.statusTime) / fps;
			}

			if (remainingSec !== null && remainingSec > 0) {
				obj.setStatus(this.status, remainingSec);
			} else {
				obj.resetStatus();
			}
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
		const game = this.game;

		// 落下音（EventBus経由で通知）
		EventBus.emitEvent('sound:play', 'fall');

		// 落下数の計算（EventBus経由で通知）
		EventBus.emitEvent('award:add', { key: 'fallBallNum', count: 1 });

		// ボール消去（ballListから自身を削除）
		this.destructor();

		// 残りのボール一覧を取得（destructorでthis.gameがnullになるためgame参照を使用）
		const remainingBalls = (game && game.objectManage && game.objectManage.balls) ? game.objectManage.balls : [];

		// 全てのボールが落ちた場合のみ、EventBus経由でラウンドリセットを通知
		if (remainingBalls.length === 0) {
			EventBus.emitEvent('ball:allLost');
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
	// 位置移動（物理演算）
	//--------------------------------------------------
	movePosition(targetBar = null)
	{
		const bDefaultSpeed = (this.game && this.game.ballDefaultSpeed) || DEFAULT_CONFIG.ballDefaultSpeed;
		const bMaxSpeed = (this.game && this.game.ballMaxSpeed) || DEFAULT_CONFIG.ballMaxSpeed;
		const bar = targetBar || (this.game && this.game.objectManage && this.game.objectManage.bar) || null;

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
	// 状態更新
	//--------------------------------------------------
	updateState()
	{
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
		} else if (this.lastHitAxis === 'both') {
			this.vx += delta * (this.vx < 0 ? -1 : 1);
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

			if( this.simulate == 0 ) { EventBus.emitEvent('sound:play', 'wall'); }
			return true;
		}
		// 右端
		else if( this.getRightX() > canvasWidth )
		{
			this.x = canvasWidth - this.radius;
			this.vx *= -1;

			if( this.simulate == 0 ) { EventBus.emitEvent('sound:play', 'wall'); }
			return true;
		}

		// 上端
		if( this.getTopY() < statusBarHeight )
		{
			this.y = this.radius + statusBarHeight;
			this.vy *= -1;

			if( this.simulate == 0 ) { EventBus.emitEvent('sound:play', 'wall'); }
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
				if (typeof bar.absorbBall === 'function') {
					bar.absorbBall();
				} else {
					bar.absorptionNum++;
				}
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
			EventBus.emitEvent('sound:play', 'bar');
			return true;
		}

		return false;
	}

	//--------------------------------------------------
	// 衝突判定（単一ブロックとの交差・反射判定）
	//--------------------------------------------------
	checkCollision(block, blockMapParam = null)
	{
		if (!block) { return false; }
		if (this.simulate === 0 && block.type === 0) { return false; }
		if (this.simulate === 1 && block.simulate === 0) { return false; }

		const bLeft = block.getLeftX();
		const bRight = block.getRightX();
		const bTop = block.getTopY();
		const bBottom = block.getBottomY();

		// バウンディングボックスによる粗判定
		if (
			this.getRightX() < bLeft ||
			this.getLeftX() > bRight ||
			this.getBottomY() < bTop ||
			this.getTopY() > bBottom
		) {
			return false;
		}

		// 円と矩形の精密集判定
		const clampedX = Math.max(bLeft, Math.min(this.x, bRight));
		const clampedY = Math.max(bTop, Math.min(this.y, bBottom));
		const distX = this.x - clampedX;
		const distY = this.y - clampedY;
		if (distX * distX + distY * distY > this.radius * this.radius) {
			return false;
		}

		//----------周囲のブロック配置の取得----------
		const blockMap = blockMapParam || (this.game && this.game.objectManage && this.game.objectManage.blockMap) || (block.game && block.game.objectManage && block.game.objectManage.blockMap) || null;
		const blkWidth = block.width || DEFAULT_CONFIG.blockWidth;
		const blkHeight = block.height || DEFAULT_CONFIG.blockHeight;
		const sBarHeight = (typeof block.getStatusBarHeight === 'function') ? block.getStatusBarHeight() : this.getStatusBarHeight();

		const col = (block.col !== undefined && block.func !== BLOCK_FUNCTION.VERTICAL_MOVE) ? block.col : Math.round(block.x / blkWidth);
		const row = (block.row !== undefined && block.func !== BLOCK_FUNCTION.VERTICAL_MOVE) ? block.row : Math.round((block.y - sBarHeight) / blkHeight);

		const isBlockActive = (b) => {
			if (!b) { return false; }
			return this.simulate === 0 ? b.type !== 0 : b.simulate !== 0;
		};

		// 4方向の隣接ブロック（面を塞ぐ）
		const hasLeftBlock = !!(blockMap && blockMap[row] && isBlockActive(blockMap[row][col - 1]));
		const hasRightBlock = !!(blockMap && blockMap[row] && isBlockActive(blockMap[row][col + 1]));
		const hasTopBlock = !!(blockMap && blockMap[row - 1] && isBlockActive(blockMap[row - 1][col]));
		const hasBottomBlock = !!(blockMap && blockMap[row + 1] && isBlockActive(blockMap[row + 1][col]));

		// 対角4方向の隣接ブロック（角を塞ぐ）
		const hasTopLeftBlock = !!(blockMap && blockMap[row - 1] && isBlockActive(blockMap[row - 1][col - 1]));
		const hasTopRightBlock = !!(blockMap && blockMap[row - 1] && isBlockActive(blockMap[row - 1][col + 1]));
		const hasBottomLeftBlock = !!(blockMap && blockMap[row + 1] && isBlockActive(blockMap[row + 1][col - 1]));
		const hasBottomRightBlock = !!(blockMap && blockMap[row + 1] && isBlockActive(blockMap[row + 1][col + 1]));

		const prevX = (this.prevX !== undefined) ? this.prevX : (this.histX && this.histX.length > 0 ? this.histX[0] : (this.x - this.vx));
		const prevY = (this.prevY !== undefined) ? this.prevY : (this.histY && this.histY.length > 0 ? this.histY[0] : (this.y - this.vy));
		const midX = bLeft + blkWidth / 2;
		const midY = bTop + blkHeight / 2;

		//----------遮蔽された角・面の保護----------
		// 2つの面が隣接ブロックで塞がれている内角の奥（遮蔽面）には進入・接触不可能
		if (hasRightBlock && hasBottomBlock && (this.x >= midX && this.y >= midY)) {
			return false;
		}
		if (hasLeftBlock && hasBottomBlock && (this.x <= midX && this.y >= midY)) {
			return false;
		}
		if (hasRightBlock && hasTopBlock && (this.x >= midX && this.y <= midY)) {
			return false;
		}
		if (hasLeftBlock && hasTopBlock && (this.x <= midX && this.y <= midY)) {
			return false;
		}

		//----------衝突面・方向の判定----------
		let directVectX = 0;
		let directVectY = 0;
		let targetPushX = null;
		let targetPushY = null;

		// 1. 各角（コーナーおよび対角隣接ブロックの接点）との判定
		const cornerThreshold = this.radius + 1;
		const nearBottomLeft = Math.hypot(this.x - bLeft, this.y - bBottom) <= cornerThreshold;
		const nearBottomRight = Math.hypot(this.x - bRight, this.y - bBottom) <= cornerThreshold;
		const nearTopLeft = Math.hypot(this.x - bLeft, this.y - bTop) <= cornerThreshold;
		const nearTopRight = Math.hypot(this.x - bRight, this.y - bTop) <= cornerThreshold;

		// (A-1) 凹んだ内角（2つの直交する壁が接する窪み）への突入
		// 手前の露出面側（空きマス）へ押し戻し、両軸を確実に外側へ反転
		if (nearBottomLeft && hasLeftBlock && !hasBottomBlock && hasBottomLeftBlock && this.vx <= 0 && this.vy <= 0) {
			directVectX = 1;
			directVectY = 1;
			targetPushX = bLeft + this.radius + 1;
			targetPushY = bBottom + this.radius + 1;
		} else if (nearBottomLeft && !hasLeftBlock && hasBottomBlock && hasBottomLeftBlock && this.vx <= 0 && this.vy <= 0) {
			directVectX = 1;
			directVectY = 1;
			targetPushX = bLeft + this.radius + 1;
			targetPushY = bBottom + this.radius + 1;
		} else if (nearBottomRight && hasRightBlock && !hasBottomBlock && hasBottomRightBlock && this.vx >= 0 && this.vy <= 0) {
			directVectX = -1;
			directVectY = 1;
			targetPushX = bRight - this.radius - 1;
			targetPushY = bBottom + this.radius + 1;
		} else if (nearBottomRight && !hasRightBlock && hasBottomBlock && hasBottomRightBlock && this.vx >= 0 && this.vy <= 0) {
			directVectX = -1;
			directVectY = 1;
			targetPushX = bRight - this.radius - 1;
			targetPushY = bBottom + this.radius + 1;
		} else if (nearTopLeft && hasLeftBlock && !hasTopBlock && hasTopLeftBlock && this.vx <= 0 && this.vy >= 0) {
			directVectX = 1;
			directVectY = -1;
			targetPushX = bLeft + this.radius + 1;
			targetPushY = bTop - this.radius - 1;
		} else if (nearTopLeft && !hasLeftBlock && hasTopBlock && hasTopLeftBlock && this.vx <= 0 && this.vy >= 0) {
			directVectX = 1;
			directVectY = -1;
			targetPushX = bLeft + this.radius + 1;
			targetPushY = bTop - this.radius - 1;
		} else if (nearTopRight && hasRightBlock && !hasTopBlock && hasTopRightBlock && this.vx >= 0 && this.vy >= 0) {
			directVectX = -1;
			directVectY = -1;
			targetPushX = bRight - this.radius - 1;
			targetPushY = bTop - this.radius - 1;
		} else if (nearTopRight && !hasRightBlock && hasTopBlock && hasTopRightBlock && this.vx >= 0 && this.vy >= 0) {
			directVectX = -1;
			directVectY = -1;
			targetPushX = bRight - this.radius - 1;
			targetPushY = bTop - this.radius - 1;
		}

		// (A-2) 凸の対角接点（隙間0の対角ブロック接点）への突入
		// ※その角を形成する2面が両方とも開いている場合のみ（隣接ブロックがある場合は内角または連続壁）
		if (directVectX === 0 && directVectY === 0) {
			if (hasBottomRightBlock && !hasRightBlock && !hasBottomBlock && nearBottomRight) {
				if (this.vx >= 0 && this.vy <= 0) {
					directVectX = -1;
					directVectY = 1;
				} else if (this.vx <= 0 && this.vy >= 0) {
					directVectX = 1;
					directVectY = -1;
				}
			} else if (hasBottomLeftBlock && !hasLeftBlock && !hasBottomBlock && nearBottomLeft) {
				if (this.vx <= 0 && this.vy <= 0) {
					directVectX = 1;
					directVectY = 1;
				} else if (this.vx >= 0 && this.vy >= 0) {
					directVectX = -1;
					directVectY = -1;
				}
			} else if (hasTopRightBlock && !hasRightBlock && !hasTopBlock && nearTopRight) {
				if (this.vx >= 0 && this.vy >= 0) {
					directVectX = -1;
					directVectY = -1;
				} else if (this.vx <= 0 && this.vy <= 0) {
					directVectX = 1;
					directVectY = 1;
				}
			} else if (hasTopLeftBlock && !hasLeftBlock && !hasTopBlock && nearTopLeft) {
				if (this.vx <= 0 && this.vy >= 0) {
					directVectX = 1;
					directVectY = -1;
				} else if (this.vx >= 0 && this.vy <= 0) {
					directVectX = -1;
					directVectY = 1;
				}
			}
		}

		// (B) 露出した角への衝突（単一ブロックの角：速度のX/Y成分の大きい方に跳ね返す）
		if (directVectX === 0 && directVectY === 0) {
			const absVx = Math.abs(this.vx);
			const absVy = Math.abs(this.vy);

			if (nearBottomLeft && !hasLeftBlock && !hasBottomBlock && (this.x < bLeft || this.y > bBottom) && this.vx >= 0 && this.vy <= 0) {
				if (absVx > absVy) { directVectX = -1; }
				else { directVectY = 1; }
			} else if (nearBottomRight && !hasRightBlock && !hasBottomBlock && (this.x > bRight || this.y > bBottom) && this.vx <= 0 && this.vy <= 0) {
				if (absVx > absVy) { directVectX = 1; }
				else { directVectY = 1; }
			} else if (nearTopLeft && !hasLeftBlock && !hasTopBlock && (this.x < bLeft || this.y < bTop) && this.vx >= 0 && this.vy >= 0) {
				if (absVx > absVy) { directVectX = -1; }
				else { directVectY = -1; }
			} else if (nearTopRight && !hasRightBlock && !hasTopBlock && (this.x > bRight || this.y < bTop) && this.vx <= 0 && this.vy >= 0) {
				if (absVx > absVy) { directVectX = 1; }
				else { directVectY = -1; }
			}
		}

		// 2. 移動軌跡による交差面判定（露出面のみ）
		if (directVectX === 0 && directVectY === 0) {
			const midX = bLeft + blkWidth / 2;
			const midY = bTop + blkHeight / 2;
			const crossedLeft = !hasLeftBlock && this.vx >= 0 && (prevX <= bLeft || prevX - this.radius <= bLeft);
			const crossedRight = !hasRightBlock && this.vx <= 0 && (prevX >= bRight || prevX + this.radius >= bRight);
			const crossedTop = !hasTopBlock && this.vy >= 0 && (prevY <= bTop || prevY - this.radius <= bTop);
			const crossedBottom = !hasBottomBlock && this.vy <= 0 && (prevY >= bBottom || prevY + this.radius >= bBottom);
			const absVx = Math.abs(this.vx);
			const absVy = Math.abs(this.vy);

			// (A) 両軸が同時に交差した場合（角への進入：速度のX/Y成分の大きい方に跳ね返す）
			if (crossedLeft && crossedTop) {
				if (absVx > absVy) { directVectX = -1; }
				else { directVectY = -1; }
			} else if (crossedRight && crossedTop) {
				if (absVx > absVy) { directVectX = 1; }
				else { directVectY = -1; }
			} else if (crossedLeft && crossedBottom) {
				if (absVx > absVy) { directVectX = -1; }
				else { directVectY = 1; }
			} else if (crossedRight && crossedBottom) {
				if (absVx > absVy) { directVectX = 1; }
				else { directVectY = 1; }
			}
			// (B) 単一軸の交差
			else if (crossedLeft && (this.x <= midX || !crossedRight)) {
				directVectX = -1;
			} else if (crossedRight && (this.x >= midX || !crossedLeft)) {
				directVectX = 1;
			} else if (crossedTop && (this.y <= midY || !crossedBottom)) {
				directVectY = -1;
			} else if (crossedBottom && (this.y >= midY || !crossedTop)) {
				directVectY = 1;
			}
		}

		// 3. 幾何学的な面判定（交差判定で決定しなかった場合）
		if (directVectX === 0 && directVectY === 0) {
			const midX = bLeft + blkWidth / 2;
			const midY = bTop + blkHeight / 2;

			// (A) ボールの中心がブロックの水平範囲内にある場合 -> 純粋な縦面衝突
			if (this.x >= bLeft && this.x <= bRight) {
				if (this.y <= midY) {
					if (!hasTopBlock) { directVectY = -1; }
					else if (!hasBottomBlock) { directVectY = 1; }
				} else {
					if (!hasBottomBlock) { directVectY = 1; }
					else if (!hasTopBlock) { directVectY = -1; }
				}
			}
			// (B) ボールの中心がブロックの垂直範囲内にある場合 -> 純粋な横面衝突
			else if (this.y >= bTop && this.y <= bBottom) {
				if (this.x <= midX) {
					if (!hasLeftBlock) { directVectX = -1; }
					else if (!hasRightBlock) { directVectX = 1; }
				} else {
					if (!hasRightBlock) { directVectX = 1; }
					else if (!hasLeftBlock) { directVectX = -1; }
				}
			}
			// (C) ボールが角の外側領域にいる場合
			else {
				const absVx = Math.abs(this.vx);
				const absVy = Math.abs(this.vy);

				if (this.x < bLeft && this.y > bBottom) {
					if (!hasLeftBlock && !hasBottomBlock) {
						if (absVx > absVy) { directVectX = -1; }
						else { directVectY = 1; }
					} else if (!hasBottomBlock) {
						directVectY = 1;
					} else if (!hasLeftBlock) {
						directVectX = -1;
					}
				} else if (this.x > bRight && this.y > bBottom) {
					if (!hasRightBlock && !hasBottomBlock) {
						if (absVx > absVy) { directVectX = 1; }
						else { directVectY = 1; }
					} else if (!hasBottomBlock) {
						directVectY = 1;
					} else if (!hasRightBlock) {
						directVectX = 1;
					}
				} else if (this.x < bLeft && this.y < bTop) {
					if (!hasLeftBlock && !hasTopBlock) {
						if (absVx > absVy) { directVectX = -1; }
						else { directVectY = -1; }
					} else if (!hasTopBlock) {
						directVectY = -1;
					} else if (!hasLeftBlock) {
						directVectX = -1;
					}
				} else if (this.x > bRight && this.y < bTop) {
					if (!hasRightBlock && !hasTopBlock) {
						if (absVx > absVy) { directVectX = 1; }
						else { directVectY = -1; }
					} else if (!hasTopBlock) {
						directVectY = -1;
					} else if (!hasRightBlock) {
						directVectX = 1;
					}
				}
			}
		}

		// 4. めり込み時のフォールバック（露出面までの距離が最も近い面へ脱出）
		if (directVectX === 0 && directVectY === 0) {
			const midX = bLeft + blkWidth / 2;
			const midY = bTop + blkHeight / 2;
			const canEscapeLeft = !hasLeftBlock && (this.x <= midX || this.vx >= 0);
			const canEscapeRight = !hasRightBlock && (this.x >= midX || this.vx <= 0);
			const canEscapeTop = !hasTopBlock && (this.y <= midY || this.vy >= 0);
			const canEscapeBottom = !hasBottomBlock && (this.y >= midY || this.vy <= 0);

			if (this.x < midX && this.y < midY && canEscapeLeft && canEscapeTop) {
				if (Math.abs(this.vx) > Math.abs(this.vy)) { directVectX = -1; }
				else { directVectY = -1; }
			} else if (this.x > midX && this.y < midY && canEscapeRight && canEscapeTop) {
				if (Math.abs(this.vx) > Math.abs(this.vy)) { directVectX = 1; }
				else { directVectY = -1; }
			} else if (this.x < midX && this.y > midY && canEscapeLeft && canEscapeBottom) {
				if (Math.abs(this.vx) > Math.abs(this.vy)) { directVectX = -1; }
				else { directVectY = 1; }
			} else if (this.x > midX && this.y > midY && canEscapeRight && canEscapeBottom) {
				if (Math.abs(this.vx) > Math.abs(this.vy)) { directVectX = 1; }
				else { directVectY = 1; }
			} else {
				// 露出面までの距離を計算し、最も近い露出面を選択
				const distL = canEscapeLeft ? Math.abs(this.x - bLeft) : Infinity;
				const distR = canEscapeRight ? Math.abs(this.x - bRight) : Infinity;
				const distT = canEscapeTop ? Math.abs(this.y - bTop) : Infinity;
				const distB = canEscapeBottom ? Math.abs(this.y - bBottom) : Infinity;
				const minDist = Math.min(distL, distR, distT, distB);

				if (minDist !== Infinity) {
					if (minDist === distL) { directVectX = -1; }
					else if (minDist === distR) { directVectX = 1; }
					else if (minDist === distT) { directVectY = -1; }
					else if (minDist === distB) { directVectY = 1; }
				} else if (Math.abs(this.vx) > Math.abs(this.vy)) {
					directVectX = this.vx > 0 ? -1 : 1;
				} else {
					directVectY = this.vy > 0 ? -1 : 1;
				}
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
			if (directVectX !== 0 && directVectY !== 0) {
				// 斜め方向の衝突（縦・横両軸を同様に判定・反転・座標補正）
				if (targetPushX !== null) {
					this.x = targetPushX;
				} else {
					if (directVectX < 0) { this.x = bLeft - this.radius - 1; }
					else { this.x = bRight + this.radius + 1; }
				}

				if (targetPushY !== null) {
					this.y = targetPushY;
				} else {
					if (directVectY < 0) { this.y = bTop - this.radius - 1; }
					else { this.y = bBottom + this.radius + 1; }
				}

				this.vx = (directVectX < 0 ? -1 : 1) * Math.abs(this.vx);
				this.vy = (directVectY < 0 ? -1 : 1) * Math.abs(this.vy);
				this.lastHitAxis = 'both';
			} else if (directVectX !== 0) {
				// 横方向の衝突
				if (directVectX < 0) { this.x = bLeft - this.radius - 1; }
				else { this.x = bRight + this.radius + 1; }

				this.vx = (directVectX < 0 ? -1 : 1) * Math.abs(this.vx);
				this.lastHitAxis = 'x';
			} else if (directVectY !== 0) {
				// 縦方向の衝突
				if (directVectY < 0) { this.y = bTop - this.radius - 1; }
				else { this.y = bBottom + this.radius + 1; }

				this.vy = (directVectY < 0 ? -1 : 1) * Math.abs(this.vy);
				this.lastHitAxis = 'y';
			}
		} else {
			this.lastHitAxis = null;
		}

		return true;
	}
}
