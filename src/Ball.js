import Bar from "./Bar.js";

//--------------------------------------------------
// ボール
//--------------------------------------------------
function Ball(launch)
{
	this.radius = ballSize;									// ボールの半径
	this.x;													// ボール横方向位置
	this.y;													// ボール縦方向位置
	this.vx;												// ボール横方向速度
	this.vy;												// ボール縦方向速度
	this.histX = new Array();								// ボール横方向位置履歴
	this.histY = new Array();								// ボール縦方向位置履歴
	this.pointIncr = blockDefaultPoint;						// ポイント増分
	this.simulate = 0;										// シミュレートフラグ
	this.breakNum = 0;										// ブロック破壊回数
	this.collisionNum = 0;									// ブロック衝突回数
	this.status = 0;										// ボール状態
	this.statusTime = 0;									// ボール状態時間
	this.duaration = 0;										// 滞空時間
	this.isAbsorption = 0;									// 吸着状態フラグ
	this.absorptionPoint = new Array(0, 0);					// 吸着座標（バーからの相対位置）
	this.imgData = imgData.getDataArr("ball");				// 画像データ



	//--------------------------------------------------
	// 発射
	//--------------------------------------------------
	if( launch == BALL_CREATE_MODE.LAUNCH ) {
		// ため打ち時間の計算
		var diffTime = 0;
		if( mouseDownTime != 0 )
		{
			diffTime = ( Date.now() - mouseDownTime ) / 1000;
			if( diffTime > 1 ) { diffTime = 1; }
		}

		// 初速度の決定
		this.vx = ((Math.random() + 1) * ballDefaultSpeed * 0.5 / Math.abs(bar.vx) + 1) + bar.vx;
		this.vy = -1 * (ballDefaultSpeed + ( ballMaxSpeed - ballDefaultSpeed ) * diffTime);
		if( Math.abs(this.vy) > ballMaxSpeed ) { this.vy = ballMaxSpeed * ( this.vy < 0 ? -1 : 1 ); }
		if( Math.abs(this.vx) > ballMaxSpeed ) { this.vx = ballMaxSpeed * ( this.vx < 0 ? -1 : 1 ); }

		// 初期位置の決定
		this.x = bar.getCenterX();
		this.y = bar.getTopY() - this.radius;
	}



	//--------------------------------------------------
	// コピー
	//--------------------------------------------------
	this.copy = function(mode)
	{
		var obj = new Ball(BALL_CREATE_MODE.OTHER);
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
		obj.histX = this.histX.copy();
		obj.histY = this.histY.copy();

		// 速度変更
		if( mode == BALL_COPY_MODE.RAND )
		{
			if( obj.vy > 0 && Math.random() < 0.6 ) { obj.vy *= -1; }
			else { obj.vy = (Math.random() * 0.15 + 0.85) * ballDefaultSpeed; }
			obj.vx = (~~(Math.random() * 2) * 2 - 1) * (Math.random() * 0.7 + 0.3) * ballDefaultSpeed;

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
	this.getLeftX = function() {
		return this.x - this.radius;
	}
	this.getCenterX = function() {
		return this.x;
	}
	this.getRightX = function() {
		return this.x + this.radius;
	}

	this.getTopY = function() {
		return this.y - this.radius;
	}
	this.getCenterY = function() {
		return this.y;
	}
	this.getBottomY = function() {
		return this.y + this.radius;
	}


	//--------------------------------------------------
	// 落下
	//--------------------------------------------------
	this.fall = function()
	{
		// 落下音
		sounds.play('fall');

		// ボール消去
		balls.tarRemove(this);

		// 落下数の計算
		scoreMng.awardNum.fallBallNum++;

		// ボール無し
		if( bar.immortalStatusTime <= 0 && balls.length == 0 )
		{
			// 全アイテムの消去
			items = new Array();

			// 全武器の消去
			weapons = new Array();

			// バー状態の解除
			bar = new Bar();

			// ライフ減少
			statusMng.addLife(-1);
		}
	}



	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	this.draw = function(ctx)
	{
		// 色の選択
		if( this.status == BALL_STATUS.NORMAL ) { ctx.fillStyle = ballColor; }
		else if( this.status == BALL_STATUS.STRONG ) { ctx.fillStyle = ballStrongColor; }
		else if( this.status == BALL_STATUS.ULTIMATE ) { ctx.fillStyle = ballUltimateColor; }

		// 強化・無敵球の残像
		if( this.status != BALL_STATUS.NORMAL )
		{
			// 球の描画
			ctx.beginPath();

			// 残像の描画
			var scale = this.statusTime / ballStatusTime / FPS + 0.25;
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
	this.move = function()
	{
		// ボールの速度制限
		if( Math.abs( this.vx ) > ballMaxSpeed ) { this.vx = ballMaxSpeed * (this.vx < 0 ? -1 : 1); }
		if( Math.abs( this.vy ) > ballMaxSpeed ) { this.vy = ballMaxSpeed * (this.vy < 0 ? -1 : 1); }
		else if( Math.abs( this.vy ) < ballDefaultSpeed * 0.8 ) { this.vy = ballMaxSpeed * 0.8 * (this.vy < 0 ? -1 : 1); }

		// 状態時間の減少
		if( this.statusTime > 0 ) {
			this.statusTime--;

			// 状態の解除
			if( this.statusTime == 0 ) { this.status = BALL_STATUS.NORMAL; }
		}

		// 吸着状態の場合，ここで処理終了
		if( this.isAbsorption == 1 )
		{
			// 吸着位置を保持
			this.x = this.absorptionPoint[0] + bar.getCenterX();
			this.y = this.absorptionPoint[1] + bar.getTopY();
			return;
		}

		// ボール位置の決定
		this.x += this.vx;
		this.y += this.vy;

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

			// 接触音
			if( simulate == 0 ) { sounds.play('wall'); }

		// 右端
		} else if( this.getRightX() > canvasWidth )
		{
			// 跳ね返り計算
			this.x = canvasWidth - this.radius - 1;
			this.vx *= -1;

			// 接触音
			if( simulate == 0 ) { sounds.play('wall'); }
		}

		// 上端
		if( this.getTopY() < statusBarHeight )
		{
			// 跳ね返り計算
			this.y = this.radius + statusBarHeight + 1;
			this.vy *= -1;

			// 接触音
			if( simulate == 0 ) { sounds.play('wall'); }

		// バー接触
		} else if( simulate == 0 && this.getBottomY() >= bar.getTopY() && Math.abs(x - bar.getCenterX()) <= bar.width / 2 )
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
			this.vx += bar.vx * barSpin;

			// 両端の傾斜による速度変化
			var barEdgeWidth = bar.width * ( 0.5 - bar.edge * ~~(bar.height / 2) );
			if( x < bar.getCenterX() - barEdgeWidth && vx > 0 ) { this.vx -= Math.abs( ballDefaultSpeed - vx ) * 0.4; }
			else if( x > bar.getCenterX() + barEdgeWidth && vx < 0 ) { this.vx += Math.abs( ballDefaultSpeed + vx ) * 0.4; }

			// ボールの縦方向速度の制御（速度が上方向が前提）
			if( vy < -ballDefaultSpeed ) { this.vy += 0.05; }
			else if( vy > -ballDefaultSpeed ) { this.vy -= 0.4; }

			// ボールの横方向速度の制御
			if( Math.abs(this.vx) > ballMaxSpeed ) { this.vx = ballMaxSpeed * ( this.vx < 0 ? -1 : 1 ); }
			if( Math.abs(this.vx) < ballDefaultSpeed * 0.01 ) { this.vx = ballDefaultSpeed * 0.01; }

			// ポイント増分のリセット
			this.pointIncr = 10;

			// 固定ブロック衝突回数のリセット
			this.duaration = 0;

			// 連続衝突回数のリセット
			this.breakNum = 0;
			this.collisionNum = 0;

			// 接触音
			if( simulate == 0 ) { sounds.play('bar'); }

		// 下端
		} else if( this.getBottomY() > canvasHeight )
		{
			this.y = canvasHeight + this.radius + 1;

			// ボール落下
			this.fall();
			return;
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
		var colDetStartX = ~~( (x - this.radius * stepX) / blockWidth );
		var colDetEndX = ~~( (x + this.radius * stepX) / blockWidth );

		// 縦方向
		var colDetStartY = ~~( (y - this.radius * stepY - statusBarHeight) / blockHeight );
		var colDetEndY = ~~( (y + this.radius * stepY - statusBarHeight) / blockHeight );

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
						// 衝突検出
						collisionFlag = 1;

						//----------衝突方向の判定----------
						var directVectX = 0, directVectY = 0;

						// 左から衝突
						if( this.histX[0] + this.radius <= block.getLeftX() && ( blockMap[i][j - 1] == null || (( simulate == 0 && blockMap[i][j - 1].type == 0 ) || ( simulate == 1 && blockMap[i][j - 1].simulate == 0 )) ) ) {
							directVectX = -1;
						}
						// 右から衝突
						else if( this.histX[0] - this.radius > block.getRightX() && ( blockMap[i][j + 1] == null || (( simulate == 0 && blockMap[i][j + 1].type == 0 ) || ( simulate == 1 && blockMap[i][j + 1].simulate == 0 )) ) ) {
							directVectX = 1;
						}

						// 上から衝突
						if( this.histY[0] + this.radius <= block.getTopY() && ( blockMap[i - 1] == null || blockMap[i - 1][j] == null || (( simulate == 0 && blockMap[i - 1][j].type == 0 ) || ( simulate == 1 && blockMap[i - 1][j].simulate == 0 )) ) ) {
							directVectY = -1;
						}
						// 下から衝突
						else if( this.histY[0] - this.radius > block.getBottomY() && ( blockMap[i + 1] == null || blockMap[i + 1][j] == null || (( simulate == 0 && blockMap[i + 1][j].type == 0 ) || ( simulate == 1 && blockMap[i + 1][j].simulate == 0 )) ) ) {
							directVectY = 1;
						}

						// 塞ぐブロックなしで、斜めからの衝突（速度の速い方向で判定）
						if( directVectX != 0 && directVectY != 0 ) {
							if( vx > vy ) { directVectY = 0; }
							else { directVectX = 0; }
						}
						// 塞ぐブロックありで、斜めからの衝突（移動履歴から判定）
						else if( directVectX == 0 && directVectY == 0 )
						{
							for( var k = 0, len = this.histX.length; k < len; k++ )
							{
								directVectX = ~~( this.histX[k] / blockWidth ) - j;
								directVectY = ~~( (this.histY[k] - statusBarHeight) / blockHeight ) - i;

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
								if( directVectY < 0 ) { this.y = horBlock.getTopY() - ballSize - 1; }
								else { this.y = horBlock.getBottomY() + ballSize + 1; }

								// 進行方向の反転及び，加減速
								this.vy = -1 * (vy + horBlock.action(this, 1) * (vy < 0 ? -1 : 1));
							}

							// 縦方向
							if( verBlock1 && verBlock1[j] && verBlock1[j].type != 0 && verBlock1[j].func != BLOCK_FUNCTION.THROUGH ) {
								var verBlock = verBlock1[j];

								// 座標の修正
								if( directVectX < 0 ) { this.x = verBlock.getLeftX() - ballSize - 1; }
								else { this.x = verBlock.getRightX() + ballSize + 1; }

								// 進行方向の反転及び，加減速
								this.vx = -1 * (vx + verBlock.action(this, 0) * (vx < 0 ? -1 : 1));
							}

						// 通常の衝突
						} else {
							if( directVectX != 0 ) {
								// 座標の修正
								if( directVectX < 0 ) { this.x = block.getLeftX() - ballSize - 1; }
								else { this.x = block.getRightX() + ballSize + 1; }

								// 進行方向の反転及び，加減速
								 this.vx = -1 * (vx + block.action(this, 0) * (vx < 0 ? -1 : 1));

							} else {
								// 座標の修正
								if( directVectY < 0 ) { this.y = block.getTopY() - ballSize - 1; }
								else { this.y = block.getBottomY() + ballSize + 1; }

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

		// ボールの速度制限
		if( Math.abs( this.vx ) > ballMaxSpeed ) { this.vx = ballMaxSpeed * (this.vx < 0 ? -1 : 1); }
		if( Math.abs( this.vy ) > ballMaxSpeed ) { this.vy = ballMaxSpeed * (this.vy < 0 ? -1 : 1); }

		// 位置履歴の管理
		if( throughFlag == 0 && this.isAbsorption == 0 ) {
			this.histX.unshift(this.x);
			this.histY.unshift(this.y);
			if( this.histX.length > SYSTEM_PARAM.BALL_HIST_MAX ) {
				this.histX.pop();
				this.histY.pop();
			}
		}
	}
}

export default Ball;
