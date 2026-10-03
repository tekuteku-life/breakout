import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import Block from '../../src/Block.js';
import ImageData from '../../src/ImageData.js';

test('Block class unit tests', async (t) => {
	setupEnvironment();
	const mockCtx = createMock2DContext();
	globalThis.staticCtx = mockCtx;
	globalThis.dynamicCtx = mockCtx;
	globalThis.imgData = new ImageData(mockCtx);
	globalThis.imgData.init();

	await t.test('constructor initializes different functional block types', () => {
		const bNormal = new Block(2, 3, 1, globalThis.BLOCK_FUNCTION.NORMAL, 0, 0, 0);
		assert.equal(bNormal.x, 2 * globalThis.blockWidth);
		assert.equal(bNormal.y, 3 * globalThis.blockHeight + globalThis.statusBarHeight);
		assert.equal(bNormal.func, globalThis.BLOCK_FUNCTION.NORMAL);

		// Vertical move
		const bMove = new Block(2, 3, 1, globalThis.BLOCK_FUNCTION.VERTICAL_MOVE, 0, 0, 0);
		assert.ok(bMove.moveInter >= 0);
		assert.ok(bMove.moveVect === 1 || bMove.moveVect === -1);

		// Blink
		const bBlink = new Block(2, 3, 1, globalThis.BLOCK_FUNCTION.BLINK, 0, 0, 0);
		assert.ok(bBlink.blinkInter >= 0);
		assert.equal(bBlink.blinkType, 1);

		// Attack
		const bAttack = new Block(2, 3, 1, globalThis.BLOCK_FUNCTION.ATTACK, 0, 0, 0);
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

	await t.test('move executes movement, blink, and attack routines', () => {
		// Exploded countdown
		const bExplode = new Block(1, 1, 1, 0, 0, 0, 0);
		bExplode.exploded = 2;
		bExplode.move();
		assert.equal(bExplode.exploded, 1);

		// Vertical move block
		const bMove = new Block(1, 1, 1, globalThis.BLOCK_FUNCTION.VERTICAL_MOVE, 0, 0, 0);
		bMove.moveInter = 0;
		bMove.moveVect = 1;
		globalThis.blockMap = [];
		globalThis.blockMap[1] = [null, bMove, null];
		bMove.move();

		// Blink block
		const bBlink = new Block(1, 1, 1, globalThis.BLOCK_FUNCTION.BLINK, 0, 0, 0);
		bBlink.blinkInter = 0;
		bBlink.blinkSwitch = 1;
		bBlink.move();
		assert.equal(bBlink.blinkSwitch, -1);

		// Attack block
		const bAttack = new Block(1, 1, 1, globalThis.BLOCK_FUNCTION.ATTACK, 0, 0, 0);
		bAttack.attackInter = 0;
		globalThis.balls = [{}];
		bAttack.move();
		assert.ok(globalThis.weapons.length > 0);
	});

	await t.test('action handles ball collisions across functional block types', () => {
		const mockBall = {
			simulate: 0,
			status: globalThis.BALL_STATUS.NORMAL,
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
		const bWarp = new Block(0, 0, 1, globalThis.BLOCK_FUNCTION.WARP_ENTER, 0, 1, 0);
		const bExit = new Block(5, 5, 1, globalThis.BLOCK_FUNCTION.WARP_EXIT, 0, 1, 0);
		globalThis.blockMap = [[bWarp], [], [], [], [], [null, null, null, null, null, bExit]];
		bWarp.action(mockBall, 0);
		assert.ok(mockBall.x !== undefined || mockBall.y !== undefined);

		// Normal block hit & break
		const bNorm = new Block(1, 1, 1, globalThis.BLOCK_FUNCTION.NORMAL, 0, 0, 0);
		bNorm.action(mockBall, 0);
		assert.equal(bNorm.type, 0);

		// Acceleration block
		const bAccel = new Block(1, 1, 1, globalThis.BLOCK_FUNCTION.ACCELERATION, 0, 1, 0);
		const spd = bAccel.action(mockBall, 0);
		assert.ok(spd > 0);

		// Deceleration block
		const bDecel = new Block(1, 1, 1, globalThis.BLOCK_FUNCTION.DECELERATION, 0, 1, 0);
		const dspd = bDecel.action(mockBall, 0);
		assert.ok(dspd < 0);

		// Weapon hit (ball == null)
		const bWeaponHit = new Block(1, 1, 1, globalThis.BLOCK_FUNCTION.NORMAL, 0, 0, 0);
		bWeaponHit.action(null, 0);
		assert.equal(bWeaponHit.type, 0);
	});

	await t.test('break and decreaseLife update life, spawn item, and clear block', () => {
		const b = new Block(1, 1, 1, 0, 2, 0, 0);
		b.item = 0; // Spawn item 0

		b.decreaseLife();
		assert.equal(b.life, 1);

		b.break({ simulate: 0, breakNum: 0 });
		assert.equal(b.type, 0);
		assert.ok(globalThis.items.length > 0);

		// Simulation break
		const bSim = new Block(1, 1, 1, 0, 1, 0, 0);
		bSim.simulate = 1;
		bSim.break({ simulate: 1 });
		assert.equal(bSim.simulate, 0);
	});

	await t.test('explode triggers chain reactions across adjacent blocks', () => {
		const b1 = new Block(1, 1, 2, globalThis.BLOCK_FUNCTION.EXPLODE, 0, 0, 0);
		const b2 = new Block(1, 2, 5, globalThis.BLOCK_FUNCTION.FUEL, 0, 0, 0);
		const b3 = new Block(1, 3, 1, globalThis.BLOCK_FUNCTION.NORMAL, 0, 0, 0);
		globalThis.blockMap = [];
		globalThis.blockMap[1] = [null, b1];
		globalThis.blockMap[2] = [null, b2];
		globalThis.blockMap[3] = [null, b3];

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

	await t.test('move handles breakLimit countdown, formatting, and expiration', () => {
		const b = new Block(1, 1, 1, 0, 0, 0, 0);
		b.breakLimit = 50; // 1.0s at 50 FPS
		globalThis.balls = [{}];
		b.move();
		assert.equal(b.text, '1.0 s');

		// When balls.length == 0
		globalThis.balls = [];
		b.move();
		assert.equal(b.breakLimit, 0);
		assert.equal(b.text, null);
	});

	await t.test('move handles moving block boundary collisions and direction reversals', () => {
		const bMove = new Block(1, 1, 1, globalThis.BLOCK_FUNCTION.VERTICAL_MOVE, 0, 0, 0);
		bMove.moveInter = 0;
		bMove.moveVect = 1;
		const obstacle = new Block(2, 1, 1, 0, 0, 0, 0);
		globalThis.blockMap = [];
		globalThis.blockMap[1] = [null, bMove, obstacle];
		bMove.move();
		assert.equal(bMove.moveVect, -1, 'Moving block should reverse when blocked');
	});

	await t.test('move handles magnet and repull acceleration forces', () => {
		const bMagnet = new Block(1, 1, 1, globalThis.BLOCK_FUNCTION.MAGNET, 0, 0, 0);
		const bRepull = new Block(1, 1, 1, globalThis.BLOCK_FUNCTION.REPULL, 0, 0, 0);
		const ball = {
			getCenterX: () => bMagnet.getCenterX() + 10,
			getCenterY: () => bMagnet.getCenterY() + 10,
			vx: 1,
			vy: -2,
		};
		globalThis.balls = [ball];

		// Magnet pull
		bMagnet.move();
		assert.ok(typeof ball.vx === 'number');

		// Repull push with ball.vy * relY < 0
		ball.vy = -2;
		bRepull.move();
		assert.ok(typeof ball.vy === 'number');
	});

	await t.test('move handles blink block turning on again', () => {
		const bBlink = new Block(1, 1, 1, globalThis.BLOCK_FUNCTION.BLINK, 0, 0, 0);
		bBlink.blinkInter = 0;
		bBlink.blinkSwitch = -1;
		bBlink.move();
		assert.equal(bBlink.blinkSwitch, 1);
		assert.equal(bBlink.type, bBlink.blinkType);
	});

	await t.test('action handles infinite loop bounce prevention and explode strength', () => {
		// Explode strength
		const bExplodeStr = new Block(1, 1, 1, globalThis.BLOCK_FUNCTION.EXPLODE_STRENGTH, 0, 0, 0);
		const ball = {
			status: globalThis.BALL_STATUS.NORMAL,
			simulate: 0,
			breakNum: 0,
			collisionNum: 0,
			duaration: 85,
			pointIncr: 10,
			getCenterX: () => 100,
			getCenterY: () => 100,
		};
		globalThis.blockMap = [[], [null, bExplodeStr]];
		bExplodeStr.action(ball, 0);
		assert.equal(ball.status, globalThis.BALL_STATUS.ULTIMATE);

		// Infinite bounce prevention
		const bInf = new Block(1, 1, 1, 0, 0, 1, 0);
		globalThis.ballInfBoundCancel = 1;
		ball.duaration = 85;
		ball.vx = 2;
		ball.vy = 2;
		bInf.action(ball, 0);
		assert.ok(ball.duaration < 85);
	});
});
