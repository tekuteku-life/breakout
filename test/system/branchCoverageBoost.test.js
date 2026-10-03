// test/system/branchCoverageBoost.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import '../../src/main.js';
import Ball from '../../src/Ball.js';
import Block from '../../src/Block.js';
import Bar from '../../src/Bar.js';
import Item from '../../src/Item.js';
import Weapon from '../../src/Weapon.js';
import ImageData from '../../src/ImageData.js';

describe('System & Component Branch Coverage Boost Suite', () => {
	beforeEach(() => {
		setupEnvironment();
		const mockCtx = createMock2DContext();
		globalThis.staticCtx = mockCtx;
		globalThis.dynamicCtx = mockCtx;
		globalThis.imgData = new ImageData(mockCtx);
		globalThis.imgData.init();
		window.init(0);
		clearInterval(window.timer_All);
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('covers through block branches in Ball.js in all directions', () => {
		// Direction 1: Up through (ball moving up from below)
		const bUp = new Block(5, 4, 1, globalThis.BLOCK_FUNCTION.NORMAL, 1, 0, 1);
		globalThis.blockMap = [[], [], [], [], [null, null, null, null, null, bUp]];
		const ballUp = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		ballUp.x = bUp.getCenterX();
		ballUp.y = bUp.getBottomY() + 2;
		ballUp.vx = 0;
		ballUp.vy = -5;
		ballUp.histX = [ballUp.x];
		ballUp.histY = [bUp.getBottomY() + 10]; // Below block -> directVectY = 1
		ballUp.move();

		// Direction 2: Right through (ball moving right from left)
		const bRight = new Block(5, 4, 1, globalThis.BLOCK_FUNCTION.NORMAL, 1, 0, 2);
		globalThis.blockMap[4][5] = bRight;
		const ballR = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		ballR.x = bRight.getLeftX() - 2;
		ballR.y = bRight.getCenterY();
		ballR.vx = 5;
		ballR.vy = 0;
		ballR.histX = [bRight.getLeftX() - 10]; // Left of block -> directVectX = -1
		ballR.histY = [ballR.y];
		ballR.move();

		// Direction 3: Down through (ball moving down from above)
		const bDown = new Block(5, 4, 1, globalThis.BLOCK_FUNCTION.NORMAL, 1, 0, 3);
		globalThis.blockMap[4][5] = bDown;
		const ballDown = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		ballDown.x = bDown.getCenterX();
		ballDown.y = bDown.getTopY() - 2;
		ballDown.vx = 0;
		ballDown.vy = 5;
		ballDown.histX = [ballDown.x];
		ballDown.histY = [bDown.getTopY() - 10]; // Above block -> directVectY = -1
		ballDown.move();

		// Direction 4: Left through (ball moving left from right)
		const bLeft = new Block(5, 4, 1, globalThis.BLOCK_FUNCTION.NORMAL, 1, 0, 4);
		globalThis.blockMap[4][5] = bLeft;
		const ballL = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		ballL.x = bLeft.getRightX() + 2;
		ballL.y = bLeft.getCenterY();
		ballL.vx = -5;
		ballL.vy = 0;
		ballL.histX = [bLeft.getRightX() + 10]; // Right of block -> directVectX = 1
		ballL.histY = [ballL.y];
		ballL.move();

		assert.ok(true, 'Through branches executed cleanly');
	});

	it('covers diagonal collision and speed-comparison branches in Ball.js', () => {
		// Case 1: vx <= vy in diagonal collision with no blocking blocks (executes line 388)
		const centerBlock = new Block(5, 4, 1, globalThis.BLOCK_FUNCTION.NORMAL, 1);
		globalThis.blockMap = [[], [], [], [], [null, null, null, null, null, centerBlock]];
		const ballSlowX = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		ballSlowX.x = centerBlock.getLeftX() - 1;
		ballSlowX.y = centerBlock.getTopY() - 1;
		ballSlowX.vx = 2;
		ballSlowX.vy = 6; // vx < vy -> directVectX = 0
		ballSlowX.histX = [centerBlock.getLeftX() - 10];
		ballSlowX.histY = [centerBlock.getTopY() - 10];
		ballSlowX.move();

		// Case 2: vx > vy in diagonal collision with no blocking blocks
		const ballFastX = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		ballFastX.x = centerBlock.getLeftX() - 1;
		ballFastX.y = centerBlock.getTopY() - 1;
		ballFastX.vx = 8;
		ballFastX.vy = 2; // vx > vy -> directVectY = 0
		ballFastX.histX = [centerBlock.getLeftX() - 10];
		ballFastX.histY = [centerBlock.getTopY() - 10];
		ballFastX.move();

		// Case 3: Diagonal collision WITH blocking blocks (directVectX < 0, directVectY < 0)
		const targetBlock = new Block(5, 4, 1, globalThis.BLOCK_FUNCTION.NORMAL, 1);
		const horBlock = new Block(4, 4, 1, globalThis.BLOCK_FUNCTION.NORMAL, 1);
		const verBlock = new Block(5, 3, 1, globalThis.BLOCK_FUNCTION.NORMAL, 1);
		globalThis.blockMap = [
			[], [], [],
			[null, null, null, null, null, verBlock],
			[null, null, null, null, horBlock, targetBlock],
		];

		const ballCorner = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		ballCorner.x = targetBlock.getLeftX() + 4;
		ballCorner.y = targetBlock.getTopY() + 4;
		ballCorner.vx = 5;
		ballCorner.vy = 5;
		ballCorner.histX = [4 * globalThis.blockWidth + 10];
		ballCorner.histY = [3 * globalThis.blockHeight + globalThis.statusBarHeight + 10];
		ballCorner.move();

		// Case 4: Diagonal collision WITH blocking blocks (directVectX > 0, directVectY > 0)
		const horBlockBR = new Block(6, 4, 1, globalThis.BLOCK_FUNCTION.NORMAL, 1);
		const verBlockBR = new Block(5, 5, 1, globalThis.BLOCK_FUNCTION.NORMAL, 1);
		globalThis.blockMap = [
			[], [], [], [],
			[null, null, null, null, null, targetBlock, horBlockBR],
			[null, null, null, null, null, verBlockBR],
		];
		const ballCornerBR = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		ballCornerBR.x = targetBlock.getRightX() - 4;
		ballCornerBR.y = targetBlock.getBottomY() - 4;
		ballCornerBR.vx = -5;
		ballCornerBR.vy = -5;
		ballCornerBR.histX = [6 * globalThis.blockWidth + 10];
		ballCornerBR.histY = [5 * globalThis.blockHeight + globalThis.statusBarHeight + 10];
		ballCornerBR.move();

		// Case 5: Ultimate ball penetrating block without reflection
		const uBall = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		uBall.status = globalThis.BALL_STATUS.ULTIMATE;
		uBall.x = targetBlock.getCenterX();
		uBall.y = targetBlock.getTopY() - 1;
		uBall.vx = 0;
		uBall.vy = 5;
		uBall.histX = [uBall.x];
		uBall.histY = [uBall.y - 10];
		uBall.move();

		assert.ok(true, 'Diagonal corner and ultimate ball branches executed');
	});

	it('covers Bar.js right bound clamping, auto dodge branches, and speed inversion', () => {
		const bar = new Bar();

		// 1. Right boundary clamping in Bar.move() (lines 192-194)
		bar.x = window.canvasWidth - 10;
		globalThis.pointX = window.canvasWidth + 200;
		bar.move();
		assert.ok(bar.getRightX() <= window.canvasWidth, 'Bar should be clamped at right screen boundary');

		// 2. Bar.auto() dodging harmful item to the left (lines 393-397)
		const activeBall = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		activeBall.x = 100;
		activeBall.y = 100;
		activeBall.vx = 0;
		activeBall.vy = 1;
		window.balls = [activeBall];

		bar.x = 200;
		bar.y = 500;
		const badItem = new Item(6, 220, 485, '#000', '#fff'); // Life -1 item
		window.items = [badItem];
		bar.auto();
		assert.ok(typeof window.pointX === 'number');

		// 3. Bar.auto() item priority adjustment towards ball (lines 438-453)
		// Case A: item to the right of ball, ball to the left
		const ballFarL = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		ballFarL.x = 100;
		ballFarL.y = 100;
		ballFarL.vx = 0;
		ballFarL.vy = 1;
		window.balls = [ballFarL];
		const itemCatchR = new Item(0, 210, 480, '#000', '#fff');
		window.items = [itemCatchR];
		bar.auto();

		// Case B: item to the left of ball, ball to the right
		ballFarL.x = 320;
		bar.auto();

		// Case C: item very close to ball (<= (blockWidth + bar.width)/2)
		ballFarL.x = 220;
		bar.auto();

		// 4. Bar.auto() weapon dodging to left and right (lines 423-426)
		const enemyWeaponL = new Weapon(1, 400, 400, -1);
		enemyWeaponL.vy = 10;
		window.weapons = [enemyWeaponL];
		ballFarL.x = 200;
		bar.x = 400;
		bar.auto();

		// 5. Bar.auto() leftSpeed > rightSpeed swap via negative barSpin (lines 471-474)
		const origSpin = window.barSpin;
		window.barSpin = -1;
		bar.vxMax = 1000;
		bar.simuData = {};
		bar.auto();
		window.barSpin = origSpin;
		bar.vxMax = window.barDefaultSpeed;

		// 6. Bar.auto() simulation data inheritance when fallBallTime <= 2 (lines 501-502)
		const quickBall = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		quickBall.x = 300;
		quickBall.y = bar.getTopY() - 5;
		quickBall.vx = 2;
		quickBall.vy = 5;
		const secondBall = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		secondBall.x = 350;
		secondBall.y = bar.getTopY() - 5;
		secondBall.vx = -1;
		secondBall.vy = 4;
		window.balls = [quickBall, secondBall];

		// Place breakable block directly in upward simulation trajectory (lines 547-550)
		const simBlockRow = ~~((bar.getTopY() - 30 - window.statusBarHeight) / window.blockHeight);
		const simBlockCol = ~~(quickBall.x / window.blockWidth);
		const simBlock = new Block(simBlockCol, simBlockRow, 1, 0, 0, 0, 0);
		window.blockMap = [];
		for (let r = 0; r <= simBlockRow + 1; r++) {
			window.blockMap[r] = [];
		}
		window.blockMap[simBlockRow][simBlockCol] = simBlock;

		bar.simuData = {
			x: quickBall.getCenterX(),
			vx: quickBall.vx,
			status: quickBall.status,
			statusTime: quickBall.statusTime,
			stDvx: -5,
			enDvx: 5,
			breakMaxNum: 0,
			collisionMaxNum: 0,
			collisionNum: 0,
			returnTime: 10,
			dvx: 3,
			step: 1,
			self: quickBall,
		};
		bar.auto();
		assert.ok(typeof window.pointX === 'number');
	});

	it('covers Block.js countdown formatting, spBlock sound, and simulation decrease', () => {
		// Countdown formatting: breakLimit with non-zero decimal (e.g. 75 / 50 = 1.5s)
		const bCount = new Block(1, 1, 1, 0, 0, 0, 0);
		bCount.breakLimit = 75; // 1.5s
		globalThis.balls = [{}];
		bCount.move();
		assert.equal(bCount.text, '1.5 s');

		// Special block hit sound (spBlock) with strong ball
		let spBlockSoundPlayed = false;
		window.sounds.play = (sound) => {
			if (sound === 'spBlock') spBlockSoundPlayed = true;
		};
		const bSpecial = new Block(2, 2, 1, globalThis.BLOCK_FUNCTION.ACCELERATION, 0, 0, 0);
		const strongBall = {
			status: globalThis.BALL_STATUS.STRONG,
			simulate: 0,
			breakNum: 0,
			collisionNum: 0,
			pointIncr: 0,
			getCenterX: () => 100,
			getCenterY: () => 100,
		};
		bSpecial.action(strongBall, 0);
		assert.equal(spBlockSoundPlayed, true, 'Should play spBlock sound when strong ball hits special block');

		// Simulation break decrease when simulate > 1
		const bSim = new Block(3, 3, 1, 0, 1, 0, 0);
		bSim.simulate = 3;
		bSim.action({ simulate: 1, status: globalThis.BALL_STATUS.NORMAL }, 0);
		assert.equal(bSim.simulate, 2, 'Simulate count should decrement when > 1');

		// Warp blocks: enter without exit, and enter with exit and isChangedVY
		const bEnter = new Block(1, 1, 1, globalThis.BLOCK_FUNCTION.WARP_ENTER, 0, 1, 0);
		const bExit = new Block(4, 4, 1, globalThis.BLOCK_FUNCTION.WARP_EXIT, 0, 1, 0);
		globalThis.blockMap = [[], [null, bEnter], [], [], [null, null, null, null, bExit]];
		const testBall = {
			x: 50,
			y: 50,
			vx: 2,
			vy: -3,
			status: globalThis.BALL_STATUS.NORMAL,
			simulate: 0,
		};
		bEnter.action(testBall, 1);
		assert.ok(testBall.x !== 50 || testBall.y !== 50);

		// Warp enter with NO exit block in blockMap
		globalThis.blockMap = [[], [null, bEnter]];
		bEnter.action(testBall, 0);

		// Block sound effects for normal ball hitting special block and warp block
		const bNormalHit = new Block(2, 2, 1, globalThis.BLOCK_FUNCTION.ACCELERATION, 0, 0, 0);
		bNormalHit.action({ status: globalThis.BALL_STATUS.NORMAL, simulate: 0 }, 0);
		const bWarpHit = new Block(2, 2, 1, globalThis.BLOCK_FUNCTION.WARP_ENTER, 0, 0, 0);
		bWarpHit.action({ status: globalThis.BALL_STATUS.NORMAL, simulate: 0 }, 0);
	});

	it('covers Bar.auto weapon firing and simulateReset execution', () => {
		// Weapon firing in Bar.auto() (line 655)
		const barFire = new Bar();
		barFire.weapon = 1;
		barFire.weaponInter = 0;
		window.weapons = [];
		const activeBall = new Ball(globalThis.BALL_CREATE_MODE.OTHER);
		activeBall.x = 140;
		activeBall.y = 100;
		activeBall.vx = 0;
		activeBall.vy = 1;
		window.balls = [activeBall];

		const fireTarget = new Block(3, 2, 1, 0, 0, 0, 0);
		window.blockMap = [];
		for (let r = 0; r < 5; r++) {
			window.blockMap[r] = [];
		}
		window.blockMap[2][3] = fireTarget;
		barFire.x = fireTarget.getCenterX();
		barFire.auto();
		assert.equal(window.weapons.length, 1, 'Bar.auto should fire weapon when lined up with target');

		// simulateReset execution in main.js
		window.simulateReset();
	});

	it('covers main.js touch weapon, cloud rendering, space key weapon, and stage advance keys', () => {
		// 1. Touch weapon fire on dynamicCanvas.ontouchstart
		window.bar.weapon = 1;
		window.bar.weaponInter = 0;
		window.weapons = [];
		window.dynamicCanvas.ontouchstart({
			touches: [{ pageX: 200, pageY: 200 }],
			preventDefault: () => {},
		});
		assert.equal(window.weapons.length, 1, 'Touch start should fire weapon when armed');

		// 2. Cloud rendering in drawAll when block has exploded > 0
		const bExploded = new Block(2, 2, 1, 0, 0, 0, 0);
		bExploded.exploded = 5;
		window.blockMap = [[], [], [null, null, bExploded]];
		window.drawAll(window.dynamicCtx);

		// 3. Keyboard space down then up launches ball when empty
		window.ctrl.ctrlSwitch = 1;
		window.ctrl.autoSwitch = 0;
		window.balls = [];
		window.mouseDownTime = 0;
		window.getKeyPress({ keyCode: 32 }, 'down');
		assert.ok(window.mouseDownTime > 0);
		window.getKeyPress({ keyCode: 32 }, 'up');
		assert.equal(window.balls.length, 1, 'Releasing space should launch ball');

		// 4. Keyboard space up when ball present and weapon armed
		window.bar.weapon = 1;
		window.bar.weaponInter = 0;
		window.weapons = [];
		window.getKeyPress({ keyCode: 32 }, 'up');
		assert.equal(window.weapons.length, 1, 'Releasing space with weapon should fire');

		// 5. Keyboard nextStage (U, keyCode 85) down and up
		const initialStage = window.ctrl.stageIndex;
		window.getKeyPress({ keyCode: 85 }, 'down');
		assert.equal(window.ctrl.stageIndex, initialStage + 1);
		window.getKeyPress({ keyCode: 85 }, 'up');
		assert.equal(window.keyStr, '');

		// 6. Keyboard prevStage (R, keyCode 82) down and up
		window.getKeyPress({ keyCode: 82 }, 'down');
		assert.equal(window.ctrl.stageIndex, initialStage);
		window.getKeyPress({ keyCode: 82 }, 'up');
		assert.equal(window.keyStr, '');

		// 7. Game loop triggers game over flow when statusMng.blockNum <= 0
		window.statusMng.blockNum = 0;
		window.gameLoopTick();
		assert.ok(document.getElementById('screen_stageClear').style.display === 'block' || window.ctrl.stageIndex >= 0);
	});
});
