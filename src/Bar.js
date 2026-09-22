import Ball from "./Ball.js";
import Weapon from "./Weapon.js";

//--------------------------------------------------
// 反射バー
//--------------------------------------------------
function Bar()
{
	this.x = pointX;										// バー横軸位置
	this.y = canvasHeight - barDefaultHeight - 5.5;			// バー縦軸位置
	this.vx = 0;											// バー速度
	this.vxMax = barDefaultSpeed;							// バー最大速度
	this.width = barDefaultWidth;							// バー幅
	this.height = barDefaultHeight;							// バー高
	this.alpha = 1;											// バーの透過率調整
	this.widthStatusTime = 0;								// バー長の状態時間
	this.speedStatusTime = 0;								// バー速度の状態時間
	this.weapon = 0;										// バーの武器状態
	this.weaponTime = 0;									// バーの武器状態時間
	this.weaponInter = 0;									// バーの武器使用間隔
	this.vibrationTime = 0;									// バーの振動状態時間
	this.absorptionStatusTime = 0;							// バーの吸着状態時間
	this.absorptionNum = 0;									// バーの吸着球数
	this.edge = barEdge;									// バーの端の傾斜
	this.color = barColor;									// バーの色
	this.simuData = new Array();							// シミュレーションの引き継ぎ情報
	this.immortalStatusTime = 0;							// 不死身
	this.disturbStatusTime = 0;								// 画面の難視化
	this.hitPoint = barDefaultHP;							// バーのHP



	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	this.draw = function(ctx)
	{
		// 武器の描画
		if( this.weapon != 0 ) {
			new Weapon(this.weapon, ~~(this.getLeftX()), ~~(this.getTopY())).draw(ctx);
			new Weapon(this.weapon, ~~(this.getRightX()), ~~(this.getTopY())).draw(ctx);
		}

		// バー状態解除前の点滅制御
		if( (this.widthStatusTime != 0 && this.widthStatusTime <= barStatusDefaultTime * FPS * 0.25) ||
			(this.magnetStatusTime != 0 && this.magnetStatusTime <= barStatusDefaultTime * FPS * 0.25)
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
	this.getLeftX = function() {
		return this.x - this.width *0.5;
	}
	this.getCenterX = function() {
		return this.x;
	}
	this.getRightX = function() {
		return this.x + this.width *0.5;
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
	// 吸着ボールの再発射
	//--------------------------------------------------
	this.relaunch = function()
	{
		// 吸着しているボールを探す
		for( var i = 0, len = balls.length; i < len; i++ )
		{
			var ball = balls[i];

			if( ball.isAbsorption == 1 )
			{
				// 吸着状態の解除
				ball.isAbsorption = 0;

				// 球速の変更
				if( Math.abs(this.vx) > ballDefaultSpeed*0.3 )
				{
					ball.vx = this.vx * barSpin;

				// ランダムに決定
				} else
				{
					ball.vx *= Math.random()*0.7 + 0.3;
				}

				// 吸着球個数の減少
				this.absorptionNum--;
				break;
			}
		}
	}


	//--------------------------------------------------
	// 移動・状態遷移
	//--------------------------------------------------
	this.move = function()
	{
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
			if( this.widthStatusTime <= 0 ) { this.width = barDefaultWidth; }
		}

		// バー速度状態の制御
		if( this.speedStatusTime > 0 )
		{
			this.speedStatusTime--;

			// バーサイズの変更
			if( this.vxMax > barDefaultSpeed ) { this.height = barDefaultHeight * 0.6; }
			else { this.height = barDefaultHeight * 1.6; }

			// 状態解除
			if( this.speedStatusTime <= 0 ) {
				this.vxMax = barDefaultSpeed;
				this.height = barDefaultHeight;
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
				for( ; this.absorptionNum > 0; )
				{
					this.relaunch();
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
				this.color = barColor;
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
	this.endamage = function(_damage)
	{
		// HPの減少
		this.hitPoint = Number(this.hitPoint) - Number(_damage);

		// HPがゼロでライフを1消費
		if( this.hitPoint <= 0 )
		{
			// HPを回復
			this.hitPoint = barDefaultHP;

			// ライフを消費
			statusMng.addLife(-1);
		}
	}


	//--------------------------------------------------
	// 自動プレイ
	//--------------------------------------------------
	this.auto = function()
	{
		// 最大予測数の計算
		var MAX_PREDICT = SIMULATE_PARAM.MAX_PREDICT * FPS;

		var targetX = -1;
		var fallBall = null;
		var fallBallI;
		var fallBallTime = MAX_PREDICT;
		var fallItemTime = MAX_PREDICT;
		var fallItemX = -1;
		var fallWeaponTime = MAX_PREDICT;
		var plusSpeed = 0;
		var ballNum = balls.length;
		var moveSpeed = this.vxMax;

		//----------発射制御及び初期化----------
		if( ballNum == 0 )
		{
			// スタート画面の終了
			allClose();

			// 初期位置及び初速度の決定
			this.x = ~~( canvasWidth / 2 * (1 + (~~(Math.random() * 2) * 2 - 1) * Math.random()) );
			this.vx = ballDefaultSpeed * (Math.random() * 0.5 + 0.8) * (~~(Math.random() * 2) * 2 - 1);

			// 球発射
			mouseDownTime = Date.now() - 1000;
			balls[0] = new Ball(BALL_CREATE_MODE.LAUNCH);
		}
		//----------発射制御及び初期化----------

		// 吸着状態解除
		if( this.absorptionNum > 0 )
		{
			for( var i = 0; i < this.absorptionNum; i++ ) {
				this.relaunch();
			}
		}

		//----------落下が近い球の選択----------
		var fallSimulate = new Array();
		for( var i = 0; i < ballNum; i++ ) { fallSimulate[i] = balls[i].copy(BALL_COPY_MODE.SIMULATE); }

		// ボールの動きのシミュレート
		simulateReset();
		for( var t = 0; t < fallBallTime; t++ )
		{
			for( var i = 0; i < ballNum; i++ )
			{
				var ball = fallSimulate[i];

				// 選択
				if( ball.vy > 0 && ball.getBottomY() >= this.y )
				{
					// 到達可能範囲内
					if( Math.abs( this.getCenterX() - ball.getCenterX() ) - this.width / 2 <= moveSpeed * t )
					{
						fallBall = ball;
						fallBallTime = t;
						fallBallI = i;
						break;
					}

				// 実行
				} else {
					ball.move();
				}
			}
		}
		//----------落下が近い球の選択----------

		//----------落下が近いアイテムの選択----------
		for( var i = 0, len = items.length; i < len; i++ )
		{
			var item = items[i];

			// 一番落下が近いアイテムを選択
			var tmpFallItemTime = (this.y - item.getBottomY()) / itemSpeed[ctrl.stageIndex];
			if( fallItemTime > tmpFallItemTime && (Math.abs(this.getCenterX() - item.getCenterX()) - (blockWidth + this.width) / 2) / moveSpeed <= fallItemTime )
			{
				// 落下時刻の取得
				fallItemTime = tmpFallItemTime;

				// アイテム落下位置の決定
				fallItemX = item.getCenterX();
				targetX = fallItemX;

				// 不利益アイテムの接近
				if( item.type == 4 || item.type == 6 || item.type == 11 || item.type == 12 || item.type == 15 || ( itemProb[ctrl.stageIndex][5] > 0.1 && item.type == 3 ) )
				{
					// 衝突回避（アイテム接近）
					if( fallItemTime * moveSpeed <= (blockWidth + this.width) * 2 && Math.abs(targetX - this.getCenterX()) <= (blockWidth + this.width) / 2 + 2 )
					{
						// 左へ回避
						if( ( this.width < item.getLeftX() && item.getLeftX() > this.getCenterX() ) || canvasWidth <= item.getRightX() + this.width ) {
							targetX -= (this.width + blockWidth) / 2 + 1;

						// 右へ回避
						} else {
							targetX += (this.width + blockWidth) / 2 + 1;
						}

					// 無視
					} else {
						fallItemTime = MAX_PREDICT;
						targetX = -1;
					}
				}
			}
		}
		//----------落下が近いアイテムの選択----------

		//----------落下が近い攻撃の選択----------
		for( var i = 0, len = weapons.length; i < len; i++ )
		{
			var weapon = weapons[i];

			// ブロックの攻撃の衝突危険性のあるものを選択
			if( weapon.vect < 0 && (this.y - weapon.y) / weapon.vy < fallWeaponTime && Math.abs(weapon.x - this.getCenterX()) <= this.width/2 + 3 )
			{
				// 落下時間の更新
				fallWeaponTime = (this.y - weapon.y) / weapon.vy;

				// ボール側に移動
				if( (fallBall.getCenterX() > weapon.x && weapon.x + this.width + 3 <= canvasWidth) || (weapon.x - this.width - 3 < 0) ) { targetX = weapon.x + this.width/2 + 3; }
				else { targetX = weapon.x - this.width/2 - 3; }
			}
		}
		//----------落下が近い攻撃の選択----------

		//----------最適経路の選択----------
		if( fallBall != null )
		{
			// 球優先
			if( targetX == -1 || (Math.abs( targetX - fallBall.getCenterX() ) > ( fallBallTime - fallItemTime ) * moveSpeed && Math.abs( targetX - fallBall.getCenterX() ) > ( fallBallTime - fallWeaponTime ) * moveSpeed ))
			{
				targetX = fallBall.getCenterX();
			}
			else if( fallItemX == targetX )
			{
				// 球にできるだけ近づく
				if( Math.abs( fallBall.getCenterX() - targetX ) > (blockWidth + this.width) / 2 )
				{
					// 球が左側
					if( item.getCenterX() > fallBall.getCenterX() ) { targetX -= (blockWidth + this.width) / 2 - 1; }

					// 球が右側
					else { targetX += (blockWidth + this.width) / 2 - 1; }

				// 球と十分に近い場合
				} else {
					fallItemTime = MAX_PREDICT;
				}
			}

			// 一時変数へ落とす
			var fallBallX = fallBall.getCenterX();
			var fallBallVX = fallBall.vx;
			var sim = this.simuData;

			// シミュレート情報の更新
			if( sim == null || sim["x"] != fallBallX || sim["vx"] != fallBallVX || sim["status"] != fallBall.status || sim["statusTime"] != fallBall.statusTime )
			{
				// 補正最大速度の算出
				var leftSpeed = (fallBallX - canvasWidth - this.width / 2) * barSpin;
				var rightSpeed = (fallBallX - this.width / 2) * barSpin;
				if( Math.abs( leftSpeed + fallBallVX ) > ballMaxSpeed ) { leftSpeed = ballMaxSpeed * ( leftSpeed < 0 ? -1 : 1 ) - fallBallVX; }
				if( Math.abs( rightSpeed + fallBallVX ) > ballMaxSpeed ) { rightSpeed = ballMaxSpeed * ( rightSpeed < 0 ? -1 : 1 ) - fallBallVX; }
				if( Math.abs( leftSpeed ) > moveSpeed * barSpin ) { leftSpeed = moveSpeed * barSpin * ( leftSpeed < 0 ? -1 : 1 ); }
				if( Math.abs( rightSpeed ) > moveSpeed * barSpin ) { rightSpeed = moveSpeed * barSpin * ( rightSpeed < 0 ? -1 : 1 ); }
				if( leftSpeed > rightSpeed ) {
					var tmp = leftSpeed;
					leftSpeed = rightSpeed;
					rightSpeed = tmp;
				}

				// 落下球情報の加工
				fallBall.vy *= -1;
				fallBall.y = this.getTopY() - ballSize;
				fallBall.breakNum = 0;
				fallBall.collisionNum = 0;

				// 情報の更新
				sim["stDvx"] = leftSpeed;
				sim["enDvx"] = rightSpeed;
				sim["x"] = fallBallX;
				sim["vx"] = fallBallVX;
				sim["status"] = fallBall.status;
				sim["statusTime"] = fallBall.statusTime;
				sim["self"] = fallBall.copy();
				sim["breakMaxNum"] = 0;
				sim["collisionMaxNum"] = 0;
				sim["returnTime"] = MAX_PREDICT;
				sim["dvx"] = 0;
				sim["step"] = ballMaxSpeed * 2 / SIMULATE_PARAM.RESOLUTION;

				// シミュレート時間の短縮（落下までに間に合う回数にする）
				if( fallBallTime < (SIMULATE_PARAM.RESOLUTION / SIMULATE_PARAM.TIMES_PER_STEP)*0.9 ) { sim["step"] = ballMaxSpeed * 2 / (fallBallTime - 2); }

			// シミュレート情報の引き継ぎ
			} else if( fallBallTime <= 2 ) {
				plusSpeed = sim["dvx"];
			}

			// 最適経路の探索
			if( sim["stDvx"] <= sim["enDvx"] )
			{
				var maxBreakNum = sim["breakMaxNum"];
				var maxCollisionNum = sim["collisionMaxNum"];
				var returnTime = sim["returnTime"];
				var fallBall = sim["self"];

				// 速度の準備
				var dvx;
				var dvxStep = sim["step"];
				var stDvx = sim["stDvx"];
				var enDvx = sim["enDvx"];
				for( var dvx = stDvx, ct = 0; dvx <= enDvx && ct < SIMULATE_PARAM.TIMES_PER_STEP; dvx += dvxStep, ct++ )
				{
					// シミュレート準備
					var simulate = new Array();
					for( var i = 0; i < ballNum; i++ )
					{
						// 速度変更
						if( fallBallI == i ) { simulate[i] = fallBall.copy(BALL_COPY_MODE.SIMULATE); }

						// その他
						else { simulate[i] = fallSimulate[i].copy(BALL_COPY_MODE.SIMULATE); }
					}
					simulate[fallBallI].vx += dvx;

					// ボールの動きのシミュレート
					simulateReset();
					var t;
					for( t = 0; simulate[fallBallI].getBottomY() <= this.getTopY() && t <= MAX_PREDICT; t++ )
					{
						for( var i = 0; i < ballNum; i++ ) {
							var ball = simulate[i];
							if( ball.getBottomY() <= this.getTopY() ) { ball.move(); }
						}
					}

					// 速度の選択
					var checkBreakNum = simulate[fallBallI].breakNum;
					var checkCollisionNum = simulate[fallBallI].collisionNum;
					if( (maxBreakNum + maxCollisionNum) / returnTime < (checkBreakNum + checkCollisionNum) / t )
					{
						maxBreakNum = checkBreakNum;
						maxCollisionNum = checkCollisionNum;
						returnTime = t;
						sim["dvx"] = dvx;
					}
				}

				// 次回へのデータの引き継ぎ
				sim["breakMaxNum"] = maxBreakNum;
				sim["collisionMaxNum"] = maxCollisionNum;
				sim["returnTime"] = returnTime;
				sim["stDvx"] = dvx;
			}

			// 衝突見込みなしの場合の探索
			if( fallBallTime <= 2 && sim["breakMaxNum"] == 0 && sim["collisionNum"] == 0 && Math.random() > 0.3 )
			{
				var dx = canvasWidth;
				plusSpeed = ballDefaultSpeed * ( 0.8 + Math.random() * 0.4 ) * ( ~~(Math.random() * 2) * 2 - 1 ) - fallBallVX;

				// 位置・速度を変更
				for( var x = 0; x < canvasWidth; x += barDefaultSpeed * (Math.random() * 0.3 + 0.7) )
				{
					for( var vx = -ballMaxSpeed; vx < ballMaxSpeed; vx += ballMaxSpeed / 10 * (Math.random() + 1) * 0.5 )
					{
						// シミュレート
						var check = fallBall.copy(BALL_COPY_MODE.SIMULATE);
						check.x = x;
						check.vx = vx;
						simulateReset();
						for( var t = 0; check.getBottomY() <= this.getTopY() && t <= MAX_PREDICT; t++ ) { check.move(); }

						// 目的地に応じた速度選択
						if( check.breakNum > 0 && dx > Math.abs( x - fallBallX ) ) {
							dx = Math.abs( x - fallBallX );
							plusSpeed = ballDefaultSpeed * (x - fallBallX) / canvasWidth * 10 - fallBallVX;
						}
					}
				}

				// 速度の制限
				if( Math.abs(plusSpeed + fallBallVX) > ballMaxSpeed ) { plusSpeed = ballMaxSpeed * (plusSpeed < 0 ? -1 : 1) - fallBallVX; }
			}
		}
		//----------最適経路の選択----------

		//----------武器使用及び移動----------
		if( this.weapon != 0 ) {
			var blockLine = new Array();

			// ブロックマッピングの初期化
			for( var i = 0, len = ~~(canvasWidth / blockWidth); i < len; i++ ) {
				blockLine[i] = 0;
			}

			// 発射済み武器の考慮
			for( var i = 0; i < weapons.length; i++ ) {
				var weapX = ~~(weapons[i].x / blockWidth);

				// 武器の考慮
				if( weapons[i].vect > 0 ) { blockLine[weapX]--; }
			}

			// ブロックの存在を確認
			for( var i = blockMap.length; i >= 0; i-- )
			{
				if( blockMap[i] != null )
				{
					for( var j = 0, len2 = blockMap[i].length; j < len2; j++ )
					{
						var block = blockMap[i][j];

						// マッピング
						if( block != null && block.type != 0 )
						{
							// 破壊不可
							if( block.infinit == 1 && this.weapon == 1 && blockLine[j] == 0 ) {
								blockLine[j] = -10000;

							// 破壊可
							} else if( blockLine[j] != -10000 ) {
								blockLine[j] += 1 + (this.weapon != 1 ? 0 : block.life);
							}
						}
					}
				}
			}

			// 移動を確認
			var breakX = -1;
			var breakDx = canvasWidth;
			var checkX = (targetX == -1 ? this.getCenterX() : targetX);
			for( var i = 0, len = blockLine.length; i < len; i++ )
			{
				// 破壊ブロックの選択
				if( blockLine[i] > 0 )
				{
					// 効率の良い場所を選ぶ
					if( breakDx > Math.abs(checkX - (i + 0.5) * blockWidth) )
					{
						breakX = (i + 0.5) * blockWidth;
						breakDx = Math.abs(checkX - breakX);
					}
				}
			}

			// 発射
			if( breakX != -1 && Math.abs(this.getCenterX() - breakX) <= blockWidth*0.5 && weapons.length < weaponMaxNum[this.weapon - 1] && this.weaponInter <= 0 ) {
				weapons[weapons.length] = new Weapon(this.weapon, this.getCenterX());
			}

			// 移動
			if( breakX != -1 && (fallItemX == -1 || (Math.abs(fallItemX - breakX) + Math.abs(breakX - this.getCenterX()) <= (fallItemTime - 3) * moveSpeed)) &&
				(fallBall == null || (Math.abs(fallBall.getCenterX() - breakX) + Math.abs(breakX - this.getCenterX()) <= (fallBallTime - 3) * moveSpeed))
			) {
				// 次の移動に備える（ブロック端に寄る）
				if( Math.abs(breakX - targetX) > blockWidth / 2 ) {
					breakX += (blockWidth * 0.35) * (targetX > breakX ? 1 : -1);
				}

				targetX = breakX;
			}
		}
		//----------武器使用及び移動----------

		// バーの移動
		if( targetX != -1 )
		{
			// バー速度へ変換
			if( fallBallTime > 1 ) { plusSpeed /= barSpin; }
			else { plusSpeed = 0; }

			// 移動
			pointX = targetX - plusSpeed;
		}
	}
}

export default Bar;
