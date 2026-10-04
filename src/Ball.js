// src/Ball.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import Bar from "./Bar.js";
import {
	SYSTEM_PARAM,
	BALL_CREATE_MODE,
	BALL_COPY_MODE,
	BALL_STATUS,
	BALL_PARAM,
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
		const bSize = DEFAULT_CONFIG.ballSize;
		const defPoint = 10;
		const imgSource = (this.game && this.game.imgData) ? this.game.imgData : null;

		this.radius = bSize;									// ボールの半径
		this.x;													// ボール横方向位置
		this.y;													// ボール縦方向位置
		this.vx;												// ボール横方向速度
		this.vy;												// ボール縦方向速度
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
			const bar = this.getBar();
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

	getBalls() {
		return (this.game && this.game.balls) || [];
	}

	getItems() {
		return (this.game && this.game.items) || [];
	}

	getWeapons() {
		return (this.game && this.game.weapons) || [];
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
		if (this.histX) obj.histX = this.histX.copy ? this.histX.copy() : [...this.histX];
		if (this.histY) obj.histY = this.histY.copy ? this.histY.copy() : [...this.histY];

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
		const bar = this.getBar();

		// 落下音（EventBus経由で通知）
		bus?.emitEvent('sound:play', 'fall');

		// ボール消去（ballListから自身を削除）
		this.destructor();

		// 落下数の計算（EventBus経由で通知）
		bus?.emitEvent('award:add', { key: 'fallBallNum', count: 1 });

		const ballList = this.getBalls();
		// 全てのボールが落ちた場合、EventBus経由でラウンドリセットを通知
		if ((!bar || bar.immortalStatusTime <= 0) && ballList.length === 0) {
			bus?.emitEvent('ball:allLost');
		}
	}



	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	draw(ctx)
	{
		const bColor = '#1F3145';
		const bStrongColor = '#0CA366';
		const bUltimateColor = '#DC210C';
		const bStatusTime = 8;
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
		const bar = this.getBar();

		// ボールの速度制限
		if( Math.abs( this.vx ) > bMaxSpeed ) { this.vx = bMaxSpeed * (this.vx < 0 ? -1 : 1); }
		if( Math.abs( this.vy ) > bMaxSpeed ) { this.vy = bMaxSpeed * (this.vy < 0 ? -1 : 1); }
		else if( Math.abs( this.vy ) < bDefaultSpeed * BALL_PARAM.MIN_VY_RATIO ) { this.vy = bMaxSpeed * BALL_PARAM.MIN_VY_RATIO * (this.vy < 0 ? -1 : 1); }

		// 状態時間の減少
		if( this.statusTime > 0 ) {
			this.statusTime--;

			// 状態の解除
			if( this.statusTime == 0 ) { this.status = BALL_STATUS.NORMAL; }
		}

		// 吸着状態の場合，ここで処理終了
		if( this.isAbsorption == 1 && bar )
		{
			// 吸着位置を保持
			this.x = this.absorptionPoint[0] + bar.getCenterX();
			this.y = this.absorptionPoint[1] + bar.getTopY();
			return;
		}

		// ボール位置の決定
		this.x += this.vx;
		this.y += this.vy;

		// 衝突判定
		const throughFlag = this.checkCollision();

		// ボールの速度制限
		if( Math.abs( this.vx ) > bMaxSpeed ) { this.vx = bMaxSpeed * (this.vx < 0 ? -1 : 1); }
		if( Math.abs( this.vy ) > bMaxSpeed ) { this.vy = bMaxSpeed * (this.vy < 0 ? -1 : 1); }

		// 位置履歴の管理
		if( throughFlag == 0 && this.isAbsorption == 0 && this.histX && this.histY ) {
			this.histX.unshift(this.x);
			this.histY.unshift(this.y);
			if( this.histX.length > SYSTEM_PARAM.BALL_HIST_MAX ) {
				this.histX.pop();
				this.histY.pop();
			}
		}
	}

	//--------------------------------------------------
	// 衝突判定
	//--------------------------------------------------
	checkCollision()
	{
		const bDefaultSpeed = (this.game && this.game.ballDefaultSpeed) || DEFAULT_CONFIG.ballDefaultSpeed;
		const bMaxSpeed = (this.game && this.game.ballMaxSpeed) || DEFAULT_CONFIG.ballMaxSpeed;
		const bSpin = BALL_PARAM.SPIN_RATIO;
		const blkWidth = (this.game && this.game.blockWidth) || DEFAULT_CONFIG.blockWidth;
		const blkHeight = (this.game && this.game.blockHeight) || DEFAULT_CONFIG.blockHeight;

		const bar = this.getBar();
		const blockMap = this.getBlockMap();
		const cWidth = this.getCanvasWidth();
		const cHeight = this.getCanvasHeight();
		const sBarHeight = this.getStatusBarHeight();

		// 一時変数
		var x = this.x;
		var y = this.y;
		var vx = this.vx;
		var vy = this.vy;
		var simulate = this.simulate;

		//-------ボール位置の制限及び壁・バーによる反射-------
		// 左端
		if( this.getLeftX() < 0 )
		{
			// 跳ね返り計算
			this.x = this.radius;
			this.vx *= -1;

			// 接触音（EventBus経由で通知）
			if( simulate == 0 ) { this.getEventBus()?.emitEvent('sound:play', 'wall'); }
			return 0;

		// 右端
		} else if( this.getRightX() > cWidth )
		{
			// 跳ね返り計算
			this.x = cWidth - this.radius - 1;
			this.vx *= -1;

			// 接触音（EventBus経由で通知）
			if( simulate == 0 ) { this.getEventBus()?.emitEvent('sound:play', 'wall'); }
			return 0;
		}

		// 上端
		if( this.getTopY() < sBarHeight )
		{
			// 跳ね返り計算
			this.y = this.radius + sBarHeight + 1;
			this.vy *= -1;

			// 接触音（EventBus経由で通知）
			if( simulate == 0 ) { this.getEventBus()?.emitEvent('sound:play', 'wall'); }
			return 0;

		// バー接触
		} else if( bar && simulate == 0 && this.getBottomY() >= bar.getTopY() && Math.abs(x - bar.getCenterX()) <= bar.width / 2 )
		{
			// 跳ね返り計算
			this.y = bar.getTopY() - this.radius;
			this.vy *= -1;
			vy = this.vy;

			// 吸着状態へ遷移
			if( bar.absorptionStatusTime > 0 )
			{
				this.isAbsorption = 1;

				// 吸着座標の取得
				this.absorptionPoint = new Array( this.getCenterX() - bar.getCenterX(), this.getCenterY() - bar.getTopY() );

				// 吸着球数を増加
				bar.absorptionNum++;

				// 移動履歴の削除
				this.histX = new Array();
				this.histY = new Array();
			}

			// バーによるスピン
			this.vx += bar.vx * bSpin;

			// 両端の傾斜による速度変化
			var barEdgeWidth = bar.width * ( 0.5 - bar.edge * ~~(bar.height / 2) );
			if( x < bar.getCenterX() - barEdgeWidth && vx > 0 ) { this.vx -= Math.abs( bDefaultSpeed - vx ) * BALL_PARAM.EDGE_ACCEL_RATIO; }
			else if( x > bar.getCenterX() + barEdgeWidth && vx < 0 ) { this.vx += Math.abs( bDefaultSpeed + vx ) * BALL_PARAM.EDGE_ACCEL_RATIO; }

			// ボールの縦方向速度の制御（速度が上方向が前提）
			if( vy < -bDefaultSpeed ) { this.vy += BALL_PARAM.VY_UP_STEP; }
			else if( vy > -bDefaultSpeed ) { this.vy -= BALL_PARAM.VY_DOWN_STEP; }

			// ボールの横方向速度の制御
			if( Math.abs(this.vx) > bMaxSpeed ) { this.vx = bMaxSpeed * ( this.vx < 0 ? -1 : 1 ); }
			if( Math.abs(this.vx) < bDefaultSpeed * BALL_PARAM.MIN_VX_RATIO ) { this.vx = bDefaultSpeed * BALL_PARAM.MIN_VX_RATIO; }

			// ポイント増分のリセット
			this.pointIncr = BALL_PARAM.DEFAULT_POINT_INCR;

			// 固定ブロック衝突回数のリセット
			this.duaration = 0;

			// 連続衝突回数のリセット
			this.breakNum = 0;
			this.collisionNum = 0;

			// 接触音（EventBus経由で通知）
			if( simulate == 0 ) { this.getEventBus()?.emitEvent('sound:play', 'bar'); }
			return 0;

		// 下端
		} else if( this.getBottomY() > cHeight )
		{
			this.y = cHeight + this.radius + 1;

			// ボール落下
			this.fall();
			return 0;
		}
		//-------ボール位置の制限及び壁・バーによる反射-------

		// 一時変数
		x = this.x;
		y = this.y;
		vx = this.vx;
		vy = this.vy;

		//-------ブロック衝突判定-------
		var collisionFlag = 0;

		// 検査範囲の選別（ボールの飛来方向から順に判定）
		var stepX = vx < 0 ? -1 : 1;
		var stepY = vy < 0 ? -1 : 1;

		// 横方向
		var colDetStartX = ~~( (x - this.radius * stepX) / blkWidth );
		var colDetEndX = ~~( (x + this.radius * stepX) / blkWidth );

		// 縦方向
		var colDetStartY = ~~( (y - this.radius * stepY - sBarHeight) / blkHeight );
		var colDetEndY = ~~( (y + this.radius * stepY - sBarHeight) / blkHeight );

		// ボールが存在するエリア内を検査
		var throughFlag = 0;
		for( var i = colDetStartY; ( i <= colDetEndY && stepY > 0 ) || ( i >= colDetEndY && stepY < 0 ); i += stepY )
		{
			if( blockMap[i] != null ) {
				for( var j = colDetStartX; ( j <= colDetEndX && stepX > 0 ) || ( j >= colDetEndX && stepX < 0 ); j += stepX )
				{
					var block = blockMap[i][j];

					// 衝突検出
					if( block != null && (( simulate == 0 && block.type != 0 ) || ( simulate == 1 && block.simulate != 0 )) )
					{
						collisionFlag = 1;

						//----------衝突方向の判定----------
						var directVectX = 0, directVectY = 0;

						// 左から衝突
						if( this.histX && this.histX[0] + this.radius <= block.getLeftX() && ( blockMap[i][j - 1] == null || (( simulate == 0 && blockMap[i][j - 1].type == 0 ) || ( simulate == 1 && blockMap[i][j - 1].simulate == 0 )) ) ) {
							directVectX = -1;
						}
						// 右から衝突
						else if( this.histX && this.histX[0] - this.radius > block.getRightX() && ( blockMap[i][j + 1] == null || (( simulate == 0 && blockMap[i][j + 1].type == 0 ) || ( simulate == 1 && blockMap[i][j + 1].simulate == 0 )) ) ) {
							directVectX = 1;
						}

						// 上から衝突
						if( this.histY && this.histY[0] + this.radius <= block.getTopY() && ( blockMap[i - 1] == null || blockMap[i - 1][j] == null || (( simulate == 0 && blockMap[i - 1][j].type == 0 ) || ( simulate == 1 && blockMap[i - 1][j].simulate == 0 )) ) ) {
							directVectY = -1;
						}
						// 下から衝突
						else if( this.histY && this.histY[0] - this.radius > block.getBottomY() && ( blockMap[i + 1] == null || blockMap[i + 1][j] == null || (( simulate == 0 && blockMap[i + 1][j].type == 0 ) || ( simulate == 1 && blockMap[i + 1][j].simulate == 0 )) ) ) {
							directVectY = 1;
						}

						// 塞ぐブロックなしで、斜めからの衝突（速度の速い方向で判定）
						if( directVectX != 0 && directVectY != 0 ) {
							if( vx > vy ) { directVectY = 0; }
							else { directVectX = 0; }
						}
						// 塞ぐブロックありで、斜めからの衝突（移動履歴から判定）
						else if( directVectX == 0 && directVectY == 0 && this.histX )
						{
							for( var k = 0, len = this.histX.length; k < len; k++ )
							{
								directVectX = ~~( this.histX[k] / blkWidth ) - j;
								directVectY = ~~( (this.histY[k] - sBarHeight) / blkHeight ) - i;

								if( Math.abs(directVectX) >= 1 ) { directVectX = 1 * (directVectX < 0 ? -1 : 1); }
								if( Math.abs(directVectY) >= 1 ) { directVectY = 1 * (directVectY < 0 ? -1 : 1); }

								if( directVectX != 0 || directVectY != 0 ) { break; }
							}
						}
						//----------衝突方向の判定----------

						//----------透過処理----------
						var throughVect = block.throughVect;
						if( throughVect != 0 ) {
							// 上
							if( throughVect == 1 && directVectY >= 1 && directVectX == 0 ) {
								throughFlag = 1;
								this.x -= this.vx;
							}
							// 右
							else if( throughVect == 2 && directVectX <= -1 && directVectY == 0 ) {
								throughFlag = 1;
								this.y -= this.vy;
							}
							// 下
							else if( throughVect == 3 && directVectY <= -1 && directVectX == 0 ) {
								throughFlag = 1;
								this.x -= this.vx;
							}
							// 左
							else if( throughVect == 4 && directVectX >= 1 && directVectY == 0 ) {
								throughFlag = 1;
								this.y -= this.vy;
							}
						}
						//----------透過処理----------

						//--------衝突に伴う反射等の処理-------
						// 貫通ブロック・無敵状態
						if( this.status == BALL_STATUS.ULTIMATE || block.func == BLOCK_FUNCTION.THROUGH || throughFlag == 1 ) {
							if( throughFlag != 1 ) { block.action(this, 0); }

						// 斜めからの衝突
						} else if( directVectX != 0 && directVectY != 0 ) {
							var verBlock1 = blockMap[i + directVectY];
							var horBlock = blockMap[i][j + directVectX];

							// 横方向
							if( horBlock && horBlock.type != 0 && horBlock.func != BLOCK_FUNCTION.THROUGH ) {
								// 座標の修正
								if( directVectY < 0 ) { this.y = horBlock.getTopY() - this.radius - 1; }
								else { this.y = horBlock.getBottomY() + this.radius + 1; }

								// 進行方向の反転及び，加減速
								this.vy = -1 * (vy + horBlock.action(this, 1) * (vy < 0 ? -1 : 1));
							}

							// 縦方向
							if( verBlock1 && verBlock1[j] && verBlock1[j].type != 0 && verBlock1[j].func != BLOCK_FUNCTION.THROUGH ) {
								var verBlock = verBlock1[j];

								// 座標の修正
								if( directVectX < 0 ) { this.x = verBlock.getLeftX() - this.radius - 1; }
								else { this.x = verBlock.getRightX() + this.radius + 1; }

								// 進行方向の反転及び，加減速
								this.vx = -1 * (vx + verBlock.action(this, 0) * (vx < 0 ? -1 : 1));
							}

						// 通常の衝突
						} else {
							if( directVectX != 0 ) {
								// 座標の修正
								if( directVectX < 0 ) { this.x = block.getLeftX() - this.radius - 1; }
								else { this.x = block.getRightX() + this.radius + 1; }

								// 進行方向の反転及び，加減速
								 this.vx = -1 * (vx + block.action(this, 0) * (vx < 0 ? -1 : 1));

							} else {
								// 座標の修正
								if( directVectY < 0 ) { this.y = block.getTopY() - this.radius - 1; }
								else { this.y = block.getBottomY() + this.radius + 1; }

								// 進行方向の反転及び，加減速
								this.vy = -1 * (vy + block.action(this, 1) * (vy < 0 ? -1 : 1));
							}
						}
						//--------衝突に伴う反射等の処理-------
						break;
					}
				}
				if( collisionFlag != 0 ) { break; }
			}
		}
		//-------ブロック衝突判定-------

		return throughFlag;
	}
}

