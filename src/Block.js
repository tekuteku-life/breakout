// src/Block.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import {
	BALL_STATUS,
	BLOCK_FUNCTION,
	BLOCK_PARAM,
	DEFAULT_CONFIG,
} from "./const.js";
import EventBus from "./EventBus.js";

//--------------------------------------------------
// ブロック
//--------------------------------------------------
export default class Block
{
	constructor(x, y, type, func, life, infinit, through, game = null)
	{
		this.game = game;
		const blkWidth = (this.game && this.game.blockWidth) || DEFAULT_CONFIG.blockWidth;
		const blkHeight = (this.game && this.game.blockHeight) || DEFAULT_CONFIG.blockHeight;
		const sBarHeight = this.getStatusBarHeight();
		const fps = (this.game && this.game.FPS) || DEFAULT_CONFIG.FPS;
		const bMoveInter = (this.game && this.game.blockMoveInter !== undefined) ? this.game.blockMoveInter : DEFAULT_CONFIG.blockMoveInter;
		const bBlinkInter = (this.game && this.game.blockBlinkInter !== undefined) ? this.game.blockBlinkInter : DEFAULT_CONFIG.blockBlinkInter;
		const bAttackInter = (this.game && this.game.blockAttackInter !== undefined) ? this.game.blockAttackInter : DEFAULT_CONFIG.blockAttackInter;
		const imgSource = (this.game && this.game.imgData) ? this.game.imgData : null;

		this.width = blkWidth;									// ブロックの横幅
		this.height = blkHeight;								// ブロックの縦幅
		this.col = x;											// マップ列インデックス
		this.row = y;											// マップ行インデックス
		this.x = x * this.width;								// ブロックの横軸座標
		this.y = y * this.height + sBarHeight;					// ブロックの縦軸座標
		this.type = type;										// ブロックの種類
		this.func = (func !== undefined && func !== null) ? Number(func) : 0; // ブロックの機能
		this.text = null;										// ブロックの文字
		this.infinit = (infinit !== undefined && infinit !== null) ? Number(infinit) : 0; // 破壊の可否
		this.life = (life !== undefined && life !== null) ? Number(life) : 0; // 残り衝突可能回数
		this.item = null;										// アイテム
		this.simulate = 0;										// シミュレート用
		this.breakLimit = 0;									// 破壊制限時間
		this.moveInter = 0;										// 移動間隔
		this.moveVect = 0;										// 移動方向（0:右、1：左）
		this.blinkInter = 0;									// 点滅用カウント
		this.blinkSwitch = 0;									// 点灯・消灯の判別（-1:消灯、1:点灯、0:停止）
		this.blinkType = 0;										// 種類保持用変数
		this.throughVect = (through !== undefined && through !== null) ? Number(through) : 0; // 透過方向（0：なし、1～4：上、右、下、左）
		this.attackInter = 0;									// 攻撃間隔
		this.imgData = (imgSource && typeof imgSource.getData === 'function') ? imgSource.getData("block", type) : null;	// 描画イメージ

		// 移動ブロックの設定
		if( this.func == BLOCK_FUNCTION.VERTICAL_MOVE )
		{
			this.moveInter = Math.random() * bMoveInter * fps;
			this.moveVect = (~~(Math.random() * 2) * 2 - 1);
		}
		// 点滅ブロックの設定
		else if( this.func == BLOCK_FUNCTION.BLINK )
		{
			this.blinkInter = Math.random() * bBlinkInter * fps;
			this.blinkSwitch = (~~(Math.random() * 2) * 2 - 1);
			this.blinkType = this.type;
		}
		// 攻撃ブロックの設定
		else if( this.func == BLOCK_FUNCTION.ATTACK )
		{
			this.attackInter = Math.random() * bAttackInter * fps;
		}
	}

	destructor()
	{
		const ctx = this.getStaticCtx();
		if (ctx) { this.clear(ctx); }
		this.item = null;
		this.imgData = null;
		this.game = null;
	}

	getStaticCtx() {
		return (this.game && this.game.staticCtx) || null;
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
	getEventBus()
	{
		return (this.game && this.game.eventBus) || EventBus;
	}

	//--------------------------------------------------
	// コピー / クローン
	//--------------------------------------------------
	copy(newGame = this.game)
	{
		return this.clone(newGame);
	}

	clone(newGame = this.game)
	{
		const obj = new Block(
			this.col !== undefined ? this.col : this.x / this.width,
			this.row !== undefined ? this.row : (this.y - this.getStatusBarHeight()) / this.height,
			this.type,
			this.func,
			this.life,
			this.infinit,
			this.throughVect,
			newGame
		);
		obj.x = this.x;
		obj.y = this.y;
		obj.width = this.width;
		obj.height = this.height;
		obj.item = this.item;
		obj.simulate = this.simulate;
		obj.breakLimit = this.breakLimit;
		obj.moveInter = this.moveInter;
		obj.moveVect = this.moveVect;
		obj.blinkInter = this.blinkInter;
		obj.blinkSwitch = this.blinkSwitch;
		obj.blinkType = this.blinkType;
		obj.attackInter = this.attackInter;
		obj.text = this.text;

		return obj;
	}


	//--------------------------------------------------
	// 上下・左右・中央座標取得
	//--------------------------------------------------
	getLeftX() {
		return this.x;
	}
	getCenterX() {
		return this.x + this.width *0.5;
	}
	getRightX() {
		return this.x + this.width;
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
	// 描画
	//--------------------------------------------------
	draw(ctx)
	{
		const blockLife = (this.game && this.game.blockLife) || [];

		// 削除
		this.clear(ctx);

		// 画像の描画
		if (this.imgData) {
			ctx.putImageData(this.imgData, this.x, this.y);
		}

		// 文字の描画
		if( this.text != null )
		{
			ctx.fillStyle = '#ffffff';
			ctx.font = '10px bolder sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText(this.text, this.getCenterX(), this.getCenterY() + 4);
		}

		// 耐久性を透過率で表現（ダメージを受けた場合に白オーバーレイを描画）
		if( blockLife[this.type] !== undefined && this.life < blockLife[this.type] )
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
	clear(ctx)
	{
		if (ctx) ctx.clearRect(this.x - 0.5, this.y - 0.5, this.width, this.height);
	}


	//--------------------------------------------------
	//--------------------------------------------------
	// 状態・カウントダウン更新（見た目・耐久度）
	//--------------------------------------------------
	updateState(hasBalls = true)
	{
		const fps = (this.game && this.game.FPS !== undefined) ? this.game.FPS : DEFAULT_CONFIG.FPS;
		const blockLife = (this.game && this.game.blockLife) || [];
		const staticCtx = this.getStaticCtx();

		// 爆発モーションのカウントダウン
		if( this.exploded > 0 ) { this.exploded--; }

		// カウントダウン文字の表示
		if( this.breakLimit > 0 )
		{
			// カウントダウンのリセット
			if( !hasBalls ) { this.breakLimit = 1; }

			// 残り時間の計算
			const countDownTime = ~~(this.breakLimit / fps * 10) / 10;

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
			if (staticCtx) { this.draw(staticCtx); }
		}

		// 攻撃・点滅の更新
		this.updateAttack(hasBalls);
		this.updateBlink();
	}

	//--------------------------------------------------
	// 移動処理（横移動ブロック）
	//--------------------------------------------------
	movePosition(blockMapParam = null)
	{
		if( this.type == 0 || this.func !== BLOCK_FUNCTION.VERTICAL_MOVE ) { return; }

		const fps = (this.game && this.game.FPS !== undefined) ? this.game.FPS : DEFAULT_CONFIG.FPS;
		const blockMoveInter = (this.game && this.game.blockMoveInter !== undefined) ? this.game.blockMoveInter : DEFAULT_CONFIG.blockMoveInter;
		const blockMap = blockMapParam || (this.game && this.game.objectManage && this.game.objectManage.blockMap) || [];
		const canvasWidth = this.getCanvasWidth();
		const statusBarHeight = this.getStatusBarHeight();
		const staticCtx = this.getStaticCtx();

		this.moveInter--;

		if( this.moveInter <= 0 )
		{
			const i = Math.round((this.getTopY() - statusBarHeight) / this.height);
			const j = Math.round(this.getLeftX() / this.width);
			let forBlock = (blockMap && blockMap[i]) ? blockMap[i][j + this.moveVect] : null;

			// 移動
			if( blockMap && blockMap[i] && (!forBlock || forBlock.type == 0) && (j + this.moveVect) < canvasWidth / this.width && j + this.moveVect >= 0 )
			{
				// 描画を消去
				if (staticCtx) { this.clear(staticCtx); }

				// 移動
				blockMap[i][j + this.moveVect] = this.copy();
				forBlock = blockMap[i][j + this.moveVect];
				forBlock.x += this.width * this.moveVect;
				forBlock.moveInter = blockMoveInter * fps + (this.moveVect == 1 ? 1 : 0);

				// 再描画
				if (staticCtx) { forBlock.draw(staticCtx); }

				// 無効化
				this.type = 0;

			// 反転
			} else {
				this.moveVect *= -1;
			}
		}
	}

	//--------------------------------------------------
	// 攻撃処理（攻撃ブロックの弾発射通知）
	//--------------------------------------------------
	updateAttack(hasBalls = true)
	{
		if( this.type == 0 || this.func !== BLOCK_FUNCTION.ATTACK ) { return; }
		if( !hasBalls ) { return; }

		const fps = (this.game && this.game.FPS !== undefined) ? this.game.FPS : DEFAULT_CONFIG.FPS;
		const blockAttackInter = (this.game && this.game.blockAttackInter !== undefined) ? this.game.blockAttackInter : DEFAULT_CONFIG.blockAttackInter;

		// 経過時間のカウント
		this.attackInter--;

		// 攻撃
		if( this.attackInter <= 0 )
		{
			// タイマーのリセット
			this.attackInter = blockAttackInter * fps * (Math.random() * 0.2 + 0.8);

			// 武器の発射（EventBus経由で通知）
			this.getEventBus().emitEvent('weapon:spawn', {
				type: 1,
				x: this.getCenterX(),
				y: this.getBottomY() + 1,
				vect: -1
			});
		}
	}

	//--------------------------------------------------
	// 点滅処理（点滅ブロックの表示・非表示切り替え）
	//--------------------------------------------------
	updateBlink()
	{
		if( this.func !== BLOCK_FUNCTION.BLINK || this.blinkSwitch === 0 ) { return; }

		const fps = (this.game && this.game.FPS !== undefined) ? this.game.FPS : DEFAULT_CONFIG.FPS;
		const blockBlinkInter = (this.game && this.game.blockBlinkInter !== undefined) ? this.game.blockBlinkInter : DEFAULT_CONFIG.blockBlinkInter;
		const staticCtx = this.getStaticCtx();

		// 経過時間のカウント
		this.blinkInter--;

		if( this.blinkInter <= 0 ) {
			// カウントの初期化
			this.blinkInter = blockBlinkInter * fps * (0.7 + Math.random() * 0.3);

			// スイッチの反転
			this.blinkSwitch *= -1;

			// 消灯・点灯の切り替え
			if( this.blinkSwitch == -1 )
			{
				this.type = 0;
				if (staticCtx) { this.clear(staticCtx); }
			} else
			{
				this.type = this.blinkType;
				if (staticCtx) { this.draw(staticCtx); }
			}
		}
	}




	//--------------------------------------------------
	// 引力・斥力の適用
	//--------------------------------------------------
	applyMagneticForce(ball)
	{
		if (!ball) { return; }
		if (this.type === 0) { return; }
		if (this.func !== BLOCK_FUNCTION.MAGNET && this.func !== BLOCK_FUNCTION.REPULL) { return; }

		const blockDrawingDistance = (this.game && this.game.blockDrawingDistance !== undefined) ? this.game.blockDrawingDistance : DEFAULT_CONFIG.blockDrawingDistance;
		const ballDefaultSpeed = (this.game && this.game.ballDefaultSpeed !== undefined) ? this.game.ballDefaultSpeed : DEFAULT_CONFIG.ballDefaultSpeed;

		const powVect = (this.func === BLOCK_FUNCTION.MAGNET) ? -1 : 1;

		// 相対座標の取得
		const relX = ball.getCenterX() - this.getCenterX();
		const relY = ball.getCenterY() - this.getCenterY();

		// 引力影響範囲内の球のみ対象
		const dist = Math.sqrt(Math.pow(relX, 2) + Math.pow(relY, 2));
		if( dist <= blockDrawingDistance ) {
			// 加速度の計算
			const acceleration = ballDefaultSpeed * BLOCK_PARAM.MAGNET_ACCEL_BASE / Math.pow(dist, BLOCK_PARAM.MAGNET_DIST_POW);

			// 横方向の球速の変更
			ball.vx += acceleration * BLOCK_PARAM.MAGNET_VX_RATIO * (relX < 0 ? -1 : 1) * powVect;
			if( Math.abs(ball.vx) <= ballDefaultSpeed * 0.1 ) { ball.vx = ballDefaultSpeed * 0.1 * (ball.vx >= 0 ? 1 : -1); }

			// 縦方向の球速の変更
			if( ball.vy * relY < 0 ) {
				ball.vy += acceleration * BLOCK_PARAM.MAGNET_VY_REL_NEG_RATIO * (relY < 0 ? -1 : 1) * powVect;
			} else {
				ball.vy += acceleration * BLOCK_PARAM.MAGNET_VY_REL_POS_RATIO * (relY < 0 ? -1 : 1) * powVect;
			}
		}
	}


	//--------------------------------------------------
	// アクション
	//--------------------------------------------------
	action(ball, isChangedVY, blockMapParam = null)
	{
		var addSpeed = 0;
		const blockMap = blockMapParam || (this.game && this.game.objectManage && this.game.objectManage.blockMap) || [];
		const canvasWidth = this.getCanvasWidth();
		const canvasHeight = this.getCanvasHeight();
		const statusBarHeight = this.getStatusBarHeight();

		const fps = (this.game && this.game.FPS !== undefined) ? this.game.FPS : DEFAULT_CONFIG.FPS;
		const blockMotionTime = (this.game && this.game.blockMotionTime !== undefined) ? this.game.blockMotionTime : DEFAULT_CONFIG.blockMotionTime;
		const blockDefaultPoint = (this.game && this.game.blockDefaultPoint !== undefined) ? this.game.blockDefaultPoint : DEFAULT_CONFIG.blockDefaultPoint;
		const ballStatusTime = (this.game && this.game.ballStatusTime !== undefined) ? this.game.ballStatusTime : DEFAULT_CONFIG.ballStatusTime;
		const ballDefaultSpeed = (this.game && this.game.ballDefaultSpeed !== undefined) ? this.game.ballDefaultSpeed : DEFAULT_CONFIG.ballDefaultSpeed;
		const ballMaxSpeed = (this.game && this.game.ballMaxSpeed !== undefined) ? this.game.ballMaxSpeed : DEFAULT_CONFIG.ballMaxSpeed;
		const ballSize = (this.game && this.game.ballSize !== undefined) ? this.game.ballSize : DEFAULT_CONFIG.ballSize;
		const blockIncrPoint = (this.game && this.game.blockIncrPoint !== undefined) ? this.game.blockIncrPoint : DEFAULT_CONFIG.blockIncrPoint;
		const blockBreakLimit = (this.game && this.game.blockBreakLimit) || [];
		const ballInfBoundCancel = (this.game && this.game.ballInfBoundCancel !== undefined) ? this.game.ballInfBoundCancel : DEFAULT_CONFIG.ballInfBoundCancel;

		// 接触音（EventBus経由で通知）
		if( ball != null && ball.simulate == 0 )
		{
			// ワープブロック
			if( this.func == BLOCK_FUNCTION.WARP_ENTER ) {
				this.getEventBus().emitEvent('sound:play', 'warp');

			// 通常ブロック
			} else if( this.func != BLOCK_FUNCTION.NORMAL && this.func != BLOCK_FUNCTION.EXPLODE_STRENGTH ) {
				if( ball.status == BALL_STATUS.NORMAL ) {
					this.getEventBus().emitEvent('sound:play', 'block');
				} else {
					this.getEventBus().emitEvent('sound:play', 'spBlock');
				}
			}
		}

		// 武器による破壊
		if( ball == null )
		{
			// ワープブロックは破壊不可
			if( this.func != BLOCK_FUNCTION.WARP_ENTER && this.func != BLOCK_FUNCTION.WARP_EXIT )
			{
				// 爆発モーションのセット
				this.exploded = blockMotionTime * fps;

				// ブロックの削除
				this.break(null);

				// ポイントの付与（EventBus経由で通知）
				this.getEventBus().emitEvent('score:add', blockDefaultPoint);
			}

			return;
		}

		// 爆発
		if( this.func == BLOCK_FUNCTION.EXPLODE || this.func == BLOCK_FUNCTION.EXPLODE_STRENGTH )
		{
			// シミュレートの確認
			if( !ball || !ball.simulate ) {
				// 爆発モーションのセット
				this.exploded = blockMotionTime * fps;
			}

			// 短期間の貫通弾化
			if( this.func == BLOCK_FUNCTION.EXPLODE_STRENGTH ) {
				if( ball ) {
					if (typeof ball.setStatus === 'function') {
						ball.setStatus(BALL_STATUS.ULTIMATE, ballStatusTime * 0.3);
					} else {
						ball.status = BALL_STATUS.ULTIMATE;
						ball.statusTime = ~~(ballStatusTime * 0.3 * fps);
					}
				}
			}

			// 周りのブロックを破壊
			this.explode(this.getLeftX() / this.width, (this.getTopY() - statusBarHeight) / this.height, 1, ball, blockMap);

			// 爆発による速度の増加
			addSpeed = ballDefaultSpeed;

		// 強化球
		} else if( ball && ball.status == BALL_STATUS.STRONG && this.func != BLOCK_FUNCTION.WARP_ENTER ) {
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
		if( (this.infinit != 1 || (ball && ball.status == BALL_STATUS.ULTIMATE)) && this.func != BLOCK_FUNCTION.WARP_ENTER && this.func != BLOCK_FUNCTION.WARP_EXIT )
		{
			// 衝突回数の計算
			if( ball ) { ball.collisionNum++; }

			// シミュレートでない場合
			if( !ball || ball.simulate == 0 ) {
				// 破壊
				if( this.life < 1 || !ball || ball.status != BALL_STATUS.NORMAL ) {
					this.break(ball);

				// 耐久性減少
				} else {
					this.decreaseLife();
				}

				// ポイント計算（EventBus経由で通知）
				if( ball ) {
					this.getEventBus().emitEvent('score:add', ball.pointIncr);
					ball.pointIncr = Number(ball.pointIncr) + blockIncrPoint;

					// 連続破壊数の通知（EventBus経由で通知）
					let bx = ball.getCenterX();
					let by = ball.getCenterY();
					if( bx > canvasWidth - 30 ) { bx = canvasWidth - 30; }
					if( by > canvasHeight - 15 ) { by = canvasHeight - 15; }
					this.getEventBus().emitEvent('award:continuousBreak', {
						breakNum: ball.breakNum,
						x: bx,
						y: by,
					});
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
			this.getEventBus().emitEvent('score:add', ball.pointIncr);
			ball.pointIncr = Number(ball.pointIncr) + ~~(blockIncrPoint / 2);
		}

		// 無限ループ回避
		var duaration = ball.duaration;
		if( this.infinit == 1 || (blockBreakLimit[this.type] && blockBreakLimit[this.type] > 0) )
		{
			// 固定ブロック衝突回数の増加
			ball.duaration++;
			duaration = ball.duaration;

			// 無限ループ回避
			if( ballInfBoundCancel == 1 && duaration > BLOCK_PARAM.MAX_DUARATION_LIMIT )
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
	break(ball)
	{
		// 既に破壊済みの場合は重複実行しない
		if (this.type === 0 && (!ball || ball.simulate !== 1)) {
			return;
		}

		// シミュレートの場合
		if( ball != null && ball.simulate == 1 ) {
			// 破壊処理
			this.simulate = 0;
		}
		// シミュレートでない場合
		else
		{
			const staticCtx = this.getStaticCtx();

			// 破壊処理
			this.type = 0;
			this.breakLimit = 0;

			// 描画の削除
			if (staticCtx) { this.clear(staticCtx); }

			// 点滅の停止
			this.blinkSwitch = 0;

			// ブロック数の減少（EventBus経由で通知）
			if( this.infinit == 0 ) {
				this.getEventBus().emitEvent('status:blockBreak');
			}

			// アイテム出現（EventBus経由で通知）
			if( this.item != null ) {
				this.getEventBus().emitEvent('item:spawn', {
					type: this.item,
					x: this.getLeftX(),
					y: this.getTopY(),
				});
			}
		}

		// 破壊回数の計算
		if( ball != null ) { ball.breakNum++; }
	}


	//--------------------------------------------------
	// 耐久性の減少
	//--------------------------------------------------
	decreaseLife()
	{
		const staticCtx = this.getStaticCtx();
		const fps = (this.game && this.game.FPS) || DEFAULT_CONFIG.FPS;
		const blockBreakLimit = (this.game && this.game.blockBreakLimit) || [];

		// 耐久性の減少
		this.life--;

		// 描画
		if (staticCtx) { this.draw(staticCtx); }

		// 制限時間のセット
		if( blockBreakLimit[this.type] > 0 ) { this.breakLimit = blockBreakLimit[this.type] * fps; }
	}


	//--------------------------------------------------
	// 爆弾による巻き込み破壊
	//--------------------------------------------------
	explode(x, y, area, ball, blockMapParam = null)
	{
		const blockMap = blockMapParam || (this.game && this.game.objectManage && this.game.objectManage.blockMap) || [];
		const fps = (this.game && this.game.FPS !== undefined) ? this.game.FPS : DEFAULT_CONFIG.FPS;
		const blockMotionTime = (this.game && this.game.blockMotionTime !== undefined) ? this.game.blockMotionTime : DEFAULT_CONFIG.blockMotionTime;
		const blockDefaultPoint = (this.game && this.game.blockDefaultPoint !== undefined) ? this.game.blockDefaultPoint : DEFAULT_CONFIG.blockDefaultPoint;
		const blockIncrPoint = (this.game && this.game.blockIncrPoint !== undefined) ? this.game.blockIncrPoint : DEFAULT_CONFIG.blockIncrPoint;

		for(var i = -area + y; i <= area + y; i++)
		{
			if( blockMap[i] != null ) {
				for(var j = -area + x; j <= area + x; j++) {
					var block = blockMap[i][j];

					// 破壊可能ブロックのみ対象
					if( block != null && block != this && ( ( (!ball || ball.simulate == 0) && block.type != 0 ) || ( (ball && ball.simulate != 0) && block.simulate != 0 ) ) && block.infinit != 1 )
					{
						// 燃料・爆薬引火
						if( block.func == BLOCK_FUNCTION.FUEL || block.func == BLOCK_FUNCTION.EXPLODE || block.func == BLOCK_FUNCTION.EXPLODE_STRENGTH )
						{
							// シミュレートでない場合
							if( !ball || ball.simulate == 0 )
							{
								// 爆発モーションのセット
								block.exploded = ~~(blockMotionTime * fps);
							}

							// 破壊処理
							block.break(ball);

							// さらに巻き込み破壊
							this.explode(j, i, 1, ball, blockMap);

						// 通常
						} else {
							block.break(ball);
						}

						// シミュレートでない場合
						if( !ball || ball.simulate == 0 ) {
							// 爆発音（EventBus経由で通知）
							this.getEventBus().emitEvent('sound:play', 'bomb');

							// ポイント計算（EventBus経由で通知）
							this.getEventBus().emitEvent('score:add', ~~(blockDefaultPoint * 1.5));
							if( ball ) { ball.pointIncr += ~~(blockIncrPoint / 2); }
						}
					}
				}
			}
		}
	}


	//--------------------------------------------------
	// シミュレート値のリセット
	//--------------------------------------------------
	simulateReset()
	{
		if( this.type ) { this.simulate = this.life + 1; }
		else { this.simulate = 0; }
	}
}

