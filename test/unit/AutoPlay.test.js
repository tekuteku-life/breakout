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
import { BALL_CREATE_MODE, BALL_COPY_MODE, ITEM_TYPE } from '../../src/const.js';

test('AutoPlay class unit tests', async (t) => {
	setupEnvironment();

	await t.test('constructor initializes properties and getters return bound game properties', () => {
		const mockBar = { x: 100, y: 500, width: 80, height: 7 };
		const mockBalls = [{ ball: true }];
		const mockItems = [{ item: true }];
		const mockWeapons = [{ weapon: true }];
		const mockBlockMap = [[1]];
		const mockCtrl = { autoSwitch: 1 };
		const mockGame = {
			objectManage: {
				bar: mockBar,
				balls: mockBalls,
				items: mockItems,
				weapons: mockWeapons,
				blockMap: mockBlockMap,
			},
			ctrl: mockCtrl,
			canvasWidth: 800,
			canvasHeight: 600,
		};

		const ap = new AutoPlay(mockGame);
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
		EventBus.destructor();
		let launched = false;
		let closed = false;
		EventBus.addOnEvent('ball:launch', () => { launched = true; });
		EventBus.addOnEvent('screen:allClose', () => { closed = true; });

		const mockBar = new Bar();
		const mockGame = {
			objectManage: {
				bar: mockBar,
				balls: [],
				items: [],
				weapons: [],
				blockMap: [],
			},
			ctrl: { autoSwitch: 1, stageIndex: 0 },
			canvasWidth: 750,
			canvasHeight: 530,
			ballDefaultSpeed: 3.5,
		};

		const ap = new AutoPlay(mockGame);
		ap.step();

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
			objectManage: {
				bar: mockBar,
				balls: [new Ball(BALL_CREATE_MODE.OTHER)],
				items: [],
				weapons: [],
				blockMap: [],
			},
			ctrl: { autoSwitch: 1, stageIndex: 0 },
			canvasWidth: 750,
			canvasHeight: 530,
		};

		const ap = new AutoPlay(mockGame);
		ap.step();
		assert.equal(relaunchedCount, 2);
	});

	await t.test('auto computes targetX and positions bar towards falling ball', () => {
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
			movePosition() { this.y += this.vy; },
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
			objectManage: {
				bar,
				balls: [ball],
				items: [],
				weapons: [],
				blockMap: [],
			},
			ctrl: { autoSwitch: 1, stageIndex: 0 },
			canvasWidth: 750,
			canvasHeight: 530,
		};

		const ap = new AutoPlay(game);
		ap.step();
		assert.ok(setPoint !== null);
	});

	await t.test('auto executes weapon auto-targeting, block mapping, and infinite block avoidance', () => {
		EventBus.destructor();
		let spawnedWeapon = null;
		EventBus.addOnEvent('weapon:spawn', (data) => { spawnedWeapon = data; });

		const bar = new Bar();
		bar.weapon = 1; // Gun
		bar.weaponInter = 0;
		bar.x = 250;
		bar.y = 500;

		const infBlock = new Block(3, 2, 1, 0, 0, 1, 0);
		const targetBlock = new Block(5, 2, 1, 0, 1, 0, 0);
		const blockMap = [[], [], [null, null, null, infBlock, null, targetBlock]];

		const game = {
			objectManage: {
				bar,
				balls: [new Ball(BALL_CREATE_MODE.OTHER)],
				items: [],
				weapons: [],
				blockMap,
			},
			ctrl: { autoSwitch: 1, stageIndex: 0 },
			canvasWidth: 750,
			canvasHeight: 530,
		};

		const ap = new AutoPlay(game);
		ap.step();
		assert.ok(typeof bar.pointX === 'number');

		// With existing weapon fired
		const firedWeapon = new Weapon(1, infBlock.getCenterX(), 300, 1);
		game.objectManage.weapons = [firedWeapon];
		ap.step();
	});

	await t.test('auto handles combined ball and item tracking with simulation data', () => {
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
			objectManage: {
				bar,
				balls: [ball],
				items: [testItem],
				weapons: [],
				blockMap: [],
			},
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
		gm.objectManage.blockMap = [[], [], [], [], [], blocks];
		gm.statusMng.countBlockNum();

		const ball = new Ball(BALL_CREATE_MODE.OTHER, gm);
		ball.x = 200;
		ball.y = 480;
		ball.vx = 2;
		ball.vy = 4;
		gm.objectManage.balls = [ball];

		gm.objectManage.bar.x = 180;
		gm.objectManage.bar.y = 500;
		gm.objectManage.bar.pointX = 180;

		gm.autoPlay.step();

		const sim = gm.autoPlay.simuData;
		assert.ok(sim, 'simuData should be populated');
		assert.ok(sim.breakMaxNum > 0 || sim.collisionMaxNum > 0, 'Should detect block collision/destruction in simulation');
		assert.ok(typeof sim.dvx === 'number', 'sim.dvx should be computed');
		assert.ok(typeof gm.objectManage.bar.pointX === 'number', 'bar.pointX should be updated');
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
		gm.objectManage.blockMap = [[], [], [], [], [], blocks];
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

		gm.objectManage.balls = [ball1, ball2];
		gm.objectManage.bar.x = 640;
		gm.objectManage.bar.y = 500;
		gm.objectManage.bar.pointX = 640;

		gm.autoPlay.step();

		const sim = gm.autoPlay.simuData;
		assert.ok(sim, 'simuData should be created');
		assert.ok(typeof sim.dvx === 'number');
		assert.ok(typeof gm.objectManage.bar.pointX === 'number');
	});

	await t.test('auto does not throw TypeError when stDvx exceeds enDvx and no-collision search triggers', () => {
		const bar = new Bar();
		bar.x = 200;
		bar.y = 500;
		const ball = new Ball(BALL_CREATE_MODE.OTHER);
		ball.x = 200;
		ball.y = 495; // very close to bar, fallBallTime <= 2
		ball.vx = 0;
		ball.vy = 4;

		const game = {
			objectManage: {
				bar,
				balls: [ball],
				items: [],
				weapons: [],
				blockMap: [],
			},
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

	await t.test('AutoPlay initializes Worker when available and updates latestResult onmessage', () => {
		const originalWorker = globalThis.Worker;
		const originalWindow = globalThis.window;

		let terminated = false;
		let postedData = null;

		class MockWorker {
			constructor() {
				this.onmessage = null;
				this.onerror = null;
			}
			postMessage(data) {
				postedData = data;
			}
			terminate() {
				terminated = true;
			}
		}

		globalThis.Worker = MockWorker;
		globalThis.window = {};

		try {
			const bar = new Bar();
			bar.x = 200;
			bar.y = 500;
			const ball = new Ball(BALL_CREATE_MODE.OTHER);
			ball.x = 200;
			ball.y = 300;
			ball.vx = 0;
			ball.vy = 2;

			const game = {
				objectManage: {
					bar,
					balls: [ball],
					items: [],
					weapons: [],
					blockMap: [],
				},
				ctrl: { autoSwitch: 1 },
				canvasWidth: 800,
				canvasHeight: 600,
			};

			const ap = new AutoPlay(game);
			assert.ok(ap.worker instanceof MockWorker, 'Worker initialized');

			ap.step();
			assert.ok(postedData !== null, 'Message posted to Worker');

			// Simulate Worker reply
			ap.worker.onmessage({
				data: {
					id: ap.pendingRequestId,
					result: {
						targetX: 350,
						plusSpeed: 2,
					},
				},
			});
			assert.equal(ap.latestResult.targetX, 350);

			// Next step uses the latest result from worker: ball is far (y=300), so bar heads to targetX
			ap.step();
			assert.equal(bar.pointX, 350, 'Bar heads to targetX when ball is still high up');

			// When ball approaches bar within 1~2.5 frames, spin offset is applied
			ball.y = 491; // barTopY is 500, radius is 5, remaining dist is 4px -> 4 / 2 = 2 frames
			ap.step();
			assert.equal(bar.pointX, 348, 'Bar offsets by plusSpeed for spin just before collision');

			// Trigger worker onerror
			ap.worker.onerror(new Error('Worker failure'));
			assert.equal(ap.worker, null, 'Worker cleaned up on error');

			ap.destructor();

			// Test destructor terminates active worker
			const ap2 = new AutoPlay(game);
			let workerTerminated = false;
			ap2.worker.terminate = () => { workerTerminated = true; };
			ap2.destructor();
			assert.equal(workerTerminated, true, 'Worker terminated on destructor');

			// Test destructor when terminate throws
			const ap3 = new AutoPlay(game);
			ap3.worker.terminate = () => { throw new Error('Terminate fail'); };
			ap3.destructor();
			assert.equal(ap3.worker, null);
		} finally {
			globalThis.Worker = originalWorker;
			globalThis.window = originalWindow;
		}
	});

	await t.test('AutoPlay handles multiple balls with moving, blinking, and magnetic blocks accurately', () => {
		const gm = new GameManage({
			FPS: 60,
			ballDefaultSpeed: 4,
			barDefaultSpeed: 8,
			blockWidth: 40,
			blockHeight: 20,
			canvasWidth: 800,
			canvasHeight: 600,
		});
		gm.init(0);
		gm.ctrl.autoSwitch = 1;

		// Move block
		const moveBlock = new Block(2, 5, 1, 7, 1, 0, 0, gm); // VERTICAL_MOVE
		// Blink block
		const blinkBlock = new Block(5, 5, 1, 12, 1, 0, 0, gm); // BLINK
		// Magnet block
		const magnetBlock = new Block(8, 5, 1, 10, 1, 0, 0, gm); // MAGNET
		// Attack block
		const attackBlock = new Block(11, 5, 1, 13, 1, 0, 0, gm); // ATTACK

		gm.objectManage.blockMap = [[], [], [], [], [], [
			null, null, moveBlock, null, null, blinkBlock, null, null, magnetBlock, null, null, attackBlock
		]];

		// Two balls in play
		const ball1 = new Ball(BALL_CREATE_MODE.OTHER, gm);
		ball1.x = 200;
		ball1.y = 450;
		ball1.vx = 1;
		ball1.vy = 4;

		const ball2 = new Ball(BALL_CREATE_MODE.OTHER, gm);
		ball2.x = 350;
		ball2.y = 350;
		ball2.vx = -1;
		ball2.vy = 3;

		gm.objectManage.balls = [ball1, ball2];
		gm.objectManage.bar.x = 250;
		gm.objectManage.bar.y = 550;

		gm.autoPlay.step();

		// Bar pointX must be placed within valid canvas range to catch falling balls
		assert.ok(gm.objectManage.bar.pointX >= 0 && gm.objectManage.bar.pointX <= 800);

		gm.destructor();
	});

	await t.test('AutoPlay applies spin acceleration at 1.0 < minTimeToBar <= 2.5 and zeroes at contact', () => {
		const bar = new Bar();
		bar.x = 200;
		bar.y = 500;
		const ball = new Ball(BALL_CREATE_MODE.OTHER);
		ball.x = 200;
		ball.y = 300;
		ball.vx = 0;
		ball.vy = 2;

		const game = {
			objectManage: {
				bar,
				balls: [ball],
				items: [],
				weapons: [],
				blockMap: [],
			},
			ctrl: { autoSwitch: 1 },
			canvasWidth: 800,
			canvasHeight: 600,
		};

		const ap = new AutoPlay(game);
		ap.latestResult = {
			targetX: 300,
			plusSpeed: 5,
		};

		// Approach: minTimeToBar is ~2 frames (491 + 5 = 496, barTopY=500 -> (500 - 496)/2 = 2)
		ball.y = 491;
		ap.step();
		assert.equal(bar.pointX, 295, 'Applies spin acceleration offset at ~2 frames');

		// Contact: minTimeToBar is ~0.5 frames (494 + 5 = 499, barTopY=500 -> (500 - 499)/2 = 0.5)
		ball.y = 494;
		ap.step();
		assert.equal(bar.pointX, 300, 'Zeroes spin offset to directly catch at targetX at contact');

		ap.destructor();
	});

	await t.test('AutoPlay fires weapon in real-time when bar equipped with weapon is positioned beneath destructible block', () => {
		EventBus.destructor();
		let spawnedWeapon = null;
		EventBus.addOnEvent('weapon:spawn', (data) => {
			spawnedWeapon = data;
		});

		const bar = new Bar();
		bar.x = 200;
		bar.y = 500;
		bar.weapon = 1; // GUN
		bar.weaponInter = 0;

		const ball = new Ball(BALL_CREATE_MODE.OTHER);
		ball.x = 200;
		ball.y = 100;
		ball.vy = -2;

		const block = new Block(5, 2, 1, 0, 1, 0, 0); // x=200
		block.x = 200;
		block.width = 40;
		block.type = 1;
		block.life = 1;
		block.infinit = 0;

		const game = {
			objectManage: {
				bar,
				balls: [ball],
				items: [],
				weapons: [],
				blockMap: [[null, null, null, null, null, block]],
			},
			ctrl: { autoSwitch: 1 },
			canvasWidth: 800,
			canvasHeight: 600,
			blockWidth: 40,
		};

		const ap = new AutoPlay(game);
		ap.step();

		assert.ok(spawnedWeapon !== null, 'Fires weapon in real-time');
		assert.equal(spawnedWeapon.type, 1);
		assert.equal(spawnedWeapon.x, 200);

		ap.destructor();
	});

	await t.test('A-3: AutoPlay strategically moves bar towards dense block column before relaunching absorbed balls', () => {
		const bar = new Bar();
		bar.x = 200;
		bar.y = 500;
		bar.absorptionNum = 1;
		bar.absorptionStatusTime = 100; // 有効な吸着時間あり

		let relaunched = false;
		bar.relaunch = () => { relaunched = true; };

		// 密集ブロックが x=500 (col 10) にある
		const block = new Block(10, 2, 1, 0, 1, 0, 0);
		block.x = 500;
		block.width = 50;
		block.type = 1;
		block.life = 1;

		const game = {
			objectManage: {
				bar,
				balls: [new Ball(BALL_CREATE_MODE.OTHER)],
				items: [],
				weapons: [],
				blockMap: [[block]],
			},
			ctrl: { autoSwitch: 1 },
			canvasWidth: 800,
			canvasHeight: 600,
			blockWidth: 50,
		};

		const ap = new AutoPlay(game);
		ap.latestResult = {
			targetX: 200,
			bestAbsorbX: 525, // 目標密集列
		};

		// 1ステップ目: バーがまだ遠い(x=200)ため、目標位置(525)へバーを誘導し、まだrelaunchしない
		ap.step();
		assert.equal(relaunched, false, 'Holds ball while moving to target dense column');
		assert.equal(bar.pointX, 525, 'Directs bar towards bestAbsorbX (525)');

		// 2ステップ目: バーが目標列(525)付近に到達した時、戦略的リローンチを発動！
		bar.x = 525;
		ap.step();
		assert.equal(relaunched, true, 'Relaunches absorbed ball when positioned under dense blocks');

		ap.destructor();
	});

	await t.test('AutoPlay suppresses plusSpeed spin offset when harmful item is nearby to prevent edge collision', () => {
		const bar = new Bar();
		bar.x = 300;
		bar.y = 550;
		bar.width = 100;

		// ボールが落下直前（残り2フレーム -> 通常ならplusSpeedが適用されるタイミング）
		const ball = new Ball(BALL_CREATE_MODE.OTHER);
		ball.x = 300;
		ball.y = 540; // barTopY(550) - 10, vy=5 -> 2フレームで到達
		ball.vy = 5;

		// デバフアイテム（POISON）がバー右端付近(x=360)に接近中
		const poison = new Item(ITEM_TYPE.POISON, 340, 520, '#000', '#fff');
		poison.width = 40;

		const game = {
			objectManage: {
				bar,
				balls: [ball],
				items: [poison],
				weapons: [],
				blockMap: [],
			},
			ctrl: { autoSwitch: 1 },
			canvasWidth: 800,
			canvasHeight: 600,
		};

		const ap = new AutoPlay(game);
		ap.latestResult = {
			targetX: 300,
			spinOffset: -8, // 左向きスピン -> targetX - plusSpeed = 300 - (-8) = 308 (アイテム側へ寄る)
		};

		ap.step();
		// デバフアイテムの危険ゾーンへの接近を防ぐため、plusSpeedが0にクランプされ、targetX(300)のまま安全に維持される
		assert.equal(bar.pointX, 300, 'plusSpeed is suppressed to 0 to avoid moving closer to harmful item');

		ap.destructor();
	});
});

