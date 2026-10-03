import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import Bar from '../../src/Bar.js';
import Block from '../../src/Block.js';
import Weapon from '../../src/Weapon.js';
import Item from '../../src/Item.js';
import ImageData from '../../src/ImageData.js';

test('Bar class unit tests', async (t) => {
	setupEnvironment();
	const mockCtx = createMock2DContext();
	globalThis.staticCtx = mockCtx;
	globalThis.dynamicCtx = mockCtx;
	globalThis.imgData = new ImageData(mockCtx);
	globalThis.imgData.init();

	await t.test('constructor and coordinate getters', () => {
		const bar = new Bar();
		assert.equal(bar.width, globalThis.barDefaultWidth);
		assert.equal(bar.height, globalThis.barDefaultHeight);
		assert.equal(bar.hitPoint, globalThis.barDefaultHP);

		assert.equal(bar.getCenterX(), bar.x);
		assert.equal(bar.getLeftX(), bar.x - bar.width * 0.5);
		assert.equal(bar.getRightX(), bar.x + bar.width * 0.5);
		assert.equal(bar.getTopY(), bar.y);
		assert.equal(bar.getCenterY(), bar.y + bar.height * 0.5);
		assert.equal(bar.getBottomY(), bar.y + bar.height);
	});

	await t.test('draw renders bar, weapons, absorption effect, and flashing effect', () => {
		const bar = new Bar();

		// Normal draw
		assert.doesNotThrow(() => bar.draw(mockCtx));

		// Weapon equipped
		bar.weapon = 1;
		assert.doesNotThrow(() => bar.draw(mockCtx));

		// Absorption state
		bar.absorptionStatusTime = 50;
		assert.doesNotThrow(() => bar.draw(mockCtx));

		// Flashing near expiration
		bar.widthStatusTime = 10;
		assert.doesNotThrow(() => bar.draw(mockCtx));
	});

	await t.test('relaunch releases absorbed ball', () => {
		const bar = new Bar();
		const mockBall = {
			isAbsorption: 1,
			vx: 2,
		};
		globalThis.balls = [mockBall];
		bar.absorptionNum = 1;

		bar.relaunch();
		assert.equal(mockBall.isAbsorption, 0);
		assert.equal(bar.absorptionNum, 0);
	});

	await t.test('move calculates speed towards pointX and decrements status timers', () => {
		const bar = new Bar();
		globalThis.pointX = bar.getCenterX() + 20;

		bar.widthStatusTime = 1;
		bar.speedStatusTime = 1;
		bar.weaponTime = 1;
		bar.weaponInter = 2;
		bar.vibrationTime = 1;
		bar.absorptionStatusTime = 1;
		bar.immortalStatusTime = 1;
		bar.disturbStatusTime = 1;

		bar.move();
		assert.ok(bar.vx > 0);

		// Timers should have expired to 0
		assert.equal(bar.widthStatusTime, 0);
		assert.equal(bar.width, globalThis.barDefaultWidth);
		assert.equal(bar.speedStatusTime, 0);
		assert.equal(bar.weaponTime, 0);
		assert.equal(bar.weapon, 0);
		assert.equal(bar.weaponInter, 1);
		assert.equal(bar.vibrationTime, 0);
		assert.equal(bar.absorptionStatusTime, 0);
		assert.equal(bar.immortalStatusTime, 0);
		assert.equal(bar.color, globalThis.barColor);
		assert.equal(bar.disturbStatusTime, 0);
	});

	await t.test('endamage reduces HP and consumes life when HP reaches 0', () => {
		const bar = new Bar();
		let lifeConsumed = false;
		globalThis.statusMng = {
			addLife: (n) => {
				if (n < 0) lifeConsumed = true;
			},
		};

		bar.hitPoint = 2;
		bar.endamage(1);
		assert.equal(bar.hitPoint, 1);
		assert.equal(lifeConsumed, false);

		bar.endamage(1);
		assert.equal(bar.hitPoint, globalThis.barDefaultHP);
		assert.equal(lifeConsumed, true);
	});

	await t.test('auto computes targetX and positions bar', () => {
		const bar = new Bar();
		globalThis.balls = [
			{
				x: 200,
				y: 300,
				vx: 1,
				vy: 3,
				radius: 5,
				collisionNum: 0,
				getBottomY: () => 305,
				getCenterX: () => 200,
				move: function() { this.y += this.vy; },
				copy: function() { return Object.assign({}, this); },
			},
		];
		globalThis.items = [];
		globalThis.weapons = [];

		bar.auto();
		assert.ok(typeof globalThis.pointX === 'number');
	});

	await t.test('destructor can be called without error', () => {
		const bar = new Bar();
		assert.doesNotThrow(() => bar.destructor());
	});

	await t.test('move clamps bar within left canvas boundary', () => {
		const bar = new Bar();
		bar.x = 10;
		globalThis.pointX = -100;
		bar.move();
		assert.ok(bar.getLeftX() >= 0, 'Bar should be clamped at left boundary');
	});

	await t.test('auto executes weapon auto-targeting, block mapping, and infinite block avoidance', () => {
		const bar = new Bar();
		bar.weapon = 1; // Gun
		bar.weaponInter = 0;
		globalThis.weapons = [];

		const infBlock = new Block(3, 2, 1, 0, 0, 1, 0);
		const targetBlock = new Block(5, 2, 1, 0, 1, 0, 0);
		globalThis.blockMap = [[], [], [null, null, null, infBlock, null, targetBlock]];

		bar.auto();
		assert.ok(typeof globalThis.pointX === 'number');

		// With existing weapon fired
		const firedWeapon = new Weapon(1, infBlock.getCenterX(), 300, 1);
		globalThis.weapons = [firedWeapon];
		bar.auto();
	});

	await t.test('auto handles combined ball and item tracking with simulation data', () => {
		const bar = new Bar();
		const testItem = new Item(0, 250, bar.y - 30, '#000', '#fff');
		globalThis.items = [testItem];

		// Pre-populate simuData to test cache re-use and fallback path
		bar.simuData = {
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
			self: globalThis.balls[0],
		};

		bar.auto();
		assert.ok(typeof globalThis.pointX === 'number');
	});
});
