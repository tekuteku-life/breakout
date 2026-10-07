import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import Block from '../../src/Block.js';
import ImageData from '../../src/ImageData.js';
import EventBus from '../../src/EventBus.js';
import { BLOCK_FUNCTION, BALL_STATUS } from '../../src/const.js';

test('Block class unit tests', async (t) => {
	setupEnvironment();
	const mockCtx = createMock2DContext();
	globalThis.staticCtx = mockCtx;
	globalThis.dynamicCtx = mockCtx;
	globalThis.imgData = new ImageData(mockCtx);
	globalThis.imgData.init();

	await t.test('constructor initializes different functional block types', () => {
		const bNormal = new Block(2, 3, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0);
		assert.equal(bNormal.x, 2 * globalThis.blockWidth);
		assert.equal(bNormal.y, 3 * globalThis.blockHeight + globalThis.statusBarHeight);
		assert.equal(bNormal.func, BLOCK_FUNCTION.NORMAL);

		// Vertical move
		const bMove = new Block(2, 3, 1, BLOCK_FUNCTION.VERTICAL_MOVE, 0, 0, 0);
		assert.ok(bMove.moveInter >= 0);
		assert.ok(bMove.moveVect === 1 || bMove.moveVect === -1);

		// Blink
		const bBlink = new Block(2, 3, 1, BLOCK_FUNCTION.BLINK, 0, 0, 0);
		assert.ok(bBlink.blinkInter >= 0);
		assert.equal(bBlink.blinkType, 1);

		// Attack
		const bAttack = new Block(2, 3, 1, BLOCK_FUNCTION.ATTACK, 0, 0, 0);
		assert.ok(bAttack.attackInter >= 0);
	});

	await t.test('copy produces identical cloned Block', () => {
		const original = new Block(1, 2, 1, 0, 1, 0, 0);
		original.item = 3;
		const clone = original.copy();
		assert.equal(clone.x, original.x);
		assert.equal(clone.y, original.y);
		assert.equal(clone.item, 3);
	});

	await t.test('coordinate getters', () => {
		const b = new Block(1, 1, 1, 0, 0, 0, 0);
		assert.equal(b.getLeftX(), b.x);
		assert.equal(b.getCenterX(), b.x + b.width * 0.5);
		assert.equal(b.getRightX(), b.x + b.width);
		assert.equal(b.getTopY(), b.y);
		assert.equal(b.getCenterY(), b.y + b.height * 0.5);
		assert.equal(b.getBottomY(), b.y + b.height);
	});

	await t.test('draw and clear execute without error', () => {
		const b = new Block(1, 1, 2, 0, 0, 0, 0);
		b.text = 'Test';
		b.life = 0;
		assert.doesNotThrow(() => b.draw(mockCtx));
		assert.doesNotThrow(() => b.clear(mockCtx));
	});

	await t.test('draw renders damage overlay only when life is less than max blockLife', () => {
		const mockGame = {
			blockLife: [0, 1, 0],
			blockWidth: 50,
			blockHeight: 20,
			statusBarHeight: 22,
		};
		// Type 1 block has max life 1
		const b = new Block(1, 1, 1, 0, 1, 0, 0, mockGame);
		let overlayDrawn = false;
		const ctxSpy = {
			clearRect: () => {},
			putImageData: () => {},
			beginPath: () => { overlayDrawn = true; },
			rect: () => {},
			fill: () => {},
			stroke: () => {},
		};

		// 1. Initial undamaged state (life == blockLife[1]) -> no damage overlay
		b.draw(ctxSpy);
		assert.equal(overlayDrawn, false, 'Undamaged block should not draw damage overlay');

		// 2. Damaged state (life < blockLife[1]) -> damage overlay drawn
		b.life = 0;
		overlayDrawn = false;
		b.draw(ctxSpy);
		assert.equal(overlayDrawn, true, 'Damaged block must draw damage overlay');
	});

	await t.test('updateState and movePosition execute movement, blink, and attack routines', () => {
		// Exploded countdown
		const bExplode = new Block(1, 1, 1, 0, 0, 0, 0);
		bExplode.exploded = 2;
		bExplode.updateState();
		assert.equal(bExplode.exploded, 1);

		// Vertical move block
		const mockMoveMap = [];
		const mockMoveGame = { objectManage: { blockMap: mockMoveMap }, FPS: 50, blockWidth: 50, blockHeight: 20, statusBarHeight: 22, canvasWidth: 750 };
		const bMove = new Block(1, 1, 1, BLOCK_FUNCTION.VERTICAL_MOVE, 0, 0, 0, mockMoveGame);
		bMove.moveInter = 0;
		bMove.moveVect = 1;
		mockMoveMap[1] = [null, bMove, null];
		bMove.movePosition();

		// Blink block
		const bBlink = new Block(1, 1, 1, BLOCK_FUNCTION.BLINK, 0, 0, 0);
		bBlink.blinkInter = 0;
		bBlink.blinkSwitch = 1;
		bBlink.updateState();
		assert.equal(bBlink.blinkSwitch, -1);

		// Attack block
		let spawnedWeapon = null;
		EventBus.destructor();
		EventBus.addOnEvent('weapon:spawn', (data) => { spawnedWeapon = data; });
		const mockGame = { FPS: 60, objectManage: { balls: [{}] } };
		const bAttack = new Block(1, 1, 1, BLOCK_FUNCTION.ATTACK, 0, 0, 0, mockGame);
		bAttack.attackInter = 0;
		bAttack.updateState();
		assert.ok(spawnedWeapon !== null);
	});

	await t.test('action handles ball collisions across functional block types', () => {
		const mockBall = {
			simulate: 0,
			status: BALL_STATUS.NORMAL,
			vx: 2,
			vy: 3,
			radius: 5,
			breakNum: 0,
			collisionNum: 0,
			getCenterX: () => 100,
			getCenterY: () => 100,
			getTopY: () => 95,
			getBottomY: () => 105,
			getLeftX: () => 95,
			getRightX: () => 105,
		};

		// Warp block
		const mockWarpMap = [];
		const mockWarpGame = {
			objectManage: { blockMap: mockWarpMap },
			FPS: 50,
			blockWidth: 50,
			blockHeight: 20,
			statusBarHeight: 22,
			canvasWidth: 750,
			canvasHeight: 530,
		};
		const bWarp = new Block(0, 0, 1, BLOCK_FUNCTION.WARP_ENTER, 0, 1, 0, mockWarpGame);
		const bExit = new Block(5, 5, 1, BLOCK_FUNCTION.WARP_EXIT, 0, 1, 0, mockWarpGame);
		mockWarpMap[0] = [bWarp];
		mockWarpMap[1] = [];
		mockWarpMap[2] = [];
		mockWarpMap[3] = [];
		mockWarpMap[4] = [];
		mockWarpMap[5] = [null, null, null, null, null, bExit];

		bWarp.action(mockBall, 0);
		assert.ok(mockBall.x !== undefined || mockBall.y !== undefined);

		// Normal block hit & break
		const bNorm = new Block(1, 1, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, mockWarpGame);
		bNorm.action(mockBall, 0);
		assert.equal(bNorm.type, 0);

		// Acceleration block
		const bAccel = new Block(1, 1, 1, BLOCK_FUNCTION.ACCELERATION, 0, 1, 0, mockWarpGame);
		const spd = bAccel.action(mockBall, 0);
		assert.ok(spd > 0);

		// Deceleration block
		const bDecel = new Block(1, 1, 1, BLOCK_FUNCTION.DECELERATION, 0, 1, 0, mockWarpGame);
		const dspd = bDecel.action(mockBall, 0);
		assert.ok(dspd < 0);

		// Weapon hit (ball == null)
		const bWeaponHit = new Block(1, 1, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, mockWarpGame);
		bWeaponHit.action(null, 0);
		assert.equal(bWeaponHit.type, 0);
	});

	await t.test('break and decreaseLife update life, spawn item, and clear block', () => {
		let spawnedItem = null;
		let blockBreakEmitted = false;
		EventBus.destructor();
		EventBus.addOnEvent('item:spawn', (data) => { spawnedItem = data; });
		EventBus.addOnEvent('status:blockBreak', () => { blockBreakEmitted = true; });
		const mockGame = { itemLineColor: [['#fff']], itemColor: [['#000']] };
		const b = new Block(1, 1, 1, 0, 2, 0, 0, mockGame);
		b.item = 0; // Spawn item 0

		b.decreaseLife();
		assert.equal(b.life, 1);

		b.break({ simulate: 0, breakNum: 0 });
		assert.equal(b.type, 0);
		assert.ok(spawnedItem !== null);
		assert.equal(spawnedItem.type, 0);
		assert.equal(spawnedItem.lineColor, undefined);
		assert.equal(spawnedItem.color, undefined);
		assert.equal(blockBreakEmitted, true);

		// Simulation break
		const bSim = new Block(1, 1, 1, 0, 1, 0, 0, mockGame);
		bSim.simulate = 1;
		bSim.break({ simulate: 1 });
		assert.equal(bSim.simulate, 0);
	});

	await t.test('explode triggers chain reactions across adjacent blocks', () => {
		const mockExplodeMap = [];
		const mockExplodeGame = {
			objectManage: { blockMap: mockExplodeMap },
			FPS: 50,
			blockWidth: 50,
			blockHeight: 20,
			statusBarHeight: 22,
			canvasWidth: 750,
			canvasHeight: 530,
		};
		const b1 = new Block(1, 1, 2, BLOCK_FUNCTION.EXPLODE, 0, 0, 0, mockExplodeGame);
		const b2 = new Block(1, 2, 5, BLOCK_FUNCTION.FUEL, 0, 0, 0, mockExplodeGame);
		const b3 = new Block(1, 3, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, mockExplodeGame);
		mockExplodeMap[1] = [null, b1];
		mockExplodeMap[2] = [null, b2];
		mockExplodeMap[3] = [null, b3];

		b1.explode(1, 1, 2, { simulate: 0, pointIncr: 0 });
		assert.equal(b2.type, 0);
		assert.equal(b3.type, 0);
	});

	await t.test('simulateReset and destructor', () => {
		const b = new Block(1, 1, 1, 0, 2, 0, 0);
		b.simulateReset();
		assert.equal(b.simulate, 3);

		b.type = 0;
		b.simulateReset();
		assert.equal(b.simulate, 0);

		assert.doesNotThrow(() => b.destructor());
	});

	await t.test('updateState handles breakLimit countdown, formatting, and expiration', () => {
		const mockBreakGame = {
			objectManage: { balls: [{}] },
			FPS: 50,
			blockWidth: 50,
			blockHeight: 20,
			statusBarHeight: 22,
			blockLife: [0, 0],
		};
		const b = new Block(1, 1, 1, 0, 0, 0, 0, mockBreakGame);
		b.breakLimit = 50; // 1.0s at 50 FPS
		b.updateState(true);
		assert.equal(b.text, '1.0 s');

		// When balls.length == 0
		mockBreakGame.objectManage.balls = [];
		b.updateState(false);
		assert.equal(b.breakLimit, 0);
		assert.equal(b.text, null);
	});

	await t.test('movePosition handles moving block boundary collisions and direction reversals', () => {
		const mockBoundMap = [];
		const mockBoundGame = {
			objectManage: { blockMap: mockBoundMap },
			FPS: 50,
			blockWidth: 50,
			blockHeight: 20,
			statusBarHeight: 22,
			canvasWidth: 750,
		};
		const bMove = new Block(1, 1, 1, BLOCK_FUNCTION.VERTICAL_MOVE, 0, 0, 0, mockBoundGame);
		bMove.moveInter = 0;
		bMove.moveVect = 1;
		const obstacle = new Block(2, 1, 1, 0, 0, 0, 0, mockBoundGame);
		mockBoundMap[1] = [null, bMove, obstacle];
		bMove.movePosition();
		assert.equal(bMove.moveVect, -1, 'Moving block should reverse when blocked');
	});

	await t.test('applyMagneticForce handles magnet and repull acceleration forces', () => {
		const mockMagnetGame = {
			balls: [],
			FPS: 50,
			blockWidth: 50,
			blockHeight: 20,
			statusBarHeight: 22,
			ballDefaultSpeed: 3.5,
			blockDrawingDistance: 80,
		};
		const bMagnet = new Block(1, 1, 1, BLOCK_FUNCTION.MAGNET, 0, 0, 0, mockMagnetGame);
		const bRepull = new Block(1, 1, 1, BLOCK_FUNCTION.REPULL, 0, 0, 0, mockMagnetGame);
		const ball = {
			getCenterX: () => bMagnet.getCenterX() + 10,
			getCenterY: () => bMagnet.getCenterY() + 10,
			vx: 1,
			vy: -2,
		};

		// Magnet pull
		bMagnet.applyMagneticForce(ball);
		assert.ok(typeof ball.vx === 'number');

		// Repull push with ball.vy * relY < 0
		ball.vy = -2;
		bRepull.applyMagneticForce(ball);
		assert.ok(typeof ball.vy === 'number');
	});

	await t.test('updateState handles blink block turning on again', () => {
		const bBlink = new Block(1, 1, 1, BLOCK_FUNCTION.BLINK, 0, 0, 0);
		bBlink.blinkInter = 0;
		bBlink.blinkSwitch = -1;
		bBlink.updateState();
		assert.equal(bBlink.blinkSwitch, 1);
		assert.equal(bBlink.type, bBlink.blinkType);
	});

	await t.test('action handles infinite loop bounce prevention and explode strength', () => {
		const mockActionMap = [];
		const mockActionGame = {
			objectManage: { blockMap: mockActionMap },
			FPS: 50,
			blockWidth: 50,
			blockHeight: 20,
			statusBarHeight: 22,
			canvasWidth: 750,
			canvasHeight: 530,
			ballInfBoundCancel: 1,
			ballDefaultSpeed: 3.5,
		};
		// Explode strength
		const bExplodeStr = new Block(1, 1, 1, BLOCK_FUNCTION.EXPLODE_STRENGTH, 0, 0, 0, mockActionGame);
		const ball = {
			status: BALL_STATUS.NORMAL,
			simulate: 0,
			breakNum: 0,
			collisionNum: 0,
			duaration: 85,
			pointIncr: 10,
			getCenterX: () => 100,
			getCenterY: () => 100,
		};
		mockActionMap[1] = [null, bExplodeStr];
		bExplodeStr.action(ball, 0);
		assert.equal(ball.status, BALL_STATUS.ULTIMATE);

		// Infinite bounce prevention
		const bInf = new Block(1, 1, 1, 0, 0, 1, 0, mockActionGame);
		ball.duaration = 85;
		ball.vx = 2;
		ball.vy = 2;
		bInf.action(ball, 0);
		assert.ok(ball.duaration < 85);
	});

	await t.test('Block getters and destructor with item cleanup', () => {
		const mockStaticCtx = { staticCtxProp: true };
		const mockBlockMap = [[1]];
		const mockBalls = [{ ballProp: true }];
		const mockCtrl = { ctrlProp: true };
		const mockGame = {
			staticCtx: mockStaticCtx,
			objectManage: {
				blockMap: mockBlockMap,
				balls: mockBalls,
			},
			ctrl: mockCtrl,
			canvasWidth: 800,
			canvasHeight: 600,
			statusBarHeight: 30,
		};
		const b = new Block(1, 1, 1, 0, 1, 0, 0, mockGame);
		assert.equal(b.getStaticCtx(), mockStaticCtx);
		assert.equal(b.getCanvasWidth(), 800);
		assert.equal(b.getCanvasHeight(), 600);
		assert.equal(b.getStatusBarHeight(), 30);

		// Destructor cleanup
		b.clear = () => {};
		b.destructor();
		assert.equal(b.item, null);
		assert.equal(b.game, null);
	});

	await t.test('infinite block (infinit=1) cannot be destroyed by Hard (STRONG) ball, only by Fire (ULTIMATE) ball', () => {
		EventBus.destructor();
		const mockGame = {
			FPS: 60,
			objectManage: { blockMap: [] },
			canvasWidth: 750,
			canvasHeight: 530,
			statusBarHeight: 0,
		};

		// 1. Hit by STRONG (Hard) ball: should NOT be destroyed
		const infBlock1 = new Block(2, 2, 1, BLOCK_FUNCTION.NORMAL, 0, 1, 0, mockGame);
		const hardBall = {
			simulate: 0,
			status: BALL_STATUS.STRONG,
			collisionNum: 0,
			breakNum: 0,
			pointIncr: 10,
			getCenterX: () => 60,
			getCenterY: () => 30,
		};
		infBlock1.action(hardBall, 1);
		assert.equal(infBlock1.type, 1, 'Infinite block must NOT be destroyed by STRONG (Hard) ball');
		assert.equal(hardBall.breakNum, 0, 'breakNum should not increase for unbroken infinite block');

		// 2. Hit by ULTIMATE (Fire) ball: SHOULD be destroyed
		const infBlock2 = new Block(3, 2, 1, BLOCK_FUNCTION.NORMAL, 0, 1, 0, mockGame);
		const fireBall = {
			simulate: 0,
			status: BALL_STATUS.ULTIMATE,
			collisionNum: 0,
			breakNum: 0,
			pointIncr: 10,
			getCenterX: () => 90,
			getCenterY: () => 30,
		};
		infBlock2.action(fireBall, 1);
		assert.equal(infBlock2.type, 0, 'Infinite block MUST be destroyed by ULTIMATE (Fire) ball');
		assert.equal(fireBall.breakNum, 1, 'breakNum should increase when destroyed by ULTIMATE ball');
	});

	await t.test('movePosition moves only vertical move blocks without affecting timers, while updateState updates attack and blink without grid movement', () => {
		const mockBlockMap = [];
		const mockGame = {
			objectManage: { blockMap: mockBlockMap, balls: [{}] },
			FPS: 50,
			blockWidth: 50,
			blockHeight: 20,
			statusBarHeight: 0,
			canvasWidth: 750,
			blockMoveInter: 1,
			blockAttackInter: 10,
		};
		// Vertical move block
		const bMove = new Block(1, 1, 1, BLOCK_FUNCTION.VERTICAL_MOVE, 0, 0, 0, mockGame);
		bMove.moveInter = 1;
		mockBlockMap[1] = [null, bMove, null];

		// Attack block
		let attackSpawned = false;
		EventBus.destructor();
		EventBus.addOnEvent('weapon:spawn', () => { attackSpawned = true; });
		const bAttack = new Block(1, 1, 1, BLOCK_FUNCTION.ATTACK, 0, 0, 0, mockGame);
		bAttack.attackInter = 1;

		// updateState updates attack timer without moving vertical block
		bAttack.updateState(true);
		assert.equal(attackSpawned, true, 'updateState triggers attack');
		assert.equal(bMove.moveInter, 1, 'updateState should not decrement moveInter of moving block');

		// movePosition decrements moveInter of moving block
		bMove.movePosition(mockBlockMap);
		assert.equal(bMove.moveInter, 0, 'movePosition should decrement moveInter');
	});
});

