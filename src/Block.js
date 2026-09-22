import Item from "./Item.js";
import Weapon from "./Weapon.js";
import Balloon from "./Balloon.js";

//--------------------------------------------------
// ブロック
//--------------------------------------------------
function Block(x, y, type, func, life, infinit, through)
{
	this.width = blockWidth;								// ブロックの横幅
	this.height = blockHeight;								// ブロックの縦幅
	this.x = x * this.width;								// ブロックの横軸座標
	this.y = y * this.height + statusBarHeight;				// ブロックの縦軸座標
	this.type = type;										// ブロックの種類
	this.func = func;										// ブロックの機能
	this.text = null;										// ブロックの文字
	this.infinit = infinit;									// 破壊の可否
	this.life = life;										// 残り衝突可能回数
	this.item = null;										// アイテム
	this.explode = 0;										// 爆発
	this.simulate = 0;										// シミュレート用
	this.breakLimit = 0;									// 破壊制限時間
	this.moveInter = 0;										// 移動間隔
	this.moveVect = 0;										// 移動方向（0:右、1：左）
	this.blinkInter = 0;									// 点滅用カウント
	this.blinkSwitch = 0;									// 点灯・消灯の判別（-1:消灯、1:点灯、0:停止）
	this.blinkType = 0;										// 種類保持用変数
	this.throughVect = through;								// 透過方向（0：なし、1～4：上、右、下、左）
	this.attackInter = 0;									// 攻撃間隔
	this.imgData = imgData.getData("block", type);			// 描画イメージ


	// 移動ブロックの設定
	if( this.func == BLOCK_FUNCTION.VERTICAL_MOVE )
	{
		this.moveInter = Math.random() * blockMoveInter * FPS;
		this.moveVect = (~~(Math.random() * 2) * 2 - 1);
	}
	// 点滅ブロックの設定
	else if( this.func == BLOCK_FUNCTION.BLINK )
	{
		this.blinkInter = Math.random() * blockBlinkInter * FPS;
		this.blinkSwitch = (~~(Math.random() * 2) * 2 - 1);
		this.blinkType = this.type;
	}
	// 攻撃ブロックの設定
	else if( this.func == BLOCK_FUNCTION.ATTACK )
	{
		this.attackInter = Math.random() * blockAttackInter * FPS;
	}


	//--------------------------------------------------
	// コピー
	//--------------------------------------------------
	this.copy = function()
	{
		var obj = new Block(this.x / this.width, (this.y - statusBarHeight) / this.height, this.type, this.func, this.life, this.infinit, this.throughVect);
		obj.item = this.item;
		obj.explode = this.explode;
		obj.simulate = this.simulate;
		obj.breakLimit = this.breakLimit;
		obj.moveInter = this.moveInter;
		obj.moveVect = this.moveVect;

		return obj;
	}


	//--------------------------------------------------
	// 上下・左右・中央座標取得
	//--------------------------------------------------
	this.getLeftX = function() {
		return this.x;
	}
	this.getCenterX = function() {
		return this.x + this.width *0.5;
	}
	this.getRightX = function() {
		return this.x + this.width;
	}

	this.getTopY = function() {
		return this.y;
	}
	this.getCenterY = function() {
		return this.y + this.height *0.5;
	}
	this.getBottomY = function() {
		return this.y + this.height;
	}


	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	this.draw = function(ctx)
	{
		// ブロックを描画
		ctx.putImageData(this.imgData, this.x - 0.5, this.y - 0.5);

		// ブロックの文字を描画
		var text = this.text;
		if( text != null )
		{
			ctx.textBaseline = 'middle';
			ctx.textAlign = 'center';
			ctx.font = blockFontSize + "px 'ＭＳ Ｐゴシック'";
			ctx.fillStyle = blockTextColor[this.type];
			ctx.fillText(text, this.getCenterX() - 0.5, this.getCenterY() - 0.5, this.width);
		}

		// 耐久性を透過率で表現
		if( this.life < blockLife[this.type] )
		{
			ctx.globalAlpha = ( this.life + 1 ) / ( blockLife[this.type] + 1 );
			ctx.beginPath();
			ctx.strokeStyle = "#ffffff";
			ctx.fillStyle = "#ffffff";
			ctx.rect(this.x - 0.5, this.y - 0.5, this.width, this.height);
			ctx.fill();
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}


	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	this.clear = function(ctx)
	{
		ctx.clearRect(this.x - 0.5, this.y - 0.5, this.width, this.height);
	}


	//--------------------------------------------------
	// 動き・状態遷移
	//--------------------------------------------------
	this.move = function()
	{
		// 爆発モーションのカウントダウン
		if( this.exploded > 0 ) { this.exploded--; }

		// カウントダウン文字の表示
		if( this.breakLimit > 0 )
		{
			// カウントダウンのリセット
			if( balls.length == 0 ) { this.breakLimit = 1; }

			// 残り時間の計算
			var countDownTime = ~~(this.breakLimit / FPS * 10) / 10;

			// 出力文字の作成
			if( countDownTime * 10 % 10 == 0 ) { this.text = String(~~countDownTime + ".0"); }
			else { this.text = countDownTime; }
			this.text += ' s';

			// 時間の減少
			this.breakLimit--;

			// 時間切れ
			if( this.breakLimit <= 0 )
			{
				this.life = blockLife[this.type];
				this.text = null;
			}

			// 描画
			this.draw(staticCtx);
		}

		if( this.type != 0 )
		{
			// 移動処理
			if( this.func == BLOCK_FUNCTION.VERTICAL_MOVE )
			{
				this.moveInter--;

				if( this.moveInter <= 0 )
				{
					var i = (this.getTopY() - statusBarHeight) / this.height;
					var j = this.getLeftX() / this.width;
					var forBlock = blockMap[i][j + this.moveVect];

					// 移動
					if( (!forBlock || forBlock.type == 0) && (j + this.moveVect) < canvasWidth / this.width && j + this.moveVect >= 0 )
					{
						// 描画を消去
						this.clear(staticCtx);

						// 移動
						blockMap[i][j + this.moveVect] = this.copy();
						forBlock = blockMap[i][j + this.moveVect];
						forBlock.x += this.width * this.moveVect;
						forBlock.moveInter = blockMoveInter * FPS + (this.moveVect == 1 ? 1 : 0);

						// 再描画
						forBlock.draw(staticCtx);

						// 無効化
						this.type = 0;

					// 反転
					} else {
						this.moveVect *= -1;
					}
				}
			}
			// 引力処理
			else if( this.func == BLOCK_FUNCTION.MAGNET || this.func == BLOCK_FUNCTION.REPULL )
			{
				// 引力・斥力の判別
				var powVect = 1;
				if( this.func == BLOCK_FUNCTION.MAGNET ) { powVect = -1; }
				else { powVect = 1; }

				for( var i = 0, len = balls.length; i < len; i++ ) {
					var ball = balls[i];

					// 相対座標の取得
					var relX = ball.getCenterX() - this.getCenterX();
					var relY = ball.getCenterY() - this.getCenterY();

					// 引力影響範囲内の球のみ対象
					var dist = Math.sqrt(Math.pow(relX, 2) + Math.pow(relY, 2));
					if( dist <= blockDrawingDistance ) {

						// 加速度の計算
						var acceleration = ballDefaultSpeed * 25 / Math.pow(dist, 1.8);

						// 横方向の球速の変更
						ball.vx += acceleration * 1.6 * (relX < 0 ? -1 : 1) * powVect;
						if( Math.abs(ball.vx) <= ballDefaultSpeed * 0.1 ) { ball.vx = ballDefaultSpeed * 0.1 * (ball.vx >= 0 ? 1 : -1); }

						// 縦方向の球速の変更
						if( ball.vy * relY < 0 ) {
							ball.vy += acceleration * 0.4 * (relY < 0 ? -1 : 1) * powVect;
						} else {
							ball.vy += acceleration * 0.2 * (relY < 0 ? -1 : 1) * powVect;
						}
					}
				}
			}
			// 攻撃処理
			else if( this.func == BLOCK_FUNCTION.ATTACK && balls.length > 0 )
			{
				// 経過時間のカウント
				this.attackInter--;

				// 攻撃
				if( this.attackInter <= 0 )
				{
					// タイマーのリセット
					this.attackInter = blockAttackInter * FPS * (Math.random()*0.2 + 0.8);

					// 武器の発射
					weapons[weapons.length] = new Weapon(1, this.getCenterX(), this.getBottomY() + 1, -1);
				}
			}
		}
		// 点滅処理
		if( this.func == BLOCK_FUNCTION.BLINK && this.blinkSwitch != 0 )
		{
			// 経過時間のカウント
			this.blinkInter--;

			if( this.blinkInter <= 0 ) {
				// カウントの初期化
				this.blinkInter = blockBlinkInter * FPS * (0.7 + Math.random()*0.3);

				// スイッチの反転
				this.blinkSwitch *= -1;

				// 消灯・点灯の切り替え
				if( this.blinkSwitch == -1 )
				{
					this.type = 0;
					this.clear(staticCtx);

				} else
				{
					this.type = this.blinkType;
					this.draw(staticCtx);
				}
			}
		}
	}



	//--------------------------------------------------
	// アクション
	//--------------------------------------------------
	this.action = function(ball, isChangedVY)
	{
		var addSpeed = 0;

		// 接触音
		if( ball != null && ball.simulate == 0 )
		{
			// ワープブロック
			if( this.func == BLOCK_FUNCTION.WARP_ENTER ) {
				sounds.play('warp');

			// 通常ブロック
			} else if( this.func != BLOCK_FUNCTION.NORMAL && this.func != BLOCK_FUNCTION.EXPLODE_STRENGTH ) {
				if( ball.status == BALL_STATUS.NORMAL ) { sounds.play('block'); }
				else { sounds.play('spBlock'); }
			}
		}

		// 武器による破壊
		if( ball == null )
		{
			// ワープブロックは破壊不可
			if( this.func != BLOCK_FUNCTION.WARP_ENTER && this.func != BLOCK_FUNCTION.WARP_EXIT )
			{
				// 爆発モーションのセット
				this.exploded = blockMotionTime * FPS;

				// ブロックの削除
				this.break(null);

				// ポイントの付与
				scoreMng.score = Number(scoreMng.score) + blockDefaultPoint;
			}

			return;
		}

		// 爆発
		if( this.func == BLOCK_FUNCTION.EXPLODE || this.func == BLOCK_FUNCTION.EXPLODE_STRENGTH )
		{
			// シミュレートの確認
			if( !ball.simulate ) {
				// 爆発モーションのセット
				this.exploded = blockMotionTime * FPS;
			}

			// 短期間の貫通弾化
			if( this.func == BLOCK_FUNCTION.EXPLODE_STRENGTH ) {
				ball.status = BALL_STATUS.ULTIMATE;
				ball.statusTime = ~~(ballStatusTime * 0.3 * FPS);
			}

			// 周りのブロックを破壊
			this.explode(this.getLeftX() / this.width, (this.getTopY() - statusBarHeight) / this.height, 1, ball);

			// 爆発による速度の増加
			addSpeed = ballDefaultSpeed;

		// 強化球
		} else if( ball.status == BALL_STATUS.STRONG && this.func != BLOCK_FUNCTION.WARP_ENTER ) {
			addSpeed = ballMaxSpeed - Math.abs(ballDefaultSpeed);

		// 加速
		} else if( this.func == BLOCK_FUNCTION.ACCELERATION ) {
			addSpeed = ballDefaultSpeed * 0.2;

		// 減速
		} else if( this.func == BLOCK_FUNCTION.DECELERATION ) {
			addSpeed = -ballDefaultSpeed * 0.2;

		// ワープ
		} else if( this.func == BLOCK_FUNCTION.WARP_ENTER )
		{
			var randSeed = ~~(Math.random()*100);

			// ワープブロックの検索
			var warpBlockIJ = new Array();
			for( var i = 0, len = blockMap.length; i < len; i++ ) {
				if( blockMap[i] ) {
					for( var j = 0, len2 = blockMap[i].length; j < len2; j++ ) {
						var block = blockMap[i][j];
						if( block && block.type != 0 && block.func == BLOCK_FUNCTION.WARP_EXIT && block != this ) {
							warpBlockIJ[warpBlockIJ.length] = new Array(i, j);
						}
					}
				}
			}

			if( warpBlockIJ.length != 0 ) {
				// ワープ先の決定
				var toWarpBlockIJ = warpBlockIJ[randSeed%warpBlockIJ.length];
				var toWarpBlockI = toWarpBlockIJ[0];
				var toWarpBlockJ = toWarpBlockIJ[1];
				var toWarpBlock = blockMap[toWarpBlockI][toWarpBlockJ];

				// 隣接ブロックの存在確認
				var sideNumToVect = new Array( new Array(-1, 0), new Array(1, 0));
				var warpSide = new Array();
				for( var i = 0; i < 2; i++ ) {
					var warpSideI = toWarpBlockI + sideNumToVect[i][0];
					var warpSideJ = toWarpBlockJ + sideNumToVect[i][1];

					// 有効範囲の限定
					if( warpSideI >= 0 && warpSideJ >= 0 ) {
						if( blockMap[warpSideI] ) {
							var neighborBlock = blockMap[warpSideI][warpSideJ];

							// 隣接ブロックの存在確認
							if( !neighborBlock || neighborBlock.type == 0 ) {
								warpSide[warpSide.length] = i;
							}
						} else {
							warpSide[warpSide.length] = i;
						}
					}
				}

				if( warpSide.length != 0 ) {
					// ワープ先隣接の決定
					var toWarpSide = warpSide[randSeed%warpSide.length];

					// ボールを移動
					var toWarpXY = new Array( new Array(0, -this.height/2 - 1 - ballSize), new Array(0, this.height/2 + 1 + ballSize) );
					ball.x = toWarpBlock.getCenterX() + toWarpXY[toWarpSide][0];
					ball.y = toWarpBlock.getCenterY() + toWarpXY[toWarpSide][1];

					// ボール速度の変更
					if( isChangedVY == 1 ) { ball.vy *= -1; }
					ball.vy *= ((ball.vy > 0 && toWarpSide == 0) || (ball.vy < 0 && toWarpSide == 1) ? -1 : 1);
				}
			}
		}

		// 破壊
		if( (this.infinit != 1 || ball.status == BALL_STATUS.ULTIMATE || (ball.status == BALL_STATUS.STRONG && this.infinit != 1)) && this.func != BLOCK_FUNCTION.WARP_ENTER && this.func != BLOCK_FUNCTION.WARP_EXIT )
		{
			// 衝突回数の計算
			ball.collisionNum++;

			// シミュレートでない場合
			if( ball.simulate == 0 ) {
				// 破壊
				if( this.life < 1 || ball.status != BALL_STATUS.NORMAL ) {
					this.break(ball);

				// 耐久性減少
				} else {
					this.decreaseLife();
				}

				// ポイント計算
				scoreMng.score = Number(scoreMng.score) + ball.pointIncr;
				ball.pointIncr = Number(ball.pointIncr) + blockIncrPoint;

				// 連続破壊数の表示
				if( ball.breakNum > scoreMng.awardNum.continuousBreakNum )
				{
					// 最大数の更新
					scoreMng.awardNum.continuousBreakNum = ball.breakNum;

					// バルーンの追加
					var bx = ball.getCenterX();
					var by = ball.getCenterY();
					if( bx > canvasWidth - 30 ) { bx = canvasWidth - 30; }
					if( by > canvasHeight - 15 ) { by = canvasHeight - 15; }
					balloons[balloons.length] = new Balloon(scoreMng.awardNum.continuousBreakNum, bx, by, 25, 10, 0.13, popBalloonBackColor, popBalloonFontColor, 12);
				}

			// シミュレートの場合
			} else {
				// 破壊
				if( ball.status != BALL_STATUS.NORMAL || this.simulate <= 1 ) {
					this.break(ball);

				// 耐久性減少
				} else {
					this.simulate--;
				}
			}

		// 破壊不可ブロック
		} else if( this.infinit == 1 && ball.simulate == 0 ) {
			scoreMng.score = Number(scoreMng.score) + ball.pointIncr;
			ball.pointIncr = Number(ball.pointIncr) + ~~(blockIncrPoint / 2);
		}

		// 無限ループ回避
		if( this.infinit == 1 || blockBreakLimit[this.type] > 0 )
		{
			// 固定ブロック衝突回数の増加
			ball.duaration++;

			// 無限ループ回避
			var duaration = ball.duaration;
			if( ballInfBoundCancel == 1 && duaration > 80 )
			{
				// 速度を変更
				ball.vx += ~~((Math.random()*2)*2 - 1) * (Math.random()*0.5 + 0.5) * ballDefaultSpeed / 10;
				ball.vy += ~~((Math.random()*2)*2 - 1) * (Math.random()*0.5 + 0.5) * ballDefaultSpeed / 10;

				// ボール得点増加率の操作
				ball.pointIncr = ~~( ball.pointIncr * 0.8 );

				// 衝突回数の減少
				ball.duaration = ~~(duaration / 1.05);
			}
		} else {
			// 衝突回数の減少
			ball.duaration = ~~(duaration / 4);
		}

		return addSpeed;
	}



	//--------------------------------------------------
	// 破壊処理
	//--------------------------------------------------
	this.break = function(ball)
	{
		// シミュレートの場合
		if( ball != null && ball.simulate == 1 ) {
			// 破壊処理
			this.simulate = 0;
		}
		// シミュレートでない場合
		else
		{
			// 破壊処理
			this.type = 0;
			this.breakLimit = 0;

			// 描画の削除
			this.clear(staticCtx);

			// 点滅の停止
			this.blinkSwitch = 0;

			// ブロック数の減少
			if( this.infinit == 0 ) { statusMng.blockNum--; }

			// アイテム出現
			if( this.item != null ) { items[items.length] = new Item(this.item, this.getLeftX(), this.getTopY(), itemLineColor[ctrl.stageIndex][this.item], itemColor[ctrl.stageIndex][this.item]); }
		}

		// 破壊回数の計算
		if( ball != null ) { ball.breakNum++; }
	}


	//--------------------------------------------------
	// 耐久性の減少
	//--------------------------------------------------
	this.decreaseLife = function()
	{
		// 耐久性の減少
		this.life--;

		// 描画
		this.draw(staticCtx);

		// 制限時間のセット
		if( blockBreakLimit[this.type] > 0 ) { this.breakLimit = blockBreakLimit[this.type] * FPS; }
	}


	//--------------------------------------------------
	// 爆弾による巻き込み破壊
	//--------------------------------------------------
	this.explode = function(x, y, area, ball)
	{
		for(var i = -area + y; i <= area + y; i++)
		{
			if( blockMap[i] != null ) {
				for(var j = -area + x; j <= area + x; j++) {
					var block = blockMap[i][j];

					// 破壊可能ブロックのみ対象
					if( block != null && block != this && ( ( ball.simulate == 0 && block.type != 0 ) || ( ball.simulate != 0 && block.simulate != 0 ) ) && block.infinit != 1 )
					{
						// 燃料・爆薬引火
						if( block.func == BLOCK_FUNCTION.FUEL || block.func == BLOCK_FUNCTION.EXPLODE || block.func == BLOCK_FUNCTION.EXPLODE_STRENGTH )
						{
							// シミュレートでない場合
							if( ball.simulate == 0 )
							{
								// 爆発モーションのセット
								block.exploded = 60;
							}

							// 破壊処理
							block.break(ball);

							// さらに巻き込み破壊
							this.explode(j, i, 1, ball);

						// 通常
						} else {
							block.break(ball);
						}

						// シミュレートでない場合
						if( ball.simulate == 0 ) {
							// 爆発音
							sounds.play('bomb');

							// ポイント計算
							scoreMng.score += ~~(blockDefaultPoint * 1.5);
							ball.pointIncr += ~~(blockIncrPoint / 2);
						}
					}
				}
			}
		}
	}



	//--------------------------------------------------
	// シミュレート値のリセット
	//--------------------------------------------------
	this.simulateReset = function()
	{
		if( this.type ) { this.simulate = this.life + 1; }
		else { this.simulate = 0; }
	}
}

export default Block;
