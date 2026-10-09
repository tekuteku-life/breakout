// src/AutoPlaySimulation.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import Block from "./Block.js";
import Ball from "./Ball.js";
import Item from "./Item.js";
import Bar from "./Bar.js";
import {
	BLOCK_FUNCTION,
	BLOCK_PARAM,
	BAR_PARAM,
	DEFAULT_CONFIG,
	SIMULATE_PARAM,
	ITEM_PARAM,
	ITEM_TYPE,
	WEAPON_PARAM,
	BALL_CREATE_MODE,
	BALL_STATUS,
} from "./const.js";
import EventBus from "./EventBus.js";

/**
 * 有害アイテムの判定（ITEM_TYPEを使用）
 */
export function isHarmfulItem(type) {
	return (
		type === ITEM_TYPE.SHORT ||
		type === ITEM_TYPE.POISON ||
		type === ITEM_TYPE.SPEED_DOWN ||
		type === ITEM_TYPE.SLOW ||
		type === ITEM_TYPE.VIBRATE ||
		type === ITEM_TYPE.DISTURB
	);
}

/**
 * シミュレーション用ゲームコンテキストの作成
 */
export function createSimGame(config) {
	return {
		eventBus: new EventBus(),
		canvasWidth: config.canvasWidth,
		canvasHeight: config.canvasHeight,
		statusBarHeight: config.statusBarHeight,
		FPS: config.fps,
		ballDefaultSpeed: config.bDefaultSpeed,
		ballMaxSpeed: config.bMaxSpeed,
		barDefaultSpeed: config.bDefaultSpeedBar,
		barSpin: config.bSpin,
		blockWidth: config.blkWidth,
		blockHeight: config.blkHeight,
		ballSize: config.bSize,
	};
}

/**
 * ブロックが生存中か判定（点滅ブロックの一時消灯中を含む）
 */
export function isBlockAlive(b) {
	if (!b) return false;
	if (b.type !== 0) return true;
	if (b.func === BLOCK_FUNCTION.BLINK && b.blinkSwitch !== 0) return true;
	return false;
}

/**
 * ブロックマップのディープクローンを作成（本物のBlockインスタンスを生成）
 */
export function cloneBlockMap(blockMap, newGame = null) {
	if (!blockMap || !Array.isArray(blockMap)) { return []; }
	const cloned = [];
	for (let i = 0; i < blockMap.length; i++) {
		const row = blockMap[i];
		if (!row) {
			cloned.push(null);
			continue;
		}
		const clonedRow = [];
		for (let j = 0; j < row.length; j++) {
			const b = row[j];
			if (!b) {
				clonedRow.push(null);
			} else if (typeof b.clone === 'function') {
				clonedRow.push(b.clone(newGame));
			} else {
				// プレーンオブジェクトから本物の Block インスタンスを生成
				const bType = b.type !== 0 ? b.type : (b.blinkType || 0);
				const inf = (b.infinit !== undefined && b.infinit !== null)
					? Number(b.infinit)
					: (DEFAULT_CONFIG.blockInfinit && DEFAULT_CONFIG.blockInfinit[bType] !== undefined ? DEFAULT_CONFIG.blockInfinit[bType] : 0);
				const thr = (b.throughVect !== undefined && b.throughVect !== null)
					? Number(b.throughVect)
					: (DEFAULT_CONFIG.blockThrough && DEFAULT_CONFIG.blockThrough[bType] !== undefined ? DEFAULT_CONFIG.blockThrough[bType] : 0);
				const fn = (b.func !== undefined && b.func !== null)
					? Number(b.func)
					: (DEFAULT_CONFIG.blockFunction && DEFAULT_CONFIG.blockFunction[bType] !== undefined ? DEFAULT_CONFIG.blockFunction[bType] : 0);
				const blk = new Block(
					b.col !== undefined ? b.col : Math.round(b.x / (b.width || DEFAULT_CONFIG.blockWidth)),
					b.row !== undefined ? b.row : Math.round((b.y - (b.statusBarHeight || DEFAULT_CONFIG.statusBarHeight)) / (b.height || DEFAULT_CONFIG.blockHeight)),
					b.type,
					fn,
					b.life,
					inf,
					thr,
					newGame
				);
				blk.x = b.x;
				blk.y = b.y;
				blk.width = b.width || blk.width;
				blk.height = b.height || blk.height;
				blk.breakLimit = b.breakLimit || 0;
				blk.moveInter = b.moveInter || 0;
				blk.moveVect = b.moveVect || 0;
				blk.blinkInter = b.blinkInter !== undefined ? b.blinkInter : 0;
				blk.blinkSwitch = b.blinkSwitch !== undefined ? b.blinkSwitch : 0;
				blk.blinkType = b.blinkType || (b.func === BLOCK_FUNCTION.BLINK ? (b.type || 16) : 0);
				blk.attackInter = b.attackInter || 0;
				blk.item = b.item;
				blk.text = b.text;
				clonedRow.push(blk);
			}
		}
		cloned.push(clonedRow);
	}
	return cloned;
}

/**
 * ボールオブジェクトから本物のBallインスタンスを生成
 */
function instantiateBall(b, simGame) {
	if (b instanceof Ball) {
		return b.clone(simGame);
	}
	const ball = new Ball(BALL_CREATE_MODE.OTHER, simGame);
	ball.id = b.id;
	ball.ballId = b.ballId !== undefined ? b.ballId : b.id;
	ball.x = b.x;
	ball.y = b.y;
	ball.vx = b.vx;
	ball.vy = b.vy;
	ball.radius = b.radius || simGame.ballSize;
	ball.status = b.status || 0;
	ball.statusTime = b.statusTime || 0;
	ball.breakNum = b.breakNum || 0;
	ball.collisionNum = b.collisionNum || 0;
	ball.damageCollisionNum = b.damageCollisionNum || 0;
	ball.infinitBreakNum = b.infinitBreakNum || 0;
	ball.explodedCount = b.explodedCount || 0;
	ball.topRouteBreaks = b.topRouteBreaks || 0;
	ball.breakLimitFinishes = b.breakLimitFinishes || 0;
	ball.throughBouncedCount = b.throughBouncedCount || 0;
	ball.throughPassedCount = b.throughPassedCount || 0;
	ball.isAbsorption = b.isAbsorption || 0;
	ball.fell = b.fell || false;
	ball.fallTime = b.fallTime !== undefined ? b.fallTime : 0;
	ball.fallX = b.fallX !== undefined ? b.fallX : b.x;
	return ball;
}

/**
 * ブロックの状態更新（本物のBlockインスタンスおよびプレーンオブジェクトの双方に対応）
 */
export function updateSimulationBlocks(blockMap, config = null, simGame = null) {
	if (!blockMap) { return []; }
	const cfg = (typeof config === 'object' && config !== null)
		? config
		: (simGame || DEFAULT_CONFIG);
	const canvasWidth = cfg.canvasWidth || DEFAULT_CONFIG.canvasWidth;
	const blkWidth = cfg.blkWidth || cfg.blockWidth || DEFAULT_CONFIG.blockWidth;
	const fps = cfg.fps || cfg.FPS || DEFAULT_CONFIG.FPS;
	const spawnedAttacks = [];

	const eventBus = simGame && simGame.eventBus;
	const attackHandler = (weaponData) => {
		spawnedAttacks.push({
			x: weaponData.x,
			y: weaponData.y,
			vy: weaponData.vy || 3,
			vect: weaponData.vect || -1,
		});
	};
	if (eventBus && typeof eventBus.addOnEvent === 'function') {
		eventBus.addOnEvent('weapon:spawn', attackHandler);
	}

	for (let i = 0; i < blockMap.length; i++) {
		const row = blockMap[i];
		if (!row) { continue; }
		for (let j = 0; j < row.length; j++) {
			const block = row[j];
			if (!block) { continue; }

			// 本物のBlockインスタンスの場合
			if (typeof block.movePosition === 'function' && typeof block.updateState === 'function') {
				const wasAlive = block.type !== 0;
				block.movePosition(blockMap);
				if (block.func === BLOCK_FUNCTION.VERTICAL_MOVE && wasAlive && block.type === 0 && row[j] === block) {
					row[j] = null;
				}
				block.updateState(true);
				continue;
			}

			// プレーンオブジェクト用フォールバック
			if (block.type === 0 && block.blinkSwitch !== -1) { continue; }

			// 1. 移動ブロック (VERTICAL_MOVE)
			if (block.func === BLOCK_FUNCTION.VERTICAL_MOVE && block.type !== 0) {
				block.moveInter--;
				if (block.moveInter <= 0) {
					const nextCol = j + block.moveVect;
					const forBlock = row[nextCol];
					if ((!forBlock || forBlock.type === 0) && nextCol >= 0 && nextCol < canvasWidth / blkWidth) {
						row[nextCol] = {
							...block,
							col: nextCol,
							x: block.x + blkWidth * block.moveVect,
							moveInter: (cfg.blockMoveInter || 2) * fps,
						};
						row[j] = null;
					} else {
						block.moveVect *= -1;
					}
				}
			}

			// 2. 点滅ブロック (BLINK)
			if (block.func === BLOCK_FUNCTION.BLINK && block.blinkSwitch !== 0) {
				block.blinkInter--;
				if (block.blinkInter <= 0) {
					block.blinkInter = (cfg.blockBlinkInter || 3) * fps;
					block.blinkSwitch *= -1;
					if (block.blinkSwitch === -1) {
						block.type = 0;
					} else {
						block.type = block.blinkType;
					}
				}
			}

			// 3. 攻撃ブロック (ATTACK)
			if (block.func === BLOCK_FUNCTION.ATTACK && block.type !== 0) {
				block.attackInter--;
				if (block.attackInter <= 0) {
					block.attackInter = (cfg.blockAttackInter || 5) * fps;
					spawnedAttacks.push({
						x: block.x + (block.width || blkWidth) / 2,
						y: block.y + (block.height || 20) + 1,
						vy: 3,
						vect: -1,
					});
				}
			}

			// 4. 時限ブロック (BREAK_LIMIT)
			if (block.breakLimit > 0 && block.type !== 0) {
				block.breakLimit--;
				if (block.breakLimit <= 0) {
					const bLifeMap = (simGame && simGame.blockLife) || (DEFAULT_CONFIG.blockLife) || [];
					block.life = bLifeMap[block.type] || 1;
				}
			}
		}
	}

	if (eventBus && typeof eventBus.removeOnEvent === 'function') {
		eventBus.removeOnEvent('weapon:spawn', attackHandler);
	}

	return spawnedAttacks;
}

/**
 * 磁石・斥力ブロックによる影響（本物のBlock/Ballクラスまたはプレーンオブジェクトに対応）
 */
export function applySimulationMagneticForces(balls, blockMap, config) {
	if (!blockMap || !balls || balls.length === 0) return;
	const bDrawDist = (config && (config.blockDrawingDistance || config.bDrawDist)) || DEFAULT_CONFIG.blockDrawingDistance;
	const bDefSpeed = (config && (config.bDefaultSpeed || config.ballDefaultSpeed)) || DEFAULT_CONFIG.ballDefaultSpeed;

	for (let i = 0; i < blockMap.length; i++) {
		const row = blockMap[i];
		if (!row) continue;
		for (let j = 0; j < row.length; j++) {
			const block = row[j];
			if (!block || block.type === 0) continue;
			if (block.func !== BLOCK_FUNCTION.MAGNET && block.func !== BLOCK_FUNCTION.REPULL) continue;

			const blockCenterX = (typeof block.getCenterX === 'function') ? block.getCenterX() : (block.x + (block.width || 40) / 2);
			const blockCenterY = (typeof block.getCenterY === 'function') ? block.getCenterY() : (block.y + (block.height || 20) / 2);
			const powVect = (block.func === BLOCK_FUNCTION.MAGNET) ? -1 : 1;

			for (let bi = 0; bi < balls.length; bi++) {
				const ball = balls[bi];
				if (!ball || ball.fell) continue;

				if (typeof block.applyMagneticForce === 'function' && typeof ball.getCenterX === 'function') {
					block.applyMagneticForce(ball);
				} else {
					const ballCenterX = (typeof ball.getCenterX === 'function') ? ball.getCenterX() : ball.x;
					const ballCenterY = (typeof ball.getCenterY === 'function') ? ball.getCenterY() : ball.y;
					const relX = ballCenterX - blockCenterX;
					const relY = ballCenterY - blockCenterY;
					const dist = Math.sqrt(relX * relX + relY * relY);

					if (dist > 0 && dist <= bDrawDist) {
						const acceleration = bDefSpeed * BLOCK_PARAM.MAGNET_ACCEL_BASE / Math.pow(dist, BLOCK_PARAM.MAGNET_DIST_POW);
						ball.vx += acceleration * BLOCK_PARAM.MAGNET_VX_RATIO * (relX < 0 ? -1 : 1) * powVect;
						if (Math.abs(ball.vx) <= bDefSpeed * 0.1) {
							ball.vx = bDefSpeed * 0.1 * (ball.vx >= 0 ? 1 : -1);
						}
						if (ball.vy * relY < 0) {
							ball.vy += acceleration * BLOCK_PARAM.MAGNET_VY_REL_NEG_RATIO * (relY < 0 ? -1 : 1) * powVect;
						} else {
							ball.vy += acceleration * BLOCK_PARAM.MAGNET_VY_REL_POS_RATIO * (relY < 0 ? -1 : 1) * powVect;
						}
					}
				}
			}
		}
	}
}

/**
 * ボール周辺のブロック候補を取得（空間インデックス）
 */
export function getNearbyBlocksForSimulation(ball, blockMap, config) {
	if (!blockMap) return [];
	const blkWidth = (config && (config.blkWidth || config.blockWidth)) || DEFAULT_CONFIG.blockWidth;
	const blkHeight = (config && (config.blkHeight || config.blockHeight)) || DEFAULT_CONFIG.blockHeight;
	const sBarHeight = (config && (config.statusBarHeight !== undefined)) ? config.statusBarHeight : DEFAULT_CONFIG.statusBarHeight;

	const stepX = (ball.vx || 0) < 0 ? -1 : 1;
	const stepY = (ball.vy || 0) < 0 ? -1 : 1;
	const radius = ball.radius || 5;

	const startX = Math.floor((ball.x - radius * stepX) / blkWidth);
	const endX = Math.floor((ball.x + radius * stepX) / blkWidth);
	const startY = Math.floor((ball.y - radius * stepY - sBarHeight) / blkHeight);
	const endY = Math.floor((ball.y + radius * stepY - sBarHeight) / blkHeight);

	const minX = Math.max(0, Math.min(startX, endX));
	const maxX = Math.max(startX, endX);
	const minY = Math.max(0, Math.min(startY, endY));
	const maxY = Math.max(startY, endY);

	const candidates = [];
	for (let i = minY; i <= maxY; i++) {
		const row = blockMap[i];
		if (!row) continue;
		for (let j = minX; j <= maxX; j++) {
			const block = row[j];
			if (block && block.type !== 0) {
				candidates.push(block);
			}
		}
	}
	return candidates;
}

/**
 * 単一ブロックとボールの衝突解決ヘルパー
 */
function resolveBallBlockHit(ball, block, blockMap, config = null) {
	const prevVx = ball.vx;
	const prevVy = ball.vy;

	// 本物のBall・Blockクラスのメソッドが利用可能な場合
	if (typeof ball.checkCollision === 'function' && typeof block.action === 'function') {
		if (ball.checkCollision(block, blockMap) === true) {
			const wasBreakLimit = (block.breakLimit > 0);
			const isChangedVY = (ball.lastHitAxis === 'y' || ball.lastHitAxis === 'both') ? 1 : 0;
			const addSpeed = block.action(ball, isChangedVY, blockMap);
			if (addSpeed && typeof ball.applySpeedDelta === 'function') {
				ball.applySpeedDelta(addSpeed);
			}
			const isInf = (block.infinit === 1) || (DEFAULT_CONFIG.blockInfinit && DEFAULT_CONFIG.blockInfinit[block.type] === 1);
			const isDestructible = (!isInf) || (ball.status === BALL_STATUS.ULTIMATE);
			if (isDestructible) {
				ball.damageCollisionNum = (ball.damageCollisionNum || 0) + 1;
			}
			ball.collisionNum = (ball.collisionNum || 0) + 1;

			// 一方通行ブロック（throughVect !== 0）の透過／はじかれ判定
			// ボールの速度ベクトルが反射されたか（逆方向に反転したか）で正確に判定
			const thrVect = block.throughVect !== undefined ? Number(block.throughVect) : 0;
			if (thrVect !== 0) {
				const bounced = (thrVect === 1 && prevVy > 0 && ball.vy < 0) ||
								(thrVect === 3 && prevVy < 0 && ball.vy > 0) ||
								(thrVect === 2 && prevVx < 0 && ball.vx > 0) ||
								(thrVect === 4 && prevVx > 0 && ball.vx < 0) ||
								(ball.lastHitAxis === 'x' && prevVx * ball.vx < 0);
				if (bounced) {
					// 透過できずにはじかれた（バウンドした）
					ball.throughBouncedCount = (ball.throughBouncedCount || 0) + 1;
				} else {
					// 正常に透過した
					ball.throughPassedCount = (ball.throughPassedCount || 0) + 1;
				}
			}

			if (block.func === BLOCK_FUNCTION.EXPLODE || block.func === BLOCK_FUNCTION.EXPLODE_STRENGTH) {
				ball.explodedCount = (ball.explodedCount || 0) + 1;
			}
			const broken = isDestructible && (block.type === 0 || block.life <= 0) ? 1 : 0;
			if (broken) {
				ball.breakNum = (ball.breakNum || 0) + 1;
				if (wasBreakLimit) {
					ball.breakLimitFinishes = (ball.breakLimitFinishes || 0) + 1;
				}
				if (isInf) {
					ball.infinitBreakNum = (ball.infinitBreakNum || 0) + 1;
				}
				if (config && config.minBlockY !== undefined && ball.y < config.minBlockY) {
					ball.topRouteBreaks = (ball.topRouteBreaks || 0) + 1;
				}
			}
			return { hit: true, broken };
		}
		return { hit: false, broken: 0 };
	}

	// プレーンオブジェクト用フォールバック
	const left = block.x;
	const right = block.x + (block.width || 40);
	const top = block.y;
	const bottom = block.y + (block.height || 20);
	const radius = ball.radius || 5;

	if (
		ball.x + radius >= left &&
		ball.x - radius <= right &&
		ball.y + radius >= top &&
		ball.y - radius <= bottom
	) {
		const overlapLeft = (ball.x + radius) - left;
		const overlapRight = right - (ball.x - radius);
		const overlapTop = (ball.y + radius) - top;
		const overlapBottom = bottom - (ball.y - radius);

		const minOverlapX = Math.min(overlapLeft, overlapRight);
		const minOverlapY = Math.min(overlapTop, overlapBottom);

		const thrVect = (block.throughVect !== undefined && block.throughVect !== null)
			? Number(block.throughVect)
			: (DEFAULT_CONFIG.blockThrough && DEFAULT_CONFIG.blockThrough[block.type] !== undefined ? DEFAULT_CONFIG.blockThrough[block.type] : 0);

		let throughFlag = 0;
		if (thrVect !== 0) {
			if (thrVect === 1 && minOverlapY <= minOverlapX && ball.vy < 0) {
				throughFlag = 1;
				ball.x -= ball.vx;
			} else if (thrVect === 2 && minOverlapX <= minOverlapY && ball.vx > 0) {
				throughFlag = 1;
				ball.y -= ball.vy;
			} else if (thrVect === 3 && minOverlapY <= minOverlapX && ball.vy > 0) {
				throughFlag = 1;
				ball.x -= ball.vx;
			} else if (thrVect === 4 && minOverlapX <= minOverlapY && ball.vx < 0) {
				throughFlag = 1;
				ball.y -= ball.vy;
			}
		}

		if (throughFlag === 1) {
			ball.throughPassedCount = (ball.throughPassedCount || 0) + 1;
		} else {
			if (thrVect !== 0) {
				ball.throughBouncedCount = (ball.throughBouncedCount || 0) + 1;
			}
			if (minOverlapX < minOverlapY) {
				ball.vx *= -1;
			} else {
				ball.vy *= -1;
			}
		}

		if (block.func === BLOCK_FUNCTION.ACCELERATION) {
			ball.vx *= 1.2;
			ball.vy *= 1.2;
		} else if (block.func === BLOCK_FUNCTION.DECELERATION) {
			ball.vx *= 0.8;
			ball.vy *= 0.8;
		}

		let broken = 0;
		const wasBreakLimit = (block.breakLimit > 0);
		const isInf = (block.infinit === 1) || (DEFAULT_CONFIG.blockInfinit && DEFAULT_CONFIG.blockInfinit[block.type] === 1);
		const isDestructible = (!isInf) || (ball.status === BALL_STATUS.ULTIMATE);
		if (isDestructible) {
			ball.damageCollisionNum = (ball.damageCollisionNum || 0) + 1;
			if (ball.status === BALL_STATUS.ULTIMATE && isInf) {
				block.type = 0;
				broken = 1;
			} else {
				block.life = (block.life || 1) - 1;
				if (block.life <= 0) {
					block.type = 0;
					broken = 1;
				}
			}
		}
		if (block.func === BLOCK_FUNCTION.EXPLODE || block.func === BLOCK_FUNCTION.EXPLODE_STRENGTH) {
			ball.explodedCount = (ball.explodedCount || 0) + 1;
		}
		ball.collisionNum = (ball.collisionNum || 0) + 1;
		if (broken) {
			ball.breakNum = (ball.breakNum || 0) + 1;
			if (wasBreakLimit) {
				ball.breakLimitFinishes = (ball.breakLimitFinishes || 0) + 1;
			}
			if (isInf) {
				ball.infinitBreakNum = (ball.infinitBreakNum || 0) + 1;
			}
			if (config && config.minBlockY !== undefined && ball.y < config.minBlockY) {
				ball.topRouteBreaks = (ball.topRouteBreaks || 0) + 1;
			}
		}
		return { hit: true, broken };
	}
	return { hit: false, broken: 0 };
}

/**
 * ボールとブロックの衝突判定（本物のBall/Blockクラスまたはプレーンオブジェクトに対応）
 */
export function checkSimulationBallBlockCollision(ball, blockMap, config) {
	if (!blockMap || !ball || ball.fell) return 0;

	// 空間インデックスによる周辺候補から優先判定
	if (typeof ball.checkCollision === 'function') {
		const candidates = getNearbyBlocksForSimulation(ball, blockMap, config);
		for (let k = 0; k < candidates.length; k++) {
			const res = resolveBallBlockHit(ball, candidates[k], blockMap, config);
			if (res.hit) return res.broken;
		}
	}

	// 全探索（フォールバック判定）
	for (let i = 0; i < blockMap.length; i++) {
		const row = blockMap[i];
		if (!row) continue;
		for (let j = 0; j < row.length; j++) {
			const block = row[j];
			if (!block || block.type === 0) continue;
			const res = resolveBallBlockHit(ball, block, blockMap, config);
			if (res.hit) return res.broken;
		}
	}
	return 0;
}

/**
 * 1ステップの物理シミュレーション進行（本物のエンティティメソッドで実行）
 */
export function simulateSingleStep(balls, blockMap, config, simGame = null) {
	const gameCtx = simGame || createSimGame(config);

	// 1. ブロックの物理移動と状態更新
	updateSimulationBlocks(blockMap, config, gameCtx);

	// 2. 磁石・斥力効果
	applySimulationMagneticForces(balls, blockMap, config);

	// 3. ボールの物理移動と壁・ブロック衝突
	for (let bi = 0; bi < balls.length; bi++) {
		const b = balls[bi];
		if (b.fell) continue;

		if (typeof b.movePosition === 'function') {
			b.movePosition();
		} else {
			b.x += b.vx;
			b.y += b.vy;
		}

		if (typeof b.checkCollisionWithWall === 'function') {
			b.checkCollisionWithWall(gameCtx.canvasWidth, gameCtx.canvasHeight, gameCtx.statusBarHeight);
		}

		checkSimulationBallBlockCollision(b, blockMap, config);
	}
}

/**
 * 武器で狙うべきブロック列のマッピング計算（元コード準拠: 下から上へ走査）
 */
export function computeBlockLine(rawBlocks, weapons, barWeapon, config) {
	const blkWidth = (config && config.blkWidth) || DEFAULT_CONFIG.blockWidth;
	const canvasWidth = (config && config.canvasWidth) || DEFAULT_CONFIG.canvasWidth;
	const cols = Math.floor(canvasWidth / blkWidth);
	const blockLine = new Array(cols).fill(0);

	// 発射済み武器の考慮（上向きに飛んでいる武器を減算）
	if (weapons) {
		for (let i = 0; i < weapons.length; i++) {
			const w = weapons[i];
			const wx = Math.floor(w.x / blkWidth);
			if (w.vect > 0 && wx >= 0 && wx < cols) {
				blockLine[wx]--;
			}
		}
	}

	// ブロックの存在を確認（元コード準拠: 下（バー側）から上へ走査！）
	if (rawBlocks) {
		for (let i = rawBlocks.length - 1; i >= 0; i--) {
			const row = rawBlocks[i];
			if (!row) { continue; }
			for (let j = 0; j < row.length; j++) {
				const b = row[j];
				if (!b || !isBlockAlive(b)) { continue; }
				const col = (b.col !== undefined) ? b.col : Math.floor((b.x !== undefined ? b.x : j * blkWidth) / blkWidth);
				if (col < 0 || col >= cols) { continue; }

				const bType = b.type !== 0 ? b.type : (b.blinkType || 0);
				const isInf = (b.infinit === 1 || (DEFAULT_CONFIG.blockInfinit && DEFAULT_CONFIG.blockInfinit[bType] === 1));

				// ミサイル（barWeapon === 2）の場合、通常壊せない不壊ブロックを破壊できる最大のチャンス！
				// 不壊ブロックが存在する列に +100 の特大スコアを与えて集中的に狙わせる
				if (barWeapon === 2) {
					blockLine[col] += isInf ? 100 : 1;
				} else if (isInf && barWeapon === 1 && blockLine[col] === 0) {
					blockLine[col] = -10000;
				} else if (blockLine[col] !== -10000) {
					if (!isInf) {
						blockLine[col] += 1 + (b.life || 1);
					}
				}
			}
		}
	}

	return blockLine;
}

/**
 * 目標位置 checkX に最も近い破壊可能列の中心X座標を取得
 */
export function getBestWeaponBreakX(blockLine, checkX, config) {
	if (!blockLine) { return -1; }
	const blkWidth = (config && config.blkWidth) || DEFAULT_CONFIG.blockWidth;
	const cols = blockLine.length;
	let breakX = -1;
	let breakDx = Infinity;

	// 不壊ブロックを含む列（重み >= 100）が存在する場合、不壊ブロック列を集中的・最優先で狙う
	const hasInfinitTarget = blockLine.some((val) => val >= 100);

	for (let i = 0; i < cols; i++) {
		if (hasInfinitTarget && blockLine[i] < 100) { continue; }
		if (blockLine[i] > 0) {
			const colCenter = (i + 0.5) * blkWidth;
			const dist = Math.abs(checkX - colCenter);
			if (dist < breakDx) {
				breakDx = dist;
				breakX = colCenter;
			}
		}
	}

	return breakX;
}

/**
 * 武器発射の評価（元コード準拠）
 */
export function evaluateWeaponFire(bar, weapons, rawBlocks, config) {
	if (!bar || !bar.weapon || bar.weapon <= 0) { return null; }
	if (bar.weaponInter > 0) { return null; }

	const weaponMaxNum = (config && config.weaponMaxNum) || [
		WEAPON_PARAM.MAX_NUM[0] || 5,
		WEAPON_PARAM.MAX_NUM[1] || 3,
	];

	if (weapons && weapons.length >= weaponMaxNum[bar.weapon - 1]) { return null; }

	const blkWidth = (config && config.blkWidth) || DEFAULT_CONFIG.blockWidth;
	const barCenterX = (typeof bar.getCenterX === 'function') ? bar.getCenterX() : (bar.x || 0);

	const blockLine = computeBlockLine(rawBlocks, weapons, bar.weapon, config);
	const breakX = getBestWeaponBreakX(blockLine, barCenterX, config);

	if (breakX !== -1 && Math.abs(barCenterX - breakX) <= blkWidth * 0.5) {
		return {
			type: bar.weapon,
			x: barCenterX,
		};
	}

	return null;
}

/**
 * オートプレイのメインシミュレーション関数
 * 本物のエンティティクラスを活用し、高精度な軌道予測と全体最適化を実施
 */
export function runAutoPlaySimulation(snapshot) {
	if (!snapshot || !snapshot.bar) {
		return {
			targetX: -1,
			bestDvx: 0,
			spinOffset: 0,
			plusSpeed: 0,
			fallBallTime: 0,
			fallBallId: null,
			fireWeapon: null,
			simuData: {},
			isFetchingItem: false,
			predictions: [],
		};
	}

	const config = {
		canvasWidth: snapshot.canvasWidth || DEFAULT_CONFIG.canvasWidth,
		canvasHeight: snapshot.canvasHeight || DEFAULT_CONFIG.canvasHeight,
		statusBarHeight: snapshot.statusBarHeight || DEFAULT_CONFIG.statusBarHeight,
		fps: snapshot.fps || DEFAULT_CONFIG.FPS,
		bDefaultSpeed: snapshot.bDefaultSpeed || DEFAULT_CONFIG.ballDefaultSpeed,
		bMaxSpeed: snapshot.bMaxSpeed || DEFAULT_CONFIG.ballMaxSpeed,
		bDefaultSpeedBar: snapshot.bDefaultSpeedBar || DEFAULT_CONFIG.barDefaultSpeed,
		bSpin: snapshot.bSpin !== undefined ? snapshot.bSpin : BAR_PARAM.SPIN_RATIO,
		blkWidth: snapshot.blkWidth || DEFAULT_CONFIG.blockWidth,
		blkHeight: snapshot.blkHeight || DEFAULT_CONFIG.blockHeight,
		bSize: snapshot.bSize || DEFAULT_CONFIG.ballSize,
	};

	const simGame = createSimGame(config);
	const bar = snapshot.bar;
	const rawBalls = snapshot.balls || [];
	const ballNum = rawBalls.length;
	const rawBlocks = snapshot.blocks || [];
	const items = snapshot.items || [];
	const weapons = snapshot.weapons || [];
	const sim = snapshot.simuData || {};

	const MAX_FALL_PREDICT = Math.max(800, Math.round(SIMULATE_PARAM.MAX_PREDICT * config.fps * 0.35));
	const MAX_RETURN_PREDICT = Math.max(600, Math.round(SIMULATE_PARAM.MAX_PREDICT * config.fps * 0.25));
	const moveSpeed = bar.vxMax || config.bDefaultSpeedBar;

	// フィールド内の最上段ブロックY座標（天井裏判定用）と破壊可能ブロック残数を算出
	let minBlockY = Infinity;
	let remainingDestructibleBlocks = 0;
	let urgentBreakLimitBlock = null;

	const numCols = Math.max(1, Math.ceil(config.canvasWidth / config.blkWidth));
	const colInfCount = new Int32Array(numCols);
	const colDestructibleCount = new Int32Array(numCols);
	const colHasDownThrough = new Uint8Array(numCols);
	const colLowestDownThroughY = new Float32Array(numCols).fill(0);
	const colHasUpThrough = new Uint8Array(numCols);
	const colHighestUpThroughY = new Float32Array(numCols).fill(Infinity);
	let hasThroughBlocks = false;

	for (let i = 0; i < rawBlocks.length; i++) {
		const row = rawBlocks[i];
		if (!row) continue;
		for (let j = 0; j < row.length; j++) {
			const b = row[j];
			if (b && isBlockAlive(b)) {
				const bType = b.type !== 0 ? b.type : (b.blinkType || 0);
				const isInf = (b.infinit === 1 || (DEFAULT_CONFIG.blockInfinit && DEFAULT_CONFIG.blockInfinit[bType] === 1));
				const by = (b.y !== undefined ? b.y : i * config.blkHeight + config.statusBarHeight);
				const bx = (b.x !== undefined ? b.x + (b.width || config.blkWidth) / 2 : j * config.blkWidth + config.blkWidth / 2);
				const col = b.col !== undefined ? b.col : Math.floor(bx / config.blkWidth);

				if (col >= 0 && col < numCols) {
					if (isInf) {
						colInfCount[col]++;
					} else {
						colDestructibleCount[col]++;
					}

					const thr = (b.throughVect !== undefined && b.throughVect !== null)
						? Number(b.throughVect)
						: (DEFAULT_CONFIG.blockThrough && DEFAULT_CONFIG.blockThrough[bType] !== undefined ? DEFAULT_CONFIG.blockThrough[bType] : 0);
					if (thr === 3) {
						// 下向き一方通行（▼▼▼）: 下から上へ進むボールをはじき返す
						colHasDownThrough[col] = 1;
						if (by > colLowestDownThroughY[col]) colLowestDownThroughY[col] = by;
						hasThroughBlocks = true;
					} else if (thr === 1) {
						// 上向き一方通行（▲▲▲）: 上から下へ進むボールをはじき返す
						colHasUpThrough[col] = 1;
						if (by < colHighestUpThroughY[col]) colHighestUpThroughY[col] = by;
						hasThroughBlocks = true;
					}
				}

				if (!isInf) {
					remainingDestructibleBlocks++;
					// カウントダウン中の時限ブロックを発見: 時間内にトドメを刺さないと全回復してしまう
					if (b.breakLimit > 0) {
						if (!urgentBreakLimitBlock || b.breakLimit < urgentBreakLimitBlock.breakLimit) {
							urgentBreakLimitBlock = b;
						}
					}
				}
				if (by < minBlockY) minBlockY = by;
			}
		}
	}
	config.minBlockY = minBlockY;
	const hasBlocksInField = remainingDestructibleBlocks > 0 || rawBlocks.some((row) => row && row.some((b) => b && isBlockAlive(b)));
	const isEndgame = hasBlocksInField && remainingDestructibleBlocks > 0 && remainingDestructibleBlocks <= 5; // 終盤全ボール防衛モード判定

	// ★ 細い空洞通路トラップ（isNarrowChuteTrap）の検出（Stage Aim 等の細い通路ハマリ防止）
	// 両隣が不壊壁（各4個以上）で挟まれ、通路内部の壊せるブロックが1個以下の列をトラップとして識別
	const isNarrowChuteTrap = new Uint8Array(numCols);
	let hasNarrowChutes = false;
	for (let c = 1; c < numCols - 1; c++) {
		if (colInfCount[c - 1] >= 4 && colInfCount[c + 1] >= 4 && colDestructibleCount[c] <= 1) {
			isNarrowChuteTrap[c] = 1;
			hasNarrowChutes = true;
		}
	}

	// ★ 天井と上向き一方通行ブロックの間のポケット判定
	const isThroughPocketCol = new Uint8Array(numCols);
	let hasThroughPockets = false;
	for (let c = 0; c < numCols; c++) {
		if (colHasUpThrough[c] && colHighestUpThroughY[c] < config.statusBarHeight + config.blkHeight * 4) {
			isThroughPocketCol[c] = 1;
			hasThroughPockets = true;
		}
	}

	// ★ 破壊可能ブロック密集クラスタ（denseCenterX）の算出
	let maxWindowBlocks = 0;
	let denseCenterX = config.canvasWidth / 2;
	const windowSize = 5;
	for (let startCol = 0; startCol <= numCols - windowSize; startCol++) {
		let windowBlocks = 0;
		let windowSumX = 0;
		for (let c = startCol; c < startCol + windowSize; c++) {
			const count = colDestructibleCount[c];
			windowBlocks += count;
			windowSumX += (c * config.blkWidth + config.blkWidth / 2) * count;
		}
		if (windowBlocks > maxWindowBlocks) {
			maxWindowBlocks = windowBlocks;
			denseCenterX = windowSumX / windowBlocks;
		}
	}

	//--------------------------------------------------
	// 1. 各ボールの自由落下シミュレーション（到達時間・落下位置の特定）
	//--------------------------------------------------
	const fallSimulate = rawBalls.map((b) => instantiateBall(b, simGame));
	const blockMap = cloneBlockMap(rawBlocks, simGame);

	let fallBall = null;
	let fallBallI = -1;
	let fallBallTime = MAX_FALL_PREDICT;

	for (let t = 0; t < MAX_FALL_PREDICT; t++) {
		simulateSingleStep(fallSimulate, blockMap, config, simGame);

		for (let i = 0; i < ballNum; i++) {
			const b = fallSimulate[i];
			if (!b.fell && b.vy > 0 && b.y + b.radius >= bar.y) {
				b.fell = true;
				b.fallTime = t;
				// バー上面到達時の正確なX座標を線形補間
				const prevY = b.y - b.vy;
				const dy = (bar.y - b.radius) - prevY;
				if (b.vy > 0 && dy >= 0 && dy <= b.vy) {
					b.fallX = (b.x - b.vx) + b.vx * (dy / b.vy);
				} else {
					b.fallX = b.x;
				}

				if (fallBall === null && Math.abs(bar.x - b.fallX) - bar.width / 2 <= moveSpeed * t) {
					fallBall = b;
					fallBallTime = t;
					fallBallI = i;
				}
			}
		}

		if (fallBall !== null && fallSimulate.every((b) => b.fell)) {
			break;
		}
	}

	// 落下ボールを時間順にソート（最も早くバーに落ちてくる順）
	const fallingBalls = fallSimulate
		.filter((b) => b.fell && b.fallTime >= 0)
		.sort((a, b) => a.fallTime - b.fallTime);

	const isMultiBall = rawBalls.length > 1;
	let primaryBallIndex = 0;

	// 複数ボール時: 落下位置・時刻が有害デバフアイテム（POISON, SHORT, SPEED_DOWN等）の被弾ゾーンと重なるボールを回避し、
	// 最も安全に救出できるボールを選択する (C-1)
	if (isMultiBall && fallingBalls.length > 0 && items.length > 0) {
		let safeBallFound = false;
		for (let bIdx = 0; bIdx < fallingBalls.length; bIdx++) {
			const bCandidate = fallingBalls[bIdx];
			const isCandidateInDanger = items.some((it) => {
				if (!isHarmfulItem(it.type)) { return false; }
				const itSpeed = it.speed || 4;
				const itY = typeof it.getCenterY === 'function' ? it.getCenterY() : it.y;
				if (itY >= bar.y) { return false; }
				const itTime = (bar.y - itY) / itSpeed;
				const itemX = typeof it.getCenterX === 'function' ? it.getCenterX() : (it.width ? (it.x + it.width / 2) : it.x);
				const itemW = it.width || config.blkWidth || 50;
				const dangerDist = (bar.width + itemW) / 2 + 25;
				return Math.abs(itTime - bCandidate.fallTime) <= 20 && Math.abs(itemX - bCandidate.fallX) < dangerDist;
			});

			if (!isCandidateInDanger) {
				primaryBallIndex = bIdx;
				safeBallFound = true;
				break;
			}
		}

		// 全ての落下ボールが有害アイテム危険ゾーンと重なっている場合、ボールを無理に拾わず完全退避
		if (!safeBallFound) {
			primaryBallIndex = -1;
		}
	}

	// 最優先ターゲットボールを確実に設定
	if (primaryBallIndex >= 0 && fallingBalls.length > primaryBallIndex) {
		const targetBall = fallingBalls[primaryBallIndex];
		fallBall = targetBall;
		fallBallTime = targetBall.fallTime;
		fallBallI = rawBalls.findIndex((b) => b.id === targetBall.id);
		if (fallBallI === -1) fallBallI = primaryBallIndex;
	} else {
		fallBall = null;
		fallBallTime = Infinity;
		fallBallI = -1;
	}

	let targetX = -1;

	//--------------------------------------------------
	// 2. 目標バー位置 targetX の決定
	//--------------------------------------------------
	if (fallingBalls.length > primaryBallIndex) {
		const targetBall = fallingBalls[primaryBallIndex];
		const t1 = targetBall.fallTime;
		const x1 = targetBall.fallX;

		// バーが現在位置から落下位置 x1 へ到達するのに必要な時間（フレーム数）
		const distToFallX = Math.abs(x1 - bar.x);
		const timeNeeded = distToFallX / moveSpeed;
		// 余裕マージン（30フレーム = 約0.5秒）
		const moveThreshold = timeNeeded + 30;

		// ブロックが存在する実戦フィールドで、長期間戻ってこないボール（t1 > moveThreshold かつ t1 > 60）:
		// 戻ってくるタイミングが近づくまで追いかける必要はない！
		// 画面中央のホームポジションでどっしり構えて待機し、無駄な横移動を完全に抑制
		if (hasBlocksInField && t1 > moveThreshold && t1 > 60) {
			targetX = config.canvasWidth / 2;
		} else {
			if (fallingBalls.length > primaryBallIndex + 1) {
				const second = fallingBalls[primaryBallIndex + 1];
				const t2 = second.fallTime;
				const x2 = second.fallX;
				const deltaT = t2 - t1;
				const distBetween = Math.abs(x1 - x2);

				// 2つのボールがほぼ同時に落ちてくる場合
				if (deltaT <= 3 && distBetween <= bar.width * 0.75) {
					// 両方をバーの幅の中に収める中間地点
					targetX = (x1 + x2) / 2;
				} else if (t1 <= 12) {
					// 主ボール落下直前（12フレーム以内）は主ボールの中心を絶対死守！
					targetX = x1;
				} else {
					// 時間的余裕がある場合、主ボールを救出できる安全範囲（バー幅の15%以内）で次ボールへ寄せる
					const safeMargin = bar.width * 0.15;
					const shift = Math.min(safeMargin, Math.max(0, moveSpeed * deltaT));
					targetX = x1 + (x2 > x1 ? shift : -shift);
				}
			} else {
				targetX = x1;
			}
		}
	} else if (rawBalls.length > 0) {
		// まだ落下予測未到達の場合（長期間戻ってこない＝戻ってくるタイミングがまだわからない）
		// 戻ってくるタイミングがわかるまでボールを追う必要はないため、画面中央で安定待機
		targetX = config.canvasWidth / 2;
	}

	//--------------------------------------------------
	// 2-B. 有益アイテムの回収判定（ボール救出が可能な場合はアイテムを最優先で回収）
	//--------------------------------------------------
	let isFetchingItem = false;
	let bestItemX = -1;
	let bestItemTime = -1;
	if (items.length > 0) {
		const curItemSpeed = 4;
		let bestItemScore = -Infinity;

		for (let i = 0; i < items.length; i++) {
			const it = items[i];
			if (isHarmfulItem(it.type)) { continue; }

			const itSpeed = it.speed || curItemSpeed;
			const itY = (typeof it.getCenterY === 'function') ? it.getCenterY() : it.y;
			const itTime = Math.max(0, (bar.y - itY) / itSpeed);

			const itemX = (typeof it.getCenterX === 'function') ? it.getCenterX() : (it.width ? (it.x + it.width / 2) : it.x);
			// バー幅を考慮した必要移動距離（バーの幅の40%を許容マージンとする）
			const distToReachItem = Math.max(0, Math.abs(bar.x - itemX) - bar.width * 0.4);
			const timeToReachItem = distToReachItem / moveSpeed;

			// バーがアイテムの落下時刻までに間に合うか
			if (timeToReachItem <= itTime + 2) {
				let canCollectSafely = false;

				// 複数ボールがある場合、LIFEアイテムはボールを1つ落としてでも絶対に拾いに行く！
				// （ただし終盤全ボール防衛モード時はクリアボーナス優先のためボールを落とさない）
				if (isMultiBall && it.type === ITEM_TYPE.LIFE && !isEndgame) {
					canCollectSafely = true;
				} else if (fallingBalls.length > primaryBallIndex) {
					const t1 = fallingBalls[primaryBallIndex].fallTime;
					const x1 = fallingBalls[primaryBallIndex].fallX;
					const distToBallFromItem = Math.max(0, Math.abs(itemX - x1) - bar.width * 0.4);
					const timeToBallFromItem = distToBallFromItem / moveSpeed;

					// パターン 1: アイテムを回収してからボール救出に戻れるか
					const timeAfterCatchItem = Math.max(timeToReachItem, itTime);
					if (timeAfterCatchItem + timeToBallFromItem <= t1 - 1) {
						canCollectSafely = true;
					}
					// パターン 2: ボールとアイテムが近接しており、両方同時に受取可能な範囲
					else if (Math.abs(itemX - x1) <= bar.width * 0.65 && Math.abs(itTime - t1) <= 12) {
						canCollectSafely = true;
					}
					// パターン 3: ボールが上空にいて時間的余裕がたっぷりある（t1 > 35）
					else if (t1 > 35 && timeToReachItem * 2 <= t1 - 10 && itTime <= t1 - 5) {
						canCollectSafely = true;
					}
				} else {
					// ボールが上昇中（まだ落下してこない）なら、届くアイテムは安全に回収可能
					canCollectSafely = true;
				}

				// この有益アイテムの落下位置・時刻が有害デバフアイテムの危険ゾーンと干渉していないか検証
				if (canCollectSafely) {
					const isItemNearHarmful = items.some((hIt) => {
						if (!isHarmfulItem(hIt.type)) return false;
						const hSpeed = hIt.speed || curItemSpeed;
						const hY = typeof hIt.getCenterY === 'function' ? hIt.getCenterY() : hIt.y;
						if (hY >= bar.y) return false;
						const hTime = Math.max(0, (bar.y - hY) / hSpeed);
						const hX = typeof hIt.getCenterX === 'function' ? hIt.getCenterX() : (hIt.width ? (hIt.x + hIt.width / 2) : hIt.x);
						const hW = hIt.width || config.blkWidth || 50;
						const harmDist = (bar.width + hW) / 2 + 25;
						return Math.abs(hTime - itTime) <= 25 && Math.abs(hX - itemX) < harmDist;
					});
					if (isItemNearHarmful) {
						canCollectSafely = false;
					}
				}

				if (canCollectSafely) {
					// 到達が早く、強力・安全なアイテムを優先（LIFE=最優先、FIRE/MISSILE/DOUBLE=高優先）
					let baseScore = 1000;
					if (it.type === ITEM_TYPE.LIFE) baseScore = 50000;
					else if (it.type === ITEM_TYPE.FIRE || it.type === ITEM_TYPE.MISSILE) baseScore = 15000;
					else if (it.type === ITEM_TYPE.DOUBLE || it.type === ITEM_TYPE.HARD || it.type === ITEM_TYPE.GUN) baseScore = 8000;

					const score = baseScore - itTime;
					if (score > bestItemScore) {
						bestItemScore = score;
						bestItemX = itemX;
						bestItemTime = itTime;
					}
				}
			}
		}

		if (bestItemX !== -1) {
			targetX = bestItemX;
			isFetchingItem = true;
		}
	}

	//--------------------------------------------------
	// 2-C. 有害アイテム（減点・デバフ・毒）の確実な回避 (C-1)
	// ギリギリかすって被弾しないよう、衝突境界 + 25px 以上の十分な安全クリアランスを確保！
	//--------------------------------------------------
	if (items.length > 0) {
		const curItemSpeed = 4;

		for (let i = 0; i < items.length; i++) {
			const it = items[i];
			if (!isHarmfulItem(it.type)) { continue; }

			const itSpeed = it.speed || curItemSpeed;
			const itY = typeof it.getCenterY === 'function' ? it.getCenterY() : it.y;
			if (itY >= bar.y) { continue; }

			const itTime = (bar.y - itY) / itSpeed;
			const itemX = typeof it.getCenterX === 'function' ? it.getCenterX() : (it.width ? (it.x + it.width / 2) : it.x);
			const itemW = it.width || config.blkWidth || 50;
			// 物理衝突境界 (bar.width + itemW)/2 に対し、スピン・加減速・端部接触を完全に排除する十分な安全距離（+25px）
			const safeDistance = (bar.width + itemW) / 2 + 25;

			// アイテムが接近しており（65フレーム以内）、targetX または現在地 bar.x と衝突する危険があるか
			const willHitTarget = (targetX !== -1) ? (Math.abs(targetX - itemX) < safeDistance) : false;
			const willHitCurrent = Math.abs(bar.x - itemX) < safeDistance;

			if (itTime <= 65 && (willHitTarget || willHitCurrent)) {
				// ボールが直後に落ちてくるかチェック
				let mustCatchBallSoon = false;
				let ballFallX = -1;

				// 複数ボールがある場合、デバフアイテムはボールを落としてでも絶対に回避する！
				const ignoreBallCatchForHarm = isMultiBall && isHarmfulItem(it.type);

				if (!ignoreBallCatchForHarm && fallBall !== null && fallBallTime !== Infinity) {
					if (Math.abs(fallBallTime - itTime) <= 8) {
						mustCatchBallSoon = true;
						ballFallX = fallBall.fallX !== undefined ? fallBall.fallX : fallBall.x;
					}
				}

				if (mustCatchBallSoon) {
					// 単一ボール時の緊急ボール救出:
					// ボールをバーの端（端から8px内側）で確実に受け止めつつ、有害アイテムから最大限遠ざける
					const maxCatchOffset = bar.width / 2 - 8;
					let edgeTargetX = targetX;
					if (itemX >= ballFallX) {
						// アイテムが右側なら、バーを左に寄せてボールを右端で受ける
						edgeTargetX = ballFallX - maxCatchOffset;
					} else {
						// アイテムが左側なら、バーを右に寄せてボールを左端で受ける
						edgeTargetX = ballFallX + maxCatchOffset;
					}

					// ずらした結果、アイテムとの距離が物理衝突限界 + 12px 以上確保できるか？
					const hitRadius = (bar.width + itemW) / 2;
					if (Math.abs(edgeTargetX - itemX) >= hitRadius + 12) {
						targetX = edgeTargetX;
					} else {
						// どうしても両立できない至近距離の場合:
						// 毒(POISON)はライフ減少リスクがあるため完全退避を最優先
						if (it.type === ITEM_TYPE.POISON) {
							const avoidLeftX = itemX - safeDistance;
							const avoidRightX = itemX + safeDistance;
							targetX = (bar.x <= itemX) ? avoidLeftX : avoidRightX;
						} else {
							targetX = edgeTargetX;
						}
					}
				} else {
					// 完全退避: 有害アイテムから物理衝突境界 + 25px 以上完全に離れた安全位置へ移動
					const avoidLeftX = itemX - safeDistance;
					const avoidRightX = itemX + safeDistance;
					const canLeft = avoidLeftX >= bar.width / 2;
					const canRight = avoidRightX <= config.canvasWidth - bar.width / 2;

					// アイテムの真下をくぐって横切らないよう、現在位置から離れる安全方向を選択
					if (bar.x <= itemX) {
						// バーがアイテムの左側にいるなら左へ退避
						if (canLeft) {
							targetX = avoidLeftX;
						} else if (canRight) {
							targetX = avoidRightX;
						} else {
							targetX = bar.width / 2;
						}
					} else {
						// バーがアイテムの右側にいるなら右へ退避
						if (canRight) {
							targetX = avoidRightX;
						} else if (canLeft) {
							targetX = avoidLeftX;
						} else {
							targetX = config.canvasWidth - bar.width / 2;
						}
					}
					isFetchingItem = false;
				}
			}
		}
	}

	//--------------------------------------------------
	// 2-D. 武器使用のための能動的移動（ボール救出絶対最優先！）
	// ボール落下まで十分な余裕がある安全な時間帯のみ、ブロック破壊列（breakX）へ移動
	//--------------------------------------------------
	if (bar.weapon > 0) {
		const blockLine = computeBlockLine(rawBlocks, weapons, bar.weapon, config);
		const checkX = (targetX !== -1) ? targetX : bar.x;
		const breakX = getBestWeaponBreakX(blockLine, checkX, config);

		if (breakX !== -1) {
			// ボールを落とさないことを絶対最優先:
			// ボールが近く（残り35フレーム以内）に落ちてくる場合は、武器のための寄り道移動は一切禁止！
			const isBallFarEnough = (fallBall === null) || (fallBallTime > 35);

			if (isBallFarEnough) {
				const fallBallX = fallBall !== null ? (fallBall.fallX !== undefined ? fallBall.fallX : fallBall.x) : -1;
				// 往復所要時間に加え、反転やスピン加速等のための安全マージン（12フレーム以上）を確保
				const timeToBreak = Math.abs(breakX - bar.x) / moveSpeed;
				const timeToReturn = (fallBall !== null) ? Math.abs(fallBallX - breakX) / moveSpeed : 0;
				const canReturnForBall = (fallBall === null) ||
					(timeToBreak + timeToReturn + 12 <= fallBallTime);

				// 有益アイテム回収に戻る時間的余裕があるか
				const canReturnForItem = (bestItemX === -1 || bestItemTime <= 0) ||
					(timeToBreak + Math.abs(bestItemX - breakX) / moveSpeed + 8 <= bestItemTime);

				// 落下中の全ボール（第2ボール以降含む）に対しても間に合わなくなる危険がないか検証
				const canReturnForAllBalls = fallingBalls.every((b) => {
					const retTime = timeToBreak + Math.abs(b.fallX - breakX) / moveSpeed + 12;
					return retTime <= b.fallTime;
				});

				if (canReturnForBall && canReturnForItem && canReturnForAllBalls) {
					let aimBreakX = breakX;
					if (targetX !== -1 && Math.abs(breakX - targetX) > config.blkWidth / 2) {
						aimBreakX += (config.blkWidth * 0.35) * (targetX > breakX ? 1 : -1);
					}
					targetX = aimBreakX;
				}
			}
		}
	}

	//--------------------------------------------------
	// 3. 最適反射角・スピン（bestDvx）の探索
	//--------------------------------------------------
	let bestDvx = 0;
	let maxBreakNum = 0;
	let maxCollisionNum = 0;
	let bestReturnTime = MAX_RETURN_PREDICT;
	let bestScore = -Infinity;

	if (fallBall !== null) {
		const fallBallX = fallBall.fallX !== undefined ? fallBall.fallX : fallBall.x;
		const fallBallVX = fallBall.vx;

		let leftSpeed = (fallBallX - config.canvasWidth - bar.width / 2) * config.bSpin;
		let rightSpeed = (fallBallX - bar.width / 2) * config.bSpin;

		if (Math.abs(leftSpeed + fallBallVX) > config.bMaxSpeed) {
			leftSpeed = config.bMaxSpeed * (leftSpeed < 0 ? -1 : 1) - fallBallVX;
		}
		if (Math.abs(rightSpeed + fallBallVX) > config.bMaxSpeed) {
			rightSpeed = config.bMaxSpeed * (rightSpeed < 0 ? -1 : 1) - fallBallVX;
		}
		if (Math.abs(leftSpeed) > moveSpeed * config.bSpin) {
			leftSpeed = moveSpeed * config.bSpin * (leftSpeed < 0 ? -1 : 1);
		}
		if (Math.abs(rightSpeed) > moveSpeed * config.bSpin) {
			rightSpeed = moveSpeed * config.bSpin * (rightSpeed < 0 ? -1 : 1);
		}

		const minSpeed = Math.min(leftSpeed, rightSpeed);
		const maxSpeed = Math.max(leftSpeed, rightSpeed);
		leftSpeed = minSpeed;
		rightSpeed = maxSpeed;

		// 高解像度探索（元コードのRESOLUTION=400の思想をWorker内で一括高速実行）
		// 自由落下シミュレーション後のブロック盤面から探索マップを作成
		const predBlockMap = cloneBlockMap(blockMap, simGame);

		// 探索ヘルパー関数: 指定dvxでの軌道評価（全ボールの物理移動と破壊数を全体最適評価）
		const evaluateTrajectory = (dvx) => {
			const testBalls = fallSimulate.map((b, idx) => {
				const tb = instantiateBall(b, simGame);
				tb.breakNum = 0;
				tb.collisionNum = 0;
				tb.damageCollisionNum = 0;
				tb.infinitBreakNum = 0;
				tb.breakLimitFinishes = 0;
				tb.explodedCount = 0;
				tb.topRouteBreaks = 0;
				tb.throughBouncedCount = 0;
				tb.throughPassedCount = 0;
				if (idx === fallBallI) {
					tb.x = fallBallX;
					tb.y = bar.y - config.bSize;
					tb.vx = fallBallVX + dvx;
					tb.vy = -Math.abs(b.vy || config.bDefaultSpeed);
					tb.fell = false;
				}
				return tb;
			});

			const testBlockMap = cloneBlockMap(predBlockMap, simGame);
			let t = 0;
			let narrowChuteFrames = 0;
			let throughPocketFrames = 0;

			for (
				t = 0;
				testBalls[fallBallI].y + testBalls[fallBallI].radius <= bar.y && t <= MAX_RETURN_PREDICT;
				t++
			) {
				simulateSingleStep(testBalls, testBlockMap, config, simGame);
				if (hasNarrowChutes) {
					const curCol = Math.floor(testBalls[fallBallI].x / config.blkWidth);
					if (isNarrowChuteTrap[curCol]) {
						narrowChuteFrames++;
					}
				}
				if (hasThroughPockets) {
					const curCol = Math.floor(testBalls[fallBallI].x / config.blkWidth);
					if (isThroughPocketCol[curCol] && testBalls[fallBallI].y < colHighestUpThroughY[curCol]) {
						throughPocketFrames++;
					}
				}
			}

			let totalBreak = 0;
			let totalCollision = 0;
			let totalDamageCollision = 0;
			let totalInfinitBreak = 0;
			let totalBreakLimitFinishes = 0;
			let totalExploded = 0;
			let totalTopRouteBreaks = 0;
			let totalThroughBounced = 0;
			let totalThroughPassed = 0;
			for (let bi = 0; bi < testBalls.length; bi++) {
				totalBreak += testBalls[bi].breakNum;
				totalCollision += testBalls[bi].collisionNum;
				totalDamageCollision += (testBalls[bi].damageCollisionNum || 0);
				totalInfinitBreak += (testBalls[bi].infinitBreakNum || 0);
				totalBreakLimitFinishes += (testBalls[bi].breakLimitFinishes || 0);
				totalExploded += (testBalls[bi].explodedCount || 0);
				totalTopRouteBreaks += (testBalls[bi].topRouteBreaks || 0);
				totalThroughBounced += (testBalls[bi].throughBouncedCount || 0);
				totalThroughPassed += (testBalls[bi].throughPassedCount || 0);
			}

			// 評価スコア:
			// 1. 通常破壊: 1,000,000点
			// 2. 時限ブロックトドメ破壊ボーナス: 1個につき +15,000,000点（回復される前に最優先で粉砕！）
			// 3. 連続破壊コンボボーナス (B-1): 2個以上で (totalBreak^2 * 150,000点)
			// 4. 誘爆ブロック起爆ボーナス (A-1): 1個につき +2,000,000点
			// 5. 天井裏ルート連鎖ボーナス (A-2): 1個につき +500,000点
			// 6. Fireボール不壊破壊ボーナス: 1個につき +5,000,000点
			// 7. 一方通行正常透過ボーナス: 1回につき +50,000点
			// 8. 一方通行はじかれペナルティ: 1回につき -2,000,000点（はじかれる面への衝突を完全根絶！）
			// 9. 天井裏一方通行ポケット滞在ペナルティ: 1フレームにつき -50,000点（天井裏ピンポン玉往復を完全排除！）
			// 10. 細い空洞通路滞在ペナルティ: 1フレームにつき -10,000点（Stage Aimの無駄なピンポン玉ハマリを抑止）
			const returnedToBar = (testBalls[fallBallI].y + testBalls[fallBallI].radius >= bar.y);

			// ★ 重要: バーに帰還可能（returnedToBar === true）な軌道のみを最優先！
			// 天井裏ポケット等に閉じ込められてバーに戻ってこない未帰還軌道は score = -Infinity で排除
			let score = -Infinity;
			if (returnedToBar && totalBreak > 0) {
				const comboBonus = totalBreak >= 2 ? (totalBreak * totalBreak * 150000) : 0;
				score = (totalBreakLimitFinishes * 15000000)
					+ (totalInfinitBreak * 5000000)
					+ (totalExploded * 2000000)
					+ (totalBreak * 1000000)
					+ comboBonus
					+ (totalTopRouteBreaks * 500000)
					+ (totalThroughPassed * 50000)
					- (totalThroughBounced * 2000000)
					- (throughPocketFrames * 50000)
					+ (totalDamageCollision * 10)
					- (narrowChuteFrames * 10000)
					- t;

				// 微小横速度ペナルティ（天井裏ポケット・微小速度ループを抑止しつつ通常破壊・爆発スコアを維持）
				const resultantVx = Math.abs(fallBallVX + dvx);
				if (resultantVx < 0.6) {
					score -= 100000;
				}
			} else if (returnedToBar && totalDamageCollision > 0) {
				score = 1000 + (totalDamageCollision * 10) + (totalThroughPassed * 2000) - (totalThroughBounced * 1000000) - (throughPocketFrames * 50000) - (narrowChuteFrames * 10000) - t;
			} else if (returnedToBar && totalThroughPassed > 0 && totalThroughBounced === 0 && throughPocketFrames === 0) {
				score = 500 + (totalThroughPassed * 1000) - (narrowChuteFrames * 10000) - t;
			} else if (!returnedToBar && totalBreak > 0) {
				// 未帰還でもブロック破壊を達成している軌道は有効採用（帰還可能ルートが無い場合の最良手）
				// 破壊数に応じたスコアを与えつつ、帰還ルート（1,000,000〜）よりは低めに設定
				const comboBonus = totalBreak >= 2 ? (totalBreak * totalBreak * 50000) : 0;
				score = (totalBreakLimitFinishes * 10000000)
					+ (totalInfinitBreak * 2000000)
					+ (totalExploded * 1000000)
					+ (totalBreak * 300000)
					+ comboBonus
					+ (totalThroughPassed * 20000)
					- (totalThroughBounced * 1500000)
					- (throughPocketFrames * 50000)
					+ (totalDamageCollision * 5)
					- (narrowChuteFrames * 10000)
					- t;

				const resultantVx = Math.abs(fallBallVX + dvx);
				if (resultantVx < 0.6) {
					score -= 50000;
				}
			}

			return { score, totalBreak, totalCollision, totalDamageCollision, totalInfinitBreak, totalBreakLimitFinishes, totalExploded, totalTopRouteBreaks, t, dvx, returnedToBar };
		};

		// 1. 粗探索（Coarse Search）: 全探索範囲を均等走査
		const coarseSteps = 40;
		const dvxStep = (rightSpeed - leftSpeed) / Math.max(1, coarseSteps);

		for (let s = 0; s <= coarseSteps; s++) {
			const dvx = leftSpeed + dvxStep * s;
			const res = evaluateTrajectory(dvx);
			if (res.score > bestScore) {
				bestScore = res.score;
				maxBreakNum = res.totalBreak;
				maxCollisionNum = res.totalCollision;
				bestReturnTime = res.t;
				bestDvx = res.dvx;
			}
		}

		// 2. 密探索（Fine Search）: 最良解周辺を元コードの400分割以上の高解像度（超微細刻み）で集中探索
		if (bestScore > -Infinity && dvxStep > 0) {
			const fineSteps = 20;
			const fineRange = dvxStep;
			const fineStep = (fineRange * 2) / fineSteps;
			const fineBase = bestDvx;

			for (let f = 0; f <= fineSteps; f++) {
				const fineDvx = Math.max(leftSpeed, Math.min(rightSpeed, fineBase - fineRange + fineStep * f));
				const res = evaluateTrajectory(fineDvx);
				if (res.score > bestScore) {
					bestScore = res.score;
					maxBreakNum = res.totalBreak;
					maxCollisionNum = res.totalCollision;
					bestReturnTime = res.t;
					bestDvx = res.dvx;
				}
			}
		}

		// 帰還可能な破壊ルートが見つからない場合、クラスタリングターゲティング＆フォールバック処理
		if (bestScore === -Infinity) {
			// ★ クラスタリングターゲティング＆外壁バウンド誘発（Stage Fly等の手前不壊ブロック・中央空洞ループの完全解消）
			// 中央空洞（col 6〜8）からまっすぐ打ち上げると、手前の不壊ブロックに阻まれるか、天井裏ポケットに直行してしまう。
			// そこで、ブロックが存在する側の外壁（x=0 または x=750）へ向けて強い横速度（|vx| >= 2.5）で打ち込み、
			// 外壁バウンドからブロック群の側面・裏側へ一気に突入させる！
			const isFireBall = (fallBall !== null && fallBall.status === BALL_STATUS.ULTIMATE);
			const midX = config.canvasWidth / 2;
			let leftSumX = 0, leftCount = 0;
			let rightSumX = 0, rightCount = 0;

			for (let i = 0; i < rawBlocks.length; i++) {
				const row = rawBlocks[i];
				if (!row) { continue; }
				for (let j = 0; j < row.length; j++) {
					const b = row[j];
					if (!b || !isBlockAlive(b)) { continue; }
					const bType = b.type !== 0 ? b.type : (b.blinkType || 0);
					const isInf = (b.infinit === 1 || (DEFAULT_CONFIG.blockInfinit && DEFAULT_CONFIG.blockInfinit[bType] === 1));
					if (isInf && !isFireBall) continue; // 通常時は不壊ブロックを除外
					const bx = (b.x !== undefined ? b.x + (b.width || 40) / 2 : j * 50 + 25);
					if (bx < midX) {
						leftSumX += bx;
						leftCount++;
					} else {
						rightSumX += bx;
						rightCount++;
					}
				}
			}

			if (urgentBreakLimitBlock) {
				// ★ 最優先: カウントダウン中の時限ブロック（BreakLimit）へのダイレクトエイム
				// 時間切れで回復される前にトドメを刺す！
				const ubx = urgentBreakLimitBlock.x !== undefined
					? urgentBreakLimitBlock.x + (urgentBreakLimitBlock.width || config.blkWidth) / 2
					: urgentBreakLimitBlock.col * config.blkWidth + config.blkWidth / 2;
				const ucol = (urgentBreakLimitBlock.col !== undefined && urgentBreakLimitBlock.col >= 0 && urgentBreakLimitBlock.col < numCols)
					? urgentBreakLimitBlock.col
					: Math.max(0, Math.min(numCols - 1, Math.floor(ubx / config.blkWidth)));
				if (hasThroughBlocks && colHasDownThrough[ucol]) {
					// 手前が下向き一方通行で塞がれている場合は外壁バウンドで頭上へ回り込む
					const targetSide = (ubx < midX) ? -1 : 1;
					bestDvx = (targetSide * 3.5) - fallBallVX;
				} else {
					const dx = ubx - fallBallX;
					const targetVx = Math.max(-config.bMaxSpeed * 0.9, Math.min(config.bMaxSpeed * 0.9, dx * 0.02));
					let desiredDvx = targetVx - fallBallVX;
					if (Math.abs(fallBallVX + desiredDvx) < 0.6) {
						desiredDvx = (dx >= 0 ? 1.2 : -1.2) - fallBallVX;
					}
					bestDvx = desiredDvx;
				}
			} else if (leftCount > 0 || rightCount > 0) {
				const totalCount = leftCount + rightCount;
				let targetX = null;
				if (totalCount <= 6) {
					targetX = (leftSumX + rightSumX) / totalCount;
				} else if (maxWindowBlocks >= 10 && denseCenterX !== undefined) {
					targetX = denseCenterX;
				}

				// ★ 一方通行ブロック（▼▼▼ または ▲▲▲）による手前遮蔽・天井裏トラップチェック
				let isBlockedByThrough = false;
				if (targetX !== null && hasThroughBlocks) {
					const tcol = Math.max(0, Math.min(numCols - 1, Math.floor(targetX / config.blkWidth)));
					if (colHasDownThrough[tcol] || colHasUpThrough[tcol]) {
						isBlockedByThrough = true;
					}
				}

				if (targetX !== null && !isBlockedByThrough) {
					// 正面からダイレクトエイム可能！
					const dx = targetX - fallBallX;
					const factor = 0.015;
					const targetVx = Math.max(-config.bMaxSpeed * 0.85, Math.min(config.bMaxSpeed * 0.85, dx * factor));
					let desiredDvx = targetVx - fallBallVX;
					if (Math.abs(fallBallVX + desiredDvx) < 0.6) {
						desiredDvx = (dx >= 0 ? 1.2 : -1.2) - fallBallVX;
					}
					bestDvx = desiredDvx;
				} else {
					// ★ 一方通行ブロック遮蔽時または全般フォールバック:
					// はじかれる方向への無駄な衝突を絶対に避け、ブロック群が多い側の外壁へ向けて急角度反射（外壁バウンド）を誘発！
					const targetSide = (leftCount >= rightCount) ? -1 : 1;
					const targetVx = (targetSide * 3.5);
					let desiredDvx = targetVx - fallBallVX;

					// 微小横速度（|vx| < 1.5）による天井裏・一方通行ポケットピンポン玉ループを絶対に防ぐ
					if (Math.abs(fallBallVX + desiredDvx) < 1.5) {
						desiredDvx = (targetSide * 3.2) - fallBallVX;
					}
					bestDvx = desiredDvx;
				}
			}
		}

		sim.bestDvx = bestDvx;
		sim.breakMaxNum = maxBreakNum;
		sim.collisionMaxNum = maxCollisionNum;
		sim.returnTime = bestReturnTime;
		sim.dvx = bestDvx;
		sim.bestScore = bestScore;
	}

	//--------------------------------------------------
	// 4. 危険な敵弾（武器）の波状・全体俯瞰回避 (C-2)
	// 最初の一撃だけでなく、接近中の全弾の弾道・到達時刻を統合して安全スロットを探索！
	// 複数ボール存在時は、毒アイテム同様にボールを落としてでも敵弾を絶対に完全回避！
	//--------------------------------------------------
	if (weapons.length > 0) {
		const incomingWeapons = [];
		for (let i = 0; i < weapons.length; i++) {
			const w = weapons[i];
			if (w.vect < 0 && w.y < bar.y) {
				const wSpeed = Math.abs(w.vy) || 4;
				const timeToBar = (bar.y - w.y) / wSpeed;
				if (timeToBar <= 65) {
					incomingWeapons.push({
						x: w.x,
						y: w.y,
						vy: w.vy,
						time: timeToBar,
						size: w.size || 1,
					});
				}
			}
		}

		if (incomingWeapons.length > 0) {
			incomingWeapons.sort((a, b) => a.time - b.time);

			const minX = bar.width / 2;
			const maxX = config.canvasWidth - bar.width / 2;
			const hitClearance = bar.width / 2 + 12; // 物理衝突境界 (bar.width/2) + 安全マージン 12px

			const checkCurrentX = (targetX !== -1) ? targetX : bar.x;
			const hasThreatToCurrent = incomingWeapons.some((w) => {
				return w.time <= 55 && Math.abs(checkCurrentX - w.x) < hitClearance;
			});

			if (hasThreatToCurrent) {
				// ボール救出の必要性判定
				// ★ 複数ボール存在時は毒アイテム同様、ボールを落としてでも敵弾を絶対に完全回避！
				const mustCatchBall = (!isMultiBall) && (fallBall !== null) && (fallBallTime !== Infinity) && (fallBallTime <= 60);
				const ballFallX = mustCatchBall ? (fallBall.fallX !== undefined ? fallBall.fallX : fallBall.x) : -1;

				const candidates = new Set();
				candidates.add(minX);
				candidates.add(maxX);
				candidates.add(config.canvasWidth / 2);
				if (mustCatchBall) {
					candidates.add(Math.max(minX, Math.min(maxX, ballFallX)));
					candidates.add(Math.max(minX, Math.min(maxX, ballFallX - bar.width * 0.35)));
					candidates.add(Math.max(minX, Math.min(maxX, ballFallX + bar.width * 0.35)));
				}

				for (let i = 0; i < incomingWeapons.length; i++) {
					const w = incomingWeapons[i];
					const safeLeft = w.x - hitClearance - 6;
					const safeRight = w.x + hitClearance + 6;
					if (safeLeft >= minX && safeLeft <= maxX) candidates.add(safeLeft);
					if (safeRight >= minX && safeRight <= maxX) candidates.add(safeRight);
				}

				// グリッド走査（20px刻みで全域カバー）
				for (let x = minX; x <= maxX; x += 20) {
					candidates.add(x);
				}

				let bestAvoidX = -1;
				let bestAvoidScore = -Infinity;

				candidates.forEach((candX) => {
					// 1. 移動時間チェック: 直近の弾までに bar.x から candX へ移動できるか？
					const timeToReach = Math.abs(candX - bar.x) / moveSpeed;
					if (incomingWeapons[0].time < 12 && timeToReach > incomingWeapons[0].time + 1) {
						return;
					}

					// 2. 接近中の全敵弾に対する安全性チェック（波状攻撃の全貌を俯瞰）
					let minMissMargin = Infinity;
					let hitCount = 0;

					for (let i = 0; i < incomingWeapons.length; i++) {
						const w = incomingWeapons[i];
						const dist = Math.abs(candX - w.x);
						const margin = dist - hitClearance;
						if (margin < 0) {
							hitCount++;
						} else {
							if (margin < minMissMargin) {
								minMissMargin = margin;
							}
						}
					}

					let score = 0;
					if (hitCount === 0) {
						// 全弾を安全に回避できる完全安全スロット！
						score += 100000;
						score += Math.min(100, minMissMargin);

						const distToWall = Math.min(candX - minX, maxX - candX);
						if (distToWall < 50) {
							score -= (50 - distToWall);
						}

						if (mustCatchBall) {
							const ballDist = Math.abs(candX - ballFallX);
							if (ballDist <= bar.width / 2 - 8) {
								score += 500000;
								score -= ballDist * 10;
							} else {
								score -= ballDist;
							}
						} else {
							score -= Math.abs(candX - checkCurrentX) * 0.5;
						}
					} else {
						score -= hitCount * 10000;
						const distToFirst = Math.abs(candX - incomingWeapons[0].x) - hitClearance;
						if (distToFirst > 0) {
							score += 5000;
						}
						score -= timeToReach * 10;
					}

					if (score > bestAvoidScore) {
						bestAvoidScore = score;
						bestAvoidX = candX;
					}
				});

				if (bestAvoidX !== -1) {
					targetX = bestAvoidX;
				}
			}
		}
	}

	// 画面内にクランプ
	if (targetX !== -1) {
		targetX = Math.max(bar.width / 2, Math.min(config.canvasWidth - bar.width / 2, targetX));
	}

	// スピンによりバーに与えるオフセット速度量
	let spinOffset = 0;
	if (config.bSpin && !isFetchingItem) {
		spinOffset = bestDvx / config.bSpin;
		const maxOffset = moveSpeed;
		if (Math.abs(spinOffset) > maxOffset) {
			spinOffset = maxOffset * (spinOffset < 0 ? -1 : 1);
		}
	}

	// ★ スピンオフセットによるデバフアイテム方向への踏み込み・かすり接触の絶対防止！
	if (items.length > 0 && targetX !== -1 && spinOffset !== 0) {
		for (let i = 0; i < items.length; i++) {
			const it = items[i];
			if (!isHarmfulItem(it.type)) continue;
			const itY = typeof it.getCenterY === 'function' ? it.getCenterY() : it.y;
			if (itY >= bar.y) continue;
			const itSpeed = it.speed || 4;
			const itTime = (bar.y - itY) / itSpeed;
			if (itTime <= 50) {
				const itemX = typeof it.getCenterX === 'function' ? it.getCenterX() : (it.width ? (it.x + it.width / 2) : it.x);
				const itemW = it.width || config.blkWidth || 50;
				const hitRadius = (bar.width + itemW) / 2;
				// スピン適用後のバー目標位置 (targetX - spinOffset) が、衝突限界 + 20px 以内に入るならスピンを無効化
				if (Math.abs((targetX - spinOffset) - itemX) < hitRadius + 20) {
					spinOffset = 0;
					break;
				}
			}
		}
	}

	// ★ スピンオフセットによる敵弾方向への踏み込み・被弾の絶対防止！
	if (weapons.length > 0 && targetX !== -1 && spinOffset !== 0) {
		for (let i = 0; i < weapons.length; i++) {
			const w = weapons[i];
			if (w.vect < 0 && w.y < bar.y) {
				const wSpeed = Math.abs(w.vy) || 4;
				const timeToBar = (bar.y - w.y) / wSpeed;
				if (timeToBar <= 50) {
					if (Math.abs((targetX - spinOffset) - w.x) < bar.width / 2 + 15) {
						spinOffset = 0;
						break;
					}
				}
			}
		}
	}

	//--------------------------------------------------
	// 5. 吸着（ABSORB）時の最適発射位置（密集地・爆発ブロック列）の算出 (A-3)
	//--------------------------------------------------
	let bestAbsorbX = -1;
	let maxColDensity = -1;
	const blkWidth = config.blkWidth || 50;
	const cols = Math.floor(config.canvasWidth / blkWidth);
	const colScores = new Array(cols).fill(0);
	for (let i = 0; i < rawBlocks.length; i++) {
		const row = rawBlocks[i];
		if (!row) continue;
		for (let j = 0; j < row.length; j++) {
			const b = row[j];
			if (!b || !isBlockAlive(b)) continue;
			const col = (b.col !== undefined) ? b.col : Math.floor((b.x !== undefined ? b.x : j * blkWidth) / blkWidth);
			if (col >= 0 && col < cols) {
				const bType = b.type !== 0 ? b.type : (b.blinkType || 0);
				const isInf = (b.infinit === 1 || (DEFAULT_CONFIG.blockInfinit && DEFAULT_CONFIG.blockInfinit[bType] === 1));
				if (b.func === BLOCK_FUNCTION.EXPLODE || b.func === BLOCK_FUNCTION.EXPLODE_STRENGTH) {
					colScores[col] += 50;
				} else if (!isInf) {
					colScores[col] += 1;
				}
			}
		}
	}

	// 最下部（バーから見て最初）のブロックが不壊ブロックで塞がれている列は、下からの直撃が不可能なので大幅減点
	for (let c = 0; c < cols; c++) {
		for (let i = rawBlocks.length - 1; i >= 0; i--) {
			const row = rawBlocks[i];
			if (!row) continue;
			let lowestBlock = null;
			for (let j = 0; j < row.length; j++) {
				const b = row[j];
				if (!b || !isBlockAlive(b)) continue;
				const col = (b.col !== undefined) ? b.col : Math.floor((b.x !== undefined ? b.x : j * blkWidth) / blkWidth);
				if (col === c) {
					lowestBlock = b;
					break;
				}
			}
			if (lowestBlock) {
				const lowestType = lowestBlock.type !== 0 ? lowestBlock.type : (lowestBlock.blinkType || 0);
				const isInf = (lowestBlock.infinit === 1 || (DEFAULT_CONFIG.blockInfinit && DEFAULT_CONFIG.blockInfinit[lowestType] === 1));
				if (isInf) {
					colScores[c] -= 500;
				}
				break;
			}
		}
	}

	for (let c = 0; c < cols; c++) {
		if (colScores[c] > maxColDensity) {
			maxColDensity = colScores[c];
			bestAbsorbX = (c + 0.5) * blkWidth;
		}
	}

	//--------------------------------------------------
	// 6. 武器発射評価
	//--------------------------------------------------
	const fireWeapon = evaluateWeaponFire(bar, weapons, rawBlocks, config);

	return {
		targetX,
		bestDvx,
		bestScore,
		spinOffset,
		plusSpeed: spinOffset,
		fallBallTime,
		fallBallId: fallBall !== null ? fallBall.id : null,
		fireWeapon,
		bestAbsorbX,
		simuData: sim,
		isFetchingItem,
		predictions: fallingBalls.map((b) => ({
			id: b.id,
			fallTime: b.fallTime,
			fallX: b.fallX,
			fell: b.fell,
		})),
	};
}
