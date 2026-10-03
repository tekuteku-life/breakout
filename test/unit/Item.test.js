import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import Item from '../../src/Item.js';
import ImageData from '../../src/ImageData.js';

test('Item class unit tests', async (t) => {
	setupEnvironment();
	const mockCtx = createMock2DContext();
	globalThis.imgData = new ImageData(mockCtx);
	globalThis.imgData.init();

	await t.test('constructor and coordinate getters work properly', () => {
		const item = new Item(0, 100, 200, '#ffffff', '#000000');
		assert.equal(item.type, 0);
		assert.equal(item.x, 100);
		assert.equal(item.y, 200);
		assert.equal(item.width, globalThis.blockWidth);
		assert.equal(item.height, globalThis.blockHeight);

		assert.equal(item.getLeftX(), 100);
		assert.equal(item.getCenterX(), 100 + globalThis.blockWidth * 0.5);
		assert.equal(item.getRightX(), 100 + globalThis.blockWidth);
		assert.equal(item.getTopY(), 200);
		assert.equal(item.getCenterY(), 200 + globalThis.blockHeight * 0.5);
		assert.equal(item.getBottomY(), 200 + globalThis.blockHeight);
	});

	await t.test('draw calls putImageData', () => {
		const item = new Item(0, 100, 200, '#fff', '#000');
		let drawn = false;
		const ctx = {
			putImageData: (img, x, y) => {
				drawn = true;
				assert.equal(img, item.imgData);
			},
		};
		item.draw(ctx);
		assert.equal(drawn, true);
	});

	await t.test('checkCollision detects bar contact accurately', () => {
		const item = new Item(0, 100, 490, '#fff', '#000');
		globalThis.bar.x = 100;
		globalThis.bar.y = 500;
		globalThis.bar.width = 80;

		assert.equal(item.checkCollision(), true);

		// Missed X
		item.x = 999;
		assert.equal(item.checkCollision(), false);

		// Missed Y
		item.x = 100;
		item.y = 100;
		assert.equal(item.checkCollision(), false);

		// Custom target
		const customTarget = {
			getTopY: () => 100,
			getLeftX: () => 50,
			getRightX: () => 150,
		};
		item.y = 90;
		assert.equal(item.checkCollision(customTarget), true);
	});

	await t.test('move handles fall-out and bar collision life-cycle', () => {
		// Fall out of canvas
		const itemFalling = new Item(0, 50, globalThis.canvasHeight + 10, '#fff', '#000');
		globalThis.items = [itemFalling];
		itemFalling.move();
		assert.equal(globalThis.items.length, 0);

		// Collision with bar
		const itemHit = new Item(0, 100, 495, '#fff', '#000');
		globalThis.items = [itemHit];
		itemHit.move();
		assert.equal(globalThis.items.length, 0);
		assert.equal(globalThis.scoreMng.awardNum.getItemNum, 1);
	});

	await t.test('applyEffect covers all 16 item types (0 to 15)', () => {
		class MockBall {
			constructor() {
				this.status = 0;
				this.statusTime = 0;
				this.vx = 2;
				this.vy = 3;
			}
			copy() {
				return new MockBall();
			}
		}

		// Type 0: Multiply balls
		globalThis.balls = [new MockBall()];
		new Item(0, 0, 0, '#fff', '#000').applyEffect();
		assert.equal(globalThis.balls.length, 2);

		// Type 1: Strong ball
		new Item(1, 0, 0, '#fff', '#000').applyEffect();
		assert.equal(globalThis.balls[0].status, globalThis.BALL_STATUS.STRONG);

		// Type 2: Ultimate ball
		new Item(2, 0, 0, '#fff', '#000').applyEffect();
		assert.equal(globalThis.balls[0].status, globalThis.BALL_STATUS.ULTIMATE);

		// Type 3: Long bar (extend)
		globalThis.bar.width = 100;
		new Item(3, 0, 0, '#fff', '#000').applyEffect();
		assert.equal(globalThis.bar.width, 130);
		// Test upper bound
		globalThis.bar.width = 200;
		new Item(3, 0, 0, '#fff', '#000').applyEffect();
		assert.equal(globalThis.bar.width, globalThis.barMaxWidth);

		// Type 4: Short bar (shrink)
		globalThis.bar.width = 100;
		new Item(4, 0, 0, '#fff', '#000').applyEffect();
		assert.equal(globalThis.bar.width, 70);
		// Test lower bound
		globalThis.bar.width = 20;
		new Item(4, 0, 0, '#fff', '#000').applyEffect();
		assert.equal(globalThis.bar.width, globalThis.barMinWidth);

		// Type 5: Heal life
		globalThis.statusMng.life = 1;
		new Item(5, 0, 0, '#fff', '#000').applyEffect();
		assert.equal(globalThis.statusMng.life, 2);

		// Type 6: Decrease life
		new Item(6, 0, 0, '#fff', '#000').applyEffect();
		assert.equal(globalThis.statusMng.life, 1);

		// Type 7: Speed up
		const oldVx = globalThis.balls[0].vx;
		new Item(7, 0, 0, '#fff', '#000').applyEffect();
		assert.ok(globalThis.balls[0].vx >= oldVx);

		// Type 8: Speed down
		const beforeDownVx = globalThis.balls[0].vx;
		new Item(8, 0, 0, '#fff', '#000').applyEffect();
		assert.ok(globalThis.balls[0].vx <= beforeDownVx);

		// Type 9: Gun weapon
		new Item(9, 0, 0, '#fff', '#000').applyEffect();
		assert.equal(globalThis.bar.weapon, 1);

		// Type 10: Missile weapon
		new Item(10, 0, 0, '#fff', '#000').applyEffect();
		assert.equal(globalThis.bar.weapon, 2);

		// Type 11: Slow bar
		globalThis.bar.vxMax = 50;
		new Item(11, 0, 0, '#fff', '#000').applyEffect();
		assert.ok(globalThis.bar.vxMax < 50);
		// Test lower bound
		globalThis.bar.vxMax = 5;
		new Item(11, 0, 0, '#fff', '#000').applyEffect();
		assert.equal(globalThis.bar.vxMax, globalThis.barMinSpeed);

		// Type 12: Vibrate bar
		new Item(12, 0, 0, '#fff', '#000').applyEffect();
		assert.ok(globalThis.bar.vibrationTime > 0);

		// Type 13: Absorb ball
		new Item(13, 0, 0, '#fff', '#000').applyEffect();
		assert.ok(globalThis.bar.absorptionStatusTime > 0);

		// Type 14: Immortal
		new Item(14, 0, 0, '#fff', '#000').applyEffect();
		assert.ok(globalThis.bar.immortalStatusTime > 0);
		assert.equal(globalThis.bar.color, globalThis.barImmortalColor);

		// Type 15: Disturb view
		new Item(15, 0, 0, '#fff', '#000').applyEffect();
		assert.ok(globalThis.bar.disturbStatusTime > 0);
	});

	await t.test('destructor removes item from global items array', () => {
		const item = new Item(0, 0, 0, '#fff', '#000');
		globalThis.items = [item];
		item.destructor();
		assert.equal(globalThis.items.length, 0);
	});
});
