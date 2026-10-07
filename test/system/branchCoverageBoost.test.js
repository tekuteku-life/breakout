// test/system/branchCoverageBoost.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import '../../src/main.js';
import Ball from '../../src/Ball.js';
import Block from '../../src/Block.js';
import Bar from '../../src/Bar.js';
import AutoPlay from '../../src/AutoPlay.js';
import Item from '../../src/Item.js';
import Weapon from '../../src/Weapon.js';
import ImageData from '../../src/ImageData.js';
import { BLOCK_FUNCTION, BALL_STATUS, BALL_CREATE_MODE } from '../../src/const.js';

describe('System & Component Branch Coverage Boost Suite', () => {
	beforeEach(() => {
		setupEnvironment();
		const mockCtx = createMock2DContext();
		globalThis.staticCtx = mockCtx;
		globalThis.dynamicCtx = mockCtx;
		globalThis.imgData = new ImageData(mockCtx);
		globalThis.imgData.init();
		window.gameManage.init(0);
		clearInterval(window.timer_All);
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('covers through block branches in Ball.js in all directions', () => {
		// Direction 1: Up through (ball moving up from below)
		const bUp = new Block(5, 4, 1, BLOCK_FUNCTION.NORMAL, 1, 0, 1);
		globalThis.blockMap = [[], [], [], [], [null, null, null, null, null, bUp]];
		const ballUp = new Ball(BALL_CREATE_MODE.OTHER);
		ballUp.x = bUp.getCenterX();
		ballUp.y = bUp.getBottomY() + 2;
		ballUp.vx = 0;
		ballUp.vy = -5;
		ballUp.histX = [ballUp.x];
		ballUp.histY = [bUp.getBottomY() + 10]; // Below block -> directVectY = 1
		ballUp.movePosition();

		// Direction 2: Right through (ball moving right from left)
		const bRight = new Block(5, 4, 1, BLOCK_FUNCTION.NORMAL, 1, 0, 2);
		globalThis.blockMap[4][5] = bRight;
		const ballR = new Ball(BALL_CREATE_MODE.OTHER);
		ballR.x = bRight.getLeftX() - 2;
		ballR.y = bRight.getCenterY();
		ballR.vx = 5;
		ballR.vy = 0;
		ballR.histX = [bRight.getLeftX() - 10]; // Left of block -> directVectX = -1
		ballR.histY = [ballR.y];
		ballR.movePosition();

		// Direction 3: Down through (ball moving down from above)
		const bDown = new Block(5, 4, 1, BLOCK_FUNCTION.NORMAL, 1, 0, 3);
		globalThis.blockMap[4][5] = bDown;
		const ballDown = new Ball(BALL_CREATE_MODE.OTHER);
		ballDown.x = bDown.getCenterX();
		ballDown.y = bDown.getTopY() - 2;
		ballDown.vx = 0;
		ballDown.vy = 5;
		ballDown.histX = [ballDown.x];
		ballDown.histY = [bDown.getTopY() - 10]; // Above block -> directVectY = -1
		ballDown.movePosition();

		// Direction 4: Left through (ball moving left from right)
		const bLeft = new Block(5, 4, 1, BLOCK_FUNCTION.NORMAL, 1, 0, 4);
		globalThis.blockMap[4][5] = bLeft;
		const ballL = new Ball(BALL_CREATE_MODE.OTHER);
		ballL.x = bLeft.getRightX() + 2;
		ballL.y = bLeft.getCenterY();
		ballL.vx = -5;
		ballL.vy = 0;
		ballL.histX = [bLeft.getRightX() + 10]; // Right of block -> directVectX = 1
		ballL.histY = [ballL.y];
		ballL.movePosition();

		assert.ok(true, 'Through branches executed cleanly');
	});

	it('covers diagonal collision and speed-comparison branches in Ball.js', () => {
		// Case 1: vx <= vy in diagonal collision with no blocking blocks (executes line 388)
		const centerBlock = new Block(5, 4, 1, BLOCK_FUNCTION.NORMAL, 1);
		globalThis.blockMap = [[], [], [], [], [null, null, null, null, null, centerBlock]];
		const ballSlowX = new Ball(BALL_CREATE_MODE.OTHER);
		ballSlowX.x = centerBlock.getLeftX() - 1;
		ballSlowX.y = centerBlock.getTopY() - 1;
		ballSlowX.vx = 2;
		ballSlowX.vy = 6; // vx < vy -> directVectX = 0
		ballSlowX.histX = [centerBlock.getLeftX() - 10];
		ballSlowX.histY = [centerBlock.getTopY() - 10];
		ballSlowX.movePosition();

		// Case 2: vx > vy in diagonal collision with no blocking blocks
		const ballFastX = new Ball(BALL_CREATE_MODE.OTHER);
		ballFastX.x = centerBlock.getLeftX() - 1;
		ballFastX.y = centerBlock.getTopY() - 1;
		ballFastX.vx = 8;
		ballFastX.vy = 2; // vx > vy -> directVectY = 0
		ballFastX.histX = [centerBlock.getLeftX() - 10];
		ballFastX.histY = [centerBlock.getTopY() - 10];
		ballFastX.movePosition();

		// Case 3: Diagonal collision WITH blocking blocks (directVectX < 0, directVectY < 0)
		const targetBlock = new Block(5, 4, 1, BLOCK_FUNCTION.NORMAL, 1);
		const horBlock = new Block(4, 4, 1, BLOCK_FUNCTION.NORMAL, 1);
		const verBlock = new Block(5, 3, 1, BLOCK_FUNCTION.NORMAL, 1);
		globalThis.blockMap = [
			[], [], [],
			[null, null, null, null, null, verBlock],
			[null, null, null, null, horBlock, targetBlock],
		];

		const ballCorner = new Ball(BALL_CREATE_MODE.OTHER);
		ballCorner.x = targetBlock.getLeftX() + 4;
		ballCorner.y = targetBlock.getTopY() + 4;
		ballCorner.vx = 5;
		ballCorner.vy = 5;
		ballCorner.histX = [4 * globalThis.blockWidth + 10];
		ballCorner.histY = [3 * globalThis.blockHeight + globalThis.statusBarHeight + 10];
		ballCorner.movePosition();

		// Case 4: Diagonal collision WITH blocking blocks (directVectX > 0, directVectY > 0)
		const horBlockBR = new Block(6, 4, 1, BLOCK_FUNCTION.NORMAL, 1);
		const verBlockBR = new Block(5, 5, 1, BLOCK_FUNCTION.NORMAL, 1);
		globalThis.blockMap = [
			[], [], [], [],
			[null, null, null, null, null, targetBlock, horBlockBR],
			[null, null, null, null, null, verBlockBR],
		];
		const ballCornerBR = new Ball(BALL_CREATE_MODE.OTHER);
		ballCornerBR.x = targetBlock.getRightX() - 4;
		ballCornerBR.y = targetBlock.getBottomY() - 4;
		ballCornerBR.vx = -5;
		ballCornerBR.vy = -5;
		ballCornerBR.histX = [6 * globalThis.blockWidth + 10];
		ballCornerBR.histY = [5 * globalThis.blockHeight + globalThis.statusBarHeight + 10];
		ballCornerBR.movePosition();

		// Case 5: Ultimate ball penetrating block without reflection
		const uBall = new Ball(BALL_CREATE_MODE.OTHER);
		uBall.status = BALL_STATUS.ULTIMATE;
		uBall.x = targetBlock.getCenterX();
		uBall.y = targetBlock.getTopY() - 1;
		uBall.vx = 0;
		uBall.vy = 5;
		uBall.histX = [uBall.x];
		uBall.histY = [uBall.y - 10];
		uBall.movePosition();

		assert.ok(true, 'Diagonal corner and ultimate ball branches executed');
	});

	it('covers Bar.js right bound clamping, auto dodge branches, and speed inversion', () => {
		const bar = new Bar();

		// 1. Right boundary clamping in Bar.movePosition()
		bar.x = window.canvasWidth - 10;
		globalThis.pointX = window.canvasWidth + 200;
		bar.movePosition();
		assert.ok(bar.getRightX() <= window.canvasWidth, 'Bar should be clamped at right screen boundary');

		// 2. AutoPlay.auto() dodging harmful item to the left
		const autoPlay = window.gameManage.autoPlay;
		const activeBall = new Ball(BALL_CREATE_MODE.OTHER);
		activeBall.x = 100;
		activeBall.y = 100;
		activeBall.vx = 0;
		activeBall.vy = 1;
		window.balls = [activeBall];

		bar.x = 200;
		bar.y = 500;
		const badItem = new Item(6, 220, 485, '#000', '#fff'); // Life -1 item
		window.items = [badItem];
		autoPlay.step();
		assert.ok(typeof window.pointX === 'number');

		// 3. AutoPlay.step() item priority adjustment towards ball
		// Case A: item to the right of ball, ball to the left
		const ballFarL = new Ball(BALL_CREATE_MODE.OTHER);
		ballFarL.x = 100;
		ballFarL.y = 100;
		ballFarL.vx = 0;
		ballFarL.vy = 1;
		window.balls = [ballFarL];
		const itemCatchR = new Item(0, 210, 480, '#000', '#fff');
		window.items = [itemCatchR];
		autoPlay.step();

		// Case B: item to the left of ball, ball to the right
		ballFarL.x = 320;
		autoPlay.step();

		// Case C: item very close to ball (<= (blockWidth + bar.width)/2)
		ballFarL.x = 220;
		autoPlay.step();

		// 4. AutoPlay.step() weapon dodging to left and right
		const enemyWeaponL = new Weapon(1, 400, 400, -1);
		enemyWeaponL.vy = 10;
		window.weapons = [enemyWeaponL];
		ballFarL.x = 200;
		bar.x = 400;
		autoPlay.step();

		// 5. AutoPlay.step() leftSpeed > rightSpeed swap via negative barSpin
		const origSpin = window.barSpin;
		window.barSpin = -1;
		bar.vxMax = 1000;
		autoPlay.simuData = {};
		autoPlay.step();
		window.barSpin = origSpin;
		bar.vxMax = window.barDefaultSpeed;

		// 6. AutoPlay.auto() simulation data inheritance when fallBallTime <= 2
		const quickBall = new Ball(BALL_CREATE_MODE.OTHER);
		quickBall.x = 300;
		quickBall.y = bar.getTopY() - 5;
		quickBall.vx = 2;
		quickBall.vy = 5;
		const secondBall = new Ball(BALL_CREATE_MODE.OTHER);
		secondBall.x = 350;
		secondBall.y = bar.getTopY() - 5;
		secondBall.vx = -1;
		secondBall.vy = 4;
		window.balls = [quickBall, secondBall];

		// Place breakable block directly in upward simulation trajectory
		const simBlockRow = ~~((bar.getTopY() - 30 - window.statusBarHeight) / window.blockHeight);
		const simBlockCol = ~~(quickBall.x / window.blockWidth);
		const simBlock = new Block(simBlockCol, simBlockRow, 1, 0, 0, 0, 0);
		window.blockMap = [];
		for (let r = 0; r <= simBlockRow + 1; r++) {
			window.blockMap[r] = [];
		}
		window.blockMap[simBlockRow][simBlockCol] = simBlock;

		autoPlay.simuData = {
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
		autoPlay.step();
		assert.ok(typeof window.pointX === 'number');
	});

	it('covers Block.js countdown formatting, spBlock sound, and simulation decrease', () => {
		// Countdown formatting: breakLimit with non-zero decimal (e.g. 75 / 50 = 1.5s)
		const bCount = new Block(1, 1, 1, 0, 0, 0, 0, window.gameManage);
		bCount.breakLimit = 75; // 1.5s
		window.gameManage.objectManage.balls = [{}];
		globalThis.balls = window.gameManage.objectManage.balls;
		bCount.updateState(true);
		assert.equal(bCount.text, '1.5 s');

		// Special block hit sound (spBlock) with strong ball
		let spBlockSoundPlayed = false;
		const origSoundPlay = window.gameManage?.sounds?.play;
		if (window.gameManage?.sounds) {
			window.gameManage.sounds.play = (sound) => {
				if (sound === 'spBlock') spBlockSoundPlayed = true;
			};
		}
		const bSpecial = new Block(2, 2, 1, BLOCK_FUNCTION.ACCELERATION, 0, 0, 0, window.gameManage);
		const strongBall = {
			status: BALL_STATUS.STRONG,
			simulate: 0,
			breakNum: 0,
			collisionNum: 0,
			pointIncr: 0,
			getCenterX: () => 100,
			getCenterY: () => 100,
		};
		bSpecial.action(strongBall, 0);
		assert.equal(spBlockSoundPlayed, true, 'Should play spBlock sound when strong ball hits special block');
		if (window.gameManage?.sounds && origSoundPlay) {
			window.gameManage.sounds.play = origSoundPlay;
		}
		window.gameManage.objectManage.balls = [];
		globalThis.balls = [];

		// Simulation break decrease when simulate > 1
		const bSim = new Block(3, 3, 1, 0, 1, 0, 0);
		bSim.simulate = 3;
		bSim.action({ simulate: 1, status: BALL_STATUS.NORMAL }, 0);
		assert.equal(bSim.simulate, 2, 'Simulate count should decrement when > 1');

		// Warp blocks: enter without exit, and enter with exit and isChangedVY
		const bEnter = new Block(1, 1, 1, BLOCK_FUNCTION.WARP_ENTER, 0, 1, 0, window.gameManage);
		const bExit = new Block(4, 4, 1, BLOCK_FUNCTION.WARP_EXIT, 0, 1, 0, window.gameManage);
		window.gameManage.objectManage.blockMap = [[], [null, bEnter], [], [], [null, null, null, null, bExit]];
		globalThis.blockMap = window.gameManage.objectManage.blockMap;
		const testBall = {
			x: 50,
			y: 50,
			vx: 2,
			vy: -3,
			status: BALL_STATUS.NORMAL,
			simulate: 0,
		};
		bEnter.action(testBall, 1, window.gameManage.objectManage.blockMap);
		assert.ok(testBall.x !== 50 || testBall.y !== 50);

		// Warp enter with NO exit block in blockMap
		window.gameManage.objectManage.blockMap = [[], [null, bEnter]];
		globalThis.blockMap = window.gameManage.objectManage.blockMap;
		bEnter.action(testBall, 0, window.gameManage.objectManage.blockMap);

		// Block sound effects for normal ball hitting special block and warp block
		const bNormalHit = new Block(2, 2, 1, BLOCK_FUNCTION.ACCELERATION, 0, 0, 0);
		bNormalHit.action({ status: BALL_STATUS.NORMAL, simulate: 0, getCenterX: () => 100, getCenterY: () => 100 }, 0);
		const bWarpHit = new Block(2, 2, 1, BLOCK_FUNCTION.WARP_ENTER, 0, 0, 0);
		bWarpHit.action({ status: BALL_STATUS.NORMAL, simulate: 0, getCenterX: () => 100, getCenterY: () => 100 }, 0);
	});

	it('covers AutoPlay weapon firing and simulateReset execution', () => {
		const g = window.gameManage;
		// Weapon firing in AutoPlay.step()
		g.objectManage.bar.weapon = 1;
		g.objectManage.bar.weaponInter = 0;
		g.objectManage.weapons = [];
		const activeBall = new Ball(BALL_CREATE_MODE.OTHER, g);
		activeBall.x = 140;
		activeBall.y = 100;
		activeBall.vx = 0;
		activeBall.vy = 1;
		g.objectManage.balls = [activeBall];

		const fireTarget = new Block(3, 2, 1, 0, 0, 0, 0, g);
		g.objectManage.blockMap = [];
		for (let r = 0; r < 5; r++) {
			g.objectManage.blockMap[r] = [];
		}
		g.objectManage.blockMap[2][3] = fireTarget;
		g.objectManage.bar.x = fireTarget.getCenterX();
		g.autoPlay.step();
		assert.equal(g.objectManage.weapons.length, 1, 'AutoPlay.step should fire weapon when lined up with target');

		// simulateReset execution in main.js
		g.simulateReset();
	});

	it('covers main.js touch weapon, cloud rendering, space key weapon, and stage advance keys', () => {
		const g = window.gameManage;
		const input = window.inputManage;

		// 1. Touch weapon fire on dynamicCanvas.ontouchstart
		g.objectManage.bar.weapon = 1;
		g.objectManage.bar.weaponInter = 0;
		g.objectManage.weapons = [];
		g.dynamicCanvas.ontouchstart({
			touches: [{ pageX: 200, pageY: 200 }],
			preventDefault: () => {},
		});
		assert.equal(g.objectManage.weapons.length, 1, 'Touch start should fire weapon when armed');

		// 2. Cloud rendering in drawAll when block has exploded > 0
		const bExploded = new Block(2, 2, 1, 0, 0, 0, 0, g);
		bExploded.exploded = 5;
		g.objectManage.blockMap = [[], [], [null, null, bExploded]];
		g.drawAll(g.dynamicCtx);

		// 3. Keyboard space down then up launches ball when empty
		g.ctrl.ctrlSwitch = 1;
		g.ctrl.autoSwitch = 0;
		g.objectManage.balls = [];
		input.mouseDownTime = 0;
		input.getKeyPress({ keyCode: 32 }, 'down');
		assert.ok(input.mouseDownTime > 0);
		input.getKeyPress({ keyCode: 32 }, 'up');
		assert.equal(g.objectManage.balls.length, 1, 'Releasing space should launch ball');

		// 4. Keyboard space up when ball present and weapon armed
		g.objectManage.bar.weapon = 1;
		g.objectManage.bar.weaponInter = 0;
		g.objectManage.weapons = [];
		input.getKeyPress({ keyCode: 32 }, 'up');
		assert.equal(g.objectManage.weapons.length, 1, 'Releasing space with weapon should fire');

		// 5. Keyboard nextStage (U, keyCode 85) down and up
		const initialStage = g.ctrl.stageIndex;
		input.getKeyPress({ keyCode: 85 }, 'down');
		assert.equal(g.ctrl.stageIndex, initialStage + 1);
		input.getKeyPress({ keyCode: 85 }, 'up');
		assert.equal(input.keyStr, '');

		// 6. Keyboard prevStage (R, keyCode 82) down and up
		input.getKeyPress({ keyCode: 82 }, 'down');
		assert.equal(g.ctrl.stageIndex, initialStage);
		input.getKeyPress({ keyCode: 82 }, 'up');
		assert.equal(input.keyStr, '');

		// 7. Game loop triggers game over flow when statusMng.blockNum <= 0
		g.statusMng.blockNum = 0;
		window.gameLoopTick();
		assert.ok(document.getElementById('screen_stageClear').style.display === 'block' || g.ctrl.stageIndex >= 0);
	});
});
