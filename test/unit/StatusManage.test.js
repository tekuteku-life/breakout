import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import StatusManage from '../../src/StatusManage.js';
import ImageData from '../../src/ImageData.js';
import EventBus from '../../src/EventBus.js';

test('StatusManage class unit tests', async (t) => {
	setupEnvironment();
	const mockCtx = createMock2DContext();
	globalThis.staticCtx = mockCtx;
	globalThis.imgData = new ImageData(mockCtx);
	globalThis.imgData.init();

	const createMockGame = (overrides = {}) => {
		const ctrlObj = overrides.ctrl || { pauseSwitch: 0, autoSwitch: 0 };
		EventBus.destructor();
		EventBus.addOnEvent('control:togglePause', () => {
			ctrlObj.pauseSwitch = ctrlObj.pauseSwitch === 0 ? 1 : 0;
		});
		const om = overrides.objectManage || {
			balls: overrides.balls !== undefined ? overrides.balls : [],
			blockMap: overrides.blockMap !== undefined ? overrides.blockMap : [],
		};
		return {
			FPS: 60,
			maxLife: 5,
			scoreMng: { score: 0 },
			staticCtx: mockCtx,
			imgData: globalThis.imgData,
			objectManage: om,
			...overrides,
			ctrl: ctrlObj,
		};
	};

	await t.test('constructor initializes properties', () => {
		const sm = new StatusManage(createMockGame());
		assert.equal(sm.realFPS, 60);
		assert.equal(sm.life, 0);
		assert.equal(sm.hearts.length, 0);
	});

	await t.test('init creates maxLife hearts with imgData', () => {
		const sm = new StatusManage(createMockGame());
		sm.life = 2;
		sm.init();
		assert.equal(sm.hearts.length, 5);
		assert.ok(sm.hearts[0].imgData != null, 'Heart imgData should be initialized via game.imgData');
	});

	await t.test('countFPS calculates realFPS and triggers low FPS alert if ratio is exceeded', () => {
		const game = createMockGame({
			balls: [{}],
			ctrl: { pauseSwitch: 0, autoSwitch: 0 },
		});
		const sm = new StatusManage(game);
		sm.prevFPSTime = Date.now() - 2000;
		sm.FPSCount = 10;

		// Trigger measurement with low FPS
		sm.countFPS();
		assert.ok(sm.realFPS < 60);
		assert.equal(sm.lowFPSCount, 1);

		// Increment low FPS to trigger message box (> 5)
		sm.lowFPSCount = 5;
		sm.prevFPSTime = Date.now() - 2000;
		sm.FPSCount = 10;
		sm.countFPS();
		assert.equal(sm.lowFPSCount, 6);
		assert.equal(game.ctrl.pauseSwitch, 1);

		// Reset low FPS count when FPS is normal
		sm.prevFPSTime = Date.now() - 1000;
		sm.FPSCount = 1000;
		game.ctrl.pauseSwitch = 0;
		sm.countFPS();
		assert.equal(sm.lowFPSCount, 0);
	});

	await t.test('getRealFPS formats integer and decimal values', () => {
		const sm = new StatusManage(createMockGame());
		sm.realFPS = 50;
		assert.equal(sm.getRealFPS(), '50.0');

		sm.realFPS = 49.3;
		assert.equal(sm.getRealFPS(), '49.3');
	});

	await t.test('countPlayTime tracks time when balls are in play and pauses properly', () => {
		const game = createMockGame({ balls: [] });
		const sm = new StatusManage(game);
		sm.countPlayTime();

		game.objectManage.balls = [{}];
		sm.startTime = 0;
		sm.playTime = 0;
		sm.countPlayTime();
		assert.ok(sm.startTime > 0);

		// Format time
		sm.startTime = Date.now() - 65500; // 1 min 5.5 sec
		const sec = sm.getPlaySecTime();
		const min = sm.getPlayMinTime();
		assert.ok(sec.length >= 4);
		assert.equal(min, '1');

		// Check zero padding and .0 formatting
		sm.startTime = Date.now() - 5000;
		const paddedSec = sm.getPlaySecTime();
		assert.ok(paddedSec.startsWith('0'));
	});

	await t.test('getDisplayPoint smoothly interpolates towards scoreMng.score', () => {
		const game = createMockGame({
			scoreMng: { score: 100 }
		});
		const sm = new StatusManage(game);
		sm.displayPoint = 0;

		const pt1 = sm.getDisplayPoint();
		assert.ok(pt1 > 0 && pt1 < 100);

		sm.displayPoint = 99;
		const pt2 = sm.getDisplayPoint();
		assert.equal(pt2, 100);
	});

	await t.test('countBlockNum counts destroyable blocks in blockMap', () => {
		const game = createMockGame({
			blockMap: [
				[{ type: 1, infinit: 0 }, { type: 0, infinit: 0 }, { type: 2, infinit: 1 }],
				[{ type: 3, infinit: 0 }, null],
			]
		});
		const sm = new StatusManage(game);
		sm.countBlockNum();
		// Only (0,0) and (1,0) are destroyable
		assert.equal(sm.blockNum, 2);
	});

	await t.test('addLife increments life, caps at maxLife, and updates hearts', () => {
		const sm = new StatusManage(createMockGame());
		sm.init();
		sm.addLife(2);
		assert.equal(sm.life, 2);

		sm.addLife(10);
		assert.equal(sm.life, 5);
	});

	await t.test('isAlive reflects positive life', () => {
		const sm = new StatusManage(createMockGame());
		sm.life = 0;
		assert.equal(sm.isAlive(), false);
		sm.life = 1;
		assert.equal(sm.isAlive(), true);
	});

	await t.test('drawLife renders all hearts', () => {
		const sm = new StatusManage(createMockGame());
		sm.life = 3;
		sm.init();
		let drawCount = 0;
		for (const h of sm.hearts) {
			h.draw = () => { drawCount++; };
		}
		sm.drawLife(mockCtx);
		assert.equal(drawCount, 5);
	});

	await t.test('destructor empties hearts array', () => {
		const sm = new StatusManage(createMockGame());
		sm.init();
		sm.destructor();
		assert.equal(sm.hearts.length, 0);
	});

	await t.test('StatusManage getters access injected game properties', () => {
		const mockBalls = [{ ballProp: true }];
		const mockCtrl = { ctrlProp: true };
		const mockScoreMng = { scoreProp: true };
		const mockBlockMap = [[1]];
		const mockStaticCtx = { staticCtxProp: true };
		const mockGame = {
			objectManage: {
				balls: mockBalls,
				blockMap: mockBlockMap,
			},
			ctrl: mockCtrl,
			scoreMng: mockScoreMng,
			staticCtx: mockStaticCtx,
		};
		const sm = new StatusManage(mockGame);
		assert.equal(sm.getBalls(), mockBalls);
		assert.deepEqual(sm.getCtrl(), mockCtrl);
		assert.deepEqual(sm.getScoreMng(), mockScoreMng);
		assert.equal(sm.getBlockMap(), mockBlockMap);
		assert.equal(sm.getStaticCtx(), mockStaticCtx);
	});
});

