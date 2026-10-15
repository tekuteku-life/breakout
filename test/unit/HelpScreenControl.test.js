// test/unit/HelpScreenControl.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import GameManage from '../../src/GameManage.js';
import ScreenManage from '../../src/ScreenManage.js';
import BlockScreenControl from '../../src/screens/BlockScreenControl.js';
import ItemScreenControl from '../../src/screens/ItemScreenControl.js';
import PresetManage from '../../src/PresetManage.js';

test('HelpScreenControl (BlockScreenControl and ItemScreenControl) unit tests', async (t) => {
	setupEnvironment();

	await t.test('initializes BlockScreenControl and renders block previews on screen_block', () => {
		const sm = new ScreenManage();
		const blockCtrl = sm.getController('screen_block');
		assert.ok(blockCtrl instanceof BlockScreenControl, 'screen_block controller should be BlockScreenControl instance');

		const screen = blockCtrl.getElement();
		assert.ok(screen, '#screen_block element should exist in DOM');

		const canvases = screen.getElementsByTagName('canvas');
		assert.ok(canvases.length >= 15, `Expected at least 15 block preview canvases, got ${canvases.length}`);

		// Track draw calls
		let drawBlockCalls = 0;
		const mockImgData = {
			drawBlock(type, ctx) {
				drawBlockCalls++;
				assert.ok(typeof type === 'number');
				assert.ok(ctx);
			}
		};
		blockCtrl.getGame = () => ({ imgData: mockImgData, preset: { blockWidth: 50, blockHeight: 20 } });

		blockCtrl.onOpen();

		assert.ok(drawBlockCalls >= 14, `Expected at least 14 drawBlock calls, got ${drawBlockCalls}`);

		// Specific elements check
		const normalCanvas = document.getElementById('help_block_normal');
		assert.ok(normalCanvas, 'help_block_normal canvas should exist');
		assert.equal(normalCanvas.getAttribute('data-block-type'), '3');
		assert.equal(normalCanvas.width, 50);
		assert.equal(normalCanvas.height, 20);

		const speedCanvas = document.getElementById('help_block_speed');
		assert.ok(speedCanvas, 'help_block_speed canvas should exist');
		assert.equal(speedCanvas.getAttribute('data-block-type'), 'speed');

		const moveAttackCanvas = document.getElementById('help_block_move_attack');
		assert.ok(moveAttackCanvas, 'help_block_move_attack canvas should exist');
		assert.equal(moveAttackCanvas.getAttribute('data-block-type'), '18');

		const moveBombCanvas = document.getElementById('help_block_move_bomb');
		assert.ok(moveBombCanvas, 'help_block_move_bomb canvas should exist');
		assert.equal(moveBombCanvas.getAttribute('data-block-type'), '19');

		const blinkAttackCanvas = document.getElementById('help_block_blink_attack');
		assert.ok(blinkAttackCanvas, 'help_block_blink_attack canvas should exist');
		assert.equal(blinkAttackCanvas.getAttribute('data-block-type'), '20');

		const magnetAccelCanvas = document.getElementById('help_block_magnet_accel');
		assert.ok(magnetAccelCanvas, 'help_block_magnet_accel canvas should exist');
		assert.equal(magnetAccelCanvas.getAttribute('data-block-type'), '21');

		blockCtrl.destructor();
		sm.destructor();
	});

	await t.test('initializes ItemScreenControl and renders item previews on screen_item', () => {
		const sm = new ScreenManage();
		const itemCtrl = sm.getController('screen_item');
		assert.ok(itemCtrl instanceof ItemScreenControl, 'screen_item controller should be ItemScreenControl instance');

		const screen = itemCtrl.getElement();
		assert.ok(screen, '#screen_item element should exist in DOM');

		const canvases = screen.getElementsByTagName('canvas');
		assert.ok(canvases.length >= 17, `Expected at least 17 item preview canvases, got ${canvases.length}`);

		// Track draw calls
		let drawItemCalls = 0;
		const mockImgData = {
			drawItem(type, ctx) {
				drawItemCalls++;
				assert.ok(typeof type === 'number');
				assert.ok(ctx);
			}
		};
		itemCtrl.getGame = () => ({ imgData: mockImgData, preset: { blockWidth: 50, blockHeight: 20 } });

		itemCtrl.onOpen();

		assert.equal(drawItemCalls, 17, 'Expected exactly 17 drawItem calls for all 17 game items');

		// Specific elements check
		const doubleCanvas = document.getElementById('help_item_double');
		assert.ok(doubleCanvas, 'help_item_double canvas should exist');
		assert.equal(doubleCanvas.getAttribute('data-item-type'), '0');

		const speedUpCanvas = document.getElementById('help_item_speed_up');
		assert.ok(speedUpCanvas, 'help_item_speed_up canvas should exist');
		assert.equal(speedUpCanvas.getAttribute('data-item-type'), '7');

		const speedDownCanvas = document.getElementById('help_item_speed_down');
		assert.ok(speedDownCanvas, 'help_item_speed_down canvas should exist');
		assert.equal(speedDownCanvas.getAttribute('data-item-type'), '8');

		const disturbCanvas = document.getElementById('help_item_disturb');
		assert.ok(disturbCanvas, 'help_item_disturb canvas should exist');
		assert.equal(disturbCanvas.getAttribute('data-item-type'), '15');

		const barrierCanvas = document.getElementById('help_item_barrier');
		assert.ok(barrierCanvas, 'help_item_barrier canvas should exist');
		assert.equal(barrierCanvas.getAttribute('data-item-type'), '16');

		itemCtrl.destructor();
		sm.destructor();
	});

	await t.test('ScreenManage openScreen triggers onOpen and renders previews with real ImageData', () => {
		const game = new GameManage();
		game.init(0);

		const sm = game.screenManage;
		sm.openScreen('screen_block');

		const blockScreen = document.getElementById('screen_block');
		assert.equal(blockScreen.style.display, 'block');

		const normalCanvas = document.getElementById('help_block_normal');
		assert.equal(normalCanvas.width, 50);
		assert.equal(normalCanvas.height, 20);

		sm.openScreen('screen_item');
		const itemScreen = document.getElementById('screen_item');
		assert.equal(itemScreen.style.display, 'block');

		const doubleCanvas = document.getElementById('help_item_double');
		assert.equal(doubleCanvas.width, 50);
		assert.equal(doubleCanvas.height, 20);

		sm.closeScreen('screen_block');
		sm.closeScreen('screen_item');
		game.destructor();
	});

	await t.test('applyPreset updates preview dimensions and re-renders', () => {
		const sm = new ScreenManage();
		const blockCtrl = sm.getController('screen_block');
		const itemCtrl = sm.getController('screen_item');

		let blockRendered = false;
		let itemRendered = false;

		blockCtrl.renderPreviews = () => { blockRendered = true; };
		itemCtrl.renderPreviews = () => { itemRendered = true; };

		const newPreset = {
			...PresetManage.getDefaultPreset(),
			blockWidth: 60,
			blockHeight: 25,
		};

		sm.applyPreset(newPreset);

		assert.ok(blockRendered, 'Block previews should re-render on applyPreset');
		assert.ok(itemRendered, 'Item previews should re-render on applyPreset');
		assert.equal(blockCtrl.preset.blockWidth, 60);
		assert.equal(itemCtrl.preset.blockWidth, 60);

		sm.destructor();
	});

	await t.test('BlockScreenControl.drawSpeedBlock renders on canvas context without error', () => {
		const blockCtrl = new BlockScreenControl(null);
		let filledText = '';
		let rectCalled = false;
		const mockCtx = {
			beginPath() {},
			rect() { rectCalled = true; },
			fill() {},
			stroke() {},
			fillText(t) { filledText = t; },
			set textBaseline(v) {},
			set textAlign(v) {},
			set font(v) {},
			set fillStyle(v) {},
			set strokeStyle(v) {},
		};

		blockCtrl.drawSpeedBlock(mockCtx, 50, 20);
		assert.ok(rectCalled, 'rect should be called');
		assert.equal(filledText, 'Speed', 'Speed text should be filled');

		blockCtrl.destructor();
	});
});
