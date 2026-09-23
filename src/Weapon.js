import Balloon from "./Balloon.js";

//--------------------------------------------------
// 武器
//--------------------------------------------------
function Weapon(type, x, y, vect)
{
	this.type = type - 1;							// 武器の種類（0:銃、1：ミサイル）
	this.x = x;										// 横軸座標
	this.y = 0;										// 縦軸座標
	this.vy = 0;									// 縦軸速度
	this.vect = 0;									// 進行方向
	this.size = (this.type == 0 ? 1 : 4);			// サイズ
	this.setInter = 0;								// 発射間隔制御フラグ


	// 縦軸座標の設定
	if( y != null ) { this.y = y; }
	else { this.y = ~~(bar.getTopY()); }

	// 進行方向の設定
	if( vect != null ) { this.vect = vect; }
	else { this.vect = 1; }



	//--------------------------------------------------
	// 上下・左右・中央座標取得
	//--------------------------------------------------
	this.getLeftX = function() {
		return this.x - this.size *0.5;
	}
	this.getCenterX = function() {
		return this.x;
	}
	this.getRightX = function() {
		return this.x + this.size *0.5;
	}

	this.getTopY = function() {
		return this.y - this.size *0.5;
	}
	this.getCenterY = function() {
		return this.y;
	}
	this.getBottomY = function() {
		return this.y + this.size *0.5;
	}


	//--------------------------------------------------
	// 移動
	//--------------------------------------------------
	this.move = function() {
		// 発射間隔の制御
		if( this.setInter == 0 ) {
			// 発射間隔の設定
			bar.weaponInter = 12;

			this.setInter = 1;

			// 発射音
			if( this.type == 0 ) {
				// 銃
				sounds.play('gun');
			} else {
				// ミサイル
				sounds.play('missile');
			}
		}

		// 座標を進める
		this.y -= this.vy * this.vect;

		// 変数の置き換え
		var x = this.x;
		var y = this.y;
		var vy = this.vy;

		// ミサイル風加速モーション
		if( this.vy < weaponSpeed[this.type] ) {
			// ミサイル
			if( this.type == 1 ) {
				this.vy += weaponSpeed[this.type] / (FPS * 0.5);
				if( this.vy > weaponSpeed[this.type] ) { this.vy = weaponSpeed[this.type]; }

			// 銃
			} else {
				this.vy = weaponSpeed[this.type];
			}
		}

		// 画面からアウト
		if( 0 > this.getBottomY() || this.getTopY() > canvasHeight ) { weapons.tarRemove(this); }

		// ブロック衝突判定
		if( this.vect > 0 )
		{
			var collisionFlag = 0;

			// 横方向
			var colDetStartX = ~~( this.getLeftX() / blockWidth );
			var colDetEndX = ~~( this.getRightX() / blockWidth );

			// 縦方向
			var colDetStartY = ~~( (this.getTopY() - statusBarHeight) / blockHeight );
			var colDetEndY = ~~( (this.getBottomY() - statusBarHeight) / blockHeight );

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
							// 接触音
							if( block.func != BLOCK_FUNCTION.EXPLODE && block.func != BLOCK_FUNCTION.EXPLODE_STRENGTH ) { sounds.play('block'); }

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
							weapons.tarRemove(this);

							collisionFlag = 1;
							break;
						}
					}
					if( collisionFlag == 1 ) { break; }
				}
			}
		}
		// バー衝突判定
		else if( 0 > this.vect )
		{
			if( this.getCenterY() + this.size * 6 >= bar.getTopY() && Math.abs(this.getCenterX() - bar.getCenterX()) <= bar.width/2 )
			{
				// バーへのダメージ
				bar.endamage(1);

				// 武器の消去
				weapons.tarRemove(this);

				// バルーンの追加
				balloons[balloons.length] = new Balloon(bar.hitPoint, bar.getCenterX() - 10, bar.getTopY() - 15, 25, 10, 0.13, "#000000", "#ff0000", 12);
			}
		}
	}



	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	this.draw = function(dynamicCtx)
	{
		// 銃
		if( this.type == 0 )
		{
			dynamicCtx.beginPath();
			dynamicCtx.strokeStyle = weaponColor[this.type];
			dynamicCtx.fillStyle = weaponLineColor[this.type];
			dynamicCtx.rect(~~(this.x - this.size) + 0.5, ~~(this.y + this.size) + 0.5, this.size, this.size * 6);
			dynamicCtx.fill();
			dynamicCtx.stroke();

		// ミサイル
		} else if( this.type == 1 )
		{
			// 弾頭
			dynamicCtx.beginPath();
			dynamicCtx.scale(1, 1.4);
			dynamicCtx.strokeStyle = weaponLineColor[this.type];
			dynamicCtx.fillStyle = weaponColor[this.type];
			dynamicCtx.arc(this.x + 0.5, this.y / 1.4 + 0.5, this.size, 0, 2 * Math.PI, false);
			dynamicCtx.fill();
			dynamicCtx.stroke();
			dynamicCtx.scale(1, 1 / 1.4);

			// 胴体
			dynamicCtx.beginPath();
			dynamicCtx.strokeStyle = weaponLineColor[this.type];
			dynamicCtx.fillStyle = weaponColor[this.type];
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

export default Weapon;
