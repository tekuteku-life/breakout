import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import Ball from '../../src/Ball.js';
import ImageData from '../../src/ImageData.js';
import Block from '../../src/Block.js';
import EventBus from '../../src/EventBus.js';
import { BLOCK_FUNCTION, BALL_STATUS, BALL_CREATE_MODE, BALL_COPY_MODE, SYSTEM_PARAM } from '../../src/const.js';

test('Ball class unit tests', async (t) => {
	setupEnvironment();
	const mockCtx = createMock2DContext();
	globalThis.imgData = new ImageData(mockCtx);
	globalThis.imgData.init();

	const createMockGame = (overrides = {}) => {
		const barObj = overrides.bar !== undefined ? overrides.bar : globalThis.bar;
		const om = overrides.objectManage || {
			bar: barObj,
			balls: overrides.balls !== undefined ? overrides.balls : [],
			blockMap: overrides.blockMap !== undefined ? overrides.blockMap : [],
		};
		return {
			canvasWidth: globalThis.canvasWidth,
			canvasHeight: globalThis.canvasHeight,
			statusBarHeight: globalThis.statusBarHeight,
			inputManage: { mouseDownTime: Date.now() - 500 },
			objectManage: om,
			...overrides,
		};
	};

	await t.test('constructor initializes in normal mode and LAUNCH mode', () => {
		// Normal mode
		const ballOther = new Ball(BALL_CREATE_MODE.OTHER, createMockGame());
		assert.equal(ballOther.radius, globalThis.ballSize);
		assert.equal(ballOther.simulate, 0);

		// Launch mode
		const game = createMockGame({
			bar: {
				vx: 2,
				getCenterX: () => 375,
				getTopY: () => 500,
			}
		});
		const ballLaunch = new Ball(BALL_CREATE_MODE.LAUNCH, game);
		assert.ok(typeof ballLaunch.vx === 'number');
		assert.ok(typeof ballLaunch.vy === 'number');
		assert.equal(ballLaunch.x, 375);
		assert.equal(ballLaunch.y, 500 - ballLaunch.radius);
	});

	await t.test('copy produces cloned Ball for RAND and SIMULATE modes', () => {
		const original = new Ball(BALL_CREATE_MODE.LAUNCH);
		original.histX = [1, 2];
		original.histY = [3, 4];

		const randClone = original.copy(BALL_COPY_MODE.RAND);
		assert.ok(randClone instanceof Ball);
		assert.equal(randClone.simulate, 0);

		const simClone = original.copy(BALL_COPY_MODE.SIMULATE);
		assert.equal(simClone.simulate, 1);
	});

	await t.test('copy preserves special status and configures status timer to return to normal', () => {
		EventBus.destructor();
		const game = createMockGame({ FPS: 50 });
		const original = new Ball(BALL_CREATE_MODE.LAUNCH, game);
		original.setStatus(BALL_STATUS.STRONG, 1.0); // 1.0 second timer

		// Advance 400ms (0.4s elapsed, 0.6s remaining)
		EventBus.tickTimers(400);
		assert.equal(original.status, BALL_STATUS.STRONG);

		// Clone via RAND mode (e.g. ITEM_TYPE.DOUBLE duplication)
		const cloned = original.copy(BALL_COPY_MODE.RAND);
		assert.equal(cloned.status, BALL_STATUS.STRONG);
		assert.ok(cloned.ballId !== original.ballId);
		assert.equal(EventBus.hasTimer(`ball:${cloned.ballId}:status`), true);

		// Advance another 400ms (cloned should have ~200ms remaining, still STRONG)
		EventBus.tickTimers(400);
		assert.equal(cloned.status, BALL_STATUS.STRONG);
		assert.equal(original.status, BALL_STATUS.STRONG);

		// Advance another 300ms (both should expire and return to NORMAL)
		EventBus.tickTimers(300);
		assert.equal(original.status, BALL_STATUS.NORMAL);
		assert.equal(cloned.status, BALL_STATUS.NORMAL);
		assert.equal(cloned.statusTime, 0);

		// Simulate mode should not register status timer
		original.setStatus(BALL_STATUS.ULTIMATE, 2.0);
		const simClone = original.copy(BALL_COPY_MODE.SIMULATE);
		assert.equal(simClone.status, BALL_STATUS.ULTIMATE);
		assert.equal(EventBus.hasTimer(`ball:${simClone.ballId}:status`), false);

		// Expired original ball copy resets status to NORMAL
		const expired = new Ball(BALL_CREATE_MODE.LAUNCH, game);
		expired.status = BALL_STATUS.STRONG;
		expired.statusTime = 0;
		const expiredClone = expired.copy(BALL_COPY_MODE.RAND);
		assert.equal(expiredClone.status, BALL_STATUS.NORMAL);

		// Fallback when timer missing but statusTime > 0
		const manualStatusBall = new Ball(BALL_CREATE_MODE.LAUNCH, game);
		manualStatusBall.status = BALL_STATUS.STRONG;
		manualStatusBall.statusTime = 50; // 50 frames = 1.0s at 50 FPS
		const manualClone = manualStatusBall.copy(BALL_COPY_MODE.RAND);
		assert.equal(manualClone.status, BALL_STATUS.STRONG);
		assert.equal(EventBus.hasTimer(`ball:${manualClone.ballId}:status`), true);
		EventBus.tickTimers(1100);
		assert.equal(manualClone.status, BALL_STATUS.NORMAL);
	});

	await t.test('coordinate getters calculate accurate bounding bounds', () => {
		const ball = new Ball(BALL_CREATE_MODE.OTHER);
		ball.x = 100;
		ball.y = 150;
		assert.equal(ball.getCenterX(), 100);
		assert.equal(ball.getCenterY(), 150);
		assert.equal(ball.getLeftX(), 100 - ball.radius);
		assert.equal(ball.getRightX(), 100 + ball.radius);
		assert.equal(ball.getTopY(), 150 - ball.radius);
		assert.equal(ball.getBottomY(), 150 + ball.radius);
	});

	await t.test('fall removes ball and emits ball:allLost event when last ball falls', () => {
		let allLostCalled = false;
		let soundPlayed = null;
		let awardAdded = null;
		EventBus.destructor();
		EventBus.addOnEvent('ball:allLost', () => { allLostCalled = true; });
		EventBus.addOnEvent('sound:play', (data) => { soundPlayed = data; });
		EventBus.addOnEvent('award:add', (data) => { awardAdded = data; });

		const mockBar = { immortalStatusTime: 0 };
		const mockGame = {
			objectManage: {
				bar: mockBar,
				balls: [],
			},
		};

		const ball = new Ball(BALL_CREATE_MODE.OTHER, mockGame);
		mockGame.objectManage.balls = [ball];

		ball.fall();
		assert.equal(mockGame.objectManage.balls.length, 0);
		assert.equal(allLostCalled, true);
		assert.equal(soundPlayed, 'fall');
		assert.deepEqual(awardAdded, { key: 'fallBallNum', count: 1 });
	});

	await t.test('fall does NOT emit ball:allLost when other balls are still in play', () => {
		let allLostCalled = false;
		EventBus.destructor();
		EventBus.addOnEvent('ball:allLost', () => { allLostCalled = true; });

		const mockBar = { immortalStatusTime: 0 };
		const mockGame = {
			objectManage: {
				bar: mockBar,
				balls: [],
			},
		};

		const ball1 = new Ball(BALL_CREATE_MODE.OTHER, mockGame);
		const ball2 = new Ball(BALL_CREATE_MODE.OTHER, mockGame);
		mockGame.objectManage.balls = [ball1, ball2];

		// First ball falls
		ball1.fall();
		assert.equal(mockGame.objectManage.balls.length, 1);
		assert.equal(mockGame.objectManage.balls[0], ball2);
		assert.equal(allLostCalled, false, 'Should NOT emit ball:allLost when ball2 is still active');

		// Second ball falls
		ball2.fall();
		assert.equal(mockGame.objectManage.balls.length, 0);
		assert.equal(allLostCalled, true, 'Should emit ball:allLost when last ball falls');
	});

	await t.test('draw handles normal, strong, and ultimate ball rendering with tails', () => {
		const ball = new Ball(BALL_CREATE_MODE.OTHER);
		ball.x = 50;
		ball.y = 50;
		ball.histX = [48, 46, 44];
		ball.histY = [50, 50, 50];

		// Normal
		ball.status = BALL_STATUS.NORMAL;
		assert.doesNotThrow(() => ball.draw(mockCtx));

		// Strong
		ball.status = BALL_STATUS.STRONG;
		ball.statusTime = 100;
		assert.doesNotThrow(() => ball.draw(mockCtx));

		// Ultimate
		ball.status = BALL_STATUS.ULTIMATE;
		assert.doesNotThrow(() => ball.draw(mockCtx));
	});

	await t.test('move handles speed limits, state timeouts, and absorption lock', () => {
		EventBus.destructor();
		const game = createMockGame({ FPS: 50 });
		const ball = new Ball(BALL_CREATE_MODE.OTHER, game);
		ball.vx = 999;
		ball.vy = -999;
		ball.setStatus(BALL_STATUS.STRONG, 0.1);

		ball.movePosition();
		ball.updateState();
		assert.ok(Math.abs(ball.vx) <= globalThis.ballMaxSpeed);
		assert.ok(Math.abs(ball.vy) <= globalThis.ballMaxSpeed);
		assert.equal(ball.status, BALL_STATUS.STRONG);

		// Advance timer to expire status
		EventBus.tickTimers(200);
		assert.equal(ball.status, BALL_STATUS.NORMAL);

		// Direct resetStatus
		ball.setStatus(BALL_STATUS.ULTIMATE, 10);
		ball.resetStatus();
		assert.equal(ball.status, BALL_STATUS.NORMAL);

		// Absorption lock
		ball.isAbsorption = 1;
		ball.absorptionPoint = [10, 0];
		ball.movePosition();
		assert.equal(ball.x, 10 + game.objectManage.bar.getCenterX());
		assert.equal(ball.y, 0 + game.objectManage.bar.getTopY());
	});

	await t.test('movePosition and collision handlers handle wall bounces and bar reflections', () => {
		const game = createMockGame();
		const ball = new Ball(BALL_CREATE_MODE.OTHER, game);

		// Left wall bounce
		ball.x = 0;
		ball.vx = -3;
		ball.y = 100;
		ball.vy = 2;
		ball.movePosition();
		ball.checkCollisionWithWall(globalThis.canvasWidth, globalThis.canvasHeight, 30);
		assert.ok(ball.vx > 0);

		// Right wall bounce
		ball.x = globalThis.canvasWidth + 5;
		ball.vx = 3;
		ball.movePosition();
		ball.checkCollisionWithWall(globalThis.canvasWidth, globalThis.canvasHeight, 30);
		assert.ok(ball.vx < 0);

		// Top wall bounce
		ball.y = 5;
		ball.vy = -3;
		ball.movePosition();
		ball.checkCollisionWithWall(globalThis.canvasWidth, globalThis.canvasHeight, 30);
		assert.ok(ball.vy > 0);

		// Bar bounce
		game.objectManage.bar.x = 200;
		game.objectManage.bar.y = 400;
		game.objectManage.bar.width = 100;
		ball.x = 200;
		ball.y = 398;
		ball.vx = 0;
		ball.vy = 3;
		ball.movePosition();
		ball.checkCollisionWithBar(game.objectManage.bar);
		assert.ok(ball.vy < 0);
	});

	await t.test('destructor removes ball from global balls array', () => {
		const mockGame = { objectManage: { balls: [] } };
		const ball = new Ball(BALL_CREATE_MODE.OTHER, mockGame);
		mockGame.objectManage.balls.push(ball);
		ball.destructor();
		assert.equal(mockGame.objectManage.balls.length, 0);
	});

	await t.test('move triggers fall when ball passes below canvas height', () => {
		const mockGame = { objectManage: { balls: [] }, canvasHeight: 530 };
		const ball = new Ball(BALL_CREATE_MODE.OTHER, mockGame);
		mockGame.objectManage.balls.push(ball);
		ball.x = 200;
		ball.y = 528;
		ball.vy = 10;
		ball.movePosition();
		ball.checkCollisionWithWall(800, mockGame.canvasHeight, 30);
		assert.equal(mockGame.objectManage.balls.length, 0, 'Ball should fall and be removed');
	});

	await t.test('handles through block collisions in all 4 directions', () => {
		// Direction 2: Right through
		const blockRight = new Block(5, 4, 1, BLOCK_FUNCTION.NORMAL, 1, 0, 2);
		const ballR = new Ball(BALL_CREATE_MODE.OTHER);
		ballR.x = blockRight.getRightX() + 2;
		ballR.y = blockRight.getCenterY();
		ballR.vx = -5;
		ballR.vy = 0;
		ballR.histX = [ballR.x + 5];
		ballR.histY = [ballR.y];
		ballR.movePosition();
		ballR.checkCollision(blockRight);

		// Direction 3: Bottom through
		const blockBottom = new Block(5, 4, 1, BLOCK_FUNCTION.NORMAL, 1, 0, 3);
		const ballB = new Ball(BALL_CREATE_MODE.OTHER);
		ballB.x = blockBottom.getCenterX();
		ballB.y = blockBottom.getBottomY() + 2;
		ballB.vx = 0;
		ballB.vy = -5;
		ballB.histX = [ballB.x];
		ballB.histY = [ballB.y + 5];
		ballB.movePosition();
		ballB.checkCollision(blockBottom);

		// Direction 4: Left through
		const blockLeft = new Block(5, 4, 1, BLOCK_FUNCTION.NORMAL, 1, 0, 4);
		const ballL = new Ball(BALL_CREATE_MODE.OTHER);
		ballL.x = blockLeft.getLeftX() - 2;
		ballL.y = blockLeft.getCenterY();
		ballL.vx = 5;
		ballL.vy = 0;
		ballL.histX = [ballL.x - 5];
		ballL.histY = [ballL.y];
		ballL.movePosition();
		ballL.checkCollision(blockLeft);
	});

	await t.test('handles diagonal collision with adjacent obstacles and history queue', () => {
		const targetBlock = new Block(5, 4, 1, BLOCK_FUNCTION.NORMAL, 1);
		const ball = new Ball(BALL_CREATE_MODE.OTHER);
		ball.x = targetBlock.getRightX() + 1;
		ball.y = targetBlock.getBottomY() + 1;
		ball.vx = -4;
		ball.vy = -5;
		ball.histX = [ball.x + 4, ball.x + 8, ball.x + 12, ball.x + 16];
		ball.histY = [ball.y + 5, ball.y + 10, ball.y + 15, ball.y + 20];

		ball.movePosition();
		ball.checkCollision(targetBlock);
		assert.equal(ball.histX.length, SYSTEM_PARAM.BALL_HIST_MAX);
	});

	await t.test('Ball getters and destructor via standard Array', () => {
		const mockBar = { barProp: true };
		const mockBlockMap = [[1]];
		const mockBalls = [{ ballProp: true }];
		const mockItems = [{ itemProp: true }];
		const mockWeapons = [{ weaponProp: true }];
		const mockGame = {
			objectManage: {
				bar: mockBar,
				blockMap: mockBlockMap,
				balls: mockBalls,
				items: mockItems,
				weapons: mockWeapons,
			},
			canvasWidth: 800,
			canvasHeight: 600,
			statusBarHeight: 30,
		};
		const ball = new Ball(BALL_CREATE_MODE.OTHER, mockGame);
		assert.equal(ball.getCanvasWidth(), 800);
		assert.equal(ball.getCanvasHeight(), 600);
		assert.equal(ball.getStatusBarHeight(), 30);

		// destructor removes ball from array
		const plainArray = [ball];
		mockGame.objectManage.balls = plainArray;
		ball.destructor();
		assert.equal(plainArray.length, 0);
	});

	await t.test('checkCollisionWithWall handles wall reflections and falling', () => {
		const ball = new Ball(BALL_CREATE_MODE.OTHER);
		ball.x = -5;
		ball.vx = -3;
		assert.equal(ball.checkCollisionWithWall(800, 600, 30), true);
		assert.equal(ball.x, ball.radius);
		assert.equal(ball.vx, 3);

		ball.x = 810;
		ball.vx = 4;
		assert.equal(ball.checkCollisionWithWall(800, 600, 30), true);
		assert.equal(ball.x, 800 - ball.radius);
		assert.equal(ball.vx, -4);

		ball.y = 10;
		ball.vy = -5;
		assert.equal(ball.checkCollisionWithWall(800, 600, 30), true);
		assert.equal(ball.y, ball.radius + 30);
		assert.equal(ball.vy, 5);

		let fallEmitted = false;
		EventBus.destructor();
		EventBus.addOnEvent('sound:play', (evt) => { if (evt === 'fall') fallEmitted = true; });
		const ballFall = new Ball(BALL_CREATE_MODE.OTHER, { balls: [] });
		ballFall.x = 400;
		ballFall.y = 650;
		assert.equal(ballFall.checkCollisionWithWall(800, 600, 30), true);
		assert.equal(fallEmitted, true);
	});

	await t.test('checkCollisionWithBar handles reflection and absorption', () => {
		const mockBar = {
			width: 100,
			height: 10,
			edge: 0.04,
			vx: 5,
			absorptionStatusTime: 0,
			getTopY: () => 500,
			getCenterX: () => 200,
		};
		const ball = new Ball(BALL_CREATE_MODE.OTHER, { ballDefaultSpeed: 5, ballMaxSpeed: 10 });
		ball.x = 200;
		ball.y = 500;
		ball.vy = 4;

		assert.equal(ball.checkCollisionWithBar(mockBar), true);
		assert.ok(ball.vy < 0);
		assert.equal(ball.y, 500 - ball.radius);

		// Absorption
		mockBar.absorptionStatusTime = 100;
		mockBar.absorptionNum = 0;
		ball.y = 500;
		assert.equal(ball.checkCollisionWithBar(mockBar), true);
		assert.equal(ball.isAbsorption, 1);
		assert.equal(mockBar.absorptionNum, 1);
	});

	await t.test('checkCollision with Block handles bounce, through, and state update', () => {
		const mockBlock = {
			type: 1,
			func: BLOCK_FUNCTION.NORMAL,
			throughVect: 0,
			getLeftX: () => 100,
			getRightX: () => 150,
			getTopY: () => 100,
			getBottomY: () => 120,
		};
		const ball = new Ball(BALL_CREATE_MODE.OTHER);
		ball.x = 125;
		ball.y = 100;
		ball.vx = 0;
		ball.vy = 5;
		ball.histX = [125];
		ball.histY = [90];

		assert.equal(ball.checkCollision(mockBlock), true);
		assert.ok(ball.vy < 0);

		// No collision when far
		ball.x = 500;
		ball.y = 500;
		assert.equal(ball.checkCollision(mockBlock), false);
	});

	await t.test('movePosition updates coordinates and velocity, updateState callable without side effects', () => {
		const ball = new Ball(BALL_CREATE_MODE.OTHER);
		ball.x = 100;
		ball.y = 100;
		ball.vx = 3;
		ball.vy = 4;

		ball.movePosition();
		assert.equal(ball.x, 103);
		assert.equal(ball.y, 104);

		assert.doesNotThrow(() => ball.updateState());
		assert.equal(ball.x, 103);
		assert.equal(ball.y, 104);
	});

	await t.test('checkCollision prevents penetration in horizontal, vertical, and diagonal seamless boundaries', () => {
		// 1. Horizontal seam: block A at (col 1, row 1) and block B at (col 2, row 1)
		const blockA = new Block(1, 1, 1, BLOCK_FUNCTION.NORMAL, 1);
		const blockB = new Block(2, 1, 1, BLOCK_FUNCTION.NORMAL, 1);
		const seamMapH = [
			[],
			[null, blockA, blockB]
		];

		const ballH = new Ball(BALL_CREATE_MODE.OTHER);
		const seamX = blockA.getRightX();
		ballH.x = seamX;
		ballH.y = blockA.getBottomY() + 2;
		ballH.vx = 2;
		ballH.vy = -5;
		ballH.prevX = seamX - 2;
		ballH.prevY = blockA.getBottomY() + 7;

		const hitH = ballH.checkCollision(blockA, seamMapH);
		assert.equal(hitH, true);
		assert.ok(ballH.vy > 0, 'Ball must reflect vertically downwards, not penetrating horizontal seam');
		assert.ok(ballH.y >= blockA.getBottomY(), 'Ball y must be pushed below bottom surface');

		// 2. Vertical seam: block Top at (col 1, row 1) and block Bottom at (col 1, row 2)
		const blockTop = new Block(1, 1, 1, BLOCK_FUNCTION.NORMAL, 1);
		const blockBottom = new Block(1, 2, 1, BLOCK_FUNCTION.NORMAL, 1);
		const seamMapV = [
			[],
			[null, blockTop],
			[null, blockBottom]
		];

		const ballV = new Ball(BALL_CREATE_MODE.OTHER);
		const seamY = blockTop.getBottomY();
		ballV.x = blockTop.getLeftX() - 2;
		ballV.y = seamY;
		ballV.vx = 5;
		ballV.vy = 2;
		ballV.prevX = blockTop.getLeftX() - 7;
		ballV.prevY = seamY - 2;

		const hitV = ballV.checkCollision(blockTop, seamMapV);
		assert.equal(hitV, true);
		assert.ok(ballV.vx < 0, 'Ball must reflect horizontally to the left, not penetrating vertical seam');
		assert.ok(ballV.x <= blockTop.getLeftX(), 'Ball x must be pushed to the left of the block');

		// 3. Diagonal seamless contact: block1 at (col 1, row 1) and block2 at (col 2, row 2)
		const bDiag1 = new Block(1, 1, 1, BLOCK_FUNCTION.NORMAL, 1);
		const bDiag2 = new Block(2, 2, 1, BLOCK_FUNCTION.NORMAL, 1);
		const diagMap = [
			[],
			[null, bDiag1, null],
			[null, null, bDiag2]
		];

		const ballDiag = new Ball(BALL_CREATE_MODE.OTHER);
		const cornerX = bDiag1.getRightX();
		const cornerY = bDiag1.getBottomY();
		ballDiag.x = cornerX - 1;
		ballDiag.y = cornerY + 1;
		ballDiag.vx = 4;
		ballDiag.vy = -4;
		ballDiag.prevX = cornerX - 5;
		ballDiag.prevY = cornerY + 5;

		const hitDiag = ballDiag.checkCollision(bDiag1, diagMap);
		assert.equal(hitDiag, true);
		assert.ok(ballDiag.vx < 0, 'Ball vx must reflect to left, preventing diagonal pass-through');
		assert.ok(ballDiag.vy > 0, 'Ball vy must reflect downwards, preventing diagonal pass-through');
		assert.equal(ballDiag.lastHitAxis, 'both', 'Diagonal collision must reflect both axes equally');
	});

	await t.test('checkCollision handles exposed corners by reflecting on larger velocity component axis', () => {
		const target = new Block(2, 2, 1, BLOCK_FUNCTION.NORMAL, 1);
		const emptyMap = [[], [], [null, null, target]];

		// 1. Bottom-Left corner:
		// 1-a. |vx| > |vy| -> reflects X axis
		const bBL_X = new Ball(BALL_CREATE_MODE.OTHER);
		bBL_X.x = target.getLeftX() - 1;
		bBL_X.y = target.getBottomY() + 1;
		bBL_X.vx = 5;
		bBL_X.vy = -3;
		bBL_X.prevX = target.getLeftX() - 5;
		bBL_X.prevY = target.getBottomY() + 5;
		assert.equal(bBL_X.checkCollision(target, emptyMap), true);
		assert.ok(bBL_X.vx < 0, 'vx should reflect to negative');
		assert.ok(bBL_X.vy < 0, 'vy should keep moving upward');
		assert.equal(bBL_X.lastHitAxis, 'x');

		// 1-b. |vy| > |vx| -> reflects Y axis
		const bBL_Y = new Ball(BALL_CREATE_MODE.OTHER);
		bBL_Y.x = target.getLeftX() - 1;
		bBL_Y.y = target.getBottomY() + 1;
		bBL_Y.vx = 3;
		bBL_Y.vy = -5;
		bBL_Y.prevX = target.getLeftX() - 5;
		bBL_Y.prevY = target.getBottomY() + 5;
		assert.equal(bBL_Y.checkCollision(target, emptyMap), true);
		assert.ok(bBL_Y.vx > 0, 'vx should keep moving right');
		assert.ok(bBL_Y.vy > 0, 'vy should reflect downwards');
		assert.equal(bBL_Y.lastHitAxis, 'y');

		// 1-c. |vx| === |vy| -> reflects Y axis by default
		const bBL_Eq = new Ball(BALL_CREATE_MODE.OTHER);
		bBL_Eq.x = target.getLeftX() - 1;
		bBL_Eq.y = target.getBottomY() + 1;
		bBL_Eq.vx = 4;
		bBL_Eq.vy = -4;
		bBL_Eq.prevX = target.getLeftX() - 5;
		bBL_Eq.prevY = target.getBottomY() + 5;
		assert.equal(bBL_Eq.checkCollision(target, emptyMap), true);
		assert.ok(bBL_Eq.vx > 0, 'vx should not reflect');
		assert.ok(bBL_Eq.vy > 0, 'vy should reflect downwards');
		assert.equal(bBL_Eq.lastHitAxis, 'y');

		// 2. Bottom-Right corner:
		// 2-a. |vx| > |vy| -> reflects X axis
		const bBR_X = new Ball(BALL_CREATE_MODE.OTHER);
		bBR_X.x = target.getRightX() + 1;
		bBR_X.y = target.getBottomY() + 1;
		bBR_X.vx = -5;
		bBR_X.vy = -3;
		bBR_X.prevX = target.getRightX() + 5;
		bBR_X.prevY = target.getBottomY() + 5;
		assert.equal(bBR_X.checkCollision(target, emptyMap), true);
		assert.ok(bBR_X.vx > 0, 'vx should reflect to positive');
		assert.ok(bBR_X.vy < 0, 'vy should keep moving upward');
		assert.equal(bBR_X.lastHitAxis, 'x');

		// 2-b. |vy| > |vx| -> reflects Y axis
		const bBR_Y = new Ball(BALL_CREATE_MODE.OTHER);
		bBR_Y.x = target.getRightX() + 1;
		bBR_Y.y = target.getBottomY() + 1;
		bBR_Y.vx = -3;
		bBR_Y.vy = -5;
		bBR_Y.prevX = target.getRightX() + 5;
		bBR_Y.prevY = target.getBottomY() + 5;
		assert.equal(bBR_Y.checkCollision(target, emptyMap), true);
		assert.ok(bBR_Y.vx < 0, 'vx should keep moving left');
		assert.ok(bBR_Y.vy > 0, 'vy should reflect downwards');
		assert.equal(bBR_Y.lastHitAxis, 'y');

		// 3. Top-Left corner:
		// 3-a. |vx| > |vy| -> reflects X axis
		const bTL_X = new Ball(BALL_CREATE_MODE.OTHER);
		bTL_X.x = target.getLeftX() - 1;
		bTL_X.y = target.getTopY() - 1;
		bTL_X.vx = 5;
		bTL_X.vy = 3;
		bTL_X.prevX = target.getLeftX() - 5;
		bTL_X.prevY = target.getTopY() - 5;
		assert.equal(bTL_X.checkCollision(target, emptyMap), true);
		assert.ok(bTL_X.vx < 0, 'vx should reflect to negative');
		assert.ok(bTL_X.vy > 0, 'vy should keep moving downward');
		assert.equal(bTL_X.lastHitAxis, 'x');

		// 3-b. |vy| > |vx| -> reflects Y axis
		const bTL_Y = new Ball(BALL_CREATE_MODE.OTHER);
		bTL_Y.x = target.getLeftX() - 1;
		bTL_Y.y = target.getTopY() - 1;
		bTL_Y.vx = 3;
		bTL_Y.vy = 5;
		bTL_Y.prevX = target.getLeftX() - 5;
		bTL_Y.prevY = target.getTopY() - 5;
		assert.equal(bTL_Y.checkCollision(target, emptyMap), true);
		assert.ok(bTL_Y.vx > 0, 'vx should keep moving right');
		assert.ok(bTL_Y.vy < 0, 'vy should reflect upwards');
		assert.equal(bTL_Y.lastHitAxis, 'y');

		// 4. Top-Right corner:
		// 4-a. |vx| > |vy| -> reflects X axis
		const bTR_X = new Ball(BALL_CREATE_MODE.OTHER);
		bTR_X.x = target.getRightX() + 1;
		bTR_X.y = target.getTopY() - 1;
		bTR_X.vx = -5;
		bTR_X.vy = 3;
		bTR_X.prevX = target.getRightX() + 5;
		bTR_X.prevY = target.getTopY() - 5;
		assert.equal(bTR_X.checkCollision(target, emptyMap), true);
		assert.ok(bTR_X.vx > 0, 'vx should reflect to positive');
		assert.ok(bTR_X.vy > 0, 'vy should keep moving downward');
		assert.equal(bTR_X.lastHitAxis, 'x');

		// 4-b. |vy| > |vx| -> reflects Y axis
		const bTR_Y = new Ball(BALL_CREATE_MODE.OTHER);
		bTR_Y.x = target.getRightX() + 1;
		bTR_Y.y = target.getTopY() - 1;
		bTR_Y.vx = -3;
		bTR_Y.vy = 5;
		bTR_Y.prevX = target.getRightX() + 5;
		bTR_Y.prevY = target.getTopY() - 5;
		assert.equal(bTR_Y.checkCollision(target, emptyMap), true);
		assert.ok(bTR_Y.vx < 0, 'vx should keep moving left');
		assert.ok(bTR_Y.vy < 0, 'vy should reflect upwards');
		assert.equal(bTR_Y.lastHitAxis, 'y');
	});

	await t.test('applySpeedDelta correctly adjusts both axes when lastHitAxis is both', () => {
		const ball = new Ball(BALL_CREATE_MODE.OTHER);
		ball.lastHitAxis = 'both';
		ball.vx = 4;
		ball.vy = -4;
		ball.applySpeedDelta(1);
		assert.equal(ball.vx, 5);
		assert.equal(ball.vy, -5);

		ball.vx = -4;
		ball.vy = 4;
		ball.applySpeedDelta(1);
		assert.equal(ball.vx, -5);
		assert.equal(ball.vy, 5);

		// test with y axis
		ball.lastHitAxis = 'y';
		ball.vy = 4;
		ball.applySpeedDelta(1);
		assert.equal(ball.vy, 5);

		// no-op when delta is 0 or undefined
		ball.applySpeedDelta(0);
		assert.equal(ball.vy, 5);
	});

	await t.test('checkCollision handles all 4 diagonal block junction contacts seamlessly', () => {
		// 1. Bottom-Left junction: target at (col 2, row 2), diagonal neighbor at (col 1, row 3)
		const targetBL = new Block(2, 2, 1, BLOCK_FUNCTION.NORMAL, 1);
		const neighborBL = new Block(1, 3, 1, BLOCK_FUNCTION.NORMAL, 1);
		const mapBL = [[], [], [null, null, targetBL], [null, neighborBL]];

		// Moving northwest (vx <= 0, vy <= 0) into junction
		const ballBL1 = new Ball(BALL_CREATE_MODE.OTHER);
		ballBL1.x = targetBL.getLeftX() + 1;
		ballBL1.y = targetBL.getBottomY() - 1;
		ballBL1.vx = -3;
		ballBL1.vy = -3;
		assert.equal(ballBL1.checkCollision(targetBL, mapBL), true);
		assert.ok(ballBL1.vx > 0);
		assert.ok(ballBL1.vy > 0);
		assert.equal(ballBL1.lastHitAxis, 'both');

		// Moving southeast (vx >= 0, vy >= 0) into junction
		const ballBL2 = new Ball(BALL_CREATE_MODE.OTHER);
		ballBL2.x = targetBL.getLeftX() - 1;
		ballBL2.y = targetBL.getBottomY() + 1;
		ballBL2.vx = 3;
		ballBL2.vy = 3;
		assert.equal(ballBL2.checkCollision(targetBL, mapBL), true);
		assert.ok(ballBL2.vx < 0);
		assert.ok(ballBL2.vy < 0);
		assert.equal(ballBL2.lastHitAxis, 'both');

		// 2. Top-Right junction: target at (col 2, row 2), diagonal neighbor at (col 3, row 1)
		const targetTR = new Block(2, 2, 1, BLOCK_FUNCTION.NORMAL, 1);
		const neighborTR = new Block(3, 1, 1, BLOCK_FUNCTION.NORMAL, 1);
		const mapTR = [[], [null, null, null, neighborTR], [null, null, targetTR]];

		// Moving southeast (vx >= 0, vy >= 0) into junction
		const ballTR1 = new Ball(BALL_CREATE_MODE.OTHER);
		ballTR1.x = targetTR.getRightX() - 1;
		ballTR1.y = targetTR.getTopY() + 1;
		ballTR1.vx = 3;
		ballTR1.vy = 3;
		assert.equal(ballTR1.checkCollision(targetTR, mapTR), true);
		assert.ok(ballTR1.vx < 0);
		assert.ok(ballTR1.vy < 0);
		assert.equal(ballTR1.lastHitAxis, 'both');

		// Moving northwest (vx <= 0, vy <= 0) into junction
		const ballTR2 = new Ball(BALL_CREATE_MODE.OTHER);
		ballTR2.x = targetTR.getRightX() + 1;
		ballTR2.y = targetTR.getTopY() - 1;
		ballTR2.vx = -3;
		ballTR2.vy = -3;
		assert.equal(ballTR2.checkCollision(targetTR, mapTR), true);
		assert.ok(ballTR2.vx > 0);
		assert.ok(ballTR2.vy > 0);
		assert.equal(ballTR2.lastHitAxis, 'both');

		// 3. Top-Left junction: target at (col 2, row 2), diagonal neighbor at (col 1, row 1)
		const targetTL = new Block(2, 2, 1, BLOCK_FUNCTION.NORMAL, 1);
		const neighborTL = new Block(1, 1, 1, BLOCK_FUNCTION.NORMAL, 1);
		const mapTL = [[], [null, neighborTL], [null, null, targetTL]];

		// Moving southwest (vx <= 0, vy >= 0) into junction
		const ballTL1 = new Ball(BALL_CREATE_MODE.OTHER);
		ballTL1.x = targetTL.getLeftX() + 1;
		ballTL1.y = targetTL.getTopY() + 1;
		ballTL1.vx = -3;
		ballTL1.vy = 3;
		assert.equal(ballTL1.checkCollision(targetTL, mapTL), true);
		assert.ok(ballTL1.vx > 0);
		assert.ok(ballTL1.vy < 0);
		assert.equal(ballTL1.lastHitAxis, 'both');

		// Moving northeast (vx >= 0, vy <= 0) into junction
		const ballTL2 = new Ball(BALL_CREATE_MODE.OTHER);
		ballTL2.x = targetTL.getLeftX() - 1;
		ballTL2.y = targetTL.getTopY() - 1;
		ballTL2.vx = 3;
		ballTL2.vy = -3;
		assert.equal(ballTL2.checkCollision(targetTL, mapTL), true);
		assert.ok(ballTL2.vx < 0);
		assert.ok(ballTL2.vy > 0);
		assert.equal(ballTL2.lastHitAxis, 'both');
	});

	await t.test('checkCollision fallback smoothly escapes embedded balls to nearest open faces or corners', () => {
		const target = new Block(2, 2, 1, BLOCK_FUNCTION.NORMAL, 1);
		const map = [[], [], [null, null, target]];

		// 1. Embedded inside block center without prior movement
		const ballCenter = new Ball(BALL_CREATE_MODE.OTHER);
		ballCenter.x = target.getCenterX();
		ballCenter.y = target.getCenterY();
		ballCenter.vx = 2;
		ballCenter.vy = 4;
		ballCenter.prevX = ballCenter.x;
		ballCenter.prevY = ballCenter.y;
		assert.equal(ballCenter.checkCollision(target, map), true);
		assert.ok(ballCenter.lastHitAxis === 'y' || ballCenter.lastHitAxis === 'x');

		// 2. Embedded in quadrant regions without crossed trajectory
		const makeQuadrantBall = (offsetX, offsetY, vx, vy) => {
			const b = new Ball(BALL_CREATE_MODE.OTHER);
			b.x = target.getCenterX() + offsetX;
			b.y = target.getCenterY() + offsetY;
			b.vx = vx;
			b.vy = vy;
			b.prevX = b.x;
			b.prevY = b.y;
			return b;
		};

		// Bottom-Left quadrant escape
		const bBL = makeQuadrantBall(-15, 6, -1, 1);
		assert.equal(bBL.checkCollision(target, map), true);
		assert.ok(bBL.x <= target.getLeftX() || bBL.y >= target.getBottomY());

		// Bottom-Right quadrant escape
		const bBR = makeQuadrantBall(15, 6, 1, 1);
		assert.equal(bBR.checkCollision(target, map), true);
		assert.ok(bBR.x >= target.getRightX() || bBR.y >= target.getBottomY());

		// Top-Left quadrant escape
		const bTL = makeQuadrantBall(-15, -6, -1, -1);
		assert.equal(bTL.checkCollision(target, map), true);
		assert.ok(bTL.x <= target.getLeftX() || bTL.y <= target.getTopY());

		// Top-Right quadrant escape
		const bTR = makeQuadrantBall(15, -6, 1, -1);
		assert.equal(bTR.checkCollision(target, map), true);
		assert.ok(bTR.x >= target.getRightX() || bTR.y <= target.getTopY());
	});

	await t.test('checkCollision ignores fully occluded inner corner block in L-shape clusters', () => {
		// 1. Bottom-right occluded corner
		const bTL = new Block(1, 1, 1, BLOCK_FUNCTION.NORMAL, 1);
		const bTR = new Block(2, 1, 1, BLOCK_FUNCTION.NORMAL, 1);
		const bBL = new Block(1, 2, 1, BLOCK_FUNCTION.NORMAL, 1);
		const map1 = [[], [null, bTL, bTR], [null, bBL, null]];

		const ball1 = new Ball(BALL_CREATE_MODE.OTHER);
		ball1.x = bTL.getRightX() - 1;
		ball1.y = bTL.getBottomY() - 1;
		ball1.vx = -3;
		ball1.vy = -3;
		assert.equal(ball1.checkCollision(bTL, map1), false);

		// 2. Bottom-left occluded corner
		const bBR = new Block(2, 2, 1, BLOCK_FUNCTION.NORMAL, 1);
		const map2 = [[], [null, bTL, bTR], [null, null, bBR]];
		const ball2 = new Ball(BALL_CREATE_MODE.OTHER);
		ball2.x = bTR.getLeftX() + 1;
		ball2.y = bTR.getBottomY() - 1;
		ball2.vx = 3;
		ball2.vy = -3;
		assert.equal(ball2.checkCollision(bTR, map2), false);

		// 3. Top-left occluded corner (bBR has bBL on left and bTR on top)
		const map3 = [[], [null, null, bTR], [null, bBL, bBR]];
		const ball3 = new Ball(BALL_CREATE_MODE.OTHER);
		ball3.x = bBR.getLeftX() + 1;
		ball3.y = bBR.getTopY() + 1;
		ball3.vx = 3;
		ball3.vy = 3;
		assert.equal(ball3.checkCollision(bBR, map3), false);

		// 4. Top-right occluded corner (bBL has bTL on top and bBR on right)
		const map4 = [[], [null, bTL, null], [null, bBL, bBR]];
		const ball4 = new Ball(BALL_CREATE_MODE.OTHER);
		ball4.x = bBL.getRightX() - 1;
		ball4.y = bBL.getTopY() + 1;
		ball4.vx = -3;
		ball4.vy = 3;
		assert.equal(ball4.checkCollision(bBL, map4), false);
	});

	await t.test('checkCollision reflects smoothly from concave inner corner across all 4 quadrants without teleporting', () => {
		// 1. Bottom-Left inner corner (B_TR perspective with B_TL on left, B_BL on bottom-left)
		const bTL = new Block(2, 2, 1, BLOCK_FUNCTION.NORMAL, 1);
		const bTR = new Block(3, 2, 1, BLOCK_FUNCTION.NORMAL, 1);
		const bBL = new Block(2, 3, 1, BLOCK_FUNCTION.NORMAL, 1);
		const map1 = [[], [], [null, null, bTL, bTR], [null, null, bBL, null]];

		const ball1 = new Ball(BALL_CREATE_MODE.OTHER);
		ball1.x = bTR.getLeftX() - 1;
		ball1.y = bTR.getBottomY() - 1;
		ball1.vx = -4;
		ball1.vy = -4;
		assert.equal(ball1.checkCollision(bTR, map1), true);
		assert.ok(ball1.vx > 0, 'vx must reflect rightwards');
		assert.ok(ball1.vy > 0, 'vy must reflect downwards');
		assert.equal(ball1.lastHitAxis, 'both');
		assert.equal(ball1.x, bTR.getLeftX() + ball1.radius + 1, 'x must push right from bLeft, not far-right bRight');
		assert.equal(ball1.y, bTR.getBottomY() + ball1.radius + 1, 'y must push down from bBottom');

		// 2. Bottom-Right inner corner (B_TL perspective with B_TR on right, B_BR on bottom-right)
		const bBR = new Block(3, 3, 1, BLOCK_FUNCTION.NORMAL, 1);
		const map2 = [[], [], [null, null, bTL, bTR], [null, null, null, bBR]];

		const ball2 = new Ball(BALL_CREATE_MODE.OTHER);
		ball2.x = bTL.getRightX() + 1;
		ball2.y = bTL.getBottomY() - 1;
		ball2.vx = 4;
		ball2.vy = -4;
		assert.equal(ball2.checkCollision(bTL, map2), true);
		assert.ok(ball2.vx < 0, 'vx must reflect leftwards');
		assert.ok(ball2.vy > 0, 'vy must reflect downwards');
		assert.equal(ball2.lastHitAxis, 'both');
		assert.equal(ball2.x, bTL.getRightX() - ball2.radius - 1, 'x must push left from bRight');
		assert.equal(ball2.y, bTL.getBottomY() + ball2.radius + 1, 'y must push down from bBottom');

		// 3. Top-Left inner corner (B_BR perspective with B_BL on left, B_TL on top-left)
		const map3 = [[], [], [null, null, bTL, null], [null, null, bBL, bBR]];

		const ball3 = new Ball(BALL_CREATE_MODE.OTHER);
		ball3.x = bBR.getLeftX() - 1;
		ball3.y = bBR.getTopY() + 1;
		ball3.vx = -4;
		ball3.vy = 4;
		assert.equal(ball3.checkCollision(bBR, map3), true);
		assert.ok(ball3.vx > 0, 'vx must reflect rightwards');
		assert.ok(ball3.vy < 0, 'vy must reflect upwards');
		assert.equal(ball3.lastHitAxis, 'both');
		assert.equal(ball3.x, bBR.getLeftX() + ball3.radius + 1, 'x must push right from bLeft');
		assert.equal(ball3.y, bBR.getTopY() - ball3.radius - 1, 'y must push up from bTop');

		// 4. Top-Right inner corner (B_BL perspective with B_BR on right, B_TR on top-right)
		const map4 = [[], [], [null, null, null, bTR], [null, null, bBL, bBR]];

		const ball4 = new Ball(BALL_CREATE_MODE.OTHER);
		ball4.x = bBL.getRightX() + 1;
		ball4.y = bBL.getTopY() + 1;
		ball4.vx = 4;
		ball4.vy = 4;
		assert.equal(ball4.checkCollision(bBL, map4), true);
		assert.ok(ball4.vx < 0, 'vx must reflect leftwards');
		assert.ok(ball4.vy < 0, 'vy must reflect upwards');
		assert.equal(ball4.lastHitAxis, 'both');
		assert.equal(ball4.x, bBL.getRightX() - ball4.radius - 1, 'x must push left from bRight');
		assert.equal(ball4.y, bBL.getTopY() - ball4.radius - 1, 'y must push up from bTop');
	});
});


