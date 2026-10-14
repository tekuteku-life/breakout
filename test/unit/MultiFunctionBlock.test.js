import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import Block from '../../src/Block.js';
import Ball from '../../src/Ball.js';
import EventBus from '../../src/EventBus.js';
import PresetManage from '../../src/PresetManage.js';
import { blockHasFunction, cloneBlockMap } from '../../src/AutoPlaySimulation.js';
import { BLOCK_FUNCTION, BALL_STATUS, BALL_CREATE_MODE } from '../../src/const.js';
import '../../src/main.js';

test('Multi-function Block unit and integration tests', async (t) => {
	setupEnvironment();
	const mockCtx = createMock2DContext();
	globalThis.staticCtx = mockCtx;
	globalThis.dynamicCtx = mockCtx;

	await t.test('initializes multiple functions from array, Set, string, number, or defaults', () => {
		// Single number
		const bSingle = new Block(1, 1, 1, BLOCK_FUNCTION.ATTACK, 0, 0, 0);
		assert.equal(bSingle.hasFunction(BLOCK_FUNCTION.ATTACK), true);
		assert.equal(bSingle.hasFunction(BLOCK_FUNCTION.NORMAL), false);
		assert.deepEqual(bSingle.getFunctions(), [BLOCK_FUNCTION.ATTACK]);
		assert.equal(bSingle.func, BLOCK_FUNCTION.ATTACK);

		// Array of functions
		const bArray = new Block(1, 1, 1, [BLOCK_FUNCTION.VERTICAL_MOVE, BLOCK_FUNCTION.ATTACK], 0, 0, 0);
		assert.equal(bArray.hasFunction(BLOCK_FUNCTION.VERTICAL_MOVE), true);
		assert.equal(bArray.hasFunction(BLOCK_FUNCTION.ATTACK), true);
		assert.equal(bArray.hasFunction(BLOCK_FUNCTION.NORMAL), false);
		assert.deepEqual(bArray.getFunctions(), [BLOCK_FUNCTION.VERTICAL_MOVE, BLOCK_FUNCTION.ATTACK]);

		// Set of functions
		const bSet = new Block(1, 1, 1, new Set([BLOCK_FUNCTION.ACCELERATION, BLOCK_FUNCTION.EXPLODE]), 0, 0, 0);
		assert.equal(bSet.hasFunction(BLOCK_FUNCTION.ACCELERATION), true);
		assert.equal(bSet.hasFunction(BLOCK_FUNCTION.EXPLODE), true);

		// Comma-separated string
		const bString = new Block(1, 1, 1, `${BLOCK_FUNCTION.MAGNET}, ${BLOCK_FUNCTION.BLINK}`, 0, 0, 0);
		assert.equal(bString.hasFunction(BLOCK_FUNCTION.MAGNET), true);
		assert.equal(bString.hasFunction(BLOCK_FUNCTION.BLINK), true);

		// Default fallback on null / undefined / empty array / 0
		const bNull = new Block(1, 1, 1, null, 0, 0, 0);
		assert.equal(bNull.hasFunction(BLOCK_FUNCTION.NORMAL), true);
		assert.deepEqual(bNull.getFunctions(), [BLOCK_FUNCTION.NORMAL]);
		assert.equal(bNull.func, BLOCK_FUNCTION.NORMAL);

		const bEmpty = new Block(1, 1, 1, [], 0, 0, 0);
		assert.equal(bEmpty.hasFunction(BLOCK_FUNCTION.NORMAL), true);
		assert.deepEqual(bEmpty.getFunctions(), [BLOCK_FUNCTION.NORMAL]);
	});

	await t.test('dynamically adds, removes, and updates functions via API', () => {
		const block = new Block(1, 1, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0);
		assert.equal(block.hasFunction(BLOCK_FUNCTION.NORMAL), true);

		// Add VERTICAL_MOVE (should remove NORMAL and initialize timers)
		block.addFunction(BLOCK_FUNCTION.VERTICAL_MOVE);
		assert.equal(block.hasFunction(BLOCK_FUNCTION.VERTICAL_MOVE), true);
		assert.equal(block.hasFunction(BLOCK_FUNCTION.NORMAL), false);
		assert.ok(block.moveInter >= 0);
		assert.ok(block.moveVect === 1 || block.moveVect === -1);

		// Add ATTACK
		block.addFunction(BLOCK_FUNCTION.ATTACK);
		assert.equal(block.hasFunction(BLOCK_FUNCTION.ATTACK), true);
		assert.ok(block.attackInter >= 0);

		// Check .func getter returns first non-normal function
		assert.equal(block.func, BLOCK_FUNCTION.VERTICAL_MOVE);

		// Remove VERTICAL_MOVE
		block.removeFunction(BLOCK_FUNCTION.VERTICAL_MOVE);
		assert.equal(block.hasFunction(BLOCK_FUNCTION.VERTICAL_MOVE), false);
		assert.equal(block.hasFunction(BLOCK_FUNCTION.ATTACK), true);
		assert.equal(block.moveInter, 0);
		assert.equal(block.moveVect, 0);
		assert.equal(block.func, BLOCK_FUNCTION.ATTACK);

		// Remove ATTACK -> reverts to NORMAL
		block.removeFunction(BLOCK_FUNCTION.ATTACK);
		assert.equal(block.hasFunction(BLOCK_FUNCTION.NORMAL), true);
		assert.equal(block.func, BLOCK_FUNCTION.NORMAL);

		// Removing BLINK restores block type if it was extinguished
		block.addFunction(BLOCK_FUNCTION.BLINK);
		block.blinkSwitch = -1;
		block.blinkType = 5;
		block.type = 0;
		block.removeFunction(BLOCK_FUNCTION.BLINK);
		assert.equal(block.type, 5, 'Removing BLINK restores extinguished block type');
		assert.equal(block.blinkSwitch, 0);

		// .func setter replaces all functions
		block.func = BLOCK_FUNCTION.EXPLODE;
		assert.equal(block.hasFunction(BLOCK_FUNCTION.EXPLODE), true);
		assert.equal(block.hasFunction(BLOCK_FUNCTION.NORMAL), false);
	});

	await t.test('clones multi-function block preserving all functions and timers', () => {
		const original = new Block(2, 3, 2, [BLOCK_FUNCTION.VERTICAL_MOVE, BLOCK_FUNCTION.ATTACK, BLOCK_FUNCTION.BLINK], 1, 0, 0);
		original.moveInter = 12;
		original.moveVect = -1;
		original.attackInter = 34;
		original.blinkInter = 56;
		original.blinkSwitch = 1;
		original.blinkType = 2;
		original.exploded = 5;

		const clone = original.clone();
		assert.equal(clone.hasFunction(BLOCK_FUNCTION.VERTICAL_MOVE), true);
		assert.equal(clone.hasFunction(BLOCK_FUNCTION.ATTACK), true);
		assert.equal(clone.hasFunction(BLOCK_FUNCTION.BLINK), true);
		assert.deepEqual(clone.getFunctions(), original.getFunctions());
		assert.equal(clone.moveInter, 12);
		assert.equal(clone.moveVect, -1);
		assert.equal(clone.attackInter, 34);
		assert.equal(clone.blinkInter, 56);
		assert.equal(clone.blinkSwitch, 1);
		assert.equal(clone.blinkType, 2);
		assert.equal(clone.exploded, 5);
	});

	await t.test('executes autonomous behaviors simultaneously (moving + attack + blink)', () => {
		const mockBlockMap = [];
		const mockGame = {
			objectManage: { blockMap: mockBlockMap, balls: [{}] },
			FPS: 50,
			blockWidth: 50,
			blockHeight: 20,
			statusBarHeight: 0,
			canvasWidth: 750,
			blockMoveInter: 2,
			blockAttackInter: 5,
			blockBlinkInter: 3,
		};

		let weaponSpawned = false;
		EventBus.destructor();
		EventBus.addOnEvent('weapon:spawn', () => { weaponSpawned = true; });

		// Multi-function block: moves horizontally, attacks, and blinks
		const block = new Block(1, 1, 1, [BLOCK_FUNCTION.VERTICAL_MOVE, BLOCK_FUNCTION.ATTACK, BLOCK_FUNCTION.BLINK], 0, 0, 0, mockGame);
		block.moveInter = 1;
		block.moveVect = 1;
		block.attackInter = 1;
		block.blinkInter = 1;
		block.blinkSwitch = 1;
		block.blinkType = 1;

		mockBlockMap[1] = [null, block, null];

		// 1. updateState updates attack and blink simultaneously
		block.updateState(true);
		assert.equal(weaponSpawned, true, 'Attack behavior spawned weapon');
		assert.equal(block.blinkSwitch, -1, 'Blink behavior toggled blinkSwitch');
		assert.equal(block.type, 0, 'Extinguished block type is 0');

		// Restore type for movement test
		block.type = 1;

		// 2. movePosition executes horizontal movement
		block.movePosition(mockBlockMap);
		assert.equal(mockBlockMap[1][1].type, 0, 'Original position cleared');
		const movedBlock = mockBlockMap[1][2];
		assert.ok(movedBlock !== null, 'Moved block placed at next column');
		assert.equal(movedBlock.hasFunction(BLOCK_FUNCTION.VERTICAL_MOVE), true);
		assert.equal(movedBlock.hasFunction(BLOCK_FUNCTION.ATTACK), true);
		assert.equal(movedBlock.hasFunction(BLOCK_FUNCTION.BLINK), true);
	});

	await t.test('handles combined collision actions (accelerating bomb)', () => {
		const mockBlockMap = [
			[null, null, null],
			[null, null, null],
			[null, null, null],
		];
		const mockGame = {
			objectManage: { blockMap: mockBlockMap },
			FPS: 50,
			blockWidth: 50,
			blockHeight: 20,
			statusBarHeight: 0,
			ballDefaultSpeed: 5,
			blockMotionTime: 1,
			blockDefaultPoint: 100,
			blockIncrPoint: 10,
		};

		// Surrounding normal blocks to be exploded
		mockBlockMap[0][1] = new Block(1, 0, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, mockGame);
		mockBlockMap[2][1] = new Block(1, 2, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, mockGame);

		// Accelerating Bomb block at (1, 1)
		const bAccelBomb = new Block(1, 1, 2, [BLOCK_FUNCTION.ACCELERATION, BLOCK_FUNCTION.EXPLODE], 0, 0, 0, mockGame);
		mockBlockMap[1][1] = bAccelBomb;

		const mockBall = {
			simulate: 0,
			status: BALL_STATUS.NORMAL,
			vx: 0,
			vy: 5,
			radius: 5,
			breakNum: 0,
			collisionNum: 0,
			pointIncr: 10,
			duaration: 0,
			getCenterX: () => 75,
			getCenterY: () => 30,
			getLeftX: () => 70,
			getRightX: () => 80,
			getTopY: () => 25,
			getBottomY: () => 35,
		};

		const addSpeed = bAccelBomb.action(mockBall, 0, mockBlockMap);

		// Explosion speed boost (5) + Acceleration speed boost (5 * 0.2 = 1) = 6
		assert.equal(addSpeed, 6, 'Should additively combine explosion boost and acceleration boost');
		assert.ok(bAccelBomb.exploded > 0, 'Exploded animation timer set');
		assert.equal(bAccelBomb.type, 0, 'Bomb block broken');
		assert.equal(mockBlockMap[0][1].type, 0, 'Surrounding block at (1,0) destroyed by explosion');
		assert.equal(mockBlockMap[2][1].type, 0, 'Surrounding block at (2,1) destroyed by explosion');
	});

	await t.test('handles combined collision actions (decelerating bomb and moving bomb)', () => {
		const mockBlockMap = [[], [null, null, null], []];
		const mockGame = {
			objectManage: { blockMap: mockBlockMap },
			FPS: 50,
			blockWidth: 50,
			blockHeight: 20,
			statusBarHeight: 0,
			ballDefaultSpeed: 5,
			blockMotionTime: 1,
			blockDefaultPoint: 100,
			blockIncrPoint: 10,
		};

		// Decelerating Bomb: ballDefaultSpeed (5) - ballDefaultSpeed * 0.2 (1) = 4
		const bDecelBomb = new Block(1, 1, 2, [BLOCK_FUNCTION.DECELERATION, BLOCK_FUNCTION.EXPLODE], 0, 0, 0, mockGame);
		mockBlockMap[1][1] = bDecelBomb;

		const mockBall = {
			simulate: 0,
			status: BALL_STATUS.NORMAL,
			vx: 0,
			vy: 5,
			radius: 5,
			breakNum: 0,
			collisionNum: 0,
			pointIncr: 10,
			duaration: 0,
			getCenterX: () => 75,
			getCenterY: () => 30,
			getLeftX: () => 70,
			getRightX: () => 80,
			getTopY: () => 25,
			getBottomY: () => 35,
		};

		const addSpeed = bDecelBomb.action(mockBall, 0, mockBlockMap);
		assert.equal(addSpeed, 4, 'Should additively apply explosion boost and deceleration penalty');
	});

	await t.test('handles weapon collision on explosive multi-function block', () => {
		const mockBlockMap = [
			[null, null, null],
			[null, null, null],
		];
		const mockGame = {
			objectManage: { blockMap: mockBlockMap },
			FPS: 50,
			blockWidth: 50,
			blockHeight: 20,
			statusBarHeight: 0,
			blockMotionTime: 1,
			blockDefaultPoint: 150,
		};

		mockBlockMap[0][1] = new Block(1, 0, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, mockGame);
		const bMovingBomb = new Block(1, 1, 2, [BLOCK_FUNCTION.VERTICAL_MOVE, BLOCK_FUNCTION.EXPLODE], 0, 0, 0, mockGame);
		mockBlockMap[1][1] = bMovingBomb;

		let scoreAdded = 0;
		EventBus.destructor();
		EventBus.addOnEvent('score:add', (pt) => { scoreAdded += pt; });

		// Weapon hit (ball is null)
		bMovingBomb.action(null, 0, mockBlockMap);

		assert.equal(bMovingBomb.type, 0, 'Moving bomb is destroyed by weapon');
		assert.equal(mockBlockMap[0][1].type, 0, 'Adjacent block is exploded by chained weapon explosion');
		assert.ok(scoreAdded >= 150, 'Score is awarded on weapon hit');
	});

	await t.test('handles indestructible warp attacker block', () => {
		const mockBlockMap = [];
		const mockGame = {
			objectManage: { blockMap: mockBlockMap },
			FPS: 50,
			blockWidth: 50,
			blockHeight: 20,
			statusBarHeight: 0,
			canvasWidth: 750,
			canvasHeight: 530,
			ballSize: 5,
		};

		// Warp Enter + Attack block
		const warpAttacker = new Block(1, 1, 1, [BLOCK_FUNCTION.WARP_ENTER, BLOCK_FUNCTION.ATTACK], 0, 1, 0, mockGame);
		const warpExit = new Block(5, 5, 1, BLOCK_FUNCTION.WARP_EXIT, 0, 1, 0, mockGame);
		mockBlockMap[1] = [null, warpAttacker];
		mockBlockMap[5] = [null, null, null, null, null, warpExit];

		const mockBall = {
			simulate: 0,
			status: BALL_STATUS.NORMAL,
			vx: 0,
			vy: 2,
			radius: 5,
			breakNum: 0,
			collisionNum: 0,
			pointIncr: 10,
			duaration: 0,
			x: 75,
			y: 30,
			getCenterX: () => 75,
			getCenterY: () => 30,
			getLeftX: () => 70,
			getRightX: () => 80,
			getTopY: () => 25,
			getBottomY: () => 35,
		};

		warpAttacker.action(mockBall, 0, mockBlockMap);

		// Warp occurred
		assert.ok(mockBall.x !== 75 || mockBall.y !== 30, 'Ball was warped');
		// Warp block must remain indestructible
		assert.equal(warpAttacker.type, 1, 'Warp attacker block is not destroyed');
	});

	await t.test('participates in chain reaction with multi-function fuel block', () => {
		const mockBlockMap = [
			[null, null, null],
			[null, null, null],
			[null, null, null],
		];
		const mockGame = {
			objectManage: { blockMap: mockBlockMap },
			FPS: 50,
			blockWidth: 50,
			blockHeight: 20,
			statusBarHeight: 0,
			blockMotionTime: 1,
			blockDefaultPoint: 100,
			blockIncrPoint: 10,
		};

		// Bomb at (0, 1)
		const bomb = new Block(1, 0, 2, BLOCK_FUNCTION.EXPLODE, 0, 0, 0, mockGame);
		mockBlockMap[0][1] = bomb;

		// Moving Fuel at (1, 1)
		const movingFuel = new Block(1, 1, 3, [BLOCK_FUNCTION.FUEL, BLOCK_FUNCTION.VERTICAL_MOVE], 0, 0, 0, mockGame);
		mockBlockMap[1][1] = movingFuel;

		// Normal block at (2, 1) (outside 3x3 of bomb at 0,1, but inside 3x3 of movingFuel at 1,1)
		const normalBlock = new Block(1, 2, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, mockGame);
		mockBlockMap[2][1] = normalBlock;

		bomb.explode(1, 0, 1, null, mockBlockMap);

		assert.equal(movingFuel.type, 0, 'Moving fuel block was triggered by explosion');
		assert.equal(normalBlock.type, 0, 'Normal block was destroyed by chained fuel explosion');
	});

	await t.test('integrates with PresetManage multi-function definition parsing', () => {
		const pm = new PresetManage();
		const mockPresetData = {
			block: {
				types: [
					{ id: 0, life: 0 },
					{ id: 1, funcs: [BLOCK_FUNCTION.VERTICAL_MOVE, BLOCK_FUNCTION.ATTACK] },
					{ id: 2, func: [BLOCK_FUNCTION.ACCELERATION, BLOCK_FUNCTION.EXPLODE] },
					{ id: 3, functions: `${BLOCK_FUNCTION.MAGNET}, ${BLOCK_FUNCTION.BLINK}` },
					{ id: 4, func: BLOCK_FUNCTION.THROUGH },
				]
			},
		};

		const built = pm.buildPresetData('custom', mockPresetData);

		assert.deepEqual(built.blockFunction[1], [BLOCK_FUNCTION.VERTICAL_MOVE, BLOCK_FUNCTION.ATTACK]);
		assert.deepEqual(built.blockFunction[2], [BLOCK_FUNCTION.ACCELERATION, BLOCK_FUNCTION.EXPLODE]);
		assert.deepEqual(built.blockFunction[3], [BLOCK_FUNCTION.MAGNET, BLOCK_FUNCTION.BLINK]);
		assert.equal(built.blockFunction[4], BLOCK_FUNCTION.THROUGH);

		// Instantiating Block from built preset
		const b1 = new Block(0, 0, 1, built.blockFunction[1], 1, 0, 0);
		assert.equal(b1.hasFunction(BLOCK_FUNCTION.VERTICAL_MOVE), true);
		assert.equal(b1.hasFunction(BLOCK_FUNCTION.ATTACK), true);
	});

	await t.test('integrates with AutoPlaySimulation cloneBlockMap and blockHasFunction', () => {
		const bMulti = new Block(1, 1, 1, [BLOCK_FUNCTION.ACCELERATION, BLOCK_FUNCTION.EXPLODE], 1, 0, 0);
		const blockMap = [[bMulti]];

		// Test blockHasFunction on Block instance
		assert.equal(blockHasFunction(bMulti, BLOCK_FUNCTION.ACCELERATION), true);
		assert.equal(blockHasFunction(bMulti, BLOCK_FUNCTION.EXPLODE), true);
		assert.equal(blockHasFunction(bMulti, BLOCK_FUNCTION.NORMAL), false);

		// Test cloneBlockMap
		const clonedMap = cloneBlockMap(blockMap);
		const clonedBlock = clonedMap[0][0];
		assert.ok(clonedBlock instanceof Block);
		assert.equal(clonedBlock.hasFunction(BLOCK_FUNCTION.ACCELERATION), true);
		assert.equal(clonedBlock.hasFunction(BLOCK_FUNCTION.EXPLODE), true);

		// Test blockHasFunction on plain objects with array / set funcs
		const plainBlock = { funcs: [BLOCK_FUNCTION.MAGNET, BLOCK_FUNCTION.ATTACK], type: 1 };
		assert.equal(blockHasFunction(plainBlock, BLOCK_FUNCTION.MAGNET), true);
		assert.equal(blockHasFunction(plainBlock, BLOCK_FUNCTION.ATTACK), true);
		assert.equal(blockHasFunction(plainBlock, BLOCK_FUNCTION.EXPLODE), false);
	});

	await t.test('loads Hybrid stage after Warp with multi-function blocks', async () => {
		const pm = new PresetManage();
		const defaultPreset = await pm.loadPreset('default');

		const warpIdx = defaultPreset.stageTitle.indexOf('Warp');
		assert.ok(warpIdx >= 0, 'Warp stage exists');
		const hybridIdx = warpIdx + 1;
		assert.equal(defaultPreset.stageTitle[hybridIdx], 'Hybrid', 'Hybrid stage is placed directly after Warp');

		// Check multi-function blocks definition in preset
		assert.deepEqual(defaultPreset.blockFunction[18], [BLOCK_FUNCTION.VERTICAL_MOVE, BLOCK_FUNCTION.ATTACK]);
		assert.deepEqual(defaultPreset.blockFunction[19], [BLOCK_FUNCTION.VERTICAL_MOVE, BLOCK_FUNCTION.EXPLODE]);
		assert.deepEqual(defaultPreset.blockFunction[20], [BLOCK_FUNCTION.BLINK, BLOCK_FUNCTION.ATTACK]);
		assert.deepEqual(defaultPreset.blockFunction[21], [BLOCK_FUNCTION.MAGNET, BLOCK_FUNCTION.ACCELERATION]);

		// Check stage map contains multi-function blocks
		const hybridMap = defaultPreset.blockMapSet[hybridIdx];
		assert.ok(Array.isArray(hybridMap), 'Hybrid stage map exists');

		let has18 = false;
		let has19 = false;
		let has20 = false;
		let has21 = false;
		for (const row of hybridMap) {
			for (const cell of row) {
				if (cell === 18) has18 = true;
				if (cell === 19) has19 = true;
				if (cell === 20) has20 = true;
				if (cell === 21) has21 = true;
			}
		}
		assert.equal(has18, true, 'Stage contains Assault blocks (18)');
		assert.equal(has19, true, 'Stage contains MBomb blocks (19)');
		assert.equal(has20, true, 'Stage contains Stealth blocks (20)');
		assert.equal(has21, true, 'Stage contains Boost blocks (21)');

		// Instantiate map via copyMap
		const mockGame = {
			blockFunction: defaultPreset.blockFunction,
			blockLife: defaultPreset.blockLife,
			blockInfinit: defaultPreset.blockInfinit,
			blockThrough: defaultPreset.blockThrough,
			itemProb: defaultPreset.itemProb,
			ctrl: { stageIndex: hybridIdx },
			FPS: 50,
			blockWidth: 50,
			blockHeight: 20,
			statusBarHeight: 30,
		};

		const blockInstances = hybridMap.copyMap(mockGame);
		let foundAssaultInstance = null;
		let foundMBombInstance = null;
		let foundStealthInstance = null;
		let foundBoostInstance = null;

		for (const row of blockInstances) {
			for (const b of row) {
				if (b && b.type === 18) foundAssaultInstance = b;
				if (b && b.type === 19) foundMBombInstance = b;
				if (b && b.type === 20) foundStealthInstance = b;
				if (b && b.type === 21) foundBoostInstance = b;
			}
		}

		assert.ok(foundAssaultInstance, 'Assault block instantiated');
		assert.equal(foundAssaultInstance.hasFunction(BLOCK_FUNCTION.VERTICAL_MOVE), true);
		assert.equal(foundAssaultInstance.hasFunction(BLOCK_FUNCTION.ATTACK), true);
		assert.equal(foundAssaultInstance.infinit, 1, 'Assault block is an obstacle (infinit=1)');

		assert.ok(foundMBombInstance, 'MBomb block instantiated');
		assert.equal(foundMBombInstance.hasFunction(BLOCK_FUNCTION.VERTICAL_MOVE), true);
		assert.equal(foundMBombInstance.hasFunction(BLOCK_FUNCTION.EXPLODE), true);
		assert.equal(foundMBombInstance.infinit, 0, 'MBomb block is destructible (infinit=0)');

		assert.ok(foundStealthInstance, 'Stealth block instantiated');
		assert.equal(foundStealthInstance.hasFunction(BLOCK_FUNCTION.BLINK), true);
		assert.equal(foundStealthInstance.hasFunction(BLOCK_FUNCTION.ATTACK), true);
		assert.equal(foundStealthInstance.infinit, 1, 'Stealth block is an obstacle (infinit=1)');

		assert.ok(foundBoostInstance, 'Boost block instantiated');
		assert.equal(foundBoostInstance.hasFunction(BLOCK_FUNCTION.MAGNET), true);
		assert.equal(foundBoostInstance.hasFunction(BLOCK_FUNCTION.ACCELERATION), true);
		assert.equal(foundBoostInstance.infinit, 1, 'Boost block is an obstacle (infinit=1)');

		pm.destructor();
	});

	await t.test('clears Hybrid stage when all destructible blocks are destroyed while obstacle blocks remain', () => {
		const g = window.gameManage;
		const hybridIdx = g.stageTitle.indexOf('Hybrid');
		assert.ok(hybridIdx >= 0, 'Hybrid stage exists in gameManage');

		g.ctrl.setStageIndex(hybridIdx);
		g.init(hybridIdx);

		// Initial blockNum should only count destructible blocks (71)
		assert.equal(g.statusMng.blockNum, 71, 'Initial blockNum in Stage 13 should count only destructible blocks');

		// Destroy all destructible blocks
		const blockMap = g.objectManage.blockMap;
		let destroyedCount = 0;
		for (let i = 0; i < blockMap.length; i++) {
			for (let j = 0; j < (blockMap[i] || []).length; j++) {
				const b = blockMap[i][j];
				if (b && b.type !== 0 && b.infinit !== 1) {
					b.break(null);
					destroyedCount++;
				}
			}
		}

		assert.equal(destroyedCount, 71, 'Destroyed all 71 breakable blocks');
		assert.equal(g.statusMng.blockNum, 0, 'blockNum should reach 0');

		// Advance game loop step to trigger stage clear
		g.step();

		// As the final stage, all clear screen is shown
		const allClearScreen = document.getElementById('screen_allClear');
		assert.ok(allClearScreen, 'screen_allClear element exists');
		assert.equal(allClearScreen.style.display, 'block', 'screen_allClear is displayed upon clearing stage');

		// Obstacle blocks (walls, Assault, Stealth, Boost) remain on the board
		let remainingObstacles = 0;
		for (let i = 0; i < blockMap.length; i++) {
			for (let j = 0; j < (blockMap[i] || []).length; j++) {
				const b = blockMap[i][j];
				if (b && b.type !== 0 && b.infinit === 1) {
					remainingObstacles++;
				}
			}
		}
		assert.equal(remainingObstacles, 29, 'All 29 obstacle blocks remain on board');
	});
});
