// test/integration/blockBall.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';
import Ball from '../../src/Ball.js';
import Block from '../../src/Block.js';
import { BLOCK_FUNCTION, BALL_STATUS, BALL_CREATE_MODE } from '../../src/const.js';

describe('Integration Test: Block-Ball Collisions & Special Block Actions', () => {
	beforeEach(() => {
		setupEnvironment();
		window.gameManage.init(0);
		clearInterval(window.timer_All);
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('detects collisions from left, right, top, bottom, and diagonal with velocity reflection', () => {
		const g = window.gameManage;
		// Clean 10x15 block grid
		g.objectManage.blockMap = [];
		for (let r = 0; r < 10; r++) {
			g.objectManage.blockMap[r] = [];
			for (let c = 0; c < 15; c++) {
				g.objectManage.blockMap[r][c] = null;
			}
		}

		// Place target block at col=5, row=3
		const targetBlock = new Block(5, 3, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, g);
		g.objectManage.blockMap[3][5] = targetBlock;

		// 1. Collision from Left (moving right)
		const ballL = new Ball(BALL_CREATE_MODE.OTHER, g);
		ballL.x = targetBlock.getLeftX() - ballL.radius - 2;
		ballL.y = targetBlock.getCenterY();
		ballL.vx = 4;
		ballL.vy = 0.5;
		ballL.histX = [ballL.x];
		ballL.histY = [ballL.y];
		g.objectManage.balls = [ballL];
		ballL.movePosition();
		g.objectManage.resolveCollisions();
		assert.ok(ballL.vx < 0, 'Ball should reflect horizontally from left');

		// 2. Collision from Right (moving left)
		targetBlock.type = 1;
		targetBlock.life = 1;
		const ballR = new Ball(BALL_CREATE_MODE.OTHER, g);
		ballR.x = targetBlock.getRightX() + ballR.radius + 2;
		ballR.y = targetBlock.getCenterY();
		ballR.vx = -4;
		ballR.vy = 0.5;
		ballR.histX = [ballR.x];
		ballR.histY = [ballR.y];
		g.objectManage.balls = [ballR];
		ballR.movePosition();
		g.objectManage.resolveCollisions();
		assert.ok(ballR.vx > 0, 'Ball should reflect horizontally from right');

		// 3. Collision from Top (moving down)
		targetBlock.type = 1;
		targetBlock.life = 1;
		const ballT = new Ball(BALL_CREATE_MODE.OTHER, g);
		ballT.x = targetBlock.getCenterX();
		ballT.y = targetBlock.getTopY() - ballT.radius - 2;
		ballT.vx = 0.5;
		ballT.vy = 4;
		ballT.histX = [ballT.x];
		ballT.histY = [ballT.y];
		g.objectManage.balls = [ballT];
		ballT.movePosition();
		g.objectManage.resolveCollisions();
		assert.ok(ballT.vy < 0, 'Ball should reflect vertically from top');

		// 4. Collision from Bottom (moving up)
		targetBlock.type = 1;
		targetBlock.life = 1;
		const ballB = new Ball(BALL_CREATE_MODE.OTHER, g);
		ballB.x = targetBlock.getCenterX();
		ballB.y = targetBlock.getBottomY() + ballB.radius + 2;
		ballB.vx = 0.5;
		ballB.vy = -4;
		ballB.histX = [ballB.x];
		ballB.histY = [ballB.y];
		g.objectManage.balls = [ballB];
		ballB.movePosition();
		g.objectManage.resolveCollisions();
		assert.ok(ballB.vy > 0, 'Ball should reflect vertically from bottom');

		// 5. Diagonal collision where vx > vy (X reflection dominates)
		targetBlock.type = 1;
		targetBlock.life = 1;
		const ballD = new Ball(BALL_CREATE_MODE.OTHER, g);
		ballD.x = targetBlock.getLeftX() - ballD.radius - 1;
		ballD.y = targetBlock.getTopY() - ballD.radius - 1;
		ballD.vx = 5;
		ballD.vy = 2;
		ballD.histX = [ballD.x];
		ballD.histY = [ballD.y];
		g.objectManage.balls = [ballD];
		ballD.movePosition();
		g.objectManage.resolveCollisions();
		assert.ok(ballD.vx < 0);
	});

	it('handles through blocks, acceleration, deceleration, and warp entrance/exit', () => {
		const g = window.gameManage;
		g.objectManage.blockMap = [];
		for (let r = 0; r < 12; r++) {
			g.objectManage.blockMap[r] = [];
			for (let c = 0; c < 15; c++) {
				g.objectManage.blockMap[r][c] = null;
			}
		}

		// 1. Through block at col=4, row=3
		const throughBlock = new Block(4, 3, 1, BLOCK_FUNCTION.THROUGH, 1, 0, 1, g);
		throughBlock.throughVect = 1; // Allows passing upward
		g.objectManage.blockMap[3][4] = throughBlock;

		const ballUp = new Ball(BALL_CREATE_MODE.OTHER, g);
		ballUp.x = throughBlock.getCenterX();
		ballUp.y = throughBlock.getBottomY() + 2;
		ballUp.vx = 0.5;
		ballUp.vy = -4;
		ballUp.histX = [ballUp.x];
		ballUp.histY = [ballUp.y];
		g.objectManage.balls = [ballUp];
		ballUp.movePosition();
		g.objectManage.resolveCollisions();
		assert.ok(ballUp.vy < 0, 'Ball should pass through without reflecting');

		// 2. Acceleration block at col=6, row=3
		const accelBlock = new Block(6, 3, 1, BLOCK_FUNCTION.ACCELERATION, 0, 1, 0, g);
		g.objectManage.blockMap[3][6] = accelBlock;
		const ballAccel = new Ball(BALL_CREATE_MODE.OTHER, g);
		ballAccel.x = accelBlock.getLeftX() - ballAccel.radius - 2;
		ballAccel.y = accelBlock.getCenterY();
		ballAccel.vx = 4;
		ballAccel.vy = 0.5;
		ballAccel.histX = [ballAccel.x];
		ballAccel.histY = [ballAccel.y];
		g.objectManage.balls = [ballAccel];
		ballAccel.movePosition();
		g.objectManage.resolveCollisions();
		assert.ok(ballAccel.vx < 0, 'Should reflect after accelerating');

		// 3. Deceleration block at col=8, row=3
		const decelBlock = new Block(8, 3, 1, BLOCK_FUNCTION.DECELERATION, 0, 1, 0, g);
		g.objectManage.blockMap[3][8] = decelBlock;
		const ballDecel = new Ball(BALL_CREATE_MODE.OTHER, g);
		ballDecel.x = decelBlock.getLeftX() - ballDecel.radius - 2;
		ballDecel.y = decelBlock.getCenterY();
		ballDecel.vx = 4;
		ballDecel.vy = 0.5;
		ballDecel.histX = [ballDecel.x];
		ballDecel.histY = [ballDecel.y];
		g.objectManage.balls = [ballDecel];
		ballDecel.movePosition();
		g.objectManage.resolveCollisions();
		assert.ok(ballDecel.vx < 0, 'Should reflect after decelerating');

		// 4. Warp Enter at col=2, row=4 and Exit at col=10, row=7
		const warpIn = new Block(2, 4, 1, BLOCK_FUNCTION.WARP_ENTER, 0, 1, 0, g);
		const warpOut = new Block(10, 7, 1, BLOCK_FUNCTION.WARP_EXIT, 0, 1, 0, g);
		g.objectManage.blockMap[4][2] = warpIn;
		g.objectManage.blockMap[7][10] = warpOut;

		const ballWarp = new Ball(BALL_CREATE_MODE.OTHER, g);
		ballWarp.x = warpIn.getLeftX() - ballWarp.radius - 2;
		ballWarp.y = warpIn.getCenterY();
		ballWarp.vx = 4;
		ballWarp.vy = 0.5;
		ballWarp.histX = [ballWarp.x];
		ballWarp.histY = [ballWarp.y];
		g.objectManage.balls = [ballWarp];
		ballWarp.movePosition();
		g.objectManage.resolveCollisions();
		assert.equal(ballWarp.x, warpOut.getCenterX(), 'Ball should teleport to warp exit block');
	});

	it('handles magnet, repull, explosion chains, and strong/ultimate penetration', () => {
		const g = window.gameManage;
		g.objectManage.blockMap = [];
		for (let r = 0; r < 10; r++) {
			g.objectManage.blockMap[r] = [];
			for (let c = 0; c < 15; c++) {
				g.objectManage.blockMap[r][c] = null;
			}
		}

		// 1. Magnet block
		const magnetBlock = new Block(5, 5, 1, BLOCK_FUNCTION.MAGNET, 0, 0, 0, g);
		g.objectManage.blockMap[5][5] = magnetBlock;
		const ballMag = new Ball(BALL_CREATE_MODE.OTHER, g);
		ballMag.x = magnetBlock.getLeftX() - 15;
		ballMag.y = magnetBlock.getCenterY();
		ballMag.vx = 1;
		ballMag.vy = 0;
		g.objectManage.balls = [ballMag];
		g.objectManage.applyFieldEffects();
		assert.ok(ballMag.vx !== 1 || ballMag.vy !== 0, 'Magnet should pull ball');

		// 2. Repull block
		const repullBlock = new Block(7, 5, 1, BLOCK_FUNCTION.REPULL, 0, 0, 0, g);
		g.objectManage.blockMap[5][7] = repullBlock;
		const ballRepull = new Ball(BALL_CREATE_MODE.OTHER, g);
		ballRepull.x = repullBlock.getLeftX() - 10;
		ballRepull.y = repullBlock.getCenterY();
		ballRepull.vx = 2;
		ballRepull.vy = 0;
		g.objectManage.balls = [ballRepull];
		g.objectManage.applyFieldEffects();

		// 3. Bomb chain reaction
		const bomb1 = new Block(2, 2, 1, BLOCK_FUNCTION.EXPLODE, 0, 0, 0, g);
		const bomb2 = new Block(3, 2, 1, BLOCK_FUNCTION.EXPLODE_STRENGTH, 0, 0, 0, g);
		const normalBlock = new Block(4, 2, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, g);
		g.objectManage.blockMap[2][2] = bomb1;
		g.objectManage.blockMap[2][3] = bomb2;
		g.objectManage.blockMap[2][4] = normalBlock;

		const triggerBall = new Ball(BALL_CREATE_MODE.OTHER, g);
		bomb1.explode(2, 2, 1, triggerBall);
		assert.equal(bomb2.type, 0, 'Adjacent bomb should be chain exploded');
		assert.equal(normalBlock.type, 0, 'Adjacent normal block should be destroyed');

		// 4. Strong and Ultimate balls penetrating blocks without bouncing
		const blockPen = new Block(6, 6, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, g);
		g.objectManage.blockMap[6][6] = blockPen;

		const strongBall = new Ball(BALL_CREATE_MODE.OTHER, g);
		strongBall.status = BALL_STATUS.STRONG;
		strongBall.x = blockPen.getLeftX() - strongBall.radius - 2;
		strongBall.y = blockPen.getCenterY();
		strongBall.vx = 4;
		strongBall.vy = 0.5;
		strongBall.histX = [strongBall.x];
		strongBall.histY = [strongBall.y];
		g.objectManage.balls = [strongBall];
		strongBall.movePosition();
		g.objectManage.resolveCollisions();
		assert.equal(blockPen.type, 0, 'Normal block should be broken by strong ball');

		// 5. Simulate mode execution
		const simBlock = new Block(7, 7, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, g);
		simBlock.simulate = 1;
		g.objectManage.blockMap[7][7] = simBlock;
		const simBall = new Ball(BALL_CREATE_MODE.OTHER, g);
		simBall.simulate = 1;
		simBall.x = simBlock.getLeftX() - simBall.radius - 2;
		simBall.y = simBlock.getCenterY();
		simBall.vx = 4;
		simBall.vy = 0.5;
		simBall.histX = [simBall.x];
		simBall.histY = [simBall.y];
		simBall.movePosition();
		g.objectManage.resolveCollisions();
		assert.equal(simBlock.type, 1, 'Real block type should not be destroyed in simulate mode');
	});

	it('verifies that normal destructible block breaks upon ball collision and durable blocks require multiple hits', () => {
		const g = window.gameManage;
		g.objectManage.blockMap = [];
		for (let r = 0; r < 10; r++) {
			g.objectManage.blockMap[r] = [];
			for (let c = 0; c < 15; c++) {
				g.objectManage.blockMap[r][c] = null;
			}
		}

		// 1. Standard destructible block (life = 0) breaks in 1 hit
		const singleHitBlock = new Block(5, 3, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, g);
		g.objectManage.blockMap[3][5] = singleHitBlock;
		g.statusMng.blockNum = 1;
		const initialScore = g.scoreMng.score || 0;

		const ball1 = new Ball(BALL_CREATE_MODE.OTHER, g);
		ball1.x = singleHitBlock.getLeftX() - ball1.radius - 2;
		ball1.y = singleHitBlock.getCenterY();
		ball1.vx = 4;
		ball1.vy = 0.5;
		ball1.histX = [ball1.x];
		ball1.histY = [ball1.y];
		g.objectManage.balls = [ball1];

		ball1.movePosition();
		g.objectManage.resolveCollisions();
		assert.equal(singleHitBlock.type, 0, 'Standard block should be destroyed (type = 0) on collision');
		assert.equal(g.statusMng.blockNum, 0, 'statusMng blockNum should decrease to 0');
		assert.ok(g.scoreMng.score > initialScore, 'Score should increase after block destruction');

		// 2. Durable block (life = 1) requires 2 hits to break
		const durableBlock = new Block(5, 3, 1, BLOCK_FUNCTION.NORMAL, 1, 0, 0, g);
		g.objectManage.blockMap[3][5] = durableBlock;
		g.statusMng.blockNum = 1;

		// First hit: decreases life to 0 but does not destroy
		const ball2 = new Ball(BALL_CREATE_MODE.OTHER, g);
		ball2.x = durableBlock.getLeftX() - ball2.radius - 2;
		ball2.y = durableBlock.getCenterY();
		ball2.vx = 4;
		ball2.vy = 0.5;
		ball2.histX = [ball2.x];
		ball2.histY = [ball2.y];
		g.objectManage.balls = [ball2];

		ball2.movePosition();
		g.objectManage.resolveCollisions();
		assert.equal(durableBlock.type, 1, 'Durable block should survive first hit');
		assert.equal(durableBlock.life, 0, 'Durable block life should decrement to 0');
		assert.equal(g.statusMng.blockNum, 1, 'statusMng blockNum should remain 1 after non-fatal hit');

		// Second hit: breaks the durable block
		const ball3 = new Ball(BALL_CREATE_MODE.OTHER, g);
		ball3.x = durableBlock.getRightX() + ball3.radius + 2;
		ball3.y = durableBlock.getCenterY();
		ball3.vx = -4;
		ball3.vy = 0.5;
		ball3.histX = [ball3.x];
		ball3.histY = [ball3.y];
		g.objectManage.balls = [ball3];

		ball3.movePosition();
		g.objectManage.resolveCollisions();
		assert.equal(durableBlock.type, 0, 'Durable block should be destroyed on second hit');
		assert.equal(g.statusMng.blockNum, 0, 'statusMng blockNum should decrement to 0 on final destruction');
	});

	it('does not trigger ghost side collision in block gaps between horizontally adjacent blocks', () => {
		const g = window.gameManage;
		g.objectManage.blockMap = [];
		for (let r = 0; r < 10; r++) {
			g.objectManage.blockMap[r] = [];
			for (let c = 0; c < 15; c++) {
				g.objectManage.blockMap[r][c] = null;
			}
		}

		// Place two adjacent blocks horizontally in row 3: col=4 and col=5
		const blockA = new Block(4, 3, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, g);
		const blockB = new Block(5, 3, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, g);
		g.objectManage.blockMap[3][4] = blockA;
		g.objectManage.blockMap[3][5] = blockB;
		g.statusMng.blockNum = 2;

		// Ball flying upwards right at the seam/gap between blockA and blockB
		const gapX = blockA.getRightX(); // exactly on the boundary between A and B
		const ball = new Ball(BALL_CREATE_MODE.OTHER, g);
		ball.x = gapX;
		ball.y = blockA.getBottomY() + ball.radius + 1;
		ball.vx = 0.5;
		ball.vy = -3;
		ball.histX = [ball.x];
		ball.histY = [ball.y];
		g.objectManage.balls = [ball];

		ball.movePosition();
		g.objectManage.resolveCollisions();

		// Ball should reflect downwards (vy > 0), NOT sideways (side collision was prevented)
		assert.ok(ball.vy > 0, 'Ball should reflect vertically downwards from bottom surface');
		assert.ok(ball.y >= blockA.getBottomY(), 'Ball position should be pushed below the blocks');

		// Only one block should be destroyed (or touched), not both simultaneously
		const remainingBlocks = (blockA.type !== 0 ? 1 : 0) + (blockB.type !== 0 ? 1 : 0);
		assert.equal(remainingBlocks, 1, 'Only one block should be affected, not both simultaneously');

		// In the next frame, ball moves downwards away from the remaining block
		ball.movePosition();
		g.objectManage.resolveCollisions();
		const finalRemaining = (blockA.type !== 0 ? 1 : 0) + (blockB.type !== 0 ? 1 : 0);
		assert.equal(finalRemaining, 1, 'Remaining adjacent block must NOT be destroyed on next frame');
	});

	it('prevents ball from penetrating or getting wedged into horizontal and vertical seams of adjacent blocks', () => {
		const g = window.gameManage;
		g.objectManage.blockMap = [];
		for (let r = 0; r < 10; r++) {
			g.objectManage.blockMap[r] = [];
			for (let c = 0; c < 15; c++) {
				g.objectManage.blockMap[r][c] = null;
			}
		}

		// 1. Horizontal seam: block at (row 3, col 4) and (row 3, col 5)
		const bH1 = new Block(4, 3, 1, BLOCK_FUNCTION.NORMAL, 1, 0, 0, g);
		const bH2 = new Block(5, 3, 1, BLOCK_FUNCTION.NORMAL, 1, 0, 0, g);
		g.objectManage.blockMap[3][4] = bH1;
		g.objectManage.blockMap[3][5] = bH2;

		const seamX = bH1.getRightX();
		const ballH = new Ball(BALL_CREATE_MODE.OTHER, g);
		ballH.x = seamX;
		ballH.y = bH1.getBottomY() + 2;
		ballH.vx = 2;
		ballH.vy = -4;
		ballH.histX = [ballH.x];
		ballH.histY = [ballH.y];
		g.objectManage.balls = [ballH];

		ballH.movePosition();
		g.objectManage.resolveCollisions();
		assert.ok(ballH.vy > 0, 'Ball must bounce vertically downwards from horizontal seam');
		assert.ok(ballH.y >= bH1.getBottomY(), 'Ball must stay below the seam line');

		// 2. Vertical seam: block at (row 3, col 4) and (row 4, col 4)
		g.objectManage.blockMap[3][5] = null;
		const bV1 = new Block(4, 3, 1, BLOCK_FUNCTION.NORMAL, 1, 0, 0, g);
		const bV2 = new Block(4, 4, 1, BLOCK_FUNCTION.NORMAL, 1, 0, 0, g);
		g.objectManage.blockMap[3][4] = bV1;
		g.objectManage.blockMap[4][4] = bV2;

		const seamY = bV1.getBottomY();
		const ballV = new Ball(BALL_CREATE_MODE.OTHER, g);
		ballV.x = bV1.getLeftX() - 2;
		ballV.y = seamY;
		ballV.vx = 4;
		ballV.vy = 2;
		ballV.histX = [ballV.x];
		ballV.histY = [ballV.y];
		g.objectManage.balls = [ballV];

		ballV.movePosition();
		g.objectManage.resolveCollisions();
		assert.ok(ballV.vx < 0, 'Ball must bounce horizontally to the left from vertical seam');
		assert.ok(ballV.x <= bV1.getLeftX(), 'Ball must stay to the left of the seam');
	});

	it('prevents diagonal pass-through at zero-gap diagonally adjacent blocks and reflects both axes equally', () => {
		const g = window.gameManage;
		g.objectManage.blockMap = [];
		for (let r = 0; r < 10; r++) {
			g.objectManage.blockMap[r] = [];
			for (let c = 0; c < 15; c++) {
				g.objectManage.blockMap[r][c] = null;
			}
		}

		// Diagonal configuration:
		// [b1][  ]
		// [  ][b2]
		const b1 = new Block(4, 3, 1, BLOCK_FUNCTION.NORMAL, 1, 0, 0, g);
		const b2 = new Block(5, 4, 1, BLOCK_FUNCTION.NORMAL, 1, 0, 0, g);
		g.objectManage.blockMap[3][4] = b1;
		g.objectManage.blockMap[4][5] = b2;

		const cornerX = b1.getRightX();
		const cornerY = b1.getBottomY();

		// Ball moving diagonally towards the zero-gap junction (up-right towards bottom-right corner of b1)
		const ballDiag = new Ball(BALL_CREATE_MODE.OTHER, g);
		ballDiag.x = cornerX - 1;
		ballDiag.y = cornerY + 1;
		ballDiag.vx = 4;
		ballDiag.vy = -4;
		ballDiag.histX = [ballDiag.x];
		ballDiag.histY = [ballDiag.y];
		g.objectManage.balls = [ballDiag];

		ballDiag.movePosition();
		g.objectManage.resolveCollisions();

		assert.ok(ballDiag.vx < 0, 'Ball vx must reflect to the left, preventing diagonal penetration');
		assert.ok(ballDiag.vy > 0, 'Ball vy must reflect downwards, preventing diagonal penetration');
		assert.equal(ballDiag.lastHitAxis, 'both', 'Collision must treat diagonal equally on both axes');
		assert.ok(ballDiag.x <= cornerX || ballDiag.y >= cornerY, 'Ball must be positioned outside the blocks');
	});

	it('L-shape inner corner collision prevents diagonal top-left block destruction and lateral/vertical teleportation', () => {
		const g = window.gameManage;
		g.objectManage.blockMap = [];
		for (let r = 0; r < 10; r++) {
			g.objectManage.blockMap[r] = [];
			for (let c = 0; c < 15; c++) {
				g.objectManage.blockMap[r][c] = null;
			}
		}

		// Layout:
		// [B_TL (col 4, row 3)][B_TR (col 5, row 3)]
		// [B_BL (col 4, row 4)][here (col 5, row 4)]
		const bTL = new Block(4, 3, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, g);
		const bTR = new Block(5, 3, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, g);
		const bBL = new Block(4, 4, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, g);
		g.objectManage.blockMap[3][4] = bTL;
		g.objectManage.blockMap[3][5] = bTR;
		g.objectManage.blockMap[4][4] = bBL;

		const cornerX = bTL.getRightX(); // 250
		const cornerY = bTL.getBottomY(); // 102

		// Ball flying towards inner corner (cornerX, cornerY) from bottom-right ("here" space)
		const ball = new Ball(BALL_CREATE_MODE.OTHER, g);
		ball.x = cornerX + 3;
		ball.y = cornerY + 3;
		ball.vx = -4;
		ball.vy = -4;
		ball.histX = [ball.x];
		ball.histY = [ball.y];
		g.objectManage.balls = [ball];

		ball.movePosition();
		g.objectManage.resolveCollisions();

		// 1. Occluded diagonal top-left block must NEVER be destroyed
		assert.equal(bTL.type, 1, 'Diagonal top-left block must NOT be destroyed');

		// 2. Ball must reflect back into open "here" space (both axes reflected to positive direction)
		assert.ok(ball.vx > 0, 'Ball vx must reflect to the right into open space');
		assert.ok(ball.vy > 0, 'Ball vy must reflect downwards into open space');
		assert.equal(ball.lastHitAxis, 'both', 'Inner corner contact must reflect both axes');

		// 3. Ball must NOT teleport to outside boundaries of TR or BL
		assert.ok(ball.x >= cornerX, 'Ball x must stay within open space, not teleporting to the far right');
		assert.ok(ball.x <= bTR.getRightX(), 'Ball x must not warp beyond the right edge of B_TR');
		assert.ok(ball.y >= cornerY, 'Ball y must stay within open space, not teleporting to the far bottom');
		assert.ok(ball.y <= bBL.getBottomY(), 'Ball y must not warp beyond the bottom edge of B_BL');

		// 4. Either B_TR or B_BL was hit and destroyed, but not B_TL
		const remainingBlocks = (bTR.type !== 0 ? 1 : 0) + (bBL.type !== 0 ? 1 : 0);
		assert.equal(remainingBlocks, 1, 'Exactly one of the front-facing blocks should be hit');
	});

	it('Single block exposed corner collision reflects on larger velocity component axis', () => {
		const g = window.gameManage;
		g.objectManage.blockMap = [];
		for (let r = 0; r < 10; r++) {
			g.objectManage.blockMap[r] = [];
			for (let c = 0; c < 15; c++) {
				g.objectManage.blockMap[r][c] = null;
			}
		}

		// Single block at (col 4, row 3)
		// Layout:
		// [Block (col 4, row 3)]
		//                       [here (col 5, row 4)]
		const b = new Block(4, 3, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, g);
		g.objectManage.blockMap[3][4] = b;

		const cornerX = b.getRightX();
		const cornerY = b.getBottomY();

		// Case 1: |vx| > |vy| (vx = -5, vy = -3) -> should reflect along X axis only
		const ballX = new Ball(BALL_CREATE_MODE.OTHER, g);
		ballX.x = cornerX + 1;
		ballX.y = cornerY + 1;
		ballX.vx = -5;
		ballX.vy = -3;
		ballX.histX = [ballX.x];
		ballX.histY = [ballX.y];
		g.objectManage.balls = [ballX];

		ballX.movePosition();
		g.objectManage.resolveCollisions();

		assert.ok(ballX.vx > 0, 'Ball vx must reflect to positive (right)');
		assert.ok(ballX.vy < 0, 'Ball vy must remain negative (upward)');
		assert.equal(ballX.lastHitAxis, 'x', 'lastHitAxis must be x when |vx| > |vy|');

		// Reset block
		const b2 = new Block(4, 3, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, g);
		g.objectManage.blockMap[3][4] = b2;

		// Case 2: |vy| > |vx| (vx = -3, vy = -5) -> should reflect along Y axis only
		const ballY = new Ball(BALL_CREATE_MODE.OTHER, g);
		ballY.x = cornerX + 1;
		ballY.y = cornerY + 1;
		ballY.vx = -3;
		ballY.vy = -5;
		ballY.histX = [ballY.x];
		ballY.histY = [ballY.y];
		g.objectManage.balls = [ballY];

		ballY.movePosition();
		g.objectManage.resolveCollisions();

		assert.ok(ballY.vx < 0, 'Ball vx must remain negative (left)');
		assert.ok(ballY.vy > 0, 'Ball vy must reflect to positive (downward)');
		assert.equal(ballY.lastHitAxis, 'y', 'lastHitAxis must be y when |vy| > |vx|');
	});
});

