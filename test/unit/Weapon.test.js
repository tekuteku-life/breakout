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
		const mockGame = { eventBus: mockBus, FPS: 60 };

		// Gun launch
		const gun = new Weapon(1, 100, 200, 1, mockGame);
		gun.move();
		assert.equal(soundPlayed, 'gun');

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

	await t.test('checkCollision handles block collisions for gun and missile', () => {
		let blockActionCalled = false;
		let blockLifeDecreased = false;

		const mockBlock = {
			type: 1,
			infinit: 0,
			life: 1,
			func: 0,
			getLeftX: () => 80,
			getRightX: () => 120,
			getTopY: () => 80,
			getBottomY: () => 120,
			action: () => { blockActionCalled = true; },
			decreaseLife: () => { blockLifeDecreased = true; },
		};

		const mockGame = {
			eventBus: { emitEvent: () => {} },
			weapons: []
		};

		// Gun hits block
		const gun = new Weapon(1, 100, 100, 1, mockGame);
		gun.setInter = 1;
		mockGame.weapons = [gun];
		gun.move();
		if (gun.checkCollision(mockBlock)) {
			if (mockBlock.life >= 1) mockBlock.decreaseLife();
			gun.destructor();
		}
		assert.equal(blockLifeDecreased, true);
		assert.equal(mockGame.weapons.length, 0);

		// Gun hits block with life < 1
		mockBlock.life = 0;
		const gun2 = new Weapon(1, 100, 100, 1, mockGame);
		gun2.setInter = 1;
		mockGame.weapons = [gun2];
		gun2.move();
		if (gun2.checkCollision(mockBlock)) {
			mockBlock.action();
			gun2.destructor();
		}
		assert.equal(blockActionCalled, true);
		assert.equal(mockGame.weapons.length, 0);

		// Missile hits block
		blockActionCalled = false;
		const missile = new Weapon(2, 100, 100, 1, mockGame);
		missile.setInter = 1;
		mockGame.weapons = [missile];
		missile.move();
		if (missile.checkCollision(mockBlock)) {
			mockBlock.action();
			missile.destructor();
		}
		assert.equal(blockActionCalled, true);
		assert.equal(mockGame.weapons.length, 0);
	});

	await t.test('checkCollision handles bar collisions when moving downward', () => {
		let damageApplied = false;
		const mockBar = {
			edge: 0.04,
			width: 100,
			height: 10,
			hitPoint: 3,
			getTopY: () => 300,
			getCenterX: () => 200,
			endamage: () => { damageApplied = true; },
		};
		const mockGame = {
			bar: mockBar,
			weapons: []
		};

		const wpDown = new Weapon(1, 200, 295, -1, mockGame);
		wpDown.setInter = 1;
		mockGame.weapons = [wpDown];
		wpDown.move();

		if (wpDown.checkCollision(mockBar)) {
			mockBar.endamage(1);
			wpDown.destructor();
		}

		assert.equal(damageApplied, true);
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
		const mockWeapons = [{ weaponProp: true }];
		const mockGame = {
			bar: mockBar,
			weapons: mockWeapons,
			canvasHeight: 600,
			statusBarHeight: 30,
		};
		const wp = new Weapon(1, 50, null, 1, mockGame);
		assert.equal(wp.getGame(), mockGame);
		assert.equal(wp.getWeapons(), mockWeapons);
		assert.equal(wp.getCanvasHeight(), 600);
		assert.equal(wp.getStatusBarHeight(), 30);

		// destructor removes weapon from array
		const plainArray = [wp];
		mockGame.weapons = plainArray;
		wp.destructor();
		assert.equal(plainArray.length, 0);
	});

	await t.test('spawnWeapon sets bar.weaponInter to prevent continuous stacked bullet firing', () => {
		const mockBar = { weaponInter: 0, getTopY: () => 500 };
		const mockGame = {
			bar: mockBar,
			weapons: [],
		};

		// Simulate GameManage.spawnWeapon
		const w = new Weapon(1, 100, null, 1, mockGame);
		mockGame.weapons.push(w);
		mockBar.weaponInter = 12;

		assert.equal(mockBar.weaponInter, 12, 'weaponInter should be set to 12 after weapon fire');
		assert.equal(mockGame.weapons.length, 1);
	});

	await t.test('draw calls save and restore on missile rendering', () => {
		let saveCalled = false;
		let restoreCalled = false;
		const trackingCtx = {
			...mockCtx,
			save: () => { saveCalled = true; },
			restore: () => { restoreCalled = true; },
		};
		const missile = new Weapon(2, 50, 50, 1);
		missile.draw(trackingCtx);
		assert.equal(saveCalled, true, 'dynamicCtx.save() should be called');
		assert.equal(restoreCalled, true, 'dynamicCtx.restore() should be called');
	});
});
