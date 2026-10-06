import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import AutoPlay from '../../src/AutoPlay.js';
import Bar from '../../src/Bar.js';
import Ball from '../../src/Ball.js';
import Block from '../../src/Block.js';
import Item from '../../src/Item.js';
import Weapon from '../../src/Weapon.js';
import EventBus from '../../src/EventBus.js';
import GameManage from '../../src/GameManage.js';
import { BALL_CREATE_MODE, BALL_COPY_MODE } from '../../src/const.js';

test('AutoPlay class unit tests', async (t) => {
	setupEnvironment();

	await t.test('constructor initializes properties and getters return bound game properties', () => {
		const mockEventBus = new EventBus();
		const mockBar = { x: 100, y: 500, width: 80, height: 7 };
		const mockBalls = [{ ball: true }];
		const mockItems = [{ item: true }];
		const mockWeapons = [{ weapon: true }];
		const mockBlockMap = [[1]];
		const mockCtrl = { autoSwitch: 1 };
		const mockGame = {
			eventBus: mockEventBus,
			bar: mockBar,
			balls: mockBalls,
			items: mockItems,
			weapons: mockWeapons,
			blockMap: mockBlockMap,
			ctrl: mockCtrl,
			canvasWidth: 800,
			canvasHeight: 600,
		};

		const ap = new AutoPlay(mockGame);
		assert.equal(ap.getGame(), mockGame);
		assert.equal(ap.getEventBus(), mockEventBus);
		assert.equal(ap.getBar(), mockBar);
		assert.equal(ap.getBalls(), mockBalls);
		assert.equal(ap.getItems(), mockItems);
		assert.equal(ap.getWeapons(), mockWeapons);
		assert.equal(ap.getBlockMap(), mockBlockMap);
		assert.equal(ap.getCtrl(), mockCtrl);
		assert.equal(ap.getCanvasWidth(), 800);
		assert.ok(Array.isArray(ap.simuData));

		ap.destructor();
		assert.equal(ap.simuData, null);
		assert.equal(ap.game, null);
	});

	await t.test('auto() launches ball when balls array is empty', () => {
		const bus = new EventBus();
		let launched = false;
		let closed = false;
		bus.addOnEvent('ball:launch', () => { launched = true; });
		bus.addOnEvent('screen:allClose', () => { closed = true; });

		const mockBar = new Bar();
		const mockGame = {
			eventBus: bus,
			bar: mockBar,
			balls: [],
			items: [],
			weapons: [],
			blockMap: [],
			ctrl: { autoSwitch: 1, stageIndex: 0 },
			canvasWidth: 750,
			canvasHeight: 530,
			ballDefaultSpeed: 3.5,
		};

		const ap = new AutoPlay(mockGame);
		ap.auto();

		assert.ok(closed);
		assert.ok(launched);
		assert.ok(mockBar.x > 0);
	});

	await t.test('auto() relaunches absorbed balls when absorptionNum > 0', () => {
		let relaunchedCount = 0;
		const mockBar = new Bar();
		mockBar.absorptionNum = 2;
		mockBar.relaunch = () => { relaunchedCount++; };

		const mockGame = {
			eventBus: new EventBus(),
			bar: mockBar,
			balls: [new Ball(BALL_CREATE_MODE.OTHER)],
			items: [],
			weapons: [],
			blockMap: [],
			ctrl: { autoSwitch: 1, stageIndex: 0 },
			canvasWidth: 750,
			canvasHeight: 530,
		};

		const ap = new AutoPlay(mockGame);
		ap.step();
		assert.equal(relaunchedCount, 2);
	});

	await t.test('auto computes targetX and positions bar towards falling ball', () => {
		const bus = new EventBus();
		const bar = new Bar();
		bar.x = 200;
		bar.y = 500;

		const ball = {
			x: 200,
			y: 300,
			vx: 1,
			vy: 3,
			radius: 5,
			collisionNum: 0,
			breakNum: 0,
			status: 0,
			statusTime: 0,
			getBottomY() { return this.y + this.radius; },
			getCenterX() { return this.x; },
			getTopY() { return this.y - this.radius; },
			move() { this.y += this.vy; },
			copy() {
				const c = Object.create(this);
				c.x = this.x;
				c.y = this.y;
				c.vx = this.vx;
				c.vy = this.vy;
				return c;
			},
		};

		let setPoint = null;
		bar.setPointX = (val) => { setPoint = val; };

		const game = {
			eventBus: bus,
			bar,
			balls: [ball],
			items: [],
			weapons: [],
			blockMap: [],
			ctrl: { autoSwitch: 1, stageIndex: 0 },
			canvasWidth: 750,
			canvasHeight: 530,
		};

		const ap = new AutoPlay(game);
		ap.step();
		assert.ok(setPoint !== null);
	});

	await t.test('auto executes weapon auto-targeting, block mapping, and infinite block avoidance', () => {
		const bus = new EventBus();
		let spawnedWeapon = null;
		bus.addOnEvent('weapon:spawn', (data) => { spawnedWeapon = data; });

		const bar = new Bar();
		bar.weapon = 1; // Gun
		bar.weaponInter = 0;
		bar.x = 250;
		bar.y = 500;

		const infBlock = new Block(3, 2, 1, 0, 0, 1, 0);
		const targetBlock = new Block(5, 2, 1, 0, 1, 0, 0);
		const blockMap = [[], [], [null, null, null, infBlock, null, targetBlock]];

		const game = {
			eventBus: bus,
			bar,
			balls: [new Ball(BALL_CREATE_MODE.OTHER)],
			items: [],
			weapons: [],
			blockMap,
			ctrl: { autoSwitch: 1, stageIndex: 0 },
			canvasWidth: 750,
			canvasHeight: 530,
		};

		const ap = new AutoPlay(game);
		ap.step();
		assert.ok(typeof bar.pointX === 'number');

		// With existing weapon fired
		const firedWeapon = new Weapon(1, infBlock.getCenterX(), 300, 1);
		game.weapons = [firedWeapon];
		ap.step();
	});

	await t.test('auto handles combined ball and item tracking with simulation data', () => {
		const bus = new EventBus();
		const bar = new Bar();
		bar.x = 200;
		bar.y = 500;
		const testItem = new Item(0, 250, bar.y - 30, '#000', '#fff');
		const ball = new Ball(BALL_CREATE_MODE.OTHER);
		ball.x = 200;
		ball.y = 400;
		ball.vx = 1;
		ball.vy = 2;

		const game = {
			eventBus: bus,
			bar,
			balls: [ball],
			items: [testItem],
			weapons: [],
			blockMap: [],
			ctrl: { autoSwitch: 1, stageIndex: 0 },
			canvasWidth: 750,
			canvasHeight: 530,
		};

		const ap = new AutoPlay(game);
		ap.simuData = {
			x: 200,
			vx: 1,
			status: 0,
			statusTime: 0,
			stDvx: 0,
			enDvx: 5,
			breakMaxNum: 0,
			collisionMaxNum: 0,
			collisionNum: 0,
			returnTime: 10,
			dvx: 2,
			step: 1,
			self: ball,
		};

		ap.step();
		assert.ok(typeof bar.pointX === 'number');
	});

	await t.test('step() returns early if bar is not present', () => {
		const ap = new AutoPlay({});
		assert.doesNotThrow(() => ap.step());
	});

	await t.test('auto optimizes route: simulates block collisions and computes dvx trajectory', () => {
		const gm = new GameManage({
			FPS: 60,
			ballDefaultSpeed: 4,
			barDefaultSpeed: 8,
			blockWidth: 30,
			blockHeight: 15,
		});
		gm.init(0);
		gm.ctrl.autoSwitch = 1;

		// Setup blocks in row 5
		const blocks = [];
		for (let j = 0; j < 15; j++) {
			blocks.push(new Block(j, 5, 1, 0, 1, 0, 0, gm));
		}
		gm.blockMap = [[], [], [], [], [], blocks];
		gm.statusMng.countBlockNum();

		const ball = new Ball(BALL_CREATE_MODE.OTHER, gm);
		ball.x = 200;
		ball.y = 480;
		ball.vx = 2;
		ball.vy = 4;
		gm.balls = [ball];

		gm.bar.x = 180;
		gm.bar.y = 500;
		gm.bar.pointX = 180;

		gm.autoPlay.step();

		const sim = gm.autoPlay.simuData;
		assert.ok(sim, 'simuData should be populated');
		assert.ok(sim.breakMaxNum > 0 || sim.collisionMaxNum > 0, 'Should detect block collision/destruction in simulation');
		assert.ok(typeof sim.dvx === 'number', 'sim.dvx should be computed');
		assert.ok(typeof gm.bar.pointX === 'number', 'bar.pointX should be updated');
	});

	await t.test('auto optimizes route with multiple balls and handles leftSpeed swap', () => {
		const gm = new GameManage({
			FPS: 60,
			ballDefaultSpeed: 4,
			barDefaultSpeed: 8,
			blockWidth: 30,
			blockHeight: 15,
		});
		gm.init(0);
		gm.ctrl.autoSwitch = 1;

		const blocks = [];
		for (let j = 0; j < 15; j++) {
			blocks.push(new Block(j, 5, 1, 0, 1, 0, 0, gm));
		}
		gm.blockMap = [[], [], [], [], [], blocks];
		gm.statusMng.countBlockNum();

		// Ball 1: near bar, falling, located on right side of screen
		const ball1 = new Ball(BALL_CREATE_MODE.OTHER, gm);
		ball1.x = 650;
		ball1.y = 485;
		ball1.vx = -1;
		ball1.vy = 4;

		// Ball 2: far away, ascending
		const ball2 = new Ball(BALL_CREATE_MODE.OTHER, gm);
		ball2.x = 100;
		ball2.y = 200;
		ball2.vx = 2;
		ball2.vy = -3;

		gm.balls = [ball1, ball2];
		gm.bar.x = 640;
		gm.bar.y = 500;
		gm.bar.pointX = 640;

		gm.autoPlay.step();

		const sim = gm.autoPlay.simuData;
		assert.ok(sim, 'simuData should be created');
		assert.ok(typeof sim.dvx === 'number');
		assert.ok(typeof gm.bar.pointX === 'number');
	});

	await t.test('auto does not throw TypeError when stDvx exceeds enDvx and no-collision search triggers', () => {
		const bus = new EventBus();
		const bar = new Bar();
		bar.x = 200;
		bar.y = 500;
		const ball = new Ball(BALL_CREATE_MODE.OTHER);
		ball.x = 200;
		ball.y = 495; // very close to bar, fallBallTime <= 2
		ball.vx = 0;
		ball.vy = 4;

		const game = {
			eventBus: bus,
			bar,
			balls: [ball],
			items: [],
			weapons: [],
			blockMap: [],
			ctrl: { autoSwitch: 1, stageIndex: 0 },
			canvasWidth: 750,
			canvasHeight: 530,
			ballDefaultSpeed: 4,
			barDefaultSpeed: 8,
			ballMaxSpeed: 10,
		};

		const ap = new AutoPlay(game);

		// Simulate state where stDvx > enDvx (search already completed), and no blocks were broken
		ap.simuData = {
			x: 200,
			vx: 0,
			status: 0,
			statusTime: 0,
			stDvx: 10, // > enDvx
			enDvx: 5,
			breakMaxNum: 0,
			collisionMaxNum: 0,
			returnTime: 10,
			dvx: 0,
			step: 1,
			self: ball.copy(BALL_COPY_MODE.SIMULATE),
		};

		// Mock Math.random to guarantee the no-collision search branch executes (Math.random() > 0.3)
		const originalRandom = Math.random;
		Math.random = () => 0.5;

		try {
			assert.doesNotThrow(() => {
				ap.step();
			});
		} finally {
			Math.random = originalRandom;
		}
	});
});
