import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import Bar from '../../src/Bar.js';
import Block from '../../src/Block.js';
import Weapon from '../../src/Weapon.js';
import Item from '../../src/Item.js';
import ImageData from '../../src/ImageData.js';
import EventBus from '../../src/EventBus.js';
import { ITEM_TYPE } from '../../src/const.js';

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

	await t.test('relaunch emits ball:relaunch with bar velocity', () => {
		let emittedData = null;
		EventBus.destructor();
		EventBus.addOnEvent('ball:relaunch', (data) => {
			emittedData = data;
		});
		const bar = new Bar();
		bar.vx = 4;

		bar.relaunch();
		assert.deepEqual(emittedData, { barVx: 4 });
	});

	await t.test('move calculates speed towards pointX and handles state transitions with EventBus timers', () => {
		EventBus.destructor();
		const mockGame = {
			inputManage: { pointX: 400 },
			FPS: 50,
			barDefaultWidth: 80,
			canvasWidth: 750,
			barDefaultSpeed: 75,
			barDefaultHeight: 7,
			barColor: '#114400',
		};
		const bar = new Bar(mockGame);
		bar.pointX = bar.getCenterX() + 20;
		bar.weaponInter = 2;

		bar.move();
		assert.ok(bar.vx > 0);
		assert.equal(bar.weaponInter, 1);

		// Apply item effects that register timers
		bar.applyItemEffect(ITEM_TYPE.LONG);
		bar.applyItemEffect(ITEM_TYPE.GUN);
		bar.applyItemEffect(ITEM_TYPE.SLOW);
		assert.ok(bar.width > mockGame.barDefaultWidth);
		assert.equal(bar.weapon, 1);
		assert.ok(bar.height > mockGame.barDefaultHeight);

		// Advance timers past duration
		EventBus.tickTimers(20000);

		// States should have reset via EventBus timers
		assert.equal(bar.width, mockGame.barDefaultWidth);
		assert.equal(bar.weapon, 0);
		assert.equal(bar.height, mockGame.barDefaultHeight);

		// Direct reset methods
		bar.width = 150;
		bar.resetWidth();
		assert.equal(bar.width, mockGame.barDefaultWidth);

		bar.color = '#ff0000';
		bar.resetImmortal();
		assert.equal(bar.color, mockGame.barColor);
	});

	await t.test('endamage reduces HP and consumes life when HP reaches 0', () => {
		let lifeConsumed = false;
		EventBus.destructor();
		EventBus.addOnEvent('status:addLife', (val) => {
			if (val < 0) lifeConsumed = true;
		});
		const mockGame = { barDefaultHP: 5 };
		const bar = new Bar(mockGame);

		bar.hitPoint = 2;
		bar.endamage(1);
		assert.equal(bar.hitPoint, 1);
		assert.equal(lifeConsumed, false);

		bar.endamage(1);
		assert.equal(bar.hitPoint, 5);
		assert.equal(lifeConsumed, true);
	});

	await t.test('destructor can be called without error', () => {
		const bar = new Bar();
		assert.doesNotThrow(() => bar.destructor());
	});

	await t.test('move and checkCollision clamp bar within canvas boundary', () => {
		const bar = new Bar();
		bar.x = 10;
		globalThis.pointX = -100;
		bar.move();
		assert.ok(bar.getLeftX() >= 0, 'Bar should be clamped at left boundary');

		bar.x = -50;
		assert.equal(bar.checkCollision(), true);
		assert.ok(bar.getLeftX() >= 0);

		bar.x = 1000;
		assert.equal(bar.checkCollision(), true);
		assert.ok(bar.getRightX() <= bar.getCanvasWidth());

		bar.x = 200;
		assert.equal(bar.checkCollision(), false);
	});

	await t.test('Bar getters and setters via game instance', () => {
		let pointXSet = null;
		EventBus.destructor();
		EventBus.addOnEvent('input:setPointX', (val) => {
			pointXSet = val;
		});
		const mockBalls = [{ ballProp: true }];
		const mockWeapons = [{ weaponProp: true }];
		const mockItems = [{ itemProp: true }];
		const mockBlockMap = [[1]];
		const mockCtrl = { ctrlProp: true };
		const mockInputManage = { pointX: 450 };
		const mockGame = {
			objectManage: {
				balls: mockBalls,
				weapons: mockWeapons,
				items: mockItems,
				blockMap: mockBlockMap,
			},
			ctrl: mockCtrl,
			inputManage: mockInputManage,
			canvasWidth: 800,
			canvasHeight: 600,
		};
		const bar = new Bar(mockGame);
		assert.equal(bar.getPointX(), 450);
		bar.setPointX(500);
		assert.equal(pointXSet, 500);
		assert.equal(bar.getCanvasWidth(), 800);
	});
});
