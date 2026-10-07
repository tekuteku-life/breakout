import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import Item from '../../src/Item.js';
import ImageData from '../../src/ImageData.js';
import EventBus from '../../src/EventBus.js';

test('Item class unit tests', async (t) => {
	setupEnvironment();
	const mockCtx = createMock2DContext();
	globalThis.imgData = new ImageData(mockCtx);
	globalThis.imgData.init();

	const mockGame = {
		imgData: globalThis.imgData,
		blockWidth: 50,
		blockHeight: 20,
		bar: globalThis.bar,
	};

	await t.test('constructor and coordinate getters work properly', () => {
		const item = new Item(0, 100, 200, '#ffffff', '#000000', mockGame);
		assert.equal(item.type, 0);
		assert.equal(item.x, 100);
		assert.equal(item.y, 200);
		assert.equal(item.width, 50);
		assert.equal(item.height, 20);

		assert.equal(item.getLeftX(), 100);
		assert.equal(item.getCenterX(), 100 + 50 * 0.5);
		assert.equal(item.getRightX(), 100 + 50);
		assert.equal(item.getTopY(), 200);
		assert.equal(item.getCenterY(), 200 + 20 * 0.5);
		assert.equal(item.getBottomY(), 200 + 20);
	});

	await t.test('draw calls putImageData', () => {
		const item = new Item(0, 100, 200, '#fff', '#000', mockGame);
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
		const item = new Item(0, 100, 490, '#fff', '#000', mockGame);
		const bar = {
			x: 100,
			y: 500,
			width: 80,
			getTopY: () => 500,
			getLeftX: () => 60,
			getRightX: () => 140,
		};

		assert.equal(item.checkCollision(bar), true);

		// Missed X
		item.x = 999;
		assert.equal(item.checkCollision(bar), false);

		// Missed Y
		item.x = 100;
		item.y = 100;
		assert.equal(item.checkCollision(bar), false);

		// Custom target
		const customTarget = {
			getTopY: () => 100,
			getLeftX: () => 50,
			getRightX: () => 150,
		};
		item.y = 90;
		assert.equal(item.checkCollision(customTarget), true);
	});

	await t.test('movePosition and updateState handle fall-out and bar collision life-cycle', () => {
		let awardAdded = false;
		EventBus.destructor();
		EventBus.addOnEvent('award:add', (data) => {
			if (data && data.key === 'getItemNum') awardAdded = true;
		});
		const mockBar = {
			getTopY: () => 500,
			getLeftX: () => 80,
			getRightX: () => 120,
		};
		const mockGame = {
			bar: mockBar,
			objectManage: {
				items: [],
			},
			canvasHeight: 600,
		};

		// Fall out of canvas
		const itemFalling = new Item(0, 50, 610, '#fff', '#000', mockGame);
		mockGame.objectManage.items = [itemFalling];
		itemFalling.movePosition();
		itemFalling.updateState();
		assert.equal(mockGame.objectManage.items.length, 0);

		// Collision with bar (上位調停フロー)
		const itemHit = new Item(0, 100, 495, '#fff', '#000', mockGame);
		mockGame.objectManage.items = [itemHit];
		itemHit.movePosition();
		itemHit.updateState();
		if (itemHit.checkCollision(mockBar)) {
			itemHit.applyEffect();
			itemHit.destructor();
		}
		assert.equal(mockGame.objectManage.items.length, 0);
		assert.equal(awardAdded, true);
	});

	await t.test('applyEffect covers all 16 item types (0 to 15) via EventBus', () => {
		for (let type = 0; type <= 15; type++) {
			const emittedEvents = [];
			EventBus.destructor();
			const origEmit = EventBus.emitEvent;
			EventBus.emitEvent = (name, data) => {
				emittedEvents.push({ name, data });
				return origEmit.call(EventBus, name, data);
			};
			try {
				const item = new Item(type, 0, 0, '#fff', '#000', {});
				item.applyEffect();

				// Every item emits award:add and sound:play
				assert.ok(emittedEvents.some(e => e.name === 'award:add' && e.data?.key === 'getItemNum'));
				const expectedSound = (type === 4 || type === 6 || type === 11 || type === 12) ? 'minusItem' : 'plusItem';
				assert.ok(emittedEvents.some(e => e.name === 'sound:play' && e.data === expectedSound));

				// Specific effect verification
				if (type === 0 || type === 1 || type === 2 || type === 7 || type === 8) {
					assert.ok(emittedEvents.some(e => e.name === 'ball:applyItem' && e.data === type));
				} else if (type === 5) {
					assert.ok(emittedEvents.some(e => e.name === 'status:addLife' && e.data === 1));
				} else if (type === 6) {
					assert.ok(emittedEvents.some(e => e.name === 'status:addLife' && e.data === -1));
				} else {
					assert.ok(emittedEvents.some(e => e.name === 'bar:applyItem' && e.data === type));
				}
			} finally {
				EventBus.emitEvent = origEmit;
			}
		}
	});

	await t.test('destructor removes item from game items array', () => {
		const mockGame = { objectManage: { items: [] } };
		const item = new Item(0, 0, 0, '#fff', '#000', mockGame);
		mockGame.objectManage.items.push(item);
		item.destructor();
		assert.equal(mockGame.objectManage.items.length, 0);
	});

	await t.test('Item getters and destructor via standard Array', () => {
		const mockBar = { barProp: true };
		const mockItems = [{ itemProp: true }];
		const mockCtrl = { ctrlProp: true };
		const mockGame = {
			bar: mockBar,
			objectManage: {
				items: mockItems,
			},
			ctrl: mockCtrl,
			canvasHeight: 600,
		};
		const item = new Item(0, 50, 60, '#fff', '#000', mockGame);
		assert.equal(item.getCanvasHeight(), 600);

		// destructor removes item from array
		const plainArray = [item];
		mockGame.objectManage.items = plainArray;
		item.destructor();
		assert.equal(plainArray.length, 0);
	});

	await t.test('movePosition updates position without despawning, updateState handles canvas bound despawning', () => {
		const mockGame = {
			canvasHeight: 500,
			objectManage: { items: [] },
			itemSpeed: [10],
		};
		const item = new Item(0, 100, 495, '#fff', '#000', mockGame);
		mockGame.objectManage.items.push(item);

		// movePosition moves y past canvasHeight, but does NOT despawn
		item.movePosition();
		assert.equal(item.y, 505);
		assert.equal(mockGame.objectManage.items.length, 1, 'movePosition must not despawn item');

		// updateState checks boundary and despawns item
		item.updateState();
		assert.equal(mockGame.objectManage.items.length, 0, 'updateState must despawn off-canvas item');
	});
});
