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

		assert.equal(gm.objectManage.bar, null);
		assert.deepEqual(gm.objectManage.balls, []);
		assert.deepEqual(gm.objectManage.items, []);
		assert.deepEqual(gm.objectManage.weapons, []);
		assert.deepEqual(gm.objectManage.blockMap, []);
		gm.destructor();
	});

	await t.test('initializes game state, entities, and canvases on init(0)', () => {
		const gm = new GameManage();
		gm.init(0);

		assert.ok(gm.objectManage.bar !== null);
		assert.ok(gm.ctrl !== null);
		assert.ok(gm.statusMng !== null);
		assert.ok(gm.scoreMng !== null);
		assert.ok(gm.sounds !== null);
		assert.equal(gm.isRunning, true);

		// Stop animation frame loop
		gm.stop();
		assert.equal(gm.isRunning, false);
		gm.destructor();
	});

	await t.test('spawns weapons and launches balls via objectManage', () => {
		const gm = new GameManage();
		gm.init(0);
		gm.stop();

		// Launch ball
		gm.objectManage.balls = [];
		gm.objectManage.launchBall();
		assert.equal(gm.objectManage.balls.length, 1);

		// Spawn weapon
		gm.objectManage.weapons = [];
		gm.objectManage.spawnWeapon(1, 200);
		assert.equal(gm.objectManage.weapons.length, 1);
		assert.equal(gm.objectManage.weapons[0].type, 0);
		assert.equal(gm.objectManage.weapons[0].x, 200);

		// Spawn item & balloon & applyBallItem
		gm.objectManage.spawnItem({ type: 1, x: 10, y: 10 });
		assert.equal(gm.objectManage.items.length, 1);
		gm.objectManage.spawnBalloon({ text: '1', x: 0, y: 0, width: 10, height: 10, alpha: 1, backColor: '#0', fontColor: '#1', fontSize: 10 });
		assert.equal(gm.objectManage.balloons.length, 1);
		gm.objectManage.applyBallItem(1);

		// ObjectManage operations
		gm.objectManage.updateEntities();
		gm.objectManage.applyFieldEffects();
		gm.objectManage.resolveCollisions();
		gm.destructor();
	});

	await t.test('exercises game loop step() updating game entities', () => {
		const gm = new GameManage();
		gm.init(0);
		gm.stop();

		// Advance one step
		gm.step(100);
		assert.ok(true, 'step() executed cleanly');
	});

	await t.test('executes simulateReset, distributePreset, and changeSetting via PresetManage', async () => {
		const gm = new GameManage();
		gm.init(0);
		gm.stop();

		gm.simulateReset();
		assert.ok(gm.presetManage, 'PresetManage should be created under GameManage');
		assert.equal(gm.presetManage.currentPresetKey, 'default');

		// Verify distributePreset distributed preset data to child classes
		assert.ok(gm.objectManage.preset);
		assert.ok(gm.ctrl.preset);
		assert.ok(gm.statusMng.preset);
		assert.ok(gm.scoreMng.preset);
		assert.ok(gm.sounds.preset);
		assert.ok(gm.screenManage.preset);
		assert.ok(gm.inputManage.preset);
		assert.ok(gm.autoPlay.preset);

		await gm.changeSetting('default_debug');
		gm.stop();
		assert.equal(gm.presetManage.currentPresetKey, 'default_debug');
		assert.equal(gm.ballSize, 1);
		assert.equal(gm.objectManage.preset.ballSize, 1);
		assert.equal(gm.ctrl.preset.stageTitle.length, 9);

		await gm.changeSetting('default');
		gm.stop();
		assert.equal(gm.presetManage.currentPresetKey, 'default');
		assert.equal(gm.ballSize, 5);
		gm.destructor();
	});

	await t.test('executes gameOver flow and status rendering', () => {
		const gm = new GameManage();
		gm.init(0);
		gm.stop();

		gm.statusMng.printStatus();

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
		assert.equal(gm.objectManage.bar.hitPoint, 3);

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

	await t.test('initAsync and init display loading screen and update progress including JSON loading phases', async () => {
		const gm = new GameManage();
		const progressUpdates = [];

		await gm.initAsync(0, (ratio, text) => {
			progressUpdates.push({ ratio, text });
		});

		assert.ok(progressUpdates.length > 0, 'Progress updates should have been reported');
		const texts = progressUpdates.map(u => u.text);
		assert.ok(texts.includes('Loading JSON data (common.json)...'), 'Should report common.json loading status');
		assert.ok(texts.includes('Loading JSON data (manifest.json)...'), 'Should report manifest.json loading status');
		assert.ok(texts.includes('Loading JSON data (block.json)...'), 'Should report block.json loading status');
		assert.ok(texts.includes('Loading JSON data (item.json)...'), 'Should report item.json loading status');
		assert.ok(texts.includes('Loading JSON data (weapon.json)...'), 'Should report weapon.json loading status');
		assert.ok(texts.includes('Loading JSON data (award.json)...'), 'Should report award.json loading status');
		assert.ok(texts.includes('Loading JSON data (ball.json)...'), 'Should report ball.json loading status');
		assert.ok(texts.includes('Loading JSON data (blockmap.json)...'), 'Should report blockmap.json loading status');
		assert.equal(progressUpdates[progressUpdates.length - 1].ratio, 1.0, 'Final progress should reach 100%');
		assert.ok(gm.ctrl, 'Control should be initialized');
		assert.ok(gm.objectManage, 'ObjectManage should be initialized');
		assert.ok(gm.statusMng, 'StatusManage should be initialized');
		assert.ok(gm.scoreMng, 'ScoreManage should be initialized');

		gm.destructor();
	});

	await t.test('cleans up all resources, child entities, listeners, and references on destructor()', () => {
		const gm = new GameManage();
		gm.init(0);

		gm.objectManage.launchBall();
		gm.objectManage.spawnWeapon(1, 200);
		gm.objectManage.items.push({ destructor: () => {} });
		gm.objectManage.balloons.push({ destructor: () => {} });

		gm.destructor();
		assert.equal(gm.isRunning, false);
		assert.equal(gm.objectManage, null);
		assert.equal(gm.ctrl, null);
		assert.equal(gm.statusMng, null);
		assert.equal(gm.scoreMng, null);
		assert.equal(gm.sounds, null);
	});

	await t.test('applyCanvasScale resizes drawing buffer, CSS styles, transforms contexts, and adjusts DOM', () => {
		const gm = new GameManage({
			canvasWidth: 750,
			canvasHeight: 530,
			statusBarHeight: 22,
		});
		gm.init(0);
		gm.stop();

		let dynamicTransform = null;
		let staticTransform = null;
		gm.dynamicCtx.setTransform = (a, b, c, d, e, f) => {
			dynamicTransform = [a, b, c, d, e, f];
		};
		gm.staticCtx.setTransform = (a, b, c, d, e, f) => {
			staticTransform = [a, b, c, d, e, f];
		};

		// Apply scale factor 2
		gm.applyCanvasScale(2);

		assert.equal(gm.scale, 2);
		assert.equal(gm.bufferScale, 2);
		assert.equal(gm.dynamicCanvas.width, 1500);
		assert.equal(gm.dynamicCanvas.height, 1060);
		assert.equal(gm.dynamicCanvas.style.width, '1500px');
		assert.equal(gm.dynamicCanvas.style.height, '1060px');

		assert.equal(gm.staticCanvas.width, 1500);
		assert.equal(gm.staticCanvas.height, 1060);
		assert.equal(gm.staticCanvas.style.width, '1500px');
		assert.equal(gm.staticCanvas.style.height, '1060px');

		assert.deepEqual(dynamicTransform, [2, 0, 0, 2, 0, 0]);
		assert.deepEqual(staticTransform, [2, 0, 0, 2, 0, 0]);
		assert.equal(gm.dynamicCtx.imageSmoothingEnabled, true);
		assert.equal(gm.staticCtx.imageSmoothingEnabled, true);

		// Verify DOM element adjustments
		const bg = document.getElementById('canvas_background');
		assert.equal(bg.style.width, '1500px');
		assert.equal(bg.style.height, (1060 - 44) + 'px');
		assert.equal(bg.style.borderTopWidth, '44px');

		const playInfo = document.getElementById('play_info');
		assert.equal(playInfo.style.width, '1500px');
		assert.equal(playInfo.style.height, '44px');
		assert.equal(playInfo.style.fontSize, '28px');

		const statusBarBody = document.getElementById('status_bar_body');
		assert.equal(statusBarBody.style.marginLeft, '180px');

		// Reset scale back to 1
		gm.applyCanvasScale(1);
		assert.equal(gm.scale, 1);
		assert.equal(gm.bufferScale, 1);
		assert.equal(gm.dynamicCanvas.width, 750);
		assert.equal(gm.dynamicCanvas.height, 530);
		assert.equal(gm.dynamicCanvas.style.width, '750px');
		assert.equal(gm.dynamicCanvas.style.height, '530px');

		gm.destructor();
	});

	await t.test('installScaledPutImageData delegates to drawImage when scaled and putImageData when 1:1', () => {
		const gm = new GameManage();
		let origCalled = false;
		let drawImageCalled = false;
		let drawArgs = null;

		const mockCtx = {
			_bufferScale: 1,
			putImageData: (img, x, y) => {
				origCalled = true;
			},
			drawImage: (...args) => {
				drawImageCalled = true;
				drawArgs = args;
			},
		};

		gm.installScaledPutImageData(mockCtx);

		const fakeImg = {
			width: 30,
			height: 15,
		};

		// 1:1 scale -> should call original putImageData
		mockCtx.putImageData(fakeImg, 10, 20);
		assert.equal(origCalled, true);
		assert.equal(drawImageCalled, false);

		// Scaled (bufferScale = 2) -> should delegate to drawImage
		mockCtx._bufferScale = 2;
		origCalled = false;
		mockCtx.putImageData(fakeImg, 50, 60);
		assert.equal(drawImageCalled, true);
		assert.equal(origCalled, false);
		assert.equal(drawArgs[1], 50);
		assert.equal(drawArgs[2], 60);
		assert.equal(drawArgs[3], 30);
		assert.equal(drawArgs[4], 15);

		gm.destructor();
	});
});
