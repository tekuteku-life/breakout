// src/ObjectManage.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import EventBus from "./EventBus.js";
import Bar from "./Bar.js";
import Ball from "./Ball.js";
import Item from "./Item.js";
import Weapon from "./Weapon.js";
import Balloon from "./Balloon.js";
import Cloud from "./Cloud.js";
import {
	BALL_CREATE_MODE,
	BALL_COPY_MODE,
	BALL_STATUS,
	ITEM_TYPE,
	BLOCK_FUNCTION,
	WEAPON_TYPE,
} from "./const.js";
import PresetManage from "./PresetManage.js";

//--------------------------------------------------
// オブジェクト管理（Ball, Block, Item, Weapon, Bar 等の統合管理）
//--------------------------------------------------
export default class ObjectManage {
	constructor(game = null) {
		this.game = game;

		this.bar = null;
		this.balls = [];
		this.blockMap = [];
		this.items = [];
		this.weapons = [];
		this.balloons = [];

		this.eventBusSetup = false;
		this.setupEventBus();
	}

	destructor() {
		this.clearEntities();

		if (this.bar && typeof this.bar.destructor === 'function') {
			this.bar.destructor();
		}
		this.bar = null;

		if (this.blockMap) {
			for (let i = 0; i < this.blockMap.length; i++) {
				if (this.blockMap[i]) {
					for (let j = 0; j < this.blockMap[i].length; j++) {
						const b = this.blockMap[i][j];
						if (b && typeof b.destructor === 'function') {
							b.destructor();
						}
					}
				}
			}
			this.blockMap = [];
		}

		this.removeEventBus();
		this.game = null;
	}

	setupEventBus() {
		if (this.eventBusSetup) { return; }
		this.eventBusSetup = true;

		this.onItemSpawnHandler = (data) => {
			if (data) this.spawnItem(data);
		};
		this.onWeaponSpawnHandler = (data) => {
			if (data) {
				this.spawnWeapon(data.type, data.x, data.y, data.vect);
			} else {
				this.spawnWeapon();
			}
		};
		this.onBalloonSpawnHandler = (data) => {
			if (data) this.spawnBalloon(data);
		};
		this.onBallLaunchHandler = (data) => {
			const mdTime = (data && data.mouseDownTime !== undefined) ? data.mouseDownTime : 0;
			if (this.balls.length === 0) {
				if (this.isPlayerAlive() && (!data || data.mouseDownTime === undefined || mdTime !== 0)) {
					this.launchBall(mdTime);
				}
			} else if (data && data.fireWeapon) {
				this.spawnWeapon();
			}
		};
		this.onBallApplyItemHandler = (type) => {
			this.applyBallItem(type);
		};
		this.onBallAllLostHandler = () => {
			this.onBallAllLost();
		};
		this.onBallRelaunchHandler = (data) => {
			const barVx = (data && data.barVx !== undefined) ? data.barVx : (this.bar ? this.bar.vx : 0);
			this.relaunchBall(barVx);
		};

		EventBus.addOnEvent('item:spawn', this.onItemSpawnHandler);
		EventBus.addOnEvent('weapon:spawn', this.onWeaponSpawnHandler);
		EventBus.addOnEvent('balloon:spawn', this.onBalloonSpawnHandler);
		EventBus.addOnEvent('ball:launch', this.onBallLaunchHandler);
		EventBus.addOnEvent('ball:applyItem', this.onBallApplyItemHandler);
		EventBus.addOnEvent('ball:allLost', this.onBallAllLostHandler);
		EventBus.addOnEvent('ball:relaunch', this.onBallRelaunchHandler);
	}

	removeEventBus() {
		if (!this.eventBusSetup) { return; }
		if (this.onItemSpawnHandler) { EventBus.removeOnEvent('item:spawn', this.onItemSpawnHandler); }
		if (this.onWeaponSpawnHandler) { EventBus.removeOnEvent('weapon:spawn', this.onWeaponSpawnHandler); }
		if (this.onBalloonSpawnHandler) { EventBus.removeOnEvent('balloon:spawn', this.onBalloonSpawnHandler); }
		if (this.onBallLaunchHandler) { EventBus.removeOnEvent('ball:launch', this.onBallLaunchHandler); }
		if (this.onBallApplyItemHandler) { EventBus.removeOnEvent('ball:applyItem', this.onBallApplyItemHandler); }
		if (this.onBallAllLostHandler) { EventBus.removeOnEvent('ball:allLost', this.onBallAllLostHandler); }
		if (this.onBallRelaunchHandler) {
			EventBus.removeOnEvent('ball:relaunch', this.onBallRelaunchHandler);
		}

		this.onItemSpawnHandler = null;
		this.onWeaponSpawnHandler = null;
		this.onBalloonSpawnHandler = null;
		this.onBallLaunchHandler = null;
		this.onBallApplyItemHandler = null;
		this.onBallAllLostHandler = null;
		this.onBallRelaunchHandler = null;
		this.eventBusSetup = false;
	}

	applyPreset(preset = null) {
		this.preset = preset || null;
	}

	init(stageIndex = 0) {
		this.clearEntities();
		this.initBar();
		this.loadBlockMap(stageIndex);
	}

	initBar() {
		if (this.bar && typeof this.bar.destructor === 'function') {
			this.bar.destructor();
		}
		this.bar = new Bar(this.game);
	}

	loadBlockMap(stageIndex = 0) {
		if (this.blockMap) {
			for (let i = 0; i < this.blockMap.length; i++) {
				if (this.blockMap[i]) {
					for (let j = 0; j < this.blockMap[i].length; j++) {
						const b = this.blockMap[i][j];
						if (b && typeof b.destructor === 'function') {
							b.destructor();
						}
					}
				}
			}
			this.blockMap = [];
		}

		const blockMapSet = (this.game && this.game.blockMapSet) || (this.preset && this.preset.blockMapSet) || [];
		if (blockMapSet[stageIndex] && typeof blockMapSet[stageIndex].copyMap === 'function') {
			this.blockMap = blockMapSet[stageIndex].copyMap(this.game || this.preset);
		} else {
			this.blockMap = [];
		}
	}

	clearEntities() {
		for (let i = 0; i < this.balls.length; i++) {
			if (this.balls[i] && typeof this.balls[i].destructor === 'function') {
				this.balls[i].destructor();
			}
		}
		this.balls = [];

		for (let i = 0; i < this.items.length; i++) {
			if (this.items[i] && typeof this.items[i].destructor === 'function') {
				this.items[i].destructor();
			}
		}
		this.items = [];

		for (let i = 0; i < this.weapons.length; i++) {
			if (this.weapons[i] && typeof this.weapons[i].destructor === 'function') {
				this.weapons[i].destructor();
			}
		}
		this.weapons = [];

		for (let i = 0; i < this.balloons.length; i++) {
			if (this.balloons[i] && typeof this.balloons[i].destructor === 'function') {
				this.balloons[i].destructor();
			}
		}
		this.balloons = [];
	}

	step(currentTime = Date.now(), deltaTime = 0) {
		// 1. 状態更新フェーズ
		this.updateStates();

		// 2. 位置移動フェーズ（物理演算）
		this.updatePositions();

		// 3. 場の効果フェーズ
		this.applyFieldEffects();

		// 4. 衝突解決フェーズ
		this.resolveCollisions();
	}

	//--------------------------------------------------
	// 近傍ブロックの探索
	//--------------------------------------------------
	getNearbyBlocks(x, y, radius, vx = 0, vy = 0) {
		if (!this.blockMap) { return []; }
		const def = PresetManage.getDefaultPreset();
		const blkWidth = (this.game && this.game.blockWidth) || (this.preset && this.preset.blockWidth) || def.blockWidth;
		const blkHeight = (this.game && this.game.blockHeight) || (this.preset && this.preset.blockHeight) || def.blockHeight;
		const sBarHeight = (this.game && this.game.statusBarHeight) || (this.preset && this.preset.statusBarHeight) || def.statusBarHeight || 0;

		const prevX = x - vx;
		const prevY = y - vy;

		const minBoundX = Math.min(x, prevX) - radius;
		const maxBoundX = Math.max(x, prevX) + radius;
		const minBoundY = Math.min(y, prevY) - radius;
		const maxBoundY = Math.max(y, prevY) + radius;

		const minX = Math.max(0, Math.floor(minBoundX / blkWidth));
		const maxX = Math.floor(maxBoundX / blkWidth);
		const minY = Math.max(0, Math.floor((minBoundY - sBarHeight) / blkHeight));
		const maxY = Math.floor((maxBoundY - sBarHeight) / blkHeight);

		const candidates = [];
		for (let i = minY; i <= maxY; i++) {
			const row = this.blockMap[i];
			if (!row) { continue; }
			for (let j = minX; j <= maxX; j++) {
				const block = row[j];
				if (block && block.type !== 0) {
					candidates.push(block);
				}
			}
		}

		if (candidates.length > 1) {
			candidates.sort((a, b) => {
				const midAX = a.x + a.width / 2;
				const midAY = a.y + a.height / 2;
				const midBX = b.x + b.width / 2;
				const midBY = b.y + b.height / 2;
				const distA = (prevX - midAX) ** 2 + (prevY - midAY) ** 2;
				const distB = (prevX - midBX) ** 2 + (prevY - midBY) ** 2;
				return distA - distB;
			});
		}

		return candidates;
	}

	//--------------------------------------------------
	// 状態更新フェーズ（全エンティティのタイマー・状態更新）
	//--------------------------------------------------
	updateStates() {
		// バー状態更新（武器発射間隔等）
		if (this.bar && typeof this.bar.updateState === 'function') {
			this.bar.updateState();
		}

		// アイテム状態更新（画面外落下判定・消去）
		for (let i = this.items.length - 1; i >= 0; i--) {
			const it = this.items[i];
			if (it && typeof it.updateState === 'function') {
				it.updateState();
			}
		}

		// ブロック状態更新（爆発カウント、耐久度カウントダウン、点滅、弾発射タイマー等）
		if (this.blockMap) {
			const hasBalls = this.balls.length > 0;
			for (let i = 0, len1 = this.blockMap.length; i < len1; i++) {
				const blockLine = this.blockMap[i];
				if (blockLine) {
					for (let j = 0, len2 = blockLine.length; j < len2; j++) {
						const block = blockLine[j];
						if (block && typeof block.updateState === 'function') {
							block.updateState(hasBalls);
						}
					}
				}
			}
		}

		// ボール状態更新
		for (let i = 0; i < this.balls.length; i++) {
			const b = this.balls[i];
			if (b && typeof b.updateState === 'function') {
				b.updateState();
			}
		}

		// 武器状態更新（発射音、画面外アウト判定・消去）
		for (let i = this.weapons.length - 1; i >= 0; i--) {
			const w = this.weapons[i];
			if (w && typeof w.updateState === 'function') {
				w.updateState();
			}
		}
	}

	//--------------------------------------------------
	// 位置移動フェーズ（全エンティティの物理座標・速度計算）
	//--------------------------------------------------
	updatePositions() {
		// バー移動
		if (this.bar && typeof this.bar.movePosition === 'function') {
			this.bar.movePosition();
		}

		// アイテム移動
		for (let i = 0; i < this.items.length; i++) {
			const it = this.items[i];
			if (it && typeof it.movePosition === 'function') {
				it.movePosition();
			}
		}

		// ブロック移動（横移動ブロック）
		if (this.blockMap) {
			for (let i = 0, len1 = this.blockMap.length; i < len1; i++) {
				const blockLine = this.blockMap[i];
				if (blockLine) {
					for (let j = 0, len2 = blockLine.length; j < len2; j++) {
						const block = blockLine[j];
						if (block && typeof block.movePosition === 'function') {
							block.movePosition(this.blockMap);
						}
					}
				}
			}
		}

		// ボール移動
		for (let i = 0; i < this.balls.length; i++) {
			const b = this.balls[i];
			if (b && typeof b.movePosition === 'function') {
				b.movePosition(this.bar);
			}
		}

		// 武器移動
		for (let i = 0; i < this.weapons.length; i++) {
			const w = this.weapons[i];
			if (w && typeof w.movePosition === 'function') {
				w.movePosition();
			}
		}
	}

	//--------------------------------------------------
	// エンティティ更新（状態更新・位置移動の一括実行）
	//--------------------------------------------------
	updateEntities() {
		this.updateStates();
		this.updatePositions();
	}

	//--------------------------------------------------
	// 場の効果フェーズ（引力・斥力ブロックの力適用）
	//--------------------------------------------------
	applyFieldEffects() {
		if (!this.blockMap || this.balls.length === 0) { return; }
		for (let i = 0, len1 = this.blockMap.length; i < len1; i++) {
			const row = this.blockMap[i];
			if (!row) { continue; }
			for (let j = 0, len2 = row.length; j < len2; j++) {
				const block = row[j];
				if (!block || block.type === 0) { continue; }
				if (block.func === BLOCK_FUNCTION.MAGNET || block.func === BLOCK_FUNCTION.REPULL) {
					for (let k = 0; k < this.balls.length; k++) {
						const ball = this.balls[k];
						if (ball) { block.applyMagneticForce(ball); }
					}
				}
			}
		}
	}

	//--------------------------------------------------
	// 衝突解決フェーズ（衝突判定と調停）
	//--------------------------------------------------
	resolveCollisions() {
		const def = PresetManage.getDefaultPreset();
		const canvasWidth = (this.game && this.game.canvasWidth) || (this.preset && this.preset.canvasWidth) || def.canvasWidth;
		const canvasHeight = (this.game && this.game.canvasHeight) || (this.preset && this.preset.canvasHeight) || def.canvasHeight;
		const statusBarHeight = (this.game && this.game.statusBarHeight) || (this.preset && this.preset.statusBarHeight) || def.statusBarHeight || 0;

		// 1. ボール vs バー・壁・ブロック
		for (let i = this.balls.length - 1; i >= 0; i--) {
			const ball = this.balls[i];
			if (!ball) { continue; }

			// 吸着状態のボールはバーに追従固定されているため衝突判定をスキップ
			if (ball.isAbsorption === 1) {
				continue;
			}

			// バーとの衝突・吸着（画面下端より手前にあるバーとの接触を先に判定）
			let hitBar = false;
			if (this.bar && typeof ball.checkCollisionWithBar === 'function') {
				hitBar = ball.checkCollisionWithBar(this.bar);
			}

			// バーに当たって吸着状態へ遷移した場合は以降の判定を行わない
			if (ball.isAbsorption === 1) {
				continue;
			}

			// バーと衝突しなかった場合のみ、壁・天井・画面下端（落下）との衝突を判定
			if (!hitBar && typeof ball.checkCollisionWithWall === 'function') {
				ball.checkCollisionWithWall(canvasWidth, canvasHeight, statusBarHeight);
			}

			// 落下して消滅したボールは以降の衝突判定を行わない
			if (!ball.game || this.balls.indexOf(ball) === -1) {
				continue;
			}

			// ブロックとの衝突
			if (typeof ball.checkCollision === 'function') {
				const nearBlocks = this.getNearbyBlocks(ball.x, ball.y, ball.radius, ball.vx, ball.vy);
				for (let k = 0; k < nearBlocks.length; k++) {
					const blk = nearBlocks[k];
					if (ball.checkCollision(blk, this.blockMap) === true) {
						const isChangedVY = (ball.lastHitAxis === 'y' || ball.lastHitAxis === 'both') ? 1 : 0;
						const addSpeed = blk.action(ball, isChangedVY, this.blockMap);
						if (addSpeed && typeof ball.applySpeedDelta === 'function') {
							ball.applySpeedDelta(addSpeed);
						}
						break;
					}
				}
			}

			// 位置履歴の更新
			if (typeof ball.updateHistory === 'function') {
				ball.updateHistory();
			}
		}

		// 2. アイテム vs バー
		if (this.bar) {
			for (let i = this.items.length - 1; i >= 0; i--) {
				const item = this.items[i];
				if (!item) { continue; }
				if (item.checkCollision(this.bar) === true) {
					item.applyEffect();
					item.destructor();
				}
			}
		}

		// 3. 武器 vs ブロック（自機武器） / 武器 vs バー（敵武器）
		for (let i = this.weapons.length - 1; i >= 0; i--) {
			const weapon = this.weapons[i];
			if (!weapon) { continue; }

			// 自機武器 vs ブロック
			if (weapon.vect > 0) {
				const nearBlocks = this.getNearbyBlocks(weapon.x, weapon.y, weapon.size * 4, 0, -weapon.vy);
				for (let k = 0; k < nearBlocks.length; k++) {
					const blk = nearBlocks[k];
					if (weapon.checkCollision(blk) === true) {
						if (blk.func !== BLOCK_FUNCTION.EXPLODE && blk.func !== BLOCK_FUNCTION.EXPLODE_STRENGTH) {
							EventBus.emitEvent('sound:play', 'block');
						}
						if (weapon.type === WEAPON_TYPE.MISSILE) {
							blk.action(null, 0, this.blockMap);
						} else if (blk.infinit !== 1) {
							if (blk.life < 1) {
								blk.action(null, 0, this.blockMap);
							} else {
								blk.decreaseLife();
							}
						}
						weapon.destructor();
						break;
					}
				}
			// 敵武器 vs バー
			} else if (weapon.vect < 0 && this.bar) {
				if (weapon.checkCollision(this.bar) === true) {
					this.bar.endamage(1);
					const def = PresetManage.getDefaultPreset();
					const balloonCfg = (this.game && this.game.damageBalloon) || (this.preset && this.preset.damageBalloon) || def.damageBalloon || {
						offsetX: 10,
						offsetY: -10,
						width: 25,
						height: 10,
						alpha: 0.13,
						backColor: "#FFFFFF",
						fontColor: "#F00B3F",
						fontSize: 12,
					};
					EventBus.emitEvent('balloon:spawn', {
						text: Math.max(0, this.bar.hitPoint),
						x: this.bar.getCenterX() + (balloonCfg.offsetX !== undefined ? balloonCfg.offsetX : (balloonCfg.OFFSET_X || 10)),
						y: this.bar.getTopY() + (balloonCfg.offsetY !== undefined ? balloonCfg.offsetY : (balloonCfg.OFFSET_Y || -10)),
						width: balloonCfg.width !== undefined ? balloonCfg.width : (balloonCfg.WIDTH || 25),
						height: balloonCfg.height !== undefined ? balloonCfg.height : (balloonCfg.HEIGHT || 10),
						alpha: balloonCfg.alpha !== undefined ? balloonCfg.alpha : (balloonCfg.ALPHA || 0.13),
						backColor: balloonCfg.backColor || balloonCfg.BACK_COLOR || "#FFFFFF",
						fontColor: balloonCfg.fontColor || balloonCfg.FONT_COLOR || "#F00B3F",
						fontSize: balloonCfg.fontSize !== undefined ? balloonCfg.fontSize : (balloonCfg.FONT_SIZE || 12),
					});
					weapon.destructor();
				}
			}
		}
	}

	simulateReset() {
		if (!this.blockMap) { return; }
		for (let i = 0, len1 = this.blockMap.length; i < len1; i++) {
			if (this.blockMap[i] && this.blockMap[i].length) {
				for (let j = 0, len2 = this.blockMap[i].length; j < len2; j++) {
					const block = this.blockMap[i][j];
					if (block && typeof block.simulateReset === 'function') {
						block.simulateReset();
					}
				}
			}
		}
	}

	isPlayerAlive() {
		const statusMng = this.game && this.game.statusMng;
		if (!statusMng) { return true; }
		return typeof statusMng.isAlive === 'function' ? statusMng.isAlive() : statusMng.life > 0;
	}

	launchBall(mouseDownTime = 0) {
		const origin = this.bar ? { x: this.bar.getCenterX(), y: this.bar.getTopY(), vx: this.bar.vx } : null;
		const b = new Ball(BALL_CREATE_MODE.LAUNCH, this.game, mouseDownTime, origin);
		this.balls.push(b);
		return b;
	}

	relaunchBall(barVx = null) {
		const def = PresetManage.getDefaultPreset();
		const bDefaultSpeed = (this.game && this.game.ballDefaultSpeed) || (this.preset && this.preset.ballDefaultSpeed) || def.ballDefaultSpeed;
		const bSpin = (this.game && this.game.barSpin !== undefined) ? this.game.barSpin : ((this.preset && this.preset.barSpin !== undefined) ? this.preset.barSpin : (def.barSpin !== undefined ? def.barSpin : 0.05));
		const effectiveBarVx = (barVx !== null && barVx !== undefined) ? barVx : (this.bar ? this.bar.vx : 0);
		for (let i = 0, len = this.balls.length; i < len; i++) {
			const ball = this.balls[i];
			if (ball && ball.isAbsorption === 1) {
				ball.isAbsorption = 0;
				if (Math.abs(effectiveBarVx) > bDefaultSpeed * 0.3) {
					ball.vx = effectiveBarVx * bSpin;
				} else {
					ball.vx *= Math.random() * 0.7 + 0.3;
				}
				if (Math.abs(ball.vx) > bDefaultSpeed * 1.5) {
					ball.vx = (ball.vx > 0 ? 1 : -1) * bDefaultSpeed * 1.5;
				}
				if (this.bar && this.bar.absorptionNum > 0) {
					this.bar.absorptionNum--;
				}
				EventBus.emitEvent('sound:play', 'launch');
				return true;
			}
		}
		return false;
	}

	spawnWeapon(type = null, x = null, y = null, vect = null) {
		const def = PresetManage.getDefaultPreset();
		const targetVect = (vect !== null && vect !== undefined) ? vect : 1;
		const targetType = (type !== null && type !== undefined) ? type : (this.bar ? this.bar.weapon : 0);
		if (targetVect > 0) {
			const maxNum = (this.game && this.game.weaponMaxNum) || (this.preset && this.preset.weaponMaxNum) || def.weaponMaxNum || [5, 3];
			const canFire = this.bar && (typeof this.bar.canFireWeapon === 'function'
				? this.bar.canFireWeapon(this.weapons, maxNum, targetType)
				: (targetType !== 0 && this.bar.weaponInter <= 0));
			if (!canFire) {
				return null;
			}
		}
		if (!targetType) {
			return null;
		}
		const targetX = (x !== null && x !== undefined) ? x : (this.bar && typeof this.bar.getCenterX === 'function' ? this.bar.getCenterX() : (this.bar ? this.bar.x : 0));
		const targetY = (y !== null && y !== undefined) ? y : (this.bar ? ~~(this.bar.getTopY()) : 0);
		const w = new Weapon(targetType, targetX, targetY, targetVect, this.game);
		this.weapons.push(w);
		if (this.bar && targetVect > 0) {
			const fireInterval = (this.game && this.game.weaponFireInterval !== undefined) ? this.game.weaponFireInterval : ((this.preset && this.preset.weaponFireInterval !== undefined) ? this.preset.weaponFireInterval : (def.weaponFireInterval !== undefined ? def.weaponFireInterval : 10));
			this.bar.weaponInter = fireInterval;
		}
		return w;
	}

	spawnItem(data) {
		if (!data) { return null; }
		const stageIdx = (this.game && this.game.ctrl) ? this.game.ctrl.stageIndex : 0;
		const itemLineColor = (this.game && this.game.itemLineColor) || (this.preset && this.preset.itemLineColor) || [];
		const itemColor = (this.game && this.game.itemColor) || (this.preset && this.preset.itemColor) || [];
		const lineColor = (data.lineColor !== undefined)
			? data.lineColor
			: ((itemLineColor[stageIdx] && itemLineColor[stageIdx][data.type]) || '#ffffff');
		const color = (data.color !== undefined)
			? data.color
			: ((itemColor[stageIdx] && itemColor[stageIdx][data.type]) || '#000000');

		const item = new Item(data.type, data.x, data.y, lineColor, color, this.game);
		this.items.push(item);
		return item;
	}

	spawnBalloon(data) {
		if (!data) { return null; }
		const def = PresetManage.getDefaultPreset();
		const backColor = (data.backColor !== undefined)
			? data.backColor
			: ((this.game && this.game.popBalloonBackColor !== undefined)
				? this.game.popBalloonBackColor
				: ((this.preset && this.preset.popBalloonBackColor !== undefined) ? this.preset.popBalloonBackColor : def.popBalloonBackColor));
		const fontColor = (data.fontColor !== undefined)
			? data.fontColor
			: ((this.game && this.game.popBalloonFontColor !== undefined)
				? this.game.popBalloonFontColor
				: ((this.preset && this.preset.popBalloonFontColor !== undefined) ? this.preset.popBalloonFontColor : def.popBalloonFontColor));
		const defaultWidth = (this.game && this.game.balloonDefaultWidth !== undefined) ? this.game.balloonDefaultWidth : ((this.preset && this.preset.balloonDefaultWidth !== undefined) ? this.preset.balloonDefaultWidth : (def.balloonDefaultWidth !== undefined ? def.balloonDefaultWidth : 50));
		const defaultHeight = (this.game && this.game.balloonDefaultHeight !== undefined) ? this.game.balloonDefaultHeight : ((this.preset && this.preset.balloonDefaultHeight !== undefined) ? this.preset.balloonDefaultHeight : (def.balloonDefaultHeight !== undefined ? def.balloonDefaultHeight : 20));
		const defaultAlpha = (this.game && this.game.balloonDefaultAlpha !== undefined) ? this.game.balloonDefaultAlpha : ((this.preset && this.preset.balloonDefaultAlpha !== undefined) ? this.preset.balloonDefaultAlpha : (def.balloonDefaultAlpha !== undefined ? def.balloonDefaultAlpha : 1));
		const defaultFontSize = (this.game && this.game.balloonDefaultFontSize !== undefined) ? this.game.balloonDefaultFontSize : ((this.preset && this.preset.balloonDefaultFontSize !== undefined) ? this.preset.balloonDefaultFontSize : (def.balloonDefaultFontSize !== undefined ? def.balloonDefaultFontSize : 16));

		const balloon = new Balloon(
			data.text,
			data.x,
			data.y,
			data.width !== undefined ? data.width : defaultWidth,
			data.height !== undefined ? data.height : defaultHeight,
			data.alpha !== undefined ? data.alpha : defaultAlpha,
			backColor,
			fontColor,
			data.fontSize !== undefined ? data.fontSize : defaultFontSize
		);
		this.balloons.push(balloon);
		return balloon;
	}

	applyBallItem(type) {
		const def = PresetManage.getDefaultPreset();
		const ballMaxNum = (this.game && this.game.ballMaxNum) || (this.preset && this.preset.ballMaxNum) || def.ballMaxNum;
		const ballStatusTime = (this.game && this.game.ballStatusTime !== undefined) ? this.game.ballStatusTime : ((this.preset && this.preset.ballStatusTime !== undefined) ? this.preset.ballStatusTime : def.ballStatusTime);
		const speedUpRatio = (this.game && this.game.ballSpeedUpRatio !== undefined) ? this.game.ballSpeedUpRatio : ((this.preset && this.preset.ballSpeedUpRatio !== undefined) ? this.preset.ballSpeedUpRatio : (def.ballSpeedUpRatio !== undefined ? def.ballSpeedUpRatio : 1.2));
		const speedDownRatio = (this.game && this.game.ballSpeedDownRatio !== undefined) ? this.game.ballSpeedDownRatio : ((this.preset && this.preset.ballSpeedDownRatio !== undefined) ? this.preset.ballSpeedDownRatio : (def.ballSpeedDownRatio !== undefined ? def.ballSpeedDownRatio : 0.8));
		const ballNum = this.balls.length;

		// 2倍増殖
		if (type === ITEM_TYPE.DOUBLE) {
			const diffNum = ballMaxNum - ballNum;
			const len = ballNum > diffNum ? diffNum : ballNum;
			for (let i = 0; i < len; i++) {
				if (this.balls[i] && typeof this.balls[i].copy === 'function') {
					this.balls.push(this.balls[i].copy(BALL_COPY_MODE.RAND));
				}
			}
		// 強化状態
		} else if (type === ITEM_TYPE.HARD) {
			for (let i = 0; i < ballNum; i++) {
				if (this.balls[i]) {
					this.balls[i].setStatus(BALL_STATUS.STRONG, ballStatusTime);
				}
			}
		// 無敵状態
		} else if (type === ITEM_TYPE.FIRE) {
			for (let i = 0; i < ballNum; i++) {
				if (this.balls[i]) {
					this.balls[i].setStatus(BALL_STATUS.ULTIMATE, ballStatusTime);
				}
			}
		// ボール速度増加
		} else if (type === ITEM_TYPE.SPEED_UP) {
			for (let i = 0; i < ballNum; i++) {
				if (this.balls[i]) {
					this.balls[i].vx *= speedUpRatio;
					this.balls[i].vy *= speedUpRatio;
				}
			}
		// ボール速度減少
		} else if (type === ITEM_TYPE.SPEED_DOWN) {
			for (let i = 0; i < ballNum; i++) {
				if (this.balls[i]) {
					this.balls[i].vx *= speedDownRatio;
					this.balls[i].vy *= speedDownRatio;
				}
			}
		}
	}

	onBallAllLost() {
		// バーが不死身状態の場合はラウンドリセットおよびライフ減少を行わない
		if (this.bar && this.bar.immortalStatusTime > 0) {
			return;
		}

		// 全アイテムの消去
		for (let i = 0; i < this.items.length; i++) {
			if (this.items[i] && typeof this.items[i].destructor === 'function') {
				this.items[i].destructor();
			}
		}
		this.items = [];

		// 全武器の消去
		for (let i = 0; i < this.weapons.length; i++) {
			if (this.weapons[i] && typeof this.weapons[i].destructor === 'function') {
				this.weapons[i].destructor();
			}
		}
		this.weapons = [];

		// バー状態の解除と再生成
		this.initBar();

		// ライフ減少
		EventBus.emitEvent('status:addLife', -1);
	}

	drawStatic(staticCtx) {
		if (!staticCtx) { return; }
		if (this.blockMap) {
			for (let i = 0, len1 = this.blockMap.length; i < len1; i++) {
				const blockLine = this.blockMap[i];
				if (blockLine) {
					for (let j = 0, len2 = blockLine.length; j < len2; j++) {
						const block = blockLine[j];
						if (block && block.type !== 0 && typeof block.draw === 'function') {
							block.draw(staticCtx);
						}
					}
				}
			}
		}
	}

	drawDynamic(dynamicCtx) {
		if (!dynamicCtx) { return; }

		// バー描画
		if (this.bar && typeof this.bar.draw === 'function') {
			this.bar.draw(dynamicCtx);
			// バーに装着された武器の描画
			if (this.bar.weapon !== 0) {
				Weapon.drawWeapon(dynamicCtx, this.bar.weapon, ~~(this.bar.getLeftX()), ~~(this.bar.getTopY()), this.game);
				Weapon.drawWeapon(dynamicCtx, this.bar.weapon, ~~(this.bar.getRightX()), ~~(this.bar.getTopY()), this.game);
			}
		}

		// 爆破モーション（雲）
		if (this.blockMap) {
			for (let i = 0, len1 = this.blockMap.length; i < len1; i++) {
				const blockLine = this.blockMap[i];
				if (blockLine) {
					for (let j = 0, len2 = blockLine.length; j < len2; j++) {
						const block = blockLine[j];
						if (block && block.exploded > 0) {
							Cloud(dynamicCtx, block.x, block.y);
						}
					}
				}
			}
		}

		// アイテム
		for (let i = 0, len = this.items.length; i < len; i++) {
			if (this.items[i] && typeof this.items[i].draw === 'function') {
				this.items[i].draw(dynamicCtx);
			}
		}

		// 武器
		for (let i = 0, len = this.weapons.length; i < len; i++) {
			if (this.weapons[i] && typeof this.weapons[i].draw === 'function') {
				this.weapons[i].draw(dynamicCtx);
			}
		}

		// ボール
		for (let i = 0, len = this.balls.length; i < len; i++) {
			if (this.balls[i] && typeof this.balls[i].draw === 'function') {
				this.balls[i].draw(dynamicCtx);
			}
		}

		// バルーン
		for (let i = 0; i < this.balloons.length; i++) {
			const balloon = this.balloons[i];
			if (!balloon) continue;
			if (balloon.endFlag) {
				if (typeof balloon.destructor === 'function') { balloon.destructor(); }
				this.balloons.splice(i, 1);
				i--;
			} else if (typeof balloon.draw === 'function') {
				balloon.draw(dynamicCtx);
			}
		}
	}

	draw(dynamicCtx) {
		this.drawDynamic(dynamicCtx);
	}
}
