// test/unit/GameManage.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import GameManage from '../../src/GameManage.js';
import EventBus from '../../src/EventBus.js';

test('GameManage class unit tests', async (t) => {
	setupEnvironment();

	await t.test('initializes GameManage with configuration options and EventBus bindings', () => {
		const gm = new GameManage({
			canvasWidth: 800,
			canvasHeight: 600,
			statusBarHeight: 30,
			FPS: 60,
		});

		assert.equal(gm.canvasWidth, 800);
		assert.equal(gm.canvasHeight, 600);
		assert.equal(gm.statusBarHeight, 30);
		assert.equal(gm.FPS, 60);

		assert.equal(gm.bar, null);
		assert.deepEqual(gm.balls, []);
		assert.deepEqual(gm.items, []);
		assert.deepEqual(gm.weapons, []);
		assert.deepEqual(gm.blockMap, []);
	});

	await t.test('initializes game state, entities, and canvases on init(0)', () => {
		const gm = new GameManage();
		gm.init(0);

		assert.ok(gm.bar !== null);
		assert.ok(gm.ctrl !== null);
		assert.ok(gm.statusMng !== null);
		assert.ok(gm.scoreMng !== null);
		assert.ok(gm.sounds !== null);
		assert.equal(gm.isRunning, true);

		// Stop animation frame loop
		gm.stop();
		assert.equal(gm.isRunning, false);
	});

	await t.test('spawns weapons and launches balls via helper methods', () => {
		const gm = new GameManage();
		gm.init(0);
		gm.stop();

		// Launch ball
		gm.balls = [];
		gm.launchBall();
		assert.equal(gm.balls.length, 1);

		// Spawn weapon
		gm.weapons = [];
		gm.spawnWeapon(1, 200);
		assert.equal(gm.weapons.length, 1);
		assert.equal(gm.weapons[0].type, 0);
		assert.equal(gm.weapons[0].x, 200);

		// Spawn item & balloon & applyBallItem
		gm.spawnItem({ type: 1, x: 10, y: 10 });
		assert.equal(gm.items.length, 1);
		gm.spawnBalloon({ text: '1', x: 0, y: 0, width: 10, height: 10, alpha: 1, backColor: '#0', fontColor: '#1', fontSize: 10 });
		assert.equal(gm.balloons.length, 1);
		gm.applyBallItem(1);

		// Getters and setters
		const prevBar = gm.bar;
		gm.bar = prevBar;
		assert.equal(gm.bar, prevBar);
		gm.blockMap = [[1]];
		assert.deepEqual(gm.blockMap, [[1]]);

		// Delegations
		gm.updateEntities();
		gm.applyFieldEffects();
		gm.resolveCollisions();
	});

	await t.test('exercises game loop step() updating game entities', () => {
		const gm = new GameManage();
		gm.init(0);
		gm.stop();

		// Advance one step
		gm.step(100);
		assert.ok(true, 'step() executed cleanly');
	});

	await t.test('executes simulateReset and changeSetting', () => {
		const gm = new GameManage();
		gm.init(0);
		gm.stop();

		gm.simulateReset();
		assert.ok(true);

		gm.changeSetting('setup_sample.js');
		assert.ok(true);
	});

	await t.test('executes gameOver flow and status rendering', () => {
		const gm = new GameManage();
		gm.init(0);
		gm.stop();

		gm.statusMng.printStatus(gm.dynamicCtx);

		// Trigger game over
		gm.statusMng.life = 0;
		gm.gameOver();
		assert.ok(true);
	});

	await t.test('handles EventBus event triggers: sound:play, score:add, game:over', () => {
		const gm = new GameManage();
		gm.init(0);
		gm.stop();

		// sound:play
		let soundPlayed = null;
		gm.sounds.play = (k) => { soundPlayed = k; };
		EventBus.emitEvent('sound:play', 'touchButton');
		assert.equal(soundPlayed, 'touchButton');

		// score:add
		const initialScore = gm.scoreMng.score;
		EventBus.emitEvent('score:add', 500);
		assert.equal(gm.scoreMng.score, initialScore + 500);

		// game:over
		let gameOverCalled = false;
		gm.gameOver = () => { gameOverCalled = true; };
		EventBus.emitEvent('game:over');
		assert.equal(gameOverCalled, true);

		// award:add
		EventBus.emitEvent('award:add', { key: 'getItemNum', count: 2 });
		assert.equal(gm.scoreMng.awardNum.getItemNum, 2);

		// status:addLife
		const initLife = gm.statusMng.life;
		EventBus.emitEvent('status:addLife', 1);
		assert.equal(gm.statusMng.life, initLife + 1);

		// bar:damage
		EventBus.emitEvent('bar:damage', 2);
		assert.equal(gm.bar.hitPoint, 3);

		// game:simulateReset
		let resetCalled = false;
		gm.simulateReset = () => { resetCalled = true; };
		EventBus.emitEvent('game:simulateReset');
		assert.equal(resetCalled, true);

		// game:init
		let initCalled = false;
		gm.init = () => { initCalled = true; };
		EventBus.emitEvent('game:init', 1);
		assert.equal(initCalled, true);

		// setting:change
		let settingCalled = false;
		gm.changeSetting = () => { settingCalled = true; };
		EventBus.emitEvent('setting:change', 'sample');
		assert.equal(settingCalled, true);

		// screen:open, close, allClose, printRecord
		let screenAction = '';
		gm.screenManage.openScreen = (s) => { screenAction = 'open:' + s; };
		gm.screenManage.closeScreen = (s) => { screenAction = 'close:' + s; };
		gm.screenManage.allClose = () => { screenAction = 'allClose'; };
		gm.screenManage.printRecordScreen = (t, s) => { screenAction = `printRecord:${t},${s}`; };
		EventBus.emitEvent('screen:open', 'start');
		assert.equal(screenAction, 'open:start');
		EventBus.emitEvent('screen:close', 'start');
		assert.equal(screenAction, 'close:start');
		EventBus.emitEvent('screen:allClose');
		assert.equal(screenAction, 'allClose');
		EventBus.emitEvent('screen:printRecord', { type: 1, stage: 2 });
		assert.equal(screenAction, 'printRecord:1,2');

		// input:setMouseDownTime, input:setPointX
		EventBus.emitEvent('input:setMouseDownTime', 12345);
		assert.equal(gm.inputManage.mouseDownTime, 12345);
		EventBus.emitEvent('input:setPointX', 300);
		assert.equal(gm.inputManage.pointX, 300);
	});

	await t.test('cleans up all resources, child entities, listeners, and references on destructor()', () => {
		const gm = new GameManage();
		gm.init(0);

		gm.launchBall();
		gm.spawnWeapon(1, 200);
		gm.items.push({ destructor: () => {} });
		gm.balloons.push({ destructor: () => {} });

		gm.destructor();
		assert.equal(gm.isRunning, false);
		assert.equal(gm.balls.length, 0);
		assert.equal(gm.items.length, 0);
		assert.equal(gm.weapons.length, 0);
		assert.equal(gm.balloons.length, 0);
		assert.equal(gm.bar, null);
		assert.equal(gm.ctrl, null);
		assert.equal(gm.statusMng, null);
		assert.equal(gm.scoreMng, null);
		assert.equal(gm.sounds, null);
	});
});
