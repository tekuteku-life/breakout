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
		const mockBall = {
			isAbsorption: 1,
			vx: 2,
		};
		const mockGame = { balls: [mockBall], FPS: 50 };
		const bar = new Bar(mockGame);
		bar.absorptionNum = 1;

		bar.relaunch();
		assert.equal(mockBall.isAbsorption, 0);
		assert.equal(bar.absorptionNum, 0);
	});

	await t.test('move calculates speed towards pointX and decrements status timers', () => {
		const mockGame = {
			inputManage: { pointX: 400 },
			FPS: 50,
			barDefaultWidth: 80,
			canvasWidth: 750,
			barDefaultSpeed: 75,
		};
		const bar = new Bar(mockGame);
		bar.pointX = bar.getCenterX() + 20;

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
		let lifeConsumed = false;
		const mockBus = {
			emitEvent: (name, val) => {
				if (name === 'status:addLife' && val < 0) lifeConsumed = true;
			},
			addOnEvent: () => {},
			removeOnEvent: () => {}
		};
		const mockGame = { eventBus: mockBus, barDefaultHP: 5 };
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
		const mockEventBus = {
			emitEvent: (evt, val) => {
				if (evt === 'input:setPointX') pointXSet = val;
			}
		};
		const mockBalls = [{ ballProp: true }];
		const mockWeapons = [{ weaponProp: true }];
		const mockItems = [{ itemProp: true }];
		const mockBlockMap = [[1]];
		const mockCtrl = { ctrlProp: true };
		const mockInputManage = { pointX: 450 };
		const mockGame = {
			eventBus: mockEventBus,
			balls: mockBalls,
			weapons: mockWeapons,
			items: mockItems,
			blockMap: mockBlockMap,
			ctrl: mockCtrl,
			inputManage: mockInputManage,
			canvasWidth: 800,
			canvasHeight: 600,
		};
		const bar = new Bar(mockGame);
		assert.equal(bar.getGame(), mockGame);
		assert.equal(bar.getEventBus(), mockEventBus);
		assert.equal(bar.getBalls(), mockBalls);
		assert.equal(bar.getPointX(), 450);
		bar.setPointX(500);
		assert.equal(pointXSet, 500);
		assert.equal(bar.getCanvasWidth(), 800);
		assert.equal(bar.getCanvasHeight(), 600);
	});
});
