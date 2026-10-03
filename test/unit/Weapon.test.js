import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import Weapon from '../../src/Weapon.js';

test('Weapon class unit tests', async (t) => {
	setupEnvironment();
	const mockCtx = createMock2DContext();

	await t.test('constructor and coordinate getters', () => {
		const gun = new Weapon(1, 100, 200, 1);
		assert.equal(gun.type, 0); // gun
		assert.equal(gun.x, 100);
		assert.equal(gun.y, 200);
		assert.equal(gun.vect, 1);
		assert.equal(gun.size, 1);

		const missile = new Weapon(2, 100, null, null);
		assert.equal(missile.type, 1); // missile
		assert.equal(missile.size, 4);
		assert.equal(missile.vect, 1);
		assert.equal(missile.y, ~~(globalThis.bar.getTopY()));

		assert.equal(gun.getCenterX(), 100);
		assert.equal(gun.getCenterY(), 200);
		assert.equal(gun.getLeftX(), 100 - 0.5);
		assert.equal(gun.getRightX(), 100 + 0.5);
		assert.equal(gun.getTopY(), 200 - 0.5);
		assert.equal(gun.getBottomY(), 200 + 0.5);
	});

	await t.test('move handles launch sound, acceleration, and off-screen bounds', () => {
		let soundPlayed = '';
		globalThis.sounds.play = (s) => { soundPlayed = s; };

		// Gun launch
		const gun = new Weapon(1, 100, 200, 1);
		gun.move();
		assert.equal(soundPlayed, 'gun');
		assert.equal(globalThis.bar.weaponInter, 12);

		// Missile launch and acceleration
		const missile = new Weapon(2, 100, 200, 1);
		missile.vy = 1;
		missile.move();
		assert.equal(soundPlayed, 'missile');
		assert.ok(missile.vy > 1);

		// Offscreen
		const offscreenWp = new Weapon(1, 100, -100, 1);
		globalThis.weapons = [offscreenWp];
		offscreenWp.move();
		assert.equal(globalThis.weapons.length, 0);
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
		globalThis.blockMap = [];
		const row = Math.floor((100 - globalThis.statusBarHeight) / globalThis.blockHeight);
		const col = Math.floor(100 / globalThis.blockWidth);
		globalThis.blockMap[row] = [];
		globalThis.blockMap[row][col] = mockBlock;

		// Gun hits block with life >= 1
		const gun = new Weapon(1, 100, 100, 1);
		gun.setInter = 1;
		globalThis.weapons = [gun];
		gun.move();
		assert.equal(blockLifeDecreased, true);

		// Gun hits block with life < 1
		mockBlock.life = 0;
		const gun2 = new Weapon(1, 100, 100, 1);
		gun2.setInter = 1;
		globalThis.weapons = [gun2];
		gun2.move();
		assert.equal(blockActionCalled, true);

		// Missile hits block
		blockActionCalled = false;
		const missile = new Weapon(2, 100, 100, 1);
		missile.setInter = 1;
		globalThis.weapons = [missile];
		missile.move();
		assert.equal(blockActionCalled, true);
	});

	await t.test('move handles bar collisions when moving downward', () => {
		let damaged = false;
		globalThis.bar.endamage = () => { damaged = true; };
		globalThis.bar.y = 300;
		globalThis.bar.x = 200;
		globalThis.bar.width = 100;

		const wpDown = new Weapon(1, 200, 295, -1);
		wpDown.setInter = 1;
		globalThis.weapons = [wpDown];
		wpDown.move();

		assert.equal(damaged, true);
		assert.equal(globalThis.weapons.length, 0);
		assert.ok(globalThis.balloons.length > 0);
	});

	await t.test('draw renders gun and missile graphics', () => {
		const gun = new Weapon(1, 50, 50, 1);
		assert.doesNotThrow(() => gun.draw(mockCtx));

		const missile = new Weapon(2, 50, 50, 1);
		assert.doesNotThrow(() => missile.draw(mockCtx));
	});

	await t.test('destructor removes weapon from global array', () => {
		const wp = new Weapon(1, 0, 0, 1);
		globalThis.weapons = [wp];
		wp.destructor();
		assert.equal(globalThis.weapons.length, 0);
	});
});
