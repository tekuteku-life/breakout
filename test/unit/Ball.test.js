import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import Ball from '../../src/Ball.js';
import ImageData from '../../src/ImageData.js';
import Block from '../../src/Block.js';

test('Ball class unit tests', async (t) => {
	setupEnvironment();
	const mockCtx = createMock2DContext();
	globalThis.imgData = new ImageData(mockCtx);
	globalThis.imgData.init();

	await t.test('constructor initializes in normal mode and LAUNCH mode', () => {
		// Normal mode
		const ballOther = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		assert.equal(ballOther.radius, globalThis.ballSize);
		assert.equal(ballOther.simulate, 0);

		// Launch mode
		globalThis.mouseDownTime = Date.now() - 500;
		globalThis.bar.vx = 2;
		const ballLaunch = new Ball(globalThis.BALL_CREATE_MODE.LAUNCH);
		assert.ok(typeof ballLaunch.vx === 'number');
		assert.ok(typeof ballLaunch.vy === 'number');
		assert.equal(ballLaunch.x, globalThis.bar.getCenterX());
		assert.equal(ballLaunch.y, globalThis.bar.getTopY() - ballLaunch.radius);
	});

	await t.test('copy produces cloned Ball for RAND and SIMULATE modes', () => {
		const original = new Ball(globalThis.BALL_CREATE_MODE.LAUNCH);
		original.histX = [1, 2];
		original.histY = [3, 4];

		const randClone = original.copy(globalThis.BALL_COPY_MODE.RAND);
		assert.ok(randClone instanceof Ball);
		assert.equal(randClone.simulate, 0);

		const simClone = original.copy(globalThis.BALL_COPY_MODE.SIMULATE);
		assert.equal(simClone.simulate, 1);
	});

	await t.test('coordinate getters calculate accurate bounding bounds', () => {
		const ball = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		ball.x = 100;
		ball.y = 150;
		assert.equal(ball.getCenterX(), 100);
		assert.equal(ball.getCenterY(), 150);
		assert.equal(ball.getLeftX(), 100 - ball.radius);
		assert.equal(ball.getRightX(), 100 + ball.radius);
		assert.equal(ball.getTopY(), 150 - ball.radius);
		assert.equal(ball.getBottomY(), 150 + ball.radius);
	});

	await t.test('fall removes ball and resets game entities when last ball falls', () => {
		const ball = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		globalThis.balls = [ball];
		globalThis.items = [{}];
		globalThis.weapons = [{}];
		globalThis.bar.immortalStatusTime = 0;

		let lifeDecreased = false;
		globalThis.statusMng = {
			addLife: (n) => { if (n < 0) lifeDecreased = true; },
			awardNum: { fallBallNum: 0 },
		};

		ball.fall();
		assert.equal(globalThis.balls.length, 0);
		assert.equal(globalThis.items.length, 0);
		assert.equal(globalThis.weapons.length, 0);
		assert.equal(lifeDecreased, true);
	});

	await t.test('draw handles normal, strong, and ultimate ball rendering with tails', () => {
		const ball = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		ball.x = 50;
		ball.y = 50;
		ball.histX = [48, 46, 44];
		ball.histY = [50, 50, 50];

		// Normal
		ball.status = globalThis.BALL_STATUS.NORMAL;
		assert.doesNotThrow(() => ball.draw(mockCtx));

		// Strong
		ball.status = globalThis.BALL_STATUS.STRONG;
		ball.statusTime = 100;
		assert.doesNotThrow(() => ball.draw(mockCtx));

		// Ultimate
		ball.status = globalThis.BALL_STATUS.ULTIMATE;
		assert.doesNotThrow(() => ball.draw(mockCtx));
	});

	await t.test('move handles speed limits, state timeouts, and absorption lock', () => {
		const ball = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		ball.vx = 999;
		ball.vy = -999;
		ball.status = globalThis.BALL_STATUS.STRONG;
		ball.statusTime = 1;

		ball.move();
		assert.ok(Math.abs(ball.vx) <= globalThis.ballMaxSpeed);
		assert.ok(Math.abs(ball.vy) <= globalThis.ballMaxSpeed);
		assert.equal(ball.status, globalThis.BALL_STATUS.NORMAL);

		// Absorption lock
		ball.isAbsorption = 1;
		ball.absorptionPoint = [10, 0];
		ball.move();
		assert.equal(ball.x, 10 + globalThis.bar.getCenterX());
		assert.equal(ball.y, 0 + globalThis.bar.getTopY());
	});

	await t.test('move handles wall bounces and bar reflections', () => {
		const ball = new Ball(globalThis.BALL_CREATE_MODE.OTHER);

		// Left wall bounce
		ball.x = 0;
		ball.vx = -3;
		ball.y = 100;
		ball.vy = 2;
		ball.move();
		assert.ok(ball.vx > 0);

		// Right wall bounce
		ball.x = globalThis.canvasWidth + 5;
		ball.vx = 3;
		ball.move();
		assert.ok(ball.vx < 0);

		// Top wall bounce
		ball.y = 5;
		ball.vy = -3;
		ball.move();
		assert.ok(ball.vy > 0);

		// Bar bounce
		globalThis.bar.x = 200;
		globalThis.bar.y = 400;
		globalThis.bar.width = 100;
		ball.x = 200;
		ball.y = 398;
		ball.vx = 0;
		ball.vy = 3;
		ball.move();
		assert.ok(ball.vy < 0);
	});

	await t.test('destructor removes ball from global balls array', () => {
		const ball = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		globalThis.balls = [ball];
		ball.destructor();
		assert.equal(globalThis.balls.length, 0);
	});

	await t.test('move triggers fall when ball passes below canvas height', () => {
		const ball = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		globalThis.balls = [ball];
		ball.x = 200;
		ball.y = globalThis.canvasHeight - 2;
		ball.vy = 10;
		ball.move();
		assert.equal(globalThis.balls.length, 0, 'Ball should fall and be removed');
	});

	await t.test('handles through block collisions in all 4 directions', () => {
		// Direction 2: Right through
		const blockRight = new Block(5, 4, 1, globalThis.BLOCK_FUNCTION.NORMAL, 1, 0, 2);
		globalThis.blockMap = [[], [], [], [], [null, null, null, null, null, blockRight]];
		const ballR = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		ballR.x = blockRight.getRightX() + 2;
		ballR.y = blockRight.getCenterY();
		ballR.vx = -5;
		ballR.vy = 0;
		ballR.histX = [ballR.x + 5];
		ballR.histY = [ballR.y];
		ballR.move();

		// Direction 3: Bottom through
		const blockBottom = new Block(5, 4, 1, globalThis.BLOCK_FUNCTION.NORMAL, 1, 0, 3);
		globalThis.blockMap[4][5] = blockBottom;
		const ballB = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		ballB.x = blockBottom.getCenterX();
		ballB.y = blockBottom.getBottomY() + 2;
		ballB.vx = 0;
		ballB.vy = -5;
		ballB.histX = [ballB.x];
		ballB.histY = [ballB.y + 5];
		ballB.move();

		// Direction 4: Left through
		const blockLeft = new Block(5, 4, 1, globalThis.BLOCK_FUNCTION.NORMAL, 1, 0, 4);
		globalThis.blockMap[4][5] = blockLeft;
		const ballL = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		ballL.x = blockLeft.getLeftX() - 2;
		ballL.y = blockLeft.getCenterY();
		ballL.vx = 5;
		ballL.vy = 0;
		ballL.histX = [ballL.x - 5];
		ballL.histY = [ballL.y];
		ballL.move();
	});

	await t.test('handles diagonal collision with adjacent obstacles and history queue', () => {
		const targetBlock = new Block(5, 4, 1, globalThis.BLOCK_FUNCTION.NORMAL, 1);
		const horBlock = new Block(6, 4, 1, globalThis.BLOCK_FUNCTION.NORMAL, 1);
		const verBlock = new Block(5, 5, 1, globalThis.BLOCK_FUNCTION.NORMAL, 1);
		globalThis.blockMap = [
			[], [], [], [],
			[null, null, null, null, null, targetBlock, horBlock],
			[null, null, null, null, null, verBlock],
		];

		const ball = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		ball.x = targetBlock.getRightX() + 1;
		ball.y = targetBlock.getBottomY() + 1;
		ball.vx = -4;
		ball.vy = -5;
		ball.histX = [ball.x + 4, ball.x + 8, ball.x + 12, ball.x + 16];
		ball.histY = [ball.y + 5, ball.y + 10, ball.y + 15, ball.y + 20];

		ball.move();
		assert.equal(ball.histX.length, globalThis.SYSTEM_PARAM.BALL_HIST_MAX);
	});
});
