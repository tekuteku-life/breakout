// src/AutoPlay.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import {
	BALL_COPY_MODE,
	SIMULATE_PARAM,
	DEFAULT_CONFIG,
	BAR_PARAM,
	WEAPON_PARAM,
	ITEM_PARAM,
} from "./const.js";
import EventBus from "./EventBus.js";

//--------------------------------------------------
// 自動プレイ（オートパイロット制御）
//--------------------------------------------------
export default class AutoPlay
{
	constructor(game = null)
	{
		this.game = game;
		this.simuData = new Array();							// シミュレーションの引き継ぎ情報
	}

	destructor()
	{
		this.simuData = null;
		this.game = null;
	}

	getObjectManage() {
		return (this.game && this.game.objectManage) || null;
	}

	getBar() {
		const om = this.getObjectManage();
		return om ? om.bar : null;
	}

	getBalls() {
		const om = this.getObjectManage();
		return om ? om.balls : [];
	}

	getItems() {
		const om = this.getObjectManage();
		return om ? om.items : [];
	}

	getWeapons() {
		const om = this.getObjectManage();
		return om ? om.weapons : [];
	}

	getBlockMap() {
		const om = this.getObjectManage();
		return om ? om.blockMap : [];
	}

	getCtrl() {
		return (this.game && this.game.ctrl) || null;
	}

	getCanvasWidth() {
		return (this.game && this.game.canvasWidth) || DEFAULT_CONFIG.canvasWidth;
	}

	//--------------------------------------------------
	// 自動プレイの1ステップ実行
	//--------------------------------------------------
	step()
	{
		const bar = this.getBar();
		if (!bar) return;

		const fps = (this.game && this.game.FPS) || DEFAULT_CONFIG.FPS;
		const canvasWidth = this.getCanvasWidth();
		const bDefaultSpeed = (this.game && this.game.ballDefaultSpeed) || DEFAULT_CONFIG.ballDefaultSpeed;
		const bMaxSpeed = (this.game && this.game.ballMaxSpeed) || DEFAULT_CONFIG.ballMaxSpeed;
		const bDefaultSpeedBar = (this.game && this.game.barDefaultSpeed) || DEFAULT_CONFIG.barDefaultSpeed;
		const bSpin = (this.game && this.game.barSpin !== undefined) ? this.game.barSpin : ((bar && bar.spin !== undefined) ? bar.spin : BAR_PARAM.SPIN_RATIO);
		const blkWidth = (this.game && this.game.blockWidth) || DEFAULT_CONFIG.blockWidth;
		const bSize = (this.game && this.game.ballSize) || DEFAULT_CONFIG.ballSize;
		const weaponMaxNum = (this.game && this.game.weaponMaxNum) || WEAPON_PARAM.MAX_NUM;
		const itemSpeed = (this.game && this.game.itemSpeed) || ITEM_PARAM.DEFAULT_SPEED;
		const itemProb = (this.game && this.game.itemProb) || [];

		const balls = this.getBalls();
		const items = this.getItems();
		const weapons = this.getWeapons();
		const blockMap = this.getBlockMap();
		const ctrl = this.getCtrl();

		// 最大予測数の計算
		var MAX_PREDICT = SIMULATE_PARAM.MAX_PREDICT * fps;

		var targetX = -1;
		var fallBall = null;
		var fallBallI;
		var fallBallTime = MAX_PREDICT;
		var fallItemTime = MAX_PREDICT;
		var fallItemX = -1;
		var fallWeaponTime = MAX_PREDICT;
		var plusSpeed = 0;
		var ballNum = balls.length;
		var moveSpeed = bar.vxMax;

		//----------発射制御及び初期化----------
		if( ballNum == 0 )
		{
			// スタート画面の終了
			EventBus.emitEvent('screen:allClose');

			// 初期位置及び初速度の決定
			bar.x = ~~( canvasWidth / 2 * (1 + (~~(Math.random() * 2) * 2 - 1) * Math.random()) );
			bar.vx = bDefaultSpeed * (Math.random() * 0.5 + 0.8) * (~~(Math.random() * 2) * 2 - 1);

			// 球発射
			const mdTime = Date.now() - 1000;
			EventBus.emitEvent('input:setMouseDownTime', mdTime);
			EventBus.emitEvent('ball:launch', { mouseDownTime: mdTime });
			ballNum = balls.length;
		}
		//----------発射制御及び初期化----------

		// 吸着状態解除
		if( bar.absorptionNum > 0 )
		{
			for( var i = 0; i < bar.absorptionNum; i++ ) {
				bar.relaunch();
			}
		}

		//----------落下が近い球の選択----------
		var fallSimulate = new Array();
		for( var i = 0; i < ballNum; i++ ) { fallSimulate[i] = balls[i].copy(BALL_COPY_MODE.SIMULATE); }

		// ボールの動きのシミュレート（EventBus経由で通知）
		EventBus.emitEvent('game:simulateReset');

		for( var t = 0; t < fallBallTime; t++ )
		{
			for( var i = 0; i < ballNum; i++ )
			{
				var ball = fallSimulate[i];

				// 選択
				if( ball.vy > 0 && ball.getBottomY() >= bar.y )
				{
					// 到達可能範囲内
					if( Math.abs( bar.getCenterX() - ball.getCenterX() ) - bar.width / 2 <= moveSpeed * t )
					{
						fallBall = ball;
						fallBallTime = t;
						fallBallI = i;
						break;
					}

				// 実行
				} else {
					this.simulateBallStep(ball);
				}
			}
		}
		//----------落下が近い球の選択----------

		//----------落下が近いアイテムの選択----------
		const stageIdx = ctrl ? ctrl.stageIndex : 0;
		const curItemSpeed = (itemSpeed && itemSpeed[stageIdx] !== undefined) ? itemSpeed[stageIdx] : 4;

		for( var i = 0, len = items.length; i < len; i++ )
		{
			var item = items[i];

			// 一番落下が近いアイテムを選択
			var tmpFallItemTime = (bar.y - item.getBottomY()) / curItemSpeed;
			if( fallItemTime > tmpFallItemTime && (Math.abs(bar.getCenterX() - item.getCenterX()) - (blkWidth + bar.width) / 2) / moveSpeed <= fallItemTime )
			{
				// 落下時刻の取得
				fallItemTime = tmpFallItemTime;

				// アイテム落下位置の決定
				fallItemX = item.getCenterX();
				targetX = fallItemX;

				// 不利益アイテムの接近
				const hasProb = itemProb[stageIdx] && itemProb[stageIdx][5] > 0.1;
				if( item.type == 4 || item.type == 6 || item.type == 11 || item.type == 12 || item.type == 15 || ( hasProb && item.type == 3 ) )
				{
					// 衝突回避（アイテム接近）
					if( fallItemTime * moveSpeed <= (blkWidth + bar.width) * 2 && Math.abs(targetX - bar.getCenterX()) <= (blkWidth + bar.width) / 2 + 2 )
					{
						// 左へ回避
						if( ( bar.width < item.getLeftX() && item.getLeftX() > bar.getCenterX() ) || canvasWidth <= item.getRightX() + bar.width ) {
							targetX -= (bar.width + blkWidth) / 2 + 1;

						// 右へ回避
						} else {
							targetX += (bar.width + blkWidth) / 2 + 1;
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
			if( weapon.vect < 0 && (bar.y - weapon.y) / (weapon.vy || 1) < fallWeaponTime && Math.abs(weapon.x - bar.getCenterX()) <= bar.width/2 + 3 )
			{
				// 落下時間の更新
				fallWeaponTime = (bar.y - weapon.y) / (weapon.vy || 1);

				// ボール側に移動
				if( fallBall && ((fallBall.getCenterX() > weapon.x && weapon.x + bar.width + 3 <= canvasWidth) || (weapon.x - bar.width - 3 < 0)) ) {
					targetX = weapon.x + bar.width/2 + 3;
				} else {
					targetX = weapon.x - bar.width/2 - 3;
				}
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
				if( Math.abs( fallBall.getCenterX() - targetX ) > (blkWidth + bar.width) / 2 )
				{
					// 球が左側
					if( item && item.getCenterX() > fallBall.getCenterX() ) { targetX -= (blkWidth + bar.width) / 2 - 1; }

					// 球が右側
					else { targetX += (blkWidth + bar.width) / 2 - 1; }

				// 球と十分に近い場合
				} else {
					fallItemTime = MAX_PREDICT;
				}
			}

			// 一時変数へ落とす
			var fallBallX = fallBall.getCenterX();
			var fallBallVX = fallBall.vx;
			var sim = this.simuData;
			var fb = (sim && sim["self"]) || (fallBall && typeof fallBall.copy === 'function' ? fallBall : null);

			// シミュレート情報の更新
			if( sim == null || sim["x"] != fallBallX || sim["vx"] != fallBallVX || sim["status"] != fallBall.status || sim["statusTime"] != fallBall.statusTime )
			{
				// 補正最大速度の算出
				var leftSpeed = (fallBallX - canvasWidth - bar.width / 2) * bSpin;
				var rightSpeed = (fallBallX - bar.width / 2) * bSpin;
				if( Math.abs( leftSpeed + fallBallVX ) > bMaxSpeed ) { leftSpeed = bMaxSpeed * ( leftSpeed < 0 ? -1 : 1 ) - fallBallVX; }
				if( Math.abs( rightSpeed + fallBallVX ) > bMaxSpeed ) { rightSpeed = bMaxSpeed * ( rightSpeed < 0 ? -1 : 1 ) - fallBallVX; }
				if( Math.abs( leftSpeed ) > moveSpeed * bSpin ) { leftSpeed = moveSpeed * bSpin * ( leftSpeed < 0 ? -1 : 1 ); }
				if( Math.abs( rightSpeed ) > moveSpeed * bSpin ) { rightSpeed = moveSpeed * bSpin * ( rightSpeed < 0 ? -1 : 1 ); }
				if( leftSpeed > rightSpeed ) {
					var tmp = leftSpeed;
					leftSpeed = rightSpeed;
					rightSpeed = tmp;
				}

				// 落下球情報の加工
				fallBall.vy *= -1;
				fallBall.y = bar.getTopY() - bSize;
				fallBall.breakNum = 0;
				fallBall.collisionNum = 0;

				// 情報の更新
				sim["stDvx"] = leftSpeed;
				sim["enDvx"] = rightSpeed;
				sim["x"] = fallBallX;
				sim["vx"] = fallBallVX;
				sim["status"] = fallBall.status;
				sim["statusTime"] = fallBall.statusTime;
				sim["self"] = fallBall.copy(BALL_COPY_MODE.SIMULATE);
				fb = sim["self"];
				sim["breakMaxNum"] = 0;
				sim["collisionMaxNum"] = 0;
				sim["returnTime"] = MAX_PREDICT;
				sim["dvx"] = 0;
				sim["step"] = bMaxSpeed * 2 / SIMULATE_PARAM.RESOLUTION;

				// シミュレート時間の短縮（落下までに間に合う回数にする）
				if( fallBallTime < (SIMULATE_PARAM.RESOLUTION / SIMULATE_PARAM.TIMES_PER_STEP)*0.9 ) { sim["step"] = bMaxSpeed * 2 / (fallBallTime - 2); }

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
				fb = sim["self"] || fb;

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
						if( fallBallI == i ) { simulate[i] = fb.copy(BALL_COPY_MODE.SIMULATE); }

						// その他
						else { simulate[i] = fallSimulate[i].copy(BALL_COPY_MODE.SIMULATE); }
					}
					simulate[fallBallI].vx += dvx;

					// ボールの動きのシミュレート（EventBus経由で通知）
					EventBus.emitEvent('game:simulateReset');

					var t;
					for( t = 0; simulate[fallBallI].getBottomY() <= bar.getTopY() && t <= MAX_PREDICT; t++ )
					{
						for( var i = 0; i < ballNum; i++ ) {
							var ball = simulate[i];
							if( ball.getBottomY() <= bar.getTopY() ) { this.simulateBallStep(ball); }
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
			if( fallBallTime <= 2 && sim["breakMaxNum"] == 0 && (sim["collisionMaxNum"] || 0) == 0 && Math.random() > 0.3 && fb && typeof fb.copy === 'function' )
			{
				var dx = canvasWidth;
				plusSpeed = bDefaultSpeed * ( 0.8 + Math.random() * 0.4 ) * ( ~~(Math.random() * 2) * 2 - 1 ) - fallBallVX;

				// 位置・速度を変更
				for( var x = 0; x < canvasWidth; x += bDefaultSpeedBar * (Math.random() * 0.3 + 0.7) )
				{
					for( var vx = -bMaxSpeed; vx < bMaxSpeed; vx += bMaxSpeed / 10 * (Math.random() + 1) * 0.5 )
					{
						// シミュレート
						var check = fb.copy(BALL_COPY_MODE.SIMULATE);
						check.x = x;
						check.vx = vx;
						EventBus.emitEvent('game:simulateReset');

						for( var t = 0; check.getBottomY() <= bar.getTopY() && t <= MAX_PREDICT; t++ ) { this.simulateBallStep(check); }

						// 目的地に応じた速度選択
						if( check.breakNum > 0 && dx > Math.abs( x - fallBallX ) ) {
							dx = Math.abs( x - fallBallX );
							plusSpeed = bDefaultSpeed * (x - fallBallX) / canvasWidth * 10 - fallBallVX;
						}
					}
				}

				// 速度の制限
				if( Math.abs(plusSpeed + fallBallVX) > bMaxSpeed ) { plusSpeed = bMaxSpeed * (plusSpeed < 0 ? -1 : 1) - fallBallVX; }
			}
		}
		//----------最適経路の選択----------

		//----------武器使用及び移動----------
		if( bar.weapon != 0 ) {
			var blockLine = new Array();

			// ブロックマッピングの初期化
			for( var i = 0, len = ~~(canvasWidth / blkWidth); i < len; i++ ) {
				blockLine[i] = 0;
			}

			// 発射済み武器の考慮
			for( var i = 0; i < weapons.length; i++ ) {
				var weapX = ~~(weapons[i].x / blkWidth);

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
							if( block.infinit == 1 && bar.weapon == 1 && blockLine[j] == 0 ) {
								blockLine[j] = -10000;

							// 破壊可
							} else if( blockLine[j] != -10000 ) {
								blockLine[j] += 1 + (bar.weapon != 1 ? 0 : block.life);
							}
						}
					}
				}
			}

			// 移動を確認
			var breakX = -1;
			var breakDx = canvasWidth;
			var checkX = (targetX == -1 ? bar.getCenterX() : targetX);
			for( var i = 0, len = blockLine.length; i < len; i++ )
			{
				// 破壊ブロックの選択
				if( blockLine[i] > 0 )
				{
					// 効率の良い場所を選ぶ
					if( breakDx > Math.abs(checkX - (i + 0.5) * blkWidth) )
					{
						breakX = (i + 0.5) * blkWidth;
						breakDx = Math.abs(checkX - breakX);
					}
				}
			}

			// 発射（EventBus経由で通知）
			if( breakX != -1 && Math.abs(bar.getCenterX() - breakX) <= blkWidth*0.5 && weapons.length < weaponMaxNum[bar.weapon - 1] && bar.weaponInter <= 0 ) {
				EventBus.emitEvent('weapon:spawn', {
					type: bar.weapon,
					x: bar.getCenterX()
				});
			}

			// 移動
			if( breakX != -1 && (fallItemX == -1 || (Math.abs(fallItemX - breakX) + Math.abs(breakX - bar.getCenterX()) <= (fallItemTime - 3) * moveSpeed)) &&
				(fallBall == null || (Math.abs(fallBall.getCenterX() - breakX) + Math.abs(breakX - bar.getCenterX()) <= (fallBallTime - 3) * moveSpeed))
			) {
				// 次の移動に備える（ブロック端に寄る）
				if( Math.abs(breakX - targetX) > blkWidth / 2 ) {
					breakX += (blkWidth * 0.35) * (targetX > breakX ? 1 : -1);
				}

				targetX = breakX;
			}
		}
		//----------武器使用及び移動----------

		// バーの移動
		if( targetX != -1 )
		{
			// バー速度へ変換
			if( fallBallTime > 1 ) { plusSpeed /= bSpin; }
			else { plusSpeed = 0; }

			// 移動
			bar.setPointX(targetX - plusSpeed);
		}
	}

	simulateBallStep(ball)
	{
		if (!ball) { return; }
		if (typeof ball.move === 'function') { ball.move(); }
		if (typeof ball.checkCollisionWithWall === 'function') {
			ball.checkCollisionWithWall(
				this.game?.canvasWidth,
				this.game?.canvasHeight,
				this.game?.statusBarHeight
			);
		}
		const om = this.getObjectManage();
		if (om && typeof om.getNearbyBlocks === 'function') {
			const nearBlocks = om.getNearbyBlocks(ball.x, ball.y, ball.radius, ball.vx, ball.vy);
			for (let i = 0; i < nearBlocks.length; i++) {
				const blk = nearBlocks[i];
				if (typeof ball.checkCollision === 'function' && ball.checkCollision(blk) === true) {
					const isChangedVY = (ball.lastHitAxis === 'y') ? 1 : 0;
					const addSpeed = blk.action(ball, isChangedVY);
					if (addSpeed && typeof ball.applySpeedDelta === 'function') {
						ball.applySpeedDelta(addSpeed);
					}
					break;
				}
			}
		}
		if (typeof ball.updateHistory === 'function') {
			ball.updateHistory();
		}
	}
}
