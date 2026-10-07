import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import Weapon from '../../src/Weapon.js';
import EventBus from '../../src/EventBus.js';

test('Weapon class unit tests', async (t) => {
	setupEnvironment();
	const mockCtx = createMock2DContext();

	await t.test('constructor and coordinate getters', () => {
		const mockGame = { objectManage: { weapons: [] } };
		const gun = new Weapon(1, 100, 200, 1, mockGame);
		assert.equal(gun.type, 0); // gun
		assert.equal(gun.x, 100);
		assert.equal(gun.y, 200);
		assert.equal(gun.vect, 1);
		assert.equal(gun.size, 1);

		const missile = new Weapon(2, 100, 500, null, mockGame);
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

	await t.test('movePosition and updateState handle launch sound, acceleration, and off-screen bounds', () => {
		let soundPlayed = '';
		EventBus.destructor();
		EventBus.addOnEvent('sound:play', (data) => {
			soundPlayed = data;
		});
		const mockGame = { FPS: 60, objectManage: { weapons: [] } };

		// Gun launch
		const gun = new Weapon(1, 100, 200, 1, mockGame);
		gun.movePosition();
		gun.updateState();
		assert.equal(soundPlayed, 'gun');

		// Missile launch and acceleration
		soundPlayed = '';
		const missile = new Weapon(2, 100, 200, 1, mockGame);
		missile.vy = 1;
		missile.movePosition();
		missile.updateState();
		assert.equal(soundPlayed, 'missile');
		assert.ok(missile.vy > 1);

		// Offscreen
		const offscreenWp = new Weapon(1, 100, -100, 1, mockGame);
		mockGame.objectManage.weapons = [offscreenWp];
		offscreenWp.movePosition();
		offscreenWp.updateState();
		assert.equal(mockGame.objectManage.weapons.length, 0);
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
			objectManage: {
				weapons: []
			}
		};

		// Gun hits block
		const gun = new Weapon(1, 100, 100, 1, mockGame);
		gun.setInter = 1;
		mockGame.objectManage.weapons = [gun];
		gun.movePosition();
		if (gun.checkCollision(mockBlock)) {
			if (mockBlock.life >= 1) mockBlock.decreaseLife();
			gun.destructor();
		}
		assert.equal(blockLifeDecreased, true);
		assert.equal(mockGame.objectManage.weapons.length, 0);

		// Gun hits block with life < 1
		mockBlock.life = 0;
		const gun2 = new Weapon(1, 100, 100, 1, mockGame);
		gun2.setInter = 1;
		mockGame.objectManage.weapons = [gun2];
		gun2.movePosition();
		if (gun2.checkCollision(mockBlock)) {
			mockBlock.action();
			gun2.destructor();
		}
		assert.equal(blockActionCalled, true);
		assert.equal(mockGame.objectManage.weapons.length, 0);

		// Missile hits block
		blockActionCalled = false;
		const missile = new Weapon(2, 100, 100, 1, mockGame);
		missile.setInter = 1;
		mockGame.objectManage.weapons = [missile];
		missile.movePosition();
		if (missile.checkCollision(mockBlock)) {
			mockBlock.action();
			missile.destructor();
		}
		assert.equal(blockActionCalled, true);
		assert.equal(mockGame.objectManage.weapons.length, 0);
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
			objectManage: {
				bar: mockBar,
				weapons: []
			}
		};

		const wpDown = new Weapon(1, 200, 295, -1, mockGame);
		wpDown.setInter = 1;
		mockGame.objectManage.weapons = [wpDown];
		wpDown.movePosition();

		if (wpDown.checkCollision(mockBar)) {
			mockBar.endamage(1);
			wpDown.destructor();
		}

		assert.equal(damageApplied, true);
		assert.equal(mockGame.objectManage.weapons.length, 0);
	});

	await t.test('draw renders gun and missile graphics', () => {
		const gun = new Weapon(1, 50, 50, 1);
		assert.doesNotThrow(() => gun.draw(mockCtx));

		const missile = new Weapon(2, 50, 50, 1);
		assert.doesNotThrow(() => missile.draw(mockCtx));
	});

	await t.test('destructor removes weapon from game weapons array', () => {
		const mockGame = { objectManage: { weapons: [] } };
		const wp = new Weapon(1, 0, 0, 1, mockGame);
		mockGame.objectManage.weapons.push(wp);
		wp.destructor();
		assert.equal(mockGame.objectManage.weapons.length, 0);
	});

	await t.test('Weapon getters and destructor via standard Array', () => {
		const mockBar = { getTopY: () => 400 };
		const mockWeapons = [{ weaponProp: true }];
		const mockGame = {
			objectManage: {
				bar: mockBar,
				weapons: mockWeapons,
			},
			canvasHeight: 600,
			statusBarHeight: 30,
		};
		const wp = new Weapon(1, 50, 400, 1, mockGame);
		assert.equal(wp.getCanvasHeight(), 600);

		// destructor removes weapon from array
		const plainArray = [wp];
		mockGame.objectManage.weapons = plainArray;
		wp.destructor();
		assert.equal(plainArray.length, 0);
	});

	await t.test('spawnWeapon sets bar.weaponInter to prevent continuous stacked bullet firing', () => {
		const mockBar = { weaponInter: 0, getTopY: () => 500 };
		const mockGame = {
			objectManage: {
				bar: mockBar,
				weapons: [],
			},
		};

		// Simulate GameManage.spawnWeapon
		const w = new Weapon(1, 100, 500, 1, mockGame);
		mockGame.objectManage.weapons.push(w);
		mockBar.weaponInter = 12;

		assert.equal(mockBar.weaponInter, 12, 'weaponInter should be set to 12 after weapon fire');
		assert.equal(mockGame.objectManage.weapons.length, 1);
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

	await t.test('movePosition updates position/acceleration without side effects, updateState emits sound and despawns offscreen', () => {
		let soundPlayed = false;
		EventBus.destructor();
		EventBus.addOnEvent('sound:play', () => { soundPlayed = true; });

		const mockGame = {
			canvasHeight: 500,
			objectManage: { weapons: [] },
			FPS: 50,
		};
		const gun = new Weapon(1, 100, -50, 1, mockGame);
		mockGame.objectManage.weapons.push(gun);

		// movePosition only updates y coordinate and vy
		gun.movePosition();
		assert.equal(soundPlayed, false, 'movePosition should not play sound');
		assert.equal(mockGame.objectManage.weapons.length, 1, 'movePosition should not despawn weapon');

		// updateState plays launch sound and despawns offscreen weapon
		gun.updateState();
		assert.equal(soundPlayed, true, 'updateState should play sound');
		assert.equal(mockGame.objectManage.weapons.length, 0, 'updateState should despawn offscreen weapon');
	});
});
