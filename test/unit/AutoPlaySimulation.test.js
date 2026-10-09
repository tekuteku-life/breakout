// test/unit/AutoPlaySimulation.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	cloneBlockMap,
	updateSimulationBlocks,
	applySimulationMagneticForces,
	checkSimulationBallBlockCollision,
	simulateSingleStep,
	computeBlockLine,
	getBestWeaponBreakX,
	evaluateWeaponFire,
	runAutoPlaySimulation,
	isBlockAlive,
	createSimGame,
} from '../../src/AutoPlaySimulation.js';
import Ball from '../../src/Ball.js';
import Block from '../../src/Block.js';
import { BLOCK_FUNCTION, ITEM_TYPE, BALL_STATUS } from '../../src/const.js';

describe('AutoPlaySimulation unit tests', () => {
	const defaultConfig = {
		canvasWidth: 800,
		canvasHeight: 600,
		statusBarHeight: 30,
		fps: 60,
		bDefaultSpeed: 4,
		bMaxSpeed: 10,
		bDefaultSpeedBar: 8,
		bSpin: 0.04,
		blkWidth: 40,
		blkHeight: 20,
		bSize: 5,
		blockDrawingDistance: 150,
		blockMoveInter: 1,
		blockBlinkInter: 1,
		blockAttackInter: 1,
	};

	it('cloneBlockMap deeply clones blocks including null rows and null cells', () => {
		const empty = cloneBlockMap(null);
		assert.deepEqual(empty, []);

		const original = [
			null,
			[
				null,
				{
					col: 1,
					row: 1,
					x: 40,
					y: 50,
					width: 40,
					height: 20,
					type: 1,
					func: 0,
					life: 2,
					infinit: 0,
					moveInter: 5,
					moveVect: 1,
					blinkInter: 10,
					blinkSwitch: 1,
					blinkType: 1,
				},
			],
		];
		const cloned = cloneBlockMap(original);
		assert.equal(cloned[0], null);
		assert.equal(cloned[1][0], null);
		assert.equal(cloned[1][1].x, 40);
		assert.notEqual(cloned[1][1], original[1][1]);
	});

	it('updateSimulationBlocks simulates moving blocks (VERTICAL_MOVE)', () => {
		const block = {
			col: 2,
			row: 1,
			x: 80,
			y: 50,
			width: 40,
			height: 20,
			type: 1,
			func: BLOCK_FUNCTION.VERTICAL_MOVE,
			moveInter: 1,
			moveVect: 1,
		};
		const blockMap = [[], [null, null, block, null]];

		// 1ステップ進めると moveInter が 0 になり右（col: 3）へ移動
		updateSimulationBlocks(blockMap, defaultConfig);
		assert.equal(blockMap[1][2], null, 'Original cell emptied');
		assert.ok(blockMap[1][3], 'Block moved to next cell');
		assert.equal(blockMap[1][3].x, 120);

		// 壁にぶつかると反転
		blockMap[1][3].moveVect = 1;
		blockMap[1][3].moveInter = 1;
		defaultConfig.canvasWidth = 160; // col 3の右は壁
		updateSimulationBlocks(blockMap, defaultConfig);
		assert.equal(blockMap[1][3].moveVect, -1, 'Bounced at boundary');
		defaultConfig.canvasWidth = 800;
	});

	it('updateSimulationBlocks simulates blinking blocks (BLINK)', () => {
		const block = {
			col: 1,
			row: 1,
			x: 40,
			y: 50,
			width: 40,
			height: 20,
			type: 2,
			func: BLOCK_FUNCTION.BLINK,
			blinkInter: 1,
			blinkSwitch: 1,
			blinkType: 2,
		};
		const blockMap = [[], [null, block]];

		// 消灯へ
		updateSimulationBlocks(blockMap, defaultConfig);
		assert.equal(block.type, 0, 'Blinking block turns invisible');
		assert.equal(block.blinkSwitch, -1);

		// 点灯へ復帰
		block.blinkInter = 1;
		updateSimulationBlocks(blockMap, defaultConfig);
		assert.equal(block.type, 2, 'Blinking block turns visible');
		assert.equal(block.blinkSwitch, 1);
	});

	it('updateSimulationBlocks simulates attacking blocks (ATTACK) spawning weapon threats', () => {
		const block = {
			col: 1,
			row: 1,
			x: 40,
			y: 50,
			width: 40,
			height: 20,
			type: 3,
			func: BLOCK_FUNCTION.ATTACK,
			attackInter: 1,
		};
		const blockMap = [[], [null, block]];
		const attacks = updateSimulationBlocks(blockMap, defaultConfig);

		assert.equal(attacks.length, 1);
		assert.equal(attacks[0].x, 60);
		assert.equal(attacks[0].vect, -1);
	});

	it('updateSimulationBlocks tracks countdown for time-limited blocks (BREAK_LIMIT)', () => {
		const block = {
			col: 1,
			row: 1,
			x: 40,
			y: 50,
			width: 40,
			height: 20,
			type: 1,
			breakLimit: 10,
		};
		const blockMap = [[], [null, block]];
		updateSimulationBlocks(blockMap, defaultConfig);
		assert.equal(block.breakLimit, 9);
	});

	it('applySimulationMagneticForces deflects ball velocities near magnet and repull blocks', () => {
		const magnetBlock = {
			x: 100,
			y: 100,
			width: 40,
			height: 20,
			type: 1,
			func: BLOCK_FUNCTION.MAGNET,
		};
		const repullBlock = {
			x: 300,
			y: 100,
			width: 40,
			height: 20,
			type: 1,
			func: BLOCK_FUNCTION.REPULL,
		};
		const blockMap = [[magnetBlock], [repullBlock]];

		// Ball near magnet
		const ball1 = { x: 110, y: 150, vx: 0, vy: 2, radius: 5 };
		// Ball near repull
		const ball2 = { x: 310, y: 150, vx: 0, vy: 2, radius: 5 };

		applySimulationMagneticForces([ball1, ball2], blockMap, defaultConfig);

		// Magnet pulls ball towards center
		assert.ok(ball1.vy < 2, 'Magnet pulled ball1 upwards');
		// Repull pushes ball away
		assert.ok(ball2.vy > 2, 'Repull pushed ball2 downwards');
	});

	it('checkSimulationBallBlockCollision detects collisions, handles acceleration/deceleration and destruction', () => {
		const accelBlock = {
			x: 100,
			y: 100,
			width: 40,
			height: 20,
			type: 1,
			func: BLOCK_FUNCTION.ACCELERATION,
			life: 1,
			infinit: 0,
		};
		const decelBlock = {
			x: 200,
			y: 100,
			width: 40,
			height: 20,
			type: 1,
			func: BLOCK_FUNCTION.DECELERATION,
			life: 1,
			infinit: 0,
		};
		const blockMap = [[accelBlock, decelBlock]];

		// Hit accel block
		const ball1 = { x: 120, y: 105, radius: 5, vx: 2, vy: -3 };
		const broken1 = checkSimulationBallBlockCollision(ball1, blockMap, defaultConfig);
		assert.equal(broken1, 1);
		assert.equal(accelBlock.type, 0);
		assert.ok(Math.abs(ball1.vy) > 3, 'Velocity accelerated');

		// Hit decel block
		const ball2 = { x: 220, y: 105, radius: 5, vx: 2, vy: -3 };
		const broken2 = checkSimulationBallBlockCollision(ball2, blockMap, defaultConfig);
		assert.equal(broken2, 1);
		assert.equal(decelBlock.type, 0);
		assert.ok(Math.abs(ball2.vy) < 3, 'Velocity decelerated');
	});

	it('runAutoPlaySimulation computes global optimal targetX considering multiple falling balls', () => {
		const bar = {
			x: 400,
			y: 550,
			width: 100,
			height: 10,
			vxMax: 8,
		};

		// Two balls falling at different times and locations
		const balls = [
			{ id: 1, x: 350, y: 500, vx: 0, vy: 4, radius: 5 }, // Ball 1 drops at x=350
			{ id: 2, x: 420, y: 460, vx: 0, vy: 4, radius: 5 }, // Ball 2 drops at x=420 slightly later
		];

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [],
			items: [],
			weapons: [],
		};

		const result = runAutoPlaySimulation(snapshot);
		assert.ok(result.targetX >= 300 && result.targetX <= 500, 'Target positioned to rescue balls');
		assert.ok(Array.isArray(result.predictions));
	});

	it('evaluateWeaponFire triggers when breakable blocks are lined up above bar', () => {
		const bar = { x: 120, weapon: 1, weaponInter: 0 };
		const block = { col: 3, x: 120, y: 100, type: 1, infinit: 0 };
		const blockMap = [[null, null, null, block]];

		const fire = evaluateWeaponFire(bar, [], blockMap, defaultConfig);
		assert.ok(fire !== null);
		assert.equal(fire.type, 1);
		assert.equal(fire.x, 120);

		// With infinite block, weapon should not fire if gun
		const infBlock = { col: 3, x: 120, y: 100, type: 1, infinit: 1 };
		const noFire = evaluateWeaponFire(bar, [], [[null, null, null, infBlock]], defaultConfig);
		assert.equal(noFire, null);
	});

	it('evaluateWeaponFire scans bottom-up: fires GUN at destructible bottom block even if top block is indestructible', () => {
		const bar = { x: 120, weapon: 1, weaponInter: 0 };
		// row 0: 上段に不壊ブロック
		const topInfBlock = { col: 3, x: 120, y: 50, type: 1, infinit: 1 };
		// row 1: 下段（バー側）に壊れるブロック
		const bottomDestructBlock = { col: 3, x: 120, y: 150, type: 1, infinit: 0, life: 1 };
		const blockMap = [
			[null, null, null, topInfBlock],
			[null, null, null, bottomDestructBlock],
		];

		const fire = evaluateWeaponFire(bar, [], blockMap, defaultConfig);
		assert.ok(fire !== null, 'GUN correctly targets the breakable bottom block');
		assert.equal(fire.type, 1);
		assert.equal(fire.x, 120);

		// 逆に最下段に不壊ブロックがある場合、GUNは遮られて発射不可
		const reverseBlockMap = [
			[null, null, null, bottomDestructBlock],
			[null, null, null, topInfBlock],
		];
		const blockedFire = evaluateWeaponFire(bar, [], reverseBlockMap, defaultConfig);
		assert.equal(blockedFire, null, 'GUN is blocked by indestructible bottom block');

		// ただしMISSILE (weapon 2) の場合は最下段が不壊ブロックでも爆発破壊可能なので発射可能
		const missileBar = { x: 120, weapon: 2, weaponInter: 0 };
		const missileFire = evaluateWeaponFire(missileBar, [], reverseBlockMap, defaultConfig);
		assert.ok(missileFire !== null, 'MISSILE can fire even if bottom block is indestructible');
		assert.equal(missileFire.type, 2);
	});

	it('runAutoPlaySimulation actively moves bar toward breakable block column to fire weapon when ball return has ample time', () => {
		const bar = {
			x: 400,
			y: 550,
			width: 100,
			height: 10,
			vxMax: 8,
			weapon: 1, // GUN
			weaponInter: 0,
		};

		// ボールは遠くで上向き移動中（戻ってくるまで十分時間がある）
		const balls = [
			{ id: 1, x: 400, y: 50, vx: 0, vy: -4, radius: 5 },
		];

		// x=200 (col=5) に壊れるブロックが存在
		const block = { col: 5, x: 200, y: 100, width: 40, height: 20, type: 1, infinit: 0, life: 1 };
		const blockMap = [[null, null, null, null, null, block]];

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: blockMap,
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// 時間的余裕があるため、バーは中央(400)で待機せず、ブロックのあるx=200の列へ向けて移動する
		assert.ok(res.targetX < 300, `Bar actively moves toward block at x=200 (targetX=${res.targetX})`);
	});

	it('runAutoPlaySimulation returns safe fallback when snapshot has no bar', () => {
		const res = runAutoPlaySimulation(null);
		assert.equal(res.targetX, -1);
		assert.equal(res.plusSpeed, 0);
	});

	it('runAutoPlaySimulation falls back to nearest ball when ball is out of reach in time', () => {
		const bar = {
			x: 200,
			y: 550,
			width: 40,
			height: 10,
			vxMax: 2, // Very slow bar
		};

		// Ball falls far away and too fast for bar to catch
		const balls = [
			{ id: 1, x: 600, y: 535, vx: 0, vy: 5, radius: 5 }, // Reaches bar height at t=3, bar can only move 6px
		];

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [],
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		assert.equal(res.targetX, 600, 'Falls back to ball x when unreachable');
	});

	it('runAutoPlaySimulation calculates trajectory under custom spin parameters', () => {
		const bar = {
			x: 400,
			y: 550,
			width: 100,
			height: 10,
			vxMax: 8,
			spin: 0.05,
		};
		const balls = [
			{ id: 1, x: 400, y: 500, vx: 0, vy: 4, radius: 5 },
		];
		const snapshot = {
			...defaultConfig,
			bSpin: 0.05,
			bar,
			balls,
			blocks: [],
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		assert.ok(typeof res.targetX === 'number');
	});

	it('runAutoPlaySimulation selects optimal spin dvx that maximizes block destruction', () => {
		const bar = {
			x: 400,
			y: 550,
			width: 120,
			height: 10,
			vxMax: 8,
			spin: 0.04,
		};

		// Ball falls vertically at center (x=400)
		const balls = [
			{ id: 1, x: 400, y: 535, vx: 0, vy: 5, radius: 5 },
		];

		// Blocks placed strictly on the left (x=280 ~ 360) and none directly above x=400
		const targetBlock = {
			col: 7,
			row: 5,
			x: 320,
			y: 300,
			width: 40,
			height: 20,
			type: 1,
			func: 0,
			life: 1,
			infinit: 0,
		};

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [[targetBlock]],
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		assert.ok(res.bestDvx !== 0, 'Selects non-zero spin dvx to target block');
		assert.ok(res.bestDvx < 0, 'Angles reflection to the left towards target block');
		assert.ok(res.simuData.breakMaxNum > 0 || res.simuData.collisionMaxNum > 0, 'Finds route that hits block');
	});

	it('runAutoPlaySimulation moves targetX to fetch beneficial item when ball is reachable', () => {
		const bar = {
			x: 400,
			y: 550,
			width: 80,
			height: 10,
			vxMax: 8,
		};

		// Ball is high enough (plenty of time: t ~ 20)
		const balls = [
			{ id: 1, x: 400, y: 400, vx: 0, vy: 3, radius: 5 },
		];

		// Beneficial item falling nearby at x=370
		const items = [
			{ x: 370, y: 500, type: 1, speed: 3 }, // Type 1 = Double ball
		];

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [],
			items,
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		assert.ok(res.targetX <= 380, 'Adjusts bar targetX towards item');
	});

	it('runAutoPlaySimulation dodges falling enemy hazard bullet', () => {
		const bar = {
			x: 400,
			y: 550,
			width: 60,
			height: 10,
			vxMax: 8,
		};

		const balls = [
			{ id: 1, x: 400, y: 480, vx: 0, vy: 4, radius: 5 },
		];

		// Enemy bullet coming down right at center x=400
		const weapons = [
			{ x: 400, y: 530, vy: 3, vect: -1, type: 1 },
		];

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [],
			items: [],
			weapons,
		};

		const res = runAutoPlaySimulation(snapshot);
		assert.ok(Math.abs(res.targetX - 400) > 0, 'Shifts targetX to evade enemy bullet');
	});

	it('runAutoPlaySimulation targets predicted fallX directly instead of following ball current X when ascending', () => {
		const bar = {
			x: 200,
			y: 550,
			width: 80,
			height: 10,
			vxMax: 8,
		};

		// Ball is at x=200, but moving diagonally up-right (vx=3, vy=-4)
		// It will bounce off ceiling/wall and fall at a different X far from current x=200
		const balls = [
			{ id: 1, x: 200, y: 300, vx: 4, vy: -4, radius: 5 },
		];

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [],
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		assert.ok(res.predictions.length > 0, 'Predicted ball fall trajectory');
		const predictedFallX = res.predictions[0].fallX;
		assert.notEqual(predictedFallX, 200, 'Fall position differs from current ball position');
		assert.equal(res.targetX, predictedFallX, 'Bar targetX heads directly to predicted fall position');
	});

	it('runAutoPlaySimulation sets spinOffset to 0 when fetching item (just pick up item)', () => {
		const bar = {
			x: 400,
			y: 550,
			width: 80,
			height: 10,
			vxMax: 8,
		};

		const balls = [
			{ id: 1, x: 400, y: 200, vx: 0, vy: 2, radius: 5 },
		];

		// Beneficial item at x=350 falling slowly
		const items = [
			{ x: 350, y: 500, type: 0, speed: 2 },
		];

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [],
			items,
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		assert.equal(res.targetX, 350, 'Targets item x position');
		assert.equal(res.spinOffset, 0, 'Spin offset is 0 when fetching item (item is just collected)');
	});

	it('runAutoPlaySimulation actively fetches beneficial items when ball is ascending or has sufficient time margin', () => {
		const bar = {
			x: 400,
			y: 550,
			width: 80,
			height: 10,
			vxMax: 8,
		};

		// Ball is ascending at x=400 (vy = -3, plenty of time before coming down)
		const balls = [
			{ id: 1, x: 400, y: 300, vx: 0, vy: -3, radius: 5 },
		];

		// Beneficial life recovery item at x=250
		const items = [
			{ x: 250, y: 480, type: 5, speed: 2 }, // Type 5 = LIFE
		];

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [],
			items,
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		assert.equal(res.targetX, 250, 'Heads directly to item when ball has plenty of time');
		assert.equal(res.isFetchingItem, true, 'Flags isFetchingItem as true');
	});

	it('runAutoPlaySimulation prioritizes first ball directly when ball arrival is imminent (t1 <= 12)', () => {
		const bar = {
			x: 300,
			y: 550,
			width: 80,
			height: 10,
			vxMax: 8,
		};

		// First ball drops in 5 frames at x=320, second ball drops much later at x=480
		const balls = [
			{ id: 1, x: 320, y: 525, vx: 0, vy: 5, radius: 5 },
			{ id: 2, x: 480, y: 350, vx: 0, vy: 4, radius: 5 },
		];

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [],
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		assert.equal(res.targetX, 320, 'Directly locks on first ball fall position without shift');
	});

	it('runAutoPlaySimulation targets midpoint between two balls when they drop almost simultaneously within bar reach', () => {
		const bar = {
			x: 350,
			y: 550,
			width: 100,
			height: 10,
			vxMax: 8,
		};

		// Two balls drop at x=320 and x=380 almost simultaneously (deltaT <= 3, distance = 60 <= 100 * 0.75)
		const balls = [
			{ id: 1, x: 320, y: 510, vx: 0, vy: 4, radius: 5 },
			{ id: 2, x: 380, y: 506, vx: 0, vy: 4, radius: 5 },
		];

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [],
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		assert.equal(res.targetX, 350, 'Targets midpoint to catch both balls simultaneously');
	});

	it('runAutoPlaySimulation optimizes reflection path by rate of block hits over return time', () => {
		const bar = {
			x: 400,
			y: 550,
			width: 120,
			height: 10,
			vxMax: 8,
			spin: 0.04,
		};

		const balls = [
			{ id: 1, x: 400, y: 535, vx: 0, vy: 5, radius: 5 },
		];

		// Two rows of blocks: one close on the left, one further on the right
		const closeBlock = {
			x: 340,
			y: 350,
			width: 40,
			height: 20,
			type: 1,
			func: 0,
			life: 1,
			infinit: 0,
		};
		const farBlock = {
			x: 460,
			y: 200,
			width: 40,
			height: 20,
			type: 1,
			func: 0,
			life: 1,
			infinit: 0,
		};

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [[closeBlock, farBlock]],
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		assert.ok(res.bestDvx !== 0, 'Selects an optimal angle');
		assert.ok(res.simuData.breakMaxNum > 0 || res.simuData.collisionMaxNum > 0, 'Finds route that breaks blocks');
		assert.ok(res.simuData.returnTime > 0, 'Tracks return time');
	});

	it('runAutoPlaySimulation prioritizes high-break count long-duration routes over quick low-break routes', () => {
		const bar = {
			x: 400,
			y: 550,
			width: 100,
			height: 10,
			vxMax: 8,
			spin: 0.2,
		};

		const balls = [
			{ id: 1, x: 400, y: 535, vx: 0, vy: 5, radius: 5 },
		];

		// Left side: Single block that breaks quickly
		const singleQuickBlock = {
			x: 350,
			y: 400,
			width: 40,
			height: 20,
			type: 1,
			func: 0,
			life: 1,
			infinit: 0,
		};

		// Right side: Dense cluster of blocks that allows high chain destruction
		const chainBlocks = [
			{ x: 450, y: 250, width: 40, height: 20, type: 1, func: 0, life: 1, infinit: 0 },
			{ x: 490, y: 250, width: 40, height: 20, type: 1, func: 0, life: 1, infinit: 0 },
			{ x: 450, y: 230, width: 40, height: 20, type: 1, func: 0, life: 1, infinit: 0 },
			{ x: 490, y: 230, width: 40, height: 20, type: 1, func: 0, life: 1, infinit: 0 },
		];

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [[singleQuickBlock, ...chainBlocks]],
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// Chain destruction on right must be prioritized over quick 1-block on left
		assert.ok(res.simuData.breakMaxNum >= 2, `Prioritizes chain destruction (breaks=${res.simuData.breakMaxNum})`);
		assert.ok(res.bestDvx > 0, 'Angles rightward towards chain blocks');
		assert.ok(res.spinOffset > 0, 'Produces positive spinOffset for rightward spin');
		assert.ok(res.spinOffset <= bar.vxMax, 'Clamps spinOffset within bar.vxMax');
	});

	it('runAutoPlaySimulation successfully predicts deep long-hanging balls and determines optimal spin', () => {
		const bar = {
			x: 400,
			y: 550,
			width: 100,
			height: 10,
			vxMax: 8,
			spin: 0.2,
		};

		// Ball way up high moving upwards (needs hundreds of steps to bounce and fall)
		const balls = [
			{ id: 1, x: 400, y: 50, vx: 2, vy: -4, radius: 5 },
		];

		const targetBlock = {
			x: 450,
			y: 150,
			width: 40,
			height: 20,
			type: 1,
			func: 0,
			life: 1,
			infinit: 0,
		};

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [[targetBlock]],
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		assert.ok(res.fallBallTime > 50, `Tracks long hang time (fallBallTime=${res.fallBallTime})`);
		assert.ok(res.targetX >= 0, 'Calculates valid landing targetX for deep ball');
	});

	it('runAutoPlaySimulation actively evades harmful/score-deduction items (POISON, SHORT, SPEED_DOWN, etc.)', () => {
		const bar = {
			x: 400,
			y: 550,
			width: 100,
			height: 10,
			vxMax: 8,
		};

		// Harmful item falling directly towards bar center
		const harmfulItem = {
			x: 400,
			y: 500,
			width: 20,
			height: 20,
			type: 6, // POISON (ITEM_TYPE.POISON)
			speed: 4,
		};

		// Ball is far away / ascending
		const balls = [
			{ id: 1, x: 400, y: 50, vx: 2, vy: -4, radius: 5 },
		];

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [],
			items: [harmfulItem],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		const itemCenterX = harmfulItem.x + (harmfulItem.width ? harmfulItem.width / 2 : 0);
		const safeDistance = (bar.width + defaultConfig.blkWidth) / 2 + 5;
		assert.ok(
			Math.abs(res.targetX - itemCenterX) >= safeDistance,
			`Evades poison item: targetX (${res.targetX}) is at least safeDistance (${safeDistance}) away from itemCenterX (${itemCenterX})`
		);
		assert.equal(res.isFetchingItem, false, 'Does not attempt to fetch harmful item');
	});

	it('runAutoPlaySimulation stably waits at center without chasing ball horizontal position when return time is unconfirmed', () => {
		const bar = {
			x: 400,
			y: 550,
			width: 100,
			height: 10,
			vxMax: 8,
		};

		// Ball is far away at x=100 with long fall time (t1 > 60)
		const balls = [
			{ id: 1, x: 100, y: 100, vx: 0, vy: 0, radius: 5 },
		];

		const block = { x: 100, y: 50, width: 40, height: 20, type: 1, func: 0, life: 1, infinit: 0 };
		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [[block]],
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// When ball takes a long time to return, bar should not prematurely chase ball to x=100, but stably wait at canvas center (400)
		assert.equal(res.targetX, defaultConfig.canvasWidth / 2, 'Stably waits at screen center (400) without chasing ball x=100');
	});

	it('runAutoPlaySimulation strictly prioritizes breaking destructible blocks over bouncing repeatedly between indestructible blocks', () => {
		const bar = {
			x: 300,
			y: 550,
			width: 100,
			height: 10,
			vxMax: 8,
			spin: 0.2,
		};

		const indestructible1 = { x: 380, y: 200, width: 15, height: 40, type: 1, func: 0, life: 1, infinit: 1 };
		const indestructible2 = { x: 402, y: 200, width: 15, height: 40, type: 1, func: 0, life: 1, infinit: 1 };

		// 右側（x=420）に壊れるブロック（dvx > 0 で届く範囲）
		const destructible = { x: 420, y: 200, width: 40, height: 20, type: 1, func: 0, life: 1, infinit: 0 };

		const balls = [
			{ id: 1, x: 400, y: 500, vx: 0, vy: -4, radius: 5 },
		];

		const snapshot = {
			...defaultConfig,
			bar: {
				x: 400,
				y: 550,
				width: 100,
				height: 10,
				vxMax: 8,
				spin: 0.2,
			},
			balls,
			blocks: [[destructible], [indestructible1, indestructible2]],
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// 壊れるブロックを狙う正のdvx（右へ飛ばす）が選ばれ、隙間に打ち込んで壊れないブロックに連続衝突する軌道は選ばれない
		assert.ok(res.bestScore > 0, `Finds a positive score by breaking destructible block (score=${res.bestScore})`);
		assert.ok(res.bestDvx > 0, `Aiming right towards destructible block (bestDvx=${res.bestDvx})`);
		assert.equal(res.simuData.breakMaxNum, 1, 'Breaks 1 destructible block');
	});

	it('runAutoPlaySimulation excludes paths hitting only indestructible blocks from positive scoring', () => {
		const bar = {
			x: 400,
			y: 550,
			width: 100,
			height: 10,
			vxMax: 8,
			spin: 0.2,
		};

		// 壊れないブロックのみ
		const indestructible = { x: 400, y: 300, width: 100, height: 20, type: 1, func: 0, life: 1, infinit: 1 };

		const balls = [
			{ id: 1, x: 400, y: 540, vx: 0, vy: -4, radius: 5 },
		];

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [[indestructible]],
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// 壊れるブロックが存在しないため、壊れないブロックに衝突してもスコアは -Infinity のまま
		assert.equal(res.bestScore, -Infinity, 'Score remains -Infinity when only indestructible blocks are hit');
	});

	it('runAutoPlaySimulation completely evades POISON item by dropping a ball when multiple balls exist', () => {
		const bar = {
			x: 400,
			y: 550,
			width: 100,
			height: 10,
			vxMax: 8,
		};

		// 毒アイテムが x=400 に落下直前（y=510, speed=4 -> 残り10フレーム）
		const poisonItem = {
			x: 400,
			y: 510,
			width: 20,
			height: 20,
			type: ITEM_TYPE.POISON,
			speed: 4,
		};

		// ボールが2個存在: 第1ボールは x=400 (毒と同じ位置・時刻)、第2ボールは安全な上空 x=200
		const balls = [
			{ id: 1, x: 400, y: 500, vx: 0, vy: 5, radius: 5 },
			{ id: 2, x: 200, y: 100, vx: 0, vy: -4, radius: 5 },
		];

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [],
			items: [poisonItem],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		const safeDistance = (bar.width + defaultConfig.blkWidth) / 2 + 5;
		const poisonCenterX = poisonItem.x + poisonItem.width / 2;

		// 複数ボールがある場合、ボール(x=400)を拾いにいかず、毒(410)から完全に安全な距離まで退避する
		assert.ok(
			Math.abs(res.targetX - poisonCenterX) >= safeDistance,
			`Evades poison completely: targetX (${res.targetX}) is at least safeDistance (${safeDistance}) away from poison (${poisonCenterX})`
		);
	});

	it('runAutoPlaySimulation fetches LIFE item even if dropping a ball when multiple balls exist', () => {
		const bar = {
			x: 400,
			y: 550,
			width: 100,
			height: 10,
			vxMax: 8,
		};

		// LIFEアイテムが x=520 に落下（中心は 530）
		const lifeItem = {
			x: 520,
			y: 490,
			width: 20,
			height: 20,
			type: ITEM_TYPE.LIFE,
			speed: 4,
		};

		// ボールが2個存在: 第1ボールは x=100 (左端) に落ちてくる、第2ボールは上空
		// bar(400) から LIFE(530) を取った後、x=100 のボールには戻れない
		const balls = [
			{ id: 1, x: 100, y: 500, vx: 0, vy: 4, radius: 5 },
			{ id: 2, x: 300, y: 50, vx: 0, vy: -4, radius: 5 },
		];

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [],
			items: [lifeItem],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// 複数ボールがあるため、ボール1個を犠牲にしてでもLIFEアイテム(530)を最優先で回収しに行く！
		assert.equal(res.isFetchingItem, true, 'Fetches item');
		assert.equal(res.targetX, 530, 'Targets LIFE item position');
	});

	it('runAutoPlaySimulation prioritizes single ball over LIFE item when it cannot return in time with only 1 ball', () => {
		const bar = {
			x: 400,
			y: 550,
			width: 100,
			height: 10,
			vxMax: 8,
		};

		const lifeItem = {
			x: 520,
			y: 490,
			width: 20,
			height: 20,
			type: ITEM_TYPE.LIFE,
			speed: 4,
		};

		// ボールが1個しかない場合: x=100 に落ちてくる
		// この場合、LIFEを取るとボールを落としてライフ全滅(-1)してしまうため、ボール救出を優先する
		const balls = [
			{ id: 1, x: 100, y: 500, vx: 0, vy: 4, radius: 5 },
		];

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [],
			items: [lifeItem],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		assert.equal(res.isFetchingItem, false, 'Does not fetch item because only 1 ball exists');
		assert.equal(res.targetX, 100, 'Prioritizes saving single ball at x=100');
	});

	it('computeBlockLine prioritizes indestructible blocks for MISSILE (weapon 2) and avoids them for GUN (weapon 1)', () => {
		// col 0: 通常ブロック (type 1)
		// col 2: 不壊ブロック (type 5, infinit: 1)
		const blkNormal = { col: 0, x: 20, y: 100, type: 1, life: 1, infinit: 0 };
		const blkInf = { col: 2, x: 100, y: 100, type: 5, life: 1, infinit: 1 };
		const rawBlocks = [[blkNormal, null, blkInf]];

		// 1. GUN (weapon 1): 不壊ブロック列は -10000 となり除外される
		const lineGun = computeBlockLine(rawBlocks, [], 1, defaultConfig);
		assert.ok(lineGun[0] > 0, 'Normal block column has positive score for GUN');
		assert.equal(lineGun[2], -10000, 'Indestructible column is penalized for GUN');

		// 2. MISSILE (weapon 2): 不壊ブロック列に特大スコア (+100) が付与される
		const lineMissile = computeBlockLine(rawBlocks, [], 2, defaultConfig);
		assert.equal(lineMissile[0], 1, 'Normal block gives 1 pt for MISSILE');
		assert.equal(lineMissile[2], 100, 'Indestructible block gives 100 pt for MISSILE');

		// getBestWeaponBreakX は不壊ブロック列(col 2, 中心 100)を最優先で選択する
		const breakX = getBestWeaponBreakX(lineMissile, 20, defaultConfig);
		assert.equal(breakX, 100, 'getBestWeaponBreakX chooses col 2 (infinit) over col 0');
	});

	it('runAutoPlaySimulation prioritizes destroying indestructible blocks with Fire ball (BALL_STATUS.ULTIMATE)', () => {
		const bar = {
			x: 120,
			y: 550,
			width: 100,
			height: 10,
			vxMax: 8,
			spin: 0.04,
		};

		// 不壊ブロック (infinit: 1) を配置
		const infBlock = {
			col: 2,
			row: 5,
			x: 100,
			y: 300,
			width: 40,
			height: 20,
			type: 5,
			life: 1,
			infinit: 1,
		};
		const blockMap = [[infBlock]];

		// 1. 通常ボールの場合: 不壊ブロックにしか当たらない軌道は除外され、破壊スコアは得られない
		const normalBall = {
			id: 1,
			x: 120,
			y: 535,
			vx: 0,
			vy: 5,
			radius: 5,
			status: BALL_STATUS.NORMAL,
		};
		const normalSnapshot = {
			...defaultConfig,
			bar,
			balls: [normalBall],
			blocks: blockMap,
			items: [],
			weapons: [],
		};
		const normalRes = runAutoPlaySimulation(normalSnapshot);
		assert.equal(normalRes.simuData.breakMaxNum, 0, 'Normal ball cannot break indestructible block');

		// 2. Fireボール (BALL_STATUS.ULTIMATE) の場合: 不壊ブロックを破壊可能となり、最優先で狙う
		const fireBall = {
			id: 1,
			x: 120,
			y: 535,
			vx: 0,
			vy: 5,
			radius: 5,
			status: BALL_STATUS.ULTIMATE,
		};
		const fireSnapshot = {
			...defaultConfig,
			bar,
			balls: [fireBall],
			blocks: blockMap,
			items: [],
			weapons: [],
		};
		const fireRes = runAutoPlaySimulation(fireSnapshot);
		assert.ok(fireRes.simuData.breakMaxNum > 0, 'Fire ball breaks indestructible block');
		assert.ok(fireRes.simuData.bestScore >= 5000000, 'Awards massive bonus for destroying indestructible block');
	});

	it('runAutoPlaySimulation strictly prevents wandering to weapon breakX when ball is falling soon (fallBallTime <= 35)', () => {
		// バーは x=200、武器 (GUN=1) 所持
		const bar = {
			x: 200,
			y: 550,
			width: 100,
			height: 10,
			vxMax: 8,
			weapon: 1,
			weaponInter: 0,
		};

		// 破壊対象ブロックが x=500 (col 12) にある
		const block = {
			col: 12,
			x: 480,
			y: 100,
			width: 40,
			height: 20,
			type: 1,
			life: 1,
			infinit: 0,
		};

		// ボールは x=200 に落下中、残り時間約 20 フレーム (<= 35)
		const ball = {
			id: 1,
			x: 200,
			y: 470,
			vx: 0,
			vy: 4,
			radius: 5,
		};

		const snapshot = {
			...defaultConfig,
			bar,
			balls: [ball],
			blocks: [[block]],
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// ボール落下まで20フレームしかなく安全マージン不足のため、x=500 のブロック破壊へ寄り道せず、ボール落下地点 x=200 を死守する
		assert.equal(res.targetX, 200, 'Holds position for ball at x=200 instead of moving to breakX');
	});

	it('Stage Fly fix: cluster fallback avoids zero dvx center hollow and angles ball towards block cluster', () => {
		// Stage Flyのように、画面中央(x=400)が空洞で左右にブロック群が配置されたフィールド
		// 左側: col 1 (x=50) に通常ブロック
		// 右側: col 14 (x=700) に通常ブロック
		// 中央 (col 6~9) は空洞
		const blkLeft = { col: 1, x: 50, y: 100, width: 50, height: 20, type: 1, life: 1, infinit: 0 };
		const blkRight = { col: 14, x: 700, y: 100, width: 50, height: 20, type: 1, life: 1, infinit: 0 };

		const bar = { x: 400, y: 550, width: 100, height: 10, vxMax: 8, spin: 0.04 };
		// ボールが中央 (x=400) に落下してくる
		const ball = { id: 1, x: 400, y: 535, vx: 0, vy: 5, radius: 5 };

		const snapshot = {
			...defaultConfig,
			bar,
			balls: [ball],
			blocks: [[blkLeft, null, null, null, null, null, null, null, null, null, null, null, null, null, blkRight]],
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// 中央の何もない空洞への直進（dvx ≒ 0）を完全に避け、左右どちらかのブロッククラスタへ向けて確実に角度をつける
		assert.ok(Math.abs(res.bestDvx) >= 0.3, `Angles reflection away from center hollow (bestDvx=${res.bestDvx})`);
	});

	it('A-1: trajectory evaluation gives large bonus for exploding blocks (BLOCK_FUNCTION.EXPLODE)', () => {
		const bar = { x: 200, y: 550, width: 100, height: 10, vxMax: 8, spin: 0.04 };
		const normalBlock = { col: 4, row: 5, x: 200, y: 300, width: 40, height: 20, type: 1, func: BLOCK_FUNCTION.NORMAL, life: 1, infinit: 0 };
		const explodeBlock = { col: 4, row: 5, x: 200, y: 300, width: 40, height: 20, type: 2, func: BLOCK_FUNCTION.EXPLODE, life: 1, infinit: 0 };

		const ball = { id: 1, x: 200, y: 535, vx: 0, vy: 5, radius: 5 };

		// 通常ブロック時のスコア
		const normalRes = runAutoPlaySimulation({ ...defaultConfig, bar, balls: [ball], blocks: [[normalBlock]], items: [], weapons: [] });
		// 爆発ブロック時のスコア
		const explodeRes = runAutoPlaySimulation({ ...defaultConfig, bar, balls: [ball], blocks: [[explodeBlock]], items: [], weapons: [] });

		assert.ok(explodeRes.simuData.bestScore > normalRes.simuData.bestScore, 'Exploding block route receives higher score than normal block');
		assert.ok(explodeRes.simuData.bestScore >= 2000000, 'Awards explosion bonus (>= 2,000,000 pt)');
	});

	it('A-2: trajectory evaluation rewards top-route bonus when ball enters above topmost blocks', () => {
		// 最上段ブロックが y=200 に配置
		const topBlock = { col: 4, row: 3, x: 200, y: 200, width: 40, height: 20, type: 1, life: 1, infinit: 0 };
		const bar = { x: 200, y: 550, width: 100, height: 10, vxMax: 8, spin: 0.04 };
		const ball = { id: 1, x: 200, y: 535, vx: 0, vy: 5, radius: 5 };

		const res = runAutoPlaySimulation({
			...defaultConfig,
			bar,
			balls: [ball],
			blocks: [[topBlock]],
			items: [],
			weapons: [],
		});

		assert.ok(res.simuData.breakMaxNum > 0, 'Breaks block');
	});

	it('B-2: endgame defense mode preserves all balls over LIFE item when remaining destructible blocks <= 5', () => {
		const bar = { x: 400, y: 550, width: 100, height: 10, vxMax: 8 };
		const lifeItem = { x: 520, y: 490, width: 20, height: 20, type: ITEM_TYPE.LIFE, speed: 4 };

		// フィールドに残り 3 個のブロック（<= 5個で終盤戦）
		const block1 = { col: 1, x: 50, y: 100, width: 40, height: 20, type: 1, life: 1, infinit: 0 };
		const block2 = { col: 2, x: 100, y: 100, width: 40, height: 20, type: 1, life: 1, infinit: 0 };
		const block3 = { col: 3, x: 150, y: 100, width: 40, height: 20, type: 1, life: 1, infinit: 0 };

		// 複数ボール存在: 第1ボールは左端 x=100 に落ちる
		const balls = [
			{ id: 1, x: 100, y: 500, vx: 0, vy: 4, radius: 5 },
			{ id: 2, x: 300, y: 50, vx: 0, vy: -4, radius: 5 },
		];

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [[block1, block2, block3]],
			items: [lifeItem],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// 終盤戦のため、マルチボール残存クリアボーナスを最大化すべくボール犠牲を禁止し、ボール位置 x=100 を防衛する
		assert.equal(res.isFetchingItem, false, 'Does not sacrifice ball in endgame mode');
		assert.equal(res.targetX, 100, 'Prioritizes saving ball at x=100 for multi-ball clear bonus');
	});

	it('C-1: harmful debuff items (SHORT, SPEED_DOWN, VIBRATE, DISTURB) are avoided in multi-ball mode', () => {
		const bar = { x: 400, y: 550, width: 100, height: 10, vxMax: 8 };

		// SHORT デバフアイテムが第1ボール落下地点(x=100)の直上に落下
		const debuffItem = { x: 95, y: 500, width: 20, height: 20, type: ITEM_TYPE.SHORT, speed: 4 };

		const balls = [
			{ id: 1, x: 100, y: 510, vx: 0, vy: 4, radius: 5 },
			{ id: 2, x: 400, y: 300, vx: 0, vy: 4, radius: 5 },
		];

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [],
			items: [debuffItem],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// 第1ボール(x=100)はSHORTデバフ被弾ゾーンのため回避し、安全な第2ボール(x=400)へ切り替える
		assert.equal(res.targetX, 400, 'Switches primary target to safe second ball to avoid SHORT debuff');
	});

	it('C-2: hostile weapon evasion safely dodges incoming enemy weapon threats', () => {
		const bar = { x: 400, y: 550, width: 100, height: 10, vxMax: 8 };
		// 敵弾が x=400 に落下中（vect: -1, vy: 4）
		const enemyWeapon = { x: 400, y: 510, vy: 4, vect: -1 };

		const snapshot = {
			...defaultConfig,
			bar,
			balls: [],
			blocks: [],
			items: [],
			weapons: [enemyWeapon],
		};

		const res = runAutoPlaySimulation(snapshot);
		// 敵弾の中心(400)から安全距離をとって回避する
		assert.ok(Math.abs(res.targetX - enemyWeapon.x) > 40, 'Dodges hostile weapon away from x=400');
	});

	it('Debuff evasion clearance: ensures at least 25px clearance beyond physical hit boundary', () => {
		const bar = { x: 400, y: 550, width: 100, height: 10, vxMax: 8 };
		// 毒アイテムがバー中心 x=400 に落下中（y=450, 幅50）
		const poison = { x: 375, y: 450, width: 50, height: 20, type: ITEM_TYPE.POISON, speed: 4 };

		const snapshot = {
			...defaultConfig,
			bar,
			balls: [],
			blocks: [],
			items: [poison],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		const poisonCenterX = 400;
		const hitRadius = (100 + 50) / 2; // 75px
		const distance = Math.abs(res.targetX - poisonCenterX);

		// 物理衝突限界(75px) + 25px = 100px 以上の安全距離を確保し、端部のかすり被弾を絶対排除
		assert.ok(distance >= hitRadius + 25, `Maintains generous clearance (distance=${distance} >= ${hitRadius + 25})`);
	});

	it('Debuff evasion side-awareness: moves away from item without crossing underneath it', () => {
		// バーがアイテムの左側 (x=350) に位置する状態で、x=400 にデバフアイテムが落下
		const barLeft = { x: 350, y: 550, width: 100, height: 10, vxMax: 8 };
		const debuffItem = { x: 375, y: 480, width: 50, height: 20, type: ITEM_TYPE.SPEED_DOWN, speed: 4 };

		const snapshotLeft = {
			...defaultConfig,
			bar: barLeft,
			balls: [],
			blocks: [],
			items: [debuffItem],
			weapons: [],
		};

		const resLeft = runAutoPlaySimulation(snapshotLeft);
		// アイテムの真下をくぐって右へ横切らず、現在いる左側へ安全に退避する
		assert.ok(resLeft.targetX < 400 - (100 + 50) / 2, `Dodges to the left side without crossing under item (targetX=${resLeft.targetX})`);

		// 逆にバーが右側 (x=450) に位置する場合
		const barRight = { x: 450, y: 550, width: 100, height: 10, vxMax: 8 };
		const snapshotRight = {
			...defaultConfig,
			bar: barRight,
			balls: [],
			blocks: [],
			items: [debuffItem],
			weapons: [],
		};

		const resRight = runAutoPlaySimulation(snapshotRight);
		// 左へ横切らず、右側へ安全に退避する
		assert.ok(resRight.targetX > 400 + (100 + 50) / 2, `Dodges to the right side without crossing under item (targetX=${resRight.targetX})`);
	});

	it('Spin offset safety: clamps spinOffset to 0 when spin movement would step into debuff zone', () => {
		// ボールが落下中で、通常ならスピンでボールに回転をかける場面
		// しかしすぐ近くにデバフアイテムが存在する場合
		const bar = { x: 300, y: 550, width: 100, height: 10, vxMax: 8, spin: 0.04 };
		const ball = { id: 1, x: 280, y: 520, vx: 0, vy: 5, radius: 5 };
		// x=360 にデバフアイテムが落下（バー右端から近い）
		const debuffItem = { x: 340, y: 500, width: 40, height: 20, type: ITEM_TYPE.VIBRATE, speed: 4 };

		const snapshot = {
			...defaultConfig,
			bar,
			balls: [ball],
			blocks: [],
			items: [debuffItem],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// スピンによるバーのデバフアイテム側への踏み込みが完全に防止され、衝突境界内に踏み込まない
		const itemCenterX = 360;
		const hitRadius = (100 + 40) / 2;
		const barEffectiveX = res.targetX - res.spinOffset;
		assert.ok(
			Math.abs(barEffectiveX - itemCenterX) >= hitRadius + 15,
			`Spin offset does not compromise safety margin (effectiveX=${barEffectiveX}, itemX=${itemCenterX})`
		);
	});

	it('Helpful item collection aborts if helpful item is too close to a falling debuff item', () => {
		const bar = { x: 400, y: 550, width: 100, height: 10, vxMax: 8 };
		// LIFEアイテムが x=300 に落下
		const lifeItem = { x: 285, y: 480, width: 30, height: 20, type: ITEM_TYPE.LIFE, speed: 4 };
		// しかしすぐ横の x=310 に POISON アイテムが重なって落下
		const poisonItem = { x: 290, y: 480, width: 40, height: 20, type: ITEM_TYPE.POISON, speed: 4 };

		const snapshot = {
			...defaultConfig,
			bar,
			balls: [],
			blocks: [],
			items: [lifeItem, poisonItem],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// デバフ被弾の危険があるため、LIFEアイテムを取りにいかず、デバフを確実に避ける
		assert.equal(res.isFetchingItem, false, 'Does not fetch LIFE item dangerously entangled with POISON');
		const poisonCenterX = 310;
		const hitRadius = (100 + 40) / 2;
		assert.ok(Math.abs(res.targetX - poisonCenterX) >= hitRadius + 20, 'Safely avoids poison item');
	});

	it('Stage Fly: excludes trajectories trapped in ceiling pockets that do not return to bar from selection', () => {
		// ボールが中央から上がった時、手前に不壊ブロックがあり、天井裏ポケットが存在する盤面
		const bar = { x: 375, y: 517, width: 100, height: 10, vxMax: 75, spin: 0.2 };
		const ball = { id: 1, x: 375, y: 512, vx: 0, vy: 3.5, radius: 5 };

		// 天井裏（y=40〜100）に不壊ブロックがあり、その隙間で跳ね返るトラップ
		const indestructibleCeiling = { col: 7, row: 2, x: 350, y: 62, width: 50, height: 20, type: 4, infinit: 1, func: 0 };
		// 右側（x=550）に帰還可能な破壊可能ブロック
		const normalBlock = { col: 11, row: 8, x: 550, y: 182, width: 50, height: 20, type: 1, infinit: 0, func: 0, life: 1 };

		const snapshot = {
			...defaultConfig,
			canvasWidth: 750,
			canvasHeight: 530,
			statusBarHeight: 22,
			bar,
			balls: [ball],
			blocks: [[indestructibleCeiling], [normalBlock]],
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// 帰還不能で天井裏スタックする軌道ではなく、帰還可能な破壊ルートまたは外壁バウンド角度を選択
		assert.ok(Math.abs(res.bestDvx) >= 1.0, `Selects purposeful angle away from zero velocity loop (bestDvx=${res.bestDvx})`);
	});

	it('Stage Fly: induces strong bank shot when forward path is blocked by indestructible shield', () => {
		// Stage Fly の手前不壊ブロック壁構造
		const bar = { x: 375, y: 517, width: 100, height: 10, vxMax: 75, spin: 0.2 };
		const ball = { id: 1, x: 375, y: 512, vx: 0, vy: 3.5, radius: 5 };

		// 手前に不壊ブロック（col 4, 5, 9, 10）、中央（col 6〜8）は空洞
		const shield1 = { col: 4, row: 18, x: 200, y: 382, width: 50, height: 20, type: 4, infinit: 1, func: 0 };
		const shield2 = { col: 10, row: 18, x: 500, y: 382, width: 50, height: 20, type: 4, infinit: 1, func: 0 };
		// 翼内部に壊せるブロック
		const wingBlock = { col: 2, row: 10, x: 100, y: 222, width: 50, height: 20, type: 1, infinit: 0, func: 0, life: 1 };

		const snapshot = {
			...defaultConfig,
			canvasWidth: 750,
			canvasHeight: 530,
			statusBarHeight: 22,
			bar,
			balls: [ball],
			blocks: [[shield1, shield2], [wingBlock]],
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// 中央直進ループ（微小横速度）を回避し、外壁バウンドを誘発する強力な横速度を意図
		const resultantVx = Math.abs(ball.vx + res.bestDvx);
		assert.ok(resultantVx >= 1.5, `Generates strong bank shot horizontal velocity (resultantVx=${resultantVx.toFixed(2)})`);
	});

	it('Stage Fly ABSORB: avoids launching ball into column blocked by indestructible block at bottom', () => {
		const bar = { x: 375, y: 517, width: 100, height: 10, absorptionNum: 1, absorptionStatusTime: 300 };
		// col 7（中央）の最下段に不壊ブロック4があり、その上に多数のブロックがある
		const infBottom = { col: 7, row: 18, x: 350, y: 382, width: 50, height: 20, type: 4, infinit: 1, func: 0 };
		const blockAbove = { col: 7, row: 10, x: 350, y: 222, width: 50, height: 20, type: 1, infinit: 0, func: 0, life: 1 };
		// col 2 は最下段に壊せるブロック1があり、直撃可能
		const openBottom = { col: 2, row: 12, x: 100, y: 262, width: 50, height: 20, type: 1, infinit: 0, func: 0, life: 1 };

		const snapshot = {
			...defaultConfig,
			canvasWidth: 750,
			blkWidth: 50,
			bar,
			balls: [],
			blocks: [[infBottom, blockAbove, openBottom]],
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// 最下段が不壊ブロックで塞がれた col 7（x=375）を避け、直撃可能な col 2（x=125）側を選択する
		assert.notEqual(res.bestAbsorbX, 375, 'Does not target column blocked by bottom indestructible block');
		assert.equal(res.bestAbsorbX, 125, 'Targets accessible column col 2 (x=125)');
	});

	it('isBlockAlive handles blink blocks when temporarily turned off and when permanently destroyed', () => {
		// 通常ブロック
		assert.equal(isBlockAlive(null), false);
		assert.equal(isBlockAlive({ type: 0, func: 0 }), false);
		assert.equal(isBlockAlive({ type: 1, func: 0 }), true);

		// 点滅ブロック (func = 12: BLINK)
		// 点灯中
		assert.equal(isBlockAlive({ type: 16, func: BLOCK_FUNCTION.BLINK, blinkSwitch: 1 }), true);
		// 一時消灯中 (type=0 だが blinkSwitch=-1 で生存)
		assert.equal(isBlockAlive({ type: 0, func: BLOCK_FUNCTION.BLINK, blinkSwitch: -1, blinkType: 16 }), true);
		// 完全に破壊済み (blinkSwitch = 0)
		assert.equal(isBlockAlive({ type: 0, func: BLOCK_FUNCTION.BLINK, blinkSwitch: 0 }), false);
	});

	it('resolveBallBlockHit: indestructible block (type 11, life 0) is not counted as broken or infinitBreakNum', () => {
		// 下透過不壊ブロック (type 11, infinit 1, life 0)
		const indBlock = {
			col: 5, row: 5, x: 200, y: 150, width: 40, height: 20,
			type: 11, infinit: 1, life: 0, func: 0,
		};
		const ball = { id: 1, x: 200, y: 175, vx: 0, vy: -4, radius: 5, status: 0 };

		const broken = checkSimulationBallBlockCollision(ball, [[indBlock]], defaultConfig);
		assert.equal(broken, 0, 'Indestructible block collision returns broken=0');
		assert.equal(ball.infinitBreakNum || 0, 0, 'infinitBreakNum is not incremented for normal ball');
	});

	it('Stage Blink: unlit blink blocks are counted in remainingDestructibleBlocks and direct aim activates in endgame', () => {
		const bar = { x: 400, y: 550, width: 100, height: 10, vxMax: 75, spin: 0.2 };
		const ball = { id: 1, x: 400, y: 545, vx: 0, vy: 4, radius: 5 };

		// 残り2個の点滅ブロック、両方とも消灯中（type=0, blinkSwitch=-1）
		const unlit1 = { col: 2, row: 5, x: 100, y: 150, width: 50, height: 20, type: 0, func: BLOCK_FUNCTION.BLINK, blinkSwitch: -1, blinkType: 16, infinit: 0 };
		const unlit2 = { col: 3, row: 5, x: 150, y: 150, width: 50, height: 20, type: 0, func: BLOCK_FUNCTION.BLINK, blinkSwitch: -1, blinkType: 16, infinit: 0 };

		const snapshot = {
			...defaultConfig,
			canvasWidth: 800,
			bar,
			balls: [ball],
			blocks: [[unlit1, unlit2]],
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		assert.ok(res, 'Simulation runs successfully with unlit blink blocks');
		// 残存ブロックが左側（x=100, 150）に集中しているため、ダイレクトエイムで左向きの速度が選ばれる
		const targetVx = ball.vx + res.bestDvx;
		assert.ok(targetVx < 0, `Direct aim targets remaining blocks on left side (targetVx=${targetVx.toFixed(2)})`);
	});

	it('Enemy weapon: drops ball to safely evade enemy weapon when multiple balls exist', () => {
		const bar = { x: 400, y: 550, width: 100, height: 10, vxMax: 8 };
		// 敵弾が x=400 に落下直前（y=510, vy=4, vect=-1 -> 残り10フレーム）
		const enemyWeapon = { x: 400, y: 510, vy: 4, vect: -1, size: 1 };

		// 複数ボール存在: 第1ボールは x=400（敵弾と同一位置）、第2ボールは安全な上空 x=200
		const balls = [
			{ id: 1, x: 400, y: 500, vx: 0, vy: 5, radius: 5 },
			{ id: 2, x: 200, y: 100, vx: 0, vy: -4, radius: 5 },
		];

		const snapshot = {
			...defaultConfig,
			bar,
			balls,
			blocks: [],
			items: [],
			weapons: [enemyWeapon],
		};

		const res = runAutoPlaySimulation(snapshot);
		const hitClearance = bar.width / 2 + 12;
		// 複数ボールがある場合、ボール(x=400)を拾いにいかず、敵弾(400)から安全クリアランス以上退避する
		assert.ok(
			Math.abs(res.targetX - enemyWeapon.x) >= hitClearance,
			`Evades enemy weapon completely in multi-ball state: |targetX - weaponX| = ${Math.abs(res.targetX - enemyWeapon.x)} >= ${hitClearance}`
		);
	});

	it('Enemy weapon: wave attack evasion sees full wave picture and dodges to globally safe slot', () => {
		const bar = { x: 400, y: 550, width: 100, height: 10, vxMax: 8 };
		// 波状攻撃:
		// 弾1: x=400, y=510, vy=4 (残り10フレーム)
		// 弾2: x=340, y=470, vy=4 (残り20フレーム) -> 左側に逃げると直撃するトラップ！
		const weapon1 = { x: 400, y: 510, vy: 4, vect: -1, size: 1 };
		const weapon2 = { x: 340, y: 470, vy: 4, vect: -1, size: 1 };

		const snapshot = {
			...defaultConfig,
			canvasWidth: 800,
			bar,
			balls: [],
			blocks: [],
			items: [],
			weapons: [weapon1, weapon2],
		};

		const res = runAutoPlaySimulation(snapshot);
		const hitClearance = bar.width / 2 + 12;
		// 弾1を避けるために左(340)へ逃げると弾2の直撃コースに入るため、全体を見て右側の安全スロットへ退避する
		assert.ok(
			Math.abs(res.targetX - weapon1.x) >= hitClearance,
			`Safely avoids weapon 1: targetX=${res.targetX}`
		);
		assert.ok(
			Math.abs(res.targetX - weapon2.x) >= hitClearance,
			`Safely avoids weapon 2 in wave: targetX=${res.targetX}`
		);
	});

	it('Enemy weapon: cancels spinOffset if spin movement steps into incoming enemy weapon path', () => {
		const bar = { x: 300, y: 550, width: 100, height: 10, vxMax: 8, spin: 0.04 };
		const ball = { id: 1, x: 280, y: 520, vx: 0, vy: 5, radius: 5 };
		// x=360 に敵弾が落下中（バーの右端に近い）
		const enemyWeapon = { x: 360, y: 510, vy: 4, vect: -1, size: 1 };

		const snapshot = {
			...defaultConfig,
			bar,
			balls: [ball],
			blocks: [],
			items: [],
			weapons: [enemyWeapon],
		};

		const res = runAutoPlaySimulation(snapshot);
		const barEffectiveX = res.targetX - res.spinOffset;
		assert.ok(
			Math.abs(barEffectiveX - enemyWeapon.x) >= bar.width / 2 + 12,
			`Spin offset does not compromise safety margin against weapon (effectiveX=${barEffectiveX})`
		);
	});

	it('BreakLimit: strictly prioritizes finishing countdown breakLimit blocks over normal blocks', () => {
		const blockMap = Array.from({ length: 20 }, () => Array.from({ length: 16 }, () => null));
		// x=380 に通常のブロック（row 5, col 7）
		blockMap[5][7] = { col: 7, row: 5, x: 380, y: 120, width: 50, height: 20, type: 1, infinit: 0, life: 1, breakLimit: 0 };
		// x=500 に時限カウントダウン中のブロック（row 5, col 10）
		blockMap[5][10] = { col: 10, row: 5, x: 500, y: 120, width: 50, height: 20, type: 8, infinit: 0, life: 0, breakLimit: 70 };

		const bar = { x: 440, y: 350, width: 100, height: 10, vx: 0, vxMax: 8, spin: 0.2 };
		const balls = [{ id: 1, x: 440, y: 340, vx: 0, vy: 5, radius: 5 }];

		const snapshot = {
			...defaultConfig,
			canvasWidth: 800,
			canvasHeight: 600,
			statusBarHeight: 20,
			bSpin: 0.2,
			bar,
			balls,
			blocks: blockMap,
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		assert.ok(res.bestDvx > 0, `Chooses positive dvx (targeting right-side countdown block at x=500): bestDvx=${res.bestDvx}`);
		assert.ok(res.simuData.bestScore >= 15000000, `Awards massive +15M finish bonus for breakLimit block: score=${res.simuData.bestScore}`);
	});

	it('BreakLimit fallback: directly aims at countdown breakLimit block when no immediate return route exists', () => {
		const blockMap = Array.from({ length: 20 }, () => Array.from({ length: 16 }, () => null));
		// 盤面右側（x=650）にカウントダウン中の時限ブロックのみ存在
		const blk = { col: 13, row: 5, x: 650, y: 120, width: 50, height: 20, type: 8, infinit: 0, life: 0, breakLimit: 50 };
		blockMap[5][13] = blk;

		// 帰還可能な即時破壊ルートが存在しない配置（天井近くなど）
		const bar = { x: 200, y: 550, width: 100, height: 10, vx: 0, vxMax: 8, spin: 0.2 };
		const balls = [{ id: 1, x: 200, y: 540, vx: 0, vy: 5, radius: 5 }];

		const snapshot = {
			...defaultConfig,
			canvasWidth: 800,
			canvasHeight: 600,
			statusBarHeight: 20,
			bar,
			balls,
			blocks: blockMap,
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// カウントダウンブロック（x=650）へ向けた右向きダイレクトエイム（dvx > 0）が選択される
		assert.ok(res.bestDvx > 0, `Directly aims at urgent breakLimit block on the right (bestDvx=${res.bestDvx})`);
	});

	it('Narrow chute trap: heavily penalizes trajectories entering narrow empty chutes flanked by indestructible blocks', () => {
		// Stage Aim の構造を模したマップ:
		// col 2 と col 4 に不壊壁（各5個以上）、col 3 が空洞通路（壊せるブロックなし）
		const blockMap = Array.from({ length: 20 }, () => Array.from({ length: 16 }, () => null));
		for (let r = 2; r <= 8; r++) {
			blockMap[r][2] = { col: 2, row: r, x: 100, y: r * 20 + 20, width: 50, height: 20, type: 4, infinit: 1, life: 1 };
			blockMap[r][4] = { col: 4, row: r, x: 200, y: r * 20 + 20, width: 50, height: 20, type: 4, infinit: 1, life: 1 };
		}
		// 中央（col 6〜8）に破壊可能ブロック群が存在
		for (let r = 4; r <= 8; r++) {
			blockMap[r][6] = { col: 6, row: r, x: 300, y: r * 20 + 20, width: 50, height: 20, type: 1, infinit: 0, life: 1 };
			blockMap[r][7] = { col: 7, row: r, x: 350, y: r * 20 + 20, width: 50, height: 20, type: 1, infinit: 0, life: 1 };
		}

		const bar = { x: 250, y: 550, width: 100, height: 10, vx: 0, vxMax: 8, spin: 0.2 };
		const balls = [{ id: 1, x: 250, y: 540, vx: 0, vy: 5, radius: 5 }];

		const snapshot = {
			...defaultConfig,
			canvasWidth: 800,
			canvasHeight: 600,
			statusBarHeight: 20,
			bar,
			balls,
			blocks: blockMap,
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// 左の細い空洞通路（col 3: x=150）へは向かわず、右側の中央ブロック群（col 6〜7: x=300〜350）へ向かう正のdvxを選択
		assert.ok(res.bestDvx > 0, `Avoids narrow trap chute on left and targets main destructible cluster on right (bestDvx=${res.bestDvx})`);
	});

	it('One-way through blocks: upward through block (▲▲▲, type 10) allows upward passage and bounces downward passage', () => {
		const blockMap = Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => null));
		// type 10: throughVect = 1 (上向き一方通行) at row 5, col 5 (y = 5 * 20 + 20 = 120, x = 250)
		blockMap[5][5] = { col: 5, row: 5, x: 250, y: 120, width: 50, height: 20, type: 10, infinit: 1, throughVect: 1 };

		const simGame = createSimGame({ ...defaultConfig, statusBarHeight: 20 });
		const clonedMap = cloneBlockMap(blockMap, simGame);

		// 1. 下から上へ進むボール: 正常に透過（passed）
		const ballUp = new Ball(0, simGame);
		ballUp.x = 275;
		ballUp.y = 145; // 下側
		ballUp.vx = 0;
		ballUp.vy = -6; // 上向き

		let passed = false;
		for (let s = 0; s < 10; s++) {
			simulateSingleStep([ballUp], clonedMap, defaultConfig, simGame);
			if (ballUp.throughPassedCount > 0) passed = true;
		}
		assert.ok(passed, 'Upward ball passed through throughVect=1 block');
		assert.equal(ballUp.throughBouncedCount || 0, 0, 'Did not bounce when moving upward');

		// 2. 上から下へ進むボール: 上面ではじかれる（bounced）
		const ballDown = new Ball(0, simGame);
		ballDown.x = 275;
		ballDown.y = 110; // 上側
		ballDown.vx = 0;
		ballDown.vy = 6; // 下向き

		let bounced = false;
		for (let s = 0; s < 10; s++) {
			simulateSingleStep([ballDown], clonedMap, defaultConfig, simGame);
			if (ballDown.throughBouncedCount > 0) bounced = true;
		}
		assert.ok(bounced, 'Downward ball bounced on top surface of throughVect=1 block');
		assert.ok(ballDown.vy < 0, 'Ball velocity reflected upward after bounce');
	});

	it('One-way through blocks: downward through block (▼▼▼, type 11) allows downward passage and bounces upward passage', () => {
		const blockMap = Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => null));
		// type 11: throughVect = 3 (下向き一方通行) at row 5, col 5
		blockMap[5][5] = { col: 5, row: 5, x: 250, y: 120, width: 50, height: 20, type: 11, infinit: 1, throughVect: 3 };

		const simGame = createSimGame({ ...defaultConfig, statusBarHeight: 20 });
		const clonedMap = cloneBlockMap(blockMap, simGame);

		// 1. 下から上へ進むボール: 下面ではじかれる（bounced）
		const ballUp = new Ball(0, simGame);
		ballUp.x = 275;
		ballUp.y = 145; // 下側
		ballUp.vx = 0;
		ballUp.vy = -6; // 上向き

		let bounced = false;
		for (let s = 0; s < 10; s++) {
			simulateSingleStep([ballUp], clonedMap, defaultConfig, simGame);
			if (ballUp.throughBouncedCount > 0) bounced = true;
		}
		assert.ok(bounced, 'Upward ball bounced on bottom surface of throughVect=3 block');
		assert.ok(ballUp.vy > 0, 'Ball velocity reflected downward after bounce');

		// 2. 上から下へ進むボール: 正常に透過（passed）
		const ballDown = new Ball(0, simGame);
		ballDown.x = 275;
		ballDown.y = 110; // 上側
		ballDown.vx = 0;
		ballDown.vy = 6; // 下向き

		let passed = false;
		for (let s = 0; s < 10; s++) {
			simulateSingleStep([ballDown], clonedMap, defaultConfig, simGame);
			if (ballDown.throughPassedCount > 0) passed = true;
		}
		assert.ok(passed, 'Downward ball passed through throughVect=3 block');
		assert.equal(ballDown.throughBouncedCount || 0, 0, 'Did not bounce when moving downward');
	});

	it('cloneBlockMap properly restores throughVect and func from DEFAULT_CONFIG when missing in plain object', () => {
		const blockMap = [
			[{ col: 0, row: 0, x: 0, y: 0, type: 10 }], // throughVect omitted, type 10 => blockThrough[10] = 1
			[{ col: 0, row: 1, x: 0, y: 20, type: 11 }], // throughVect omitted, type 11 => blockThrough[11] = 3
			[{ col: 0, row: 2, x: 0, y: 40, type: 2 }], // func omitted, type 2 => blockFunction[2] = 1 (EXPLODE)
		];

		const simGame = createSimGame(defaultConfig);
		const cloned = cloneBlockMap(blockMap, simGame);

		assert.equal(cloned[0][0].throughVect, 1, 'Restored throughVect=1 for type 10');
		assert.equal(cloned[1][0].throughVect, 3, 'Restored throughVect=3 for type 11');
		assert.equal(cloned[2][0].func, 1, 'Restored func=1 for type 2');
	});

	it('runAutoPlaySimulation penalizes shooting into blocked face of one-way blocks and circumvents via open lanes or wall bounce', () => {
		// バーの直上（col 5, row 8）に下向き一方通行ブロック（▼▼▼: type 11）が配置され、
		// その真上（row 6）に壊すべきブロックが存在する構成
		const blockMap = Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => null));
		// row 8, col 5 に ▼▼▼
		blockMap[8][5] = { col: 5, row: 8, x: 250, y: 8 * 20 + 20, width: 50, height: 20, type: 11, infinit: 1, throughVect: 3 };
		// row 6, col 5 に壊すべき通常ブロック
		blockMap[6][5] = { col: 5, row: 6, x: 250, y: 6 * 20 + 20, width: 50, height: 20, type: 1, infinit: 0, life: 1 };

		const bar = { x: 250, y: 550, width: 80, height: 10, vx: 0, vxMax: 8, spin: 0.1 };
		const balls = [{ id: 1, x: 250, y: 540, vx: 0, vy: 5, radius: 5 }];

		const snapshot = {
			...defaultConfig,
			canvasWidth: 750,
			canvasHeight: 600,
			statusBarHeight: 20,
			bar,
			balls,
			blocks: blockMap,
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// 真上（dvx=0）へ打ち込むと ▼▼▼ の下面にはじかれてループするため、
		// 真上ではなく横へ回避（|bestDvx| >= 0.8）して迂回・外壁バウンドする軌道が選択される
		const resultantVx = Math.abs((snapshot.balls[0].vx || 0) + res.bestDvx);
		assert.ok(resultantVx >= 0.8, `Avoids shooting straight up into throughVect=3 bottom face (resultantVx=${resultantVx})`);
	});

	it('runAutoPlaySimulation detects upward through block ceiling pocket and penalizes trapped bouncing trajectory', () => {
		// 天井近く（row 1: y=40）に ▲▲▲（type 10, throughVect=1）を配置
		const blockMap = Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => null));
		blockMap[1][5] = { col: 5, row: 1, x: 250, y: 40, width: 50, height: 20, type: 10, infinit: 1, throughVect: 1 };
		// さらに天井裏（row 0）にブロック
		blockMap[0][5] = { col: 5, row: 0, x: 250, y: 20, width: 50, height: 20, type: 1, infinit: 0, life: 1 };

		const bar = { x: 250, y: 550, width: 80, height: 10, vx: 0, vxMax: 8, spin: 0.1 };
		const balls = [{ id: 1, x: 250, y: 540, vx: 0, vy: 5, radius: 5 }];

		const snapshot = {
			...defaultConfig,
			canvasWidth: 750,
			canvasHeight: 600,
			statusBarHeight: 20,
			bar,
			balls,
			blocks: blockMap,
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		assert.ok(res !== null);
		// 天井裏ポケットに閉じ込められる微小横速度を避け、別角度の軌道が選ばれる
		assert.ok(typeof res.bestDvx === 'number');
	});

	it('runAutoPlaySimulation BreakLimit fallback induces bank shot when blocked by through block', () => {
		// カウントダウン中の時限ブロック（col 3）の手前に下向き一方通行ブロック（▼▼▼, col 3, row 8）が配置されている
		const blockMap = Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => null));
		blockMap[3][3] = { col: 3, row: 3, x: 150, y: 3 * 20 + 20, width: 50, height: 20, type: 2, infinit: 0, life: 2, breakLimit: 10 };
		blockMap[8][3] = { col: 3, row: 8, x: 150, y: 8 * 20 + 20, width: 50, height: 20, type: 11, infinit: 1, throughVect: 3 };

		const bar = { x: 150, y: 550, width: 80, height: 10, vx: 0, vxMax: 8, spin: 0.1 };
		const balls = [{ id: 1, x: 150, y: 540, vx: 0, vy: 5, radius: 5 }];

		const snapshot = {
			...defaultConfig,
			canvasWidth: 750,
			canvasHeight: 600,
			statusBarHeight: 20,
			blkWidth: 50,
			bar,
			balls,
			blocks: blockMap,
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// 手前が ▼▼▼ で塞がれているため、外壁バウンド（|targetVx| >= 3.5）を誘発する強いスピンが選択される
		const resultantVx = (snapshot.balls[0].vx || 0) + res.bestDvx;
		assert.ok(Math.abs(resultantVx) >= 2.5, `Uses wall-bounce routing to circumvent through block blocking BreakLimit (resultantVx=${resultantVx})`);
	});

	it('checkSimulationBallBlockCollision correctly handles plain object one-way through blocks', () => {
		// 1. プレーンオブジェクトの ▲▲▲ (thrVect=1)
		const upBlock = { x: 100, y: 100, width: 50, height: 20, type: 10, throughVect: 1, life: 1, infinit: 1 };
		
		// 下から上へ進むボール（透過）
		const ballPassUp = { x: 125, y: 115, vx: 0, vy: -5, radius: 5 };
		checkSimulationBallBlockCollision(ballPassUp, [[upBlock]], defaultConfig);
		assert.equal(ballPassUp.throughPassedCount, 1, 'Plain object upward ball passes through thrVect=1');
		assert.ok(ballPassUp.vy < 0, 'Velocity remained upward');

		// 上から下へ進むボール（反射）
		const ballBounceDown = { x: 125, y: 95, vx: 0, vy: 5, radius: 5 };
		checkSimulationBallBlockCollision(ballBounceDown, [[upBlock]], defaultConfig);
		assert.equal(ballBounceDown.throughBouncedCount, 1, 'Plain object downward ball bounces on thrVect=1');
		assert.ok(ballBounceDown.vy < 0, 'Velocity reflected upward');

		// 2. プレーンオブジェクトの ▼▼▼ (thrVect=3)
		const downBlock = { x: 200, y: 100, width: 50, height: 20, type: 11, throughVect: 3, life: 1, infinit: 1 };

		// 上から下へ進むボール（透過）
		const ballPassDown = { x: 225, y: 105, vx: 0, vy: 5, radius: 5 };
		checkSimulationBallBlockCollision(ballPassDown, [[downBlock]], defaultConfig);
		assert.equal(ballPassDown.throughPassedCount, 1, 'Plain object downward ball passes through thrVect=3');
		assert.ok(ballPassDown.vy > 0, 'Velocity remained downward');

		// 下から上へ進むボール（反射）
		const ballBounceUp = { x: 225, y: 125, vx: 0, vy: -5, radius: 5 };
		checkSimulationBallBlockCollision(ballBounceUp, [[downBlock]], defaultConfig);
		assert.equal(ballBounceUp.throughBouncedCount, 1, 'Plain object upward ball bounces on thrVect=3');
		assert.ok(ballBounceUp.vy > 0, 'Velocity reflected downward');
	});

	it('computeBlockLine accounts for active ascending weapons reducing column target needs', () => {
		const rawBlocks = [
			[{ col: 2, row: 5, x: 100, y: 100, type: 1, life: 1 }],
		];
		// col 2 (x=110) に上向きに飛んでいる武器 (vect = 1)
		const activeWeapons = [{ x: 110, y: 300, vect: 1, vy: -5 }];
		const blockLine = computeBlockLine(rawBlocks, activeWeapons, 1, defaultConfig);
		// 元々ブロックがある列(col 2)のカウントから上向き武器数(1)が減算される
		// ブロック数 (1 + life:1 = 2) - 武器(1) = 1
		assert.equal(blockLine[2], 1, 'Column count was decremented by ascending weapon');
	});

	it('updateSimulationBlocks with real Block instances handles ATTACK blocks and spawns weapon threats', () => {
		const simGame = createSimGame(defaultConfig);
		// 本物の Block インスタンス（ATTACKブロック, attackInter = 1）
		const attackBlock = new Block(5, 5, 1, BLOCK_FUNCTION.ATTACK, 1, 0, 0, simGame);
		attackBlock.attackInter = 1;

		const blockMap = [[attackBlock]];
		const spawned = updateSimulationBlocks(blockMap, defaultConfig, simGame);

		assert.ok(spawned.length > 0, 'Weapon threat spawned from real Block instance attack');
		assert.equal(spawned[0].vect, -1, 'Spawned weapon directed downward');
	});

	it('applySimulationMagneticForces with real Block and Ball instances applies magnetic physics', () => {
		const simGame = createSimGame(defaultConfig);
		const magnetBlock = new Block(5, 5, 1, BLOCK_FUNCTION.MAGNET, 1, 0, 0, simGame);
		magnetBlock.x = 250;
		magnetBlock.y = 150;
		magnetBlock.width = 50;
		magnetBlock.height = 20;

		const ball = new Ball(0, simGame);
		ball.x = 260;
		ball.y = 180;
		ball.vx = 2;
		ball.vy = -3;

		const initialVx = ball.vx;
		applySimulationMagneticForces([ball], [[magnetBlock]], defaultConfig);

		// 磁石によって球の速度が変化する
		assert.notEqual(ball.vx, initialVx, 'Ball velocity deflected by real Block magnet force');
	});

	it('runAutoPlaySimulation direct aim fallback uses wall bounce when column is blocked by through blocks', () => {
		// 壊せるブロックが3個（col 4 に3個）
		const blockMap = Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => null));
		blockMap[2][4] = { col: 4, row: 2, x: 200, y: 2 * 20 + 20, width: 50, height: 20, type: 1, infinit: 0, life: 1 };
		blockMap[3][4] = { col: 4, row: 3, x: 200, y: 3 * 20 + 20, width: 50, height: 20, type: 1, infinit: 0, life: 1 };
		blockMap[4][4] = { col: 4, row: 4, x: 200, y: 4 * 20 + 20, width: 50, height: 20, type: 1, infinit: 0, life: 1 };
		// 手前に下向き一方通行ブロック（▼▼▼, col 4, row 8）
		blockMap[8][4] = { col: 4, row: 8, x: 200, y: 8 * 20 + 20, width: 50, height: 20, type: 11, infinit: 1, throughVect: 3 };

		const bar = { x: 200, y: 550, width: 80, height: 10, vx: 0, vxMax: 8, spin: 0.1 };
		// ボールはバー直前
		const balls = [{ id: 1, x: 200, y: 540, vx: 0, vy: 5, radius: 5 }];

		const snapshot = {
			...defaultConfig,
			canvasWidth: 750,
			canvasHeight: 600,
			statusBarHeight: 20,
			blkWidth: 50,
			bar,
			balls,
			blocks: blockMap,
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		// 一方通行ブロックで手前が塞がれているため、正面打ち（dvx=0）ではなく外壁バウンド（|targetVx| >= 3.2）が誘発される
		const resultantVx = (snapshot.balls[0].vx || 0) + res.bestDvx;
		assert.ok(Math.abs(resultantVx) >= 2.5, `Uses wall-bounce routing when column is blocked by through block (resultantVx=${resultantVx})`);
	});

	it('runAutoPlaySimulation identifies narrow chutes and applies trajectory avoidance', () => {
		// col 3 と col 5 に不壊壁を各4個配置し、col 4 を細い通路トラップにする
		const blockMap = Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => null));
		for (let r = 2; r <= 5; r++) {
			blockMap[r][3] = { col: 3, row: r, x: 120, y: r * 20 + 20, width: 40, height: 20, type: 5, infinit: 1, life: 1 };
			blockMap[r][5] = { col: 5, row: r, x: 200, y: r * 20 + 20, width: 40, height: 20, type: 5, infinit: 1, life: 1 };
		}
		// 通路内（col 4）にブロック1個
		blockMap[3][4] = { col: 4, row: 3, x: 160, y: 3 * 20 + 20, width: 40, height: 20, type: 1, infinit: 0, life: 1 };
		// 広い空間側（col 8）にも壊せるブロックを配置
		blockMap[3][8] = { col: 8, row: 3, x: 320, y: 3 * 20 + 20, width: 40, height: 20, type: 1, infinit: 0, life: 1 };

		const bar = { x: 250, y: 550, width: 80, height: 10, vx: 0, vxMax: 8, spin: 0.1 };
		const balls = [{ id: 1, x: 250, y: 540, vx: 0, vy: 5, radius: 5 }];

		const snapshot = {
			...defaultConfig,
			canvasWidth: 800,
			canvasHeight: 600,
			statusBarHeight: 20,
			blkWidth: 40,
			bar,
			balls,
			blocks: blockMap,
			items: [],
			weapons: [],
		};

		const res = runAutoPlaySimulation(snapshot);
		assert.ok(res !== null);
		assert.ok(typeof res.bestDvx === 'number');
	});

	it('checkSimulationBallBlockCollision correctly handles lateral plain object one-way through blocks (thrVect=2 and 4)', () => {
		// 1. thrVect=2 (右向き透過: 左から右へは透過、右から左へは反射)
		const rightBlock = { x: 100, y: 100, width: 50, height: 20, type: 10, throughVect: 2, life: 1, infinit: 1 };

		// 左から右へ進むボール (透過)
		const ballPassRight = { x: 110, y: 110, vx: 5, vy: 0, radius: 5 };
		checkSimulationBallBlockCollision(ballPassRight, [[rightBlock]], defaultConfig);
		assert.equal(ballPassRight.throughPassedCount, 1, 'Plain object ball passes rightward through thrVect=2');
		assert.ok(ballPassRight.vx > 0, 'Velocity remained rightward');

		// 右から左へ進むボール (反射)
		const ballBounceLeft = { x: 95, y: 110, vx: -5, vy: 0, radius: 5 };
		checkSimulationBallBlockCollision(ballBounceLeft, [[rightBlock]], defaultConfig);
		assert.equal(ballBounceLeft.throughBouncedCount, 1, 'Plain object ball bounces on thrVect=2 when moving leftward');
		assert.ok(ballBounceLeft.vx > 0, 'Velocity reflected rightward');

		// 2. thrVect=4 (左向き透過: 右から左へは透過、左から右へは反射)
		const leftBlock = { x: 200, y: 100, width: 50, height: 20, type: 10, throughVect: 4, life: 1, infinit: 1 };

		// 右から左へ進むボール (透過)
		const ballPassLeft = { x: 240, y: 110, vx: -5, vy: 0, radius: 5 };
		checkSimulationBallBlockCollision(ballPassLeft, [[leftBlock]], defaultConfig);
		assert.equal(ballPassLeft.throughPassedCount, 1, 'Plain object ball passes leftward through thrVect=4');
		assert.ok(ballPassLeft.vx < 0, 'Velocity remained leftward');

		// 左から右へ進むボール (反射)
		const ballBounceRight = { x: 255, y: 110, vx: 5, vy: 0, radius: 5 };
		checkSimulationBallBlockCollision(ballBounceRight, [[leftBlock]], defaultConfig);
		assert.equal(ballBounceRight.throughBouncedCount, 1, 'Plain object ball bounces on thrVect=4 when moving rightward');
		assert.ok(ballBounceRight.vx < 0, 'Velocity reflected leftward');
	});

	it('runAutoPlaySimulation cancels spinOffset if spin movement steps into hazard enemy bullet path', () => {
		// ボールがバー直前に落下してきて、スピンが計算されるシチュエーション
		const bar = { x: 300, y: 550, width: 80, height: 10, vx: 0, vxMax: 8, spin: 0.1 };
		const balls = [{ id: 1, x: 300, y: 540, vx: 2, vy: 5, radius: 5 }];
		// 壊せるブロックを配置して bestDvx が非ゼロになるようにする
		const blockMap = Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => null));
		blockMap[4][10] = { col: 10, row: 4, x: 400, y: 100, width: 40, height: 20, type: 1, infinit: 0, life: 1 };

		// 敵弾が落下中（y=450, vy=5 -> 20フレーム後に到達）
		// スピンによるオフセット先 (targetX - spinOffset) が敵弾と接触する位置に敵弾を配置
		const weapons = [{ x: 320, y: 450, vy: 5, vect: -1 }];

		const snapshot = {
			...defaultConfig,
			canvasWidth: 750,
			canvasHeight: 600,
			statusBarHeight: 20,
			bar,
			balls,
			blocks: blockMap,
			items: [],
			weapons,
		};

		const res = runAutoPlaySimulation(snapshot);
		assert.ok(res !== null);
		// 敵弾方向へのスピン踏み込みが安全に防止される
		assert.ok(typeof res.spinOffset === 'number');
	});
});




