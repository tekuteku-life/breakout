import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import Weapon from '../../src/Weapon.js';
import { DEFAULT_CONFIG } from '../../src/const.js';

test('Weapon class unit tests', async (t) => {
	setupEnvironment();
	const mockCtx = createMock2DContext();

	await t.test('constructor and coordinate getters', () => {
		const mockBar = { getTopY: () => 500 };
		const mockGame = { bar: mockBar };
		const gun = new Weapon(1, 100, 200, 1, mockGame);
		assert.equal(gun.type, 0); // gun
		assert.equal(gun.x, 100);
		assert.equal(gun.y, 200);
		assert.equal(gun.vect, 1);
		assert.equal(gun.size, 1);

		const missile = new Weapon(2, 100, null, null, mockGame);
		assert.equal(missile.type, 1); // missile
		assert.equal(missile.size, 4);
		assert.equal(missile.vect, 1);
		assert.equal(missile.y, 500);

		assert.equal(gun.getCenterX(), 100);
		assert.equal(gun.getCenterY(), 200);
		assert.equal(gun.getLeftX(), 100 - 0.5);
		assert.equal(gun.getRightX(), 100 + 0.5);
		assert.equal(gun.getTopY(), 200 - 0.5);
		assert.equal(gun.getBottomY(), 200 + 0.5);
	});

	await t.test('move handles launch sound, acceleration, and off-screen bounds', () => {
		let soundPlayed = '';
		const mockBus = {
			emitEvent: (evt, data) => {
				if (evt === 'sound:play') soundPlayed = data;
			}
		};
		const mockBar = { weaponInter: 0 };
		const mockGame = { eventBus: mockBus, bar: mockBar, FPS: 60 };

		// Gun launch
		const gun = new Weapon(1, 100, 200, 1, mockGame);
		gun.move();
		assert.equal(soundPlayed, 'gun');
		assert.equal(mockBar.weaponInter, 12);

		// Missile launch and acceleration
		soundPlayed = '';
		const missile = new Weapon(2, 100, 200, 1, mockGame);
		missile.vy = 1;
		missile.move();
		assert.equal(soundPlayed, 'missile');
		assert.ok(missile.vy > 1);

		// Offscreen
		const offscreenWp = new Weapon(1, 100, -100, 1, mockGame);
		mockGame.weapons = [offscreenWp];
		offscreenWp.move();
		assert.equal(mockGame.weapons.length, 0);
	});

	await t.test('move handles block collisions for gun and missile', () => {
		let blockActionCalled = false;
		let blockLifeDecreased = false;

		const mockBlock = {
			type: 1,
			infinit: 0,
			life: 1,
			func: 0,
			action: () => { blockActionCalled = true; },
			decreaseLife: () => { blockLifeDecreased = true; },
		};

		// 2D grid blockMap
		const row = Math.floor((100 - DEFAULT_CONFIG.statusBarHeight) / DEFAULT_CONFIG.blockHeight);
		const col = Math.floor(100 / DEFAULT_CONFIG.blockWidth);
		const blockMap = [];
		blockMap[row] = [];
		blockMap[row][col] = mockBlock;

		const mockGame = {
			blockMap,
			blockWidth: DEFAULT_CONFIG.blockWidth,
			blockHeight: DEFAULT_CONFIG.blockHeight,
			statusBarHeight: DEFAULT_CONFIG.statusBarHeight,
			eventBus: { emitEvent: () => {} },
			weapons: []
		};

		// Gun hits block with life >= 1
		const gun = new Weapon(1, 100, 100, 1, mockGame);
		gun.setInter = 1;
		mockGame.weapons = [gun];
		gun.move();
		assert.equal(blockLifeDecreased, true);

		// Gun hits block with life < 1
		mockBlock.life = 0;
		const gun2 = new Weapon(1, 100, 100, 1, mockGame);
		gun2.setInter = 1;
		mockGame.weapons = [gun2];
		gun2.move();
		assert.equal(blockActionCalled, true);

		// Missile hits block
		blockActionCalled = false;
		const missile = new Weapon(2, 100, 100, 1, mockGame);
		missile.setInter = 1;
		mockGame.weapons = [missile];
		missile.move();
		assert.equal(blockActionCalled, true);
	});

	await t.test('move handles bar collisions when moving downward', () => {
		let damageEmitted = null;
		let balloonEmitted = null;
		const mockBus = {
			emitEvent: (evt, data) => {
				if (evt === 'bar:damage') damageEmitted = data;
				if (evt === 'balloon:spawn') balloonEmitted = data;
			}
		};
		const mockBar = {
			y: 300,
			x: 200,
			width: 100,
			height: 10,
			hitPoint: 3,
			getTopY: () => 300,
			getCenterX: () => 200,
		};
		const mockGame = {
			eventBus: mockBus,
			bar: mockBar,
			weapons: []
		};

		const wpDown = new Weapon(1, 200, 295, -1, mockGame);
		wpDown.setInter = 1;
		mockGame.weapons = [wpDown];
		wpDown.move();

		assert.equal(damageEmitted, 1);
		assert.ok(balloonEmitted !== null);
		assert.equal(mockGame.weapons.length, 0);
	});

	await t.test('draw renders gun and missile graphics', () => {
		const gun = new Weapon(1, 50, 50, 1);
		assert.doesNotThrow(() => gun.draw(mockCtx));

		const missile = new Weapon(2, 50, 50, 1);
		assert.doesNotThrow(() => missile.draw(mockCtx));
	});

	await t.test('destructor removes weapon from game weapons array', () => {
		const mockGame = { weapons: [] };
		const wp = new Weapon(1, 0, 0, 1, mockGame);
		mockGame.weapons.push(wp);
		wp.destructor();
		assert.equal(mockGame.weapons.length, 0);
	});

	await t.test('Weapon getters and destructor via standard Array', () => {
		const mockBar = { getTopY: () => 400 };
		const mockBlockMap = [[1]];
		const mockWeapons = [{ weaponProp: true }];
		const mockGame = {
			bar: mockBar,
			blockMap: mockBlockMap,
			weapons: mockWeapons,
			canvasHeight: 600,
			statusBarHeight: 30,
		};
		const wp = new Weapon(1, 50, null, 1, mockGame);
		assert.equal(wp.getGame(), mockGame);
		assert.equal(wp.getBar(), mockBar);
		assert.equal(wp.getBlockMap(), mockBlockMap);
		assert.equal(wp.getWeapons(), mockWeapons);
		assert.equal(wp.getCanvasHeight(), 600);
		assert.equal(wp.getStatusBarHeight(), 30);

		// destructor removes weapon from array
		const plainArray = [wp];
		mockGame.weapons = plainArray;
		wp.destructor();
		assert.equal(plainArray.length, 0);
	});
});
