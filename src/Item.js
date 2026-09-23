//--------------------------------------------------
// アイテム
//--------------------------------------------------
function Item(type, x, y, lcolor, color)
{
	this.width = blockWidth;									// アイテムの横幅
	this.height = blockHeight;									// アイテムの縦幅
	this.type = type;											// アイテムの種類
	this.x = x;													// アイテムの横方向位置
	this.y = y;													// アイテムの縦方向位置
	this.color = color;											// アイテムの色
	this.lineColor = lcolor;									// アイテムの線色
	this.text = itemText[ctrl.stageIndex][this.type];			// アイテムの文字
	this.imgData = imgData.getData("item", this.type);			// 描画イメージ


	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	this.draw = function(ctx)
	{
		// アイテムを描画
		ctx.putImageData(this.imgData, ~~this.x - 0.5, ~~this.y - 0.5);
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
	// 移動
	//--------------------------------------------------
	this.move = function()
	{
		var i;
		var ballNum = balls.length;

		// 位置の決定
		this.y += itemSpeed[ctrl.stageIndex];

		// 未取得のまま落下
		if( this.y > canvasHeight ) {
			// アイテムの消去
			items.tarRemove(this);

		// バー接触（アイテム取得）
		} else if( this.getBottomY() > bar.getTopY() && bar.getLeftX() <= this.getRightX() && bar.getRightX() >= this.getLeftX() )
		{
			// アイテム取得数の計算
			scoreMng.awardNum.getItemNum++;

			// 取得音
			if( this.type == 4 || this.type == 6 || this.type == 11 || this.type == 12 ) { sounds.play('minusItem'); }
			else { sounds.play('plusItem'); }

			// 2倍増殖
			if( this.type == 0 ) {
				var diffNum = ballMaxNum - ballNum;
				var len = ballNum > diffNum ? diffNum : ballNum;
				for( i = 0; i < len; i++ ) { balls[balls.length] = balls[i].copy(BALL_COPY_MODE.RAND); }

			// 強化状態
			} else if( this.type == 1 ) {
				// 状態の設定
				for( i = 0; i < ballNum; i++ ) {
					balls[i].status = BALL_STATUS.STRONG;
					balls[i].statusTime = ballStatusTime * FPS;
				}

			// 無敵状態
			} else if( this.type == 2 ) {
				// 状態の設定
				for( i = 0; i < ballNum; i++ ) {
					balls[i].status = BALL_STATUS.ULTIMATE;
					balls[i].statusTime = ballStatusTime * FPS;
				}

			// バー幅伸長
			} else if( this.type == 3 ) {
				// 状態の設定
				bar.width = ~~( bar.width * 1.3 );
				if( bar.width > barMaxWidth ) { bar.width = barMaxWidth; }

				// タイマーのセット
				bar.widthStatusTime = barStatusDefaultTime * FPS;

			// バー幅縮小
			} else if( this.type == 4 ) {
				// 状態の設定
				bar.width = ~~( bar.width * 0.7 );
				if( bar.width < barMinWidth ) { bar.width = barMinWidth; }

				// タイマーのセット
				bar.widthStatusTime = barStatusDefaultTime * FPS;

			// ライフの回復
			} else if( this.type == 5 ) {
				statusMng.addLife(1);

			// ライフの減少
			} else if( this.type == 6 ) {
				statusMng.addLife(-1);

			// ボール速度の増加
			} else if( this.type == 7 ) {
				for( i = 0; i < ballNum; i++ ) {
					balls[i].vx *= 1 + ~~(Math.random() * 30) / 100;
					balls[i].vy *= 1 + ~~(Math.random() * 30) / 100;
				}

			// ボール速度の減少
			} else if( this.type == 8 ) {
				for( i = 0; i < ballNum; i++ ) {
					balls[i].vx *= 1 - ~~(Math.random() * 30) / 100;
					balls[i].vy *= 1 - ~~(Math.random() * 30) / 100;
				}

			// バーに銃を設定
			} else if( this.type == 9 ) {
				// 状態の設定
				bar.weapon = 1;

				// タイマーのセット
				bar.weaponTime = barWeaponDefaultTime * FPS;

			// バーにミサイルを設定
			} else if( this.type == 10 ) {
				// 状態の設定
				bar.weapon = 2;

				// タイマーのセット
				bar.weaponTime = barWeaponDefaultTime * FPS;

			// バー移動速度の鈍化
			} else if( this.type == 11 ) {
				// 状態の設定
				bar.vxMax -= ~~(Math.abs(bar.vxMax - barMinSpeed) * 0.8);
				if( bar.vxMax < barMinSpeed ) { bar.vxMax = barMinSpeed; }

				// タイマーのセット
				bar.speedStatusTime = barStatusDefaultTime * FPS;

			// バーの振動
			} else if( this.type == 12 ) {
				bar.vibrationTime = barStatusDefaultTime * FPS;

			// バーの吸着状態化
			} else if( this.type == 13 ) {
				// タイマーのセット
				bar.absorptionStatusTime = barStatusDefaultTime * FPS*1.1;

			// 不死身状態化
			} else if( this.type == 14 ) {

				// タイマーのセット
				bar.immortalStatusTime = barStatusDefaultTime * FPS;

				// 色の設定
				bar.color = barImmortalColor;

			// 画面の難視化
			} else if( this.type == 15 ) {
				// タイマーのセット
				bar.disturbStatusTime = barStatusDefaultTime * FPS;
			}

			// アイテムの消去
			items.tarRemove(this);
		}
	}
}

export default Item;
