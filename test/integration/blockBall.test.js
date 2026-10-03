// test/integration/blockBall.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';
import Ball from '../../src/Ball.js';
import Block from '../../src/Block.js';

describe('Integration Test: Block-Ball Collisions & Special Block Actions', () => {
	beforeEach(() => {
		setupEnvironment();
		window.init(0);
		clearInterval(window.timer_All);
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('detects collisions from left, right, top, bottom, and diagonal with velocity reflection', () => {
		// Clean 10x15 block grid
		window.blockMap = [];
		for (let r = 0; r < 10; r++) {
			window.blockMap[r] = [];
			for (let c = 0; c < 15; c++) {
				window.blockMap[r][c] = null;
			}
		}

		// Place target block at col=5, row=3
		const targetBlock = new Block(5, 3, 1, window.BLOCK_FUNCTION.NORMAL);
		window.blockMap[3][5] = targetBlock;

		// 1. Collision from Left (moving right)
		const ballL = new Ball(window.BALL_CREATE_MODE.OTHER);
		ballL.x = targetBlock.getLeftX() - ballL.radius - 2;
		ballL.y = targetBlock.getCenterY();
		ballL.vx = 4;
		ballL.vy = 0.5;
		ballL.histX = [ballL.x];
		ballL.histY = [ballL.y];
		window.balls = [ballL];
		ballL.move();
		assert.ok(ballL.vx < 0, 'Ball should reflect horizontally from left');

		// 2. Collision from Right (moving left)
		targetBlock.life = 1;
		const ballR = new Ball(window.BALL_CREATE_MODE.OTHER);
		ballR.x = targetBlock.getRightX() + ballR.radius + 2;
		ballR.y = targetBlock.getCenterY();
		ballR.vx = -4;
		ballR.vy = 0.5;
		ballR.histX = [ballR.x];
		ballR.histY = [ballR.y];
		window.balls = [ballR];
		ballR.move();
		assert.ok(ballR.vx > 0, 'Ball should reflect horizontally from right');

		// 3. Collision from Top (moving down)
		targetBlock.life = 1;
		const ballT = new Ball(window.BALL_CREATE_MODE.OTHER);
		ballT.x = targetBlock.getCenterX();
		ballT.y = targetBlock.getTopY() - ballT.radius - 2;
		ballT.vx = 0.5;
		ballT.vy = 4;
		ballT.histX = [ballT.x];
		ballT.histY = [ballT.y];
		window.balls = [ballT];
		ballT.move();
		assert.ok(ballT.vy < 0, 'Ball should reflect vertically from top');

		// 4. Collision from Bottom (moving up)
		targetBlock.life = 1;
		const ballB = new Ball(window.BALL_CREATE_MODE.OTHER);
		ballB.x = targetBlock.getCenterX();
		ballB.y = targetBlock.getBottomY() + ballB.radius + 2;
		ballB.vx = 0.5;
		ballB.vy = -4;
		ballB.histX = [ballB.x];
		ballB.histY = [ballB.y];
		window.balls = [ballB];
		ballB.move();
		assert.ok(ballB.vy > 0, 'Ball should reflect vertically from bottom');

		// 5. Diagonal collision where vx > vy (X reflection dominates)
		targetBlock.life = 1;
		const ballD = new Ball(window.BALL_CREATE_MODE.OTHER);
		ballD.x = targetBlock.getLeftX() - ballD.radius - 1;
		ballD.y = targetBlock.getTopY() - ballD.radius - 1;
		ballD.vx = 5;
		ballD.vy = 2;
		ballD.histX = [ballD.x];
		ballD.histY = [ballD.y];
		window.balls = [ballD];
		ballD.move();
		assert.ok(ballD.vx < 0);
	});

	it('handles through blocks, acceleration, deceleration, and warp entrance/exit', () => {
		window.blockMap = [];
		for (let r = 0; r < 12; r++) {
			window.blockMap[r] = [];
			for (let c = 0; c < 15; c++) {
				window.blockMap[r][c] = null;
			}
		}

		// 1. Through block at col=4, row=3
		const throughBlock = new Block(4, 3, 1, window.BLOCK_FUNCTION.THROUGH, 1, 0, 1);
		throughBlock.throughVect = 1; // Allows passing upward
		window.blockMap[3][4] = throughBlock;

		const ballUp = new Ball(window.BALL_CREATE_MODE.OTHER);
		ballUp.x = throughBlock.getCenterX();
		ballUp.y = throughBlock.getBottomY() + 2;
		ballUp.vx = 0.5;
		ballUp.vy = -4;
		ballUp.histX = [ballUp.x];
		ballUp.histY = [ballUp.y];
		window.balls = [ballUp];
		ballUp.move();
		assert.ok(ballUp.vy < 0, 'Ball should pass through without reflecting');

		// 2. Acceleration block at col=6, row=3
		const accelBlock = new Block(6, 3, 1, window.BLOCK_FUNCTION.ACCELERATION);
		window.blockMap[3][6] = accelBlock;
		const ballAccel = new Ball(window.BALL_CREATE_MODE.OTHER);
		ballAccel.x = accelBlock.getLeftX() - ballAccel.radius - 2;
		ballAccel.y = accelBlock.getCenterY();
		ballAccel.vx = 4;
		ballAccel.vy = 0.5;
		ballAccel.histX = [ballAccel.x];
		ballAccel.histY = [ballAccel.y];
		window.balls = [ballAccel];
		ballAccel.move();
		assert.ok(ballAccel.vx < 0, 'Should reflect after accelerating');

		// 3. Deceleration block at col=8, row=3
		const decelBlock = new Block(8, 3, 1, window.BLOCK_FUNCTION.DECELERATION);
		window.blockMap[3][8] = decelBlock;
		const ballDecel = new Ball(window.BALL_CREATE_MODE.OTHER);
		ballDecel.x = decelBlock.getLeftX() - ballDecel.radius - 2;
		ballDecel.y = decelBlock.getCenterY();
		ballDecel.vx = 4;
		ballDecel.vy = 0.5;
		ballDecel.histX = [ballDecel.x];
		ballDecel.histY = [ballDecel.y];
		window.balls = [ballDecel];
		ballDecel.move();
		assert.ok(ballDecel.vx < 0, 'Should reflect after decelerating');

		// 4. Warp Enter at col=2, row=4 and Exit at col=10, row=7
		const warpIn = new Block(2, 4, 1, window.BLOCK_FUNCTION.WARP_ENTER);
		const warpOut = new Block(10, 7, 1, window.BLOCK_FUNCTION.WARP_EXIT);
		window.blockMap[4][2] = warpIn;
		window.blockMap[7][10] = warpOut;

		const ballWarp = new Ball(window.BALL_CREATE_MODE.OTHER);
		ballWarp.x = warpIn.getLeftX() - ballWarp.radius - 2;
		ballWarp.y = warpIn.getCenterY();
		ballWarp.vx = 4;
		ballWarp.vy = 0.5;
		ballWarp.histX = [ballWarp.x];
		ballWarp.histY = [ballWarp.y];
		window.balls = [ballWarp];
		ballWarp.move();
		assert.equal(ballWarp.x, warpOut.getCenterX(), 'Ball should teleport to warp exit block');
	});

	it('handles magnet, repull, explosion chains, and strong/ultimate penetration', () => {
		window.blockMap = [];
		for (let r = 0; r < 10; r++) {
			window.blockMap[r] = [];
			for (let c = 0; c < 15; c++) {
				window.blockMap[r][c] = null;
			}
		}

		// 1. Magnet block
		const magnetBlock = new Block(5, 5, 1, window.BLOCK_FUNCTION.MAGNET);
		window.blockMap[5][5] = magnetBlock;
		const ballMag = new Ball(window.BALL_CREATE_MODE.OTHER);
		ballMag.x = magnetBlock.getLeftX() - 15;
		ballMag.y = magnetBlock.getCenterY();
		ballMag.vx = 1;
		ballMag.vy = 0;
		window.balls = [ballMag];
		magnetBlock.move();
		assert.ok(ballMag.vx !== 1 || ballMag.vy !== 0, 'Magnet should pull ball');

		// 2. Repull block
		const repullBlock = new Block(7, 5, 1, window.BLOCK_FUNCTION.REPULL);
		window.blockMap[5][7] = repullBlock;
		const ballRepull = new Ball(window.BALL_CREATE_MODE.OTHER);
		ballRepull.x = repullBlock.getLeftX() - 10;
		ballRepull.y = repullBlock.getCenterY();
		ballRepull.vx = 2;
		ballRepull.vy = 0;
		window.balls = [ballRepull];
		repullBlock.move();

		// 3. Bomb chain reaction
		const bomb1 = new Block(2, 2, 1, window.BLOCK_FUNCTION.EXPLODE);
		const bomb2 = new Block(3, 2, 1, window.BLOCK_FUNCTION.EXPLODE_STRENGTH);
		const normalBlock = new Block(4, 2, 1, window.BLOCK_FUNCTION.NORMAL);
		window.blockMap[2][2] = bomb1;
		window.blockMap[2][3] = bomb2;
		window.blockMap[2][4] = normalBlock;

		const triggerBall = new Ball(window.BALL_CREATE_MODE.OTHER);
		bomb1.explode(2, 2, 1, triggerBall);
		assert.equal(bomb2.type, 0, 'Adjacent bomb should be chain exploded');
		assert.equal(normalBlock.type, 0, 'Adjacent normal block should be destroyed');

		// 4. Strong and Ultimate balls penetrating blocks without bouncing
		const blockPen = new Block(6, 6, 1, window.BLOCK_FUNCTION.NORMAL);
		window.blockMap[6][6] = blockPen;

		const strongBall = new Ball(window.BALL_CREATE_MODE.OTHER);
		strongBall.status = window.BALL_STATUS.STRONG;
		strongBall.x = blockPen.getLeftX() - strongBall.radius - 2;
		strongBall.y = blockPen.getCenterY();
		strongBall.vx = 4;
		strongBall.vy = 0.5;
		strongBall.histX = [strongBall.x];
		strongBall.histY = [strongBall.y];
		window.balls = [strongBall];
		strongBall.move();
		assert.equal(blockPen.type, 0, 'Normal block should be broken by strong ball');

		// 5. Simulate mode execution
		const simBlock = new Block(7, 7, 1, window.BLOCK_FUNCTION.NORMAL);
		simBlock.simulate = 1;
		window.blockMap[7][7] = simBlock;
		const simBall = new Ball(window.BALL_CREATE_MODE.OTHER);
		simBall.simulate = 1;
		simBall.x = simBlock.getLeftX() - simBall.radius - 2;
		simBall.y = simBlock.getCenterY();
		simBall.vx = 4;
		simBall.vy = 0.5;
		simBall.histX = [simBall.x];
		simBall.histY = [simBall.y];
		simBall.move();
		assert.equal(simBlock.type, 1, 'Real block type should not be destroyed in simulate mode');
	});
});
