import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import Bar from '../../src/Bar.js';
import Block from '../../src/Block.js';
import Weapon from '../../src/Weapon.js';
import Item from '../../src/Item.js';
import ObjectManage from '../../src/ObjectManage.js';
import GameManage from '../../src/GameManage.js';
import EventBus from '../../src/EventBus.js';
import PresetManage from '../../src/PresetManage.js';
import ItemScreenControl from '../../src/screens/ItemScreenControl.js';
import ScreenManage from '../../src/ScreenManage.js';
import { ITEM_TYPE, BLOCK_FUNCTION, WEAPON_TYPE } from '../../src/const.js';

test('Barrier Item and Shield Effect unit tests', async (t) => {
	setupEnvironment();

	await t.test('ITEM_TYPE.BARRIER is defined as 16 and preset item metadata is resolved', () => {
		assert.equal(ITEM_TYPE.BARRIER, 16);

		const defaultPreset = PresetManage.getDefaultPreset();
		assert.ok(defaultPreset.itemText[0].length >= 17);
		assert.equal(defaultPreset.itemText[0][ITEM_TYPE.BARRIER], 'Barrier');
		assert.equal(defaultPreset.itemColor[0][ITEM_TYPE.BARRIER], '#00e5ff');
		assert.equal(defaultPreset.itemTextColor[0][ITEM_TYPE.BARRIER], '#003366');
		assert.equal(defaultPreset.itemLineColor[0][ITEM_TYPE.BARRIER], '#ffffff');
	});

	await t.test('Bar barrier lifecycle: activation, hasBarrier, EventBus timer countdown, and reset', () => {
		EventBus.destructor();
		const mockGame = {
			FPS: 50,
			barDefaultWidth: 80,
			canvasWidth: 750,
			barDefaultSpeed: 75,
			barDefaultHeight: 7,
			barColor: '#114400',
			barStatusDefaultTime: 10,
		};
		const bar = new Bar(mockGame);
		assert.equal(bar.hasBarrier(), false);
		assert.equal(bar.barrierStatusTime, 0);

		// Apply BARRIER item
		bar.applyItemEffect(ITEM_TYPE.BARRIER);
		assert.equal(bar.hasBarrier(), true);
		assert.equal(bar.barrierStatusTime, 500); // 10s * 50 FPS

		// Timer countdown
		EventBus.tickTimers(5000); // 5 seconds elapsed
		assert.equal(bar.hasBarrier(), true);
		assert.ok(bar.barrierStatusTime <= 250);

		// Clone should preserve barrier status
		const cloned = bar.clone();
		assert.equal(cloned.hasBarrier(), true);
		assert.equal(cloned.barrierStatusTime, bar.barrierStatusTime);

		// Reset barrier
		bar.resetBarrier();
		assert.equal(bar.hasBarrier(), false);
		assert.equal(bar.barrierStatusTime, 0);

		// Expire timer
		bar.applyItemEffect(ITEM_TYPE.BARRIER);
		assert.equal(bar.hasBarrier(), true);
		EventBus.tickTimers(10500);
		assert.equal(bar.hasBarrier(), false);
		assert.equal(bar.barrierStatusTime, 0);

		bar.destructor();
	});

	await t.test('Bar.draw renders visual barrier effect above the bar when active and handles blinking', () => {
		const mockGame = {
			FPS: 50,
			barDefaultWidth: 80,
			canvasWidth: 750,
			barDefaultSpeed: 75,
			barDefaultHeight: 7,
			barColor: '#114400',
			barStatusDefaultTime: 10,
			barBlinkTimeRatio: 0.2,
		};
		const bar = new Bar(mockGame);

		const strokeStyles = [];
		const fillStyles = [];
		const mockCtx = createMock2DContext();
		const origStroke = mockCtx.stroke;
		const origFill = mockCtx.fill;

		mockCtx.stroke = function () {
			strokeStyles.push(mockCtx.strokeStyle);
			return origStroke.apply(this, arguments);
		};
		mockCtx.fill = function () {
			fillStyles.push(mockCtx.fillStyle);
			return origFill.apply(this, arguments);
		};

		// 1. Without barrier: no barrier strokes or fills
		bar.barrierStatusTime = 0;
		bar.draw(mockCtx);
		assert.ok(!strokeStyles.includes('#00e5ff'), 'Should not render barrier stroke when inactive');

		// 2. With barrier active: barrier strokes and fills rendered
		strokeStyles.length = 0;
		fillStyles.length = 0;
		bar.barrierStatusTime = 400; // Well above blink threshold (10 * 50 * 0.2 = 100)
		bar.draw(mockCtx);
		assert.ok(strokeStyles.includes('#00e5ff'), 'Should render cyan barrier outline when active');
		assert.ok(fillStyles.some(s => typeof s === 'string' && s.includes('0, 229, 255')), 'Should render semi-transparent energy field fill');

		// 3. Blinking near expiration
		strokeStyles.length = 0;
		bar.barrierStatusTime = 90; // Inside blink threshold (100)
		bar.draw(mockCtx);
		// 90 / 3 = 30 -> 30 % 2 === 0 -> visible phase
		assert.ok(strokeStyles.includes('#00e5ff'));

		strokeStyles.length = 0;
		bar.barrierStatusTime = 93; // 93 / 3 = 31 -> 31 % 2 === 1 -> invisible (blinked off) phase
		bar.draw(mockCtx);
		assert.ok(!strokeStyles.includes('#00e5ff'), 'Barrier should blink off on alternate frames near expiration');

		bar.destructor();
	});

	await t.test('ObjectManage deflects enemy weapons upwards when bar has barrier and hits blocks', () => {
		const game = new GameManage();
		game.init(0);

		const objMng = game.objectManage;
		const bar = objMng.bar;
		bar.x = 200;
		bar.y = 500;
		bar.hitPoint = 5;

		const emittedEvents = [];
		const origEmit = EventBus.emitEvent;
		EventBus.emitEvent = (name, data) => {
			emittedEvents.push({ name, data });
			return origEmit.call(EventBus, name, data);
		};

		try {
			// 1. Enemy weapon hits bar WITHOUT barrier
			bar.barrierStatusTime = 0;
			const enemyWeapon1 = new Weapon(1, bar.getCenterX(), bar.getTopY(), -1, game);
			objMng.weapons = [enemyWeapon1];
			assert.ok(enemyWeapon1.checkCollision(bar));

			objMng.resolveCollisions();
			assert.equal(bar.hitPoint, 4, 'Bar should take 1 damage without barrier');
			assert.equal(objMng.weapons.length, 0, 'Enemy weapon should be destroyed on collision without barrier');
			assert.ok(emittedEvents.some(e => e.name === 'balloon:spawn' && e.data.text === 4));

			// 2. Enemy weapon hits bar WITH barrier
			emittedEvents.length = 0;
			bar.barrierStatusTime = 300;
			const enemyWeapon2 = new Weapon(1, bar.getCenterX(), bar.getTopY(), -1, game);
			objMng.weapons = [enemyWeapon2];
			assert.ok(enemyWeapon2.checkCollision(bar));

			objMng.resolveCollisions();
			assert.equal(bar.hitPoint, 4, 'Bar should NOT take damage when barrier is active');
			assert.equal(objMng.weapons.length, 1, 'Enemy weapon should NOT be destroyed; it is deflected');
			assert.equal(enemyWeapon2.vect, 1, 'Deflected weapon should have vect flipped to 1 (moving upwards)');
			assert.ok(enemyWeapon2.y < bar.getTopY(), 'Deflected weapon position should be adjusted above the bar');
			assert.ok(emittedEvents.some(e => e.name === 'sound:play' && e.data === 'spBlock'), 'Deflection sound should play');
			assert.ok(emittedEvents.some(e => e.name === 'balloon:spawn' && e.data.text === 'Reflect!'), 'Reflect balloon should spawn');

			// 3. Deflected weapon moves upwards and destroys destructible block
			const targetBlock = new Block(0, 0, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, game);
			objMng.blockMap = [[targetBlock]];
			enemyWeapon2.x = targetBlock.getCenterX();
			enemyWeapon2.y = targetBlock.getBottomY() + 2;
			enemyWeapon2.vy = 4;
			enemyWeapon2.movePosition(); // moves upwards: y -= 4 * 1
			assert.ok(enemyWeapon2.checkCollision(targetBlock));

			objMng.resolveCollisions();
			assert.equal(objMng.weapons.length, 0, 'Reflected weapon should be consumed after hitting target block');
		} finally {
			EventBus.emitEvent = origEmit;
		}
	});

	await t.test('ObjectManage guards against harmful negative items when bar has barrier and permits positive items', () => {
		const game = new GameManage();
		game.init(0);

		const objMng = game.objectManage;
		const bar = objMng.bar;
		bar.x = 200;
		bar.y = 500;
		bar.width = 80;
		const initialWidth = bar.width;
		const initialLife = game.life;

		const emittedEvents = [];
		const origEmit = EventBus.emitEvent;
		EventBus.emitEvent = (name, data) => {
			emittedEvents.push({ name, data });
			return origEmit.call(EventBus, name, data);
		};

		try {
			bar.barrierStatusTime = 400;

			// Harmful items list
			const negativeItems = [
				ITEM_TYPE.SHORT,
				ITEM_TYPE.POISON,
				ITEM_TYPE.SPEED_DOWN,
				ITEM_TYPE.SLOW,
				ITEM_TYPE.VIBRATE,
				ITEM_TYPE.DISTURB,
			];

			for (const itemType of negativeItems) {
				emittedEvents.length = 0;
				const badItem = new Item(itemType, bar.getCenterX(), bar.getTopY() + 1, '#fff', '#000', game);
				objMng.items = [badItem];

				assert.ok(badItem.checkCollision(bar));
				objMng.resolveCollisions();

				assert.equal(objMng.items.length, 0, `Item type ${itemType} should be removed after collision`);
				assert.ok(emittedEvents.some(e => e.name === 'sound:play' && e.data === 'spBlock'), `Item type ${itemType} should trigger deflection sound`);
				assert.ok(emittedEvents.some(e => e.name === 'balloon:spawn' && e.data.text === 'Guard!'), `Item type ${itemType} should spawn Guard! balloon`);
				assert.equal(bar.width, initialWidth, `Bar width should not shrink from type ${itemType}`);
				assert.equal(game.life, initialLife, `Life should not decrease from type ${itemType}`);
			}

			// Positive items should still apply normally
			emittedEvents.length = 0;
			const goodItem = new Item(ITEM_TYPE.LONG, bar.getCenterX(), bar.getTopY() + 1, '#fff', '#000', game);
			objMng.items = [goodItem];

			assert.ok(goodItem.checkCollision(bar));
			objMng.resolveCollisions();

			assert.equal(objMng.items.length, 0);
			assert.ok(bar.width > initialWidth, 'Positive item (LONG) should apply effect and extend bar width even with barrier active');
		} finally {
			EventBus.emitEvent = origEmit;
		}
	});

	await t.test('Stages with Attack blocks drop barrier item 2 to 3 times, while other stages have 0 probability', () => {
		const blockmapData = PresetManage.getDefaultPreset();
		const stages = blockmapData.stageTitle;

		const attackStageIdx = stages.indexOf('Attack');
		const hybridStageIdx = stages.indexOf('Hybrid');
		assert.ok(attackStageIdx >= 0, 'Attack stage should exist');
		assert.ok(hybridStageIdx >= 0, 'Hybrid stage should exist');

		// Probability definitions in blockmap
		assert.equal(blockmapData.itemProb[attackStageIdx][ITEM_TYPE.BARRIER], '0.035');
		assert.equal(blockmapData.itemProb[hybridStageIdx][ITEM_TYPE.BARRIER], '0.035');

		// Verify non-attack stages have '0'
		for (let s = 0; s < stages.length; s++) {
			if (s !== attackStageIdx && s !== hybridStageIdx) {
				assert.equal(blockmapData.itemProb[s][ITEM_TYPE.BARRIER], '0', `Stage ${stages[s]} should have 0 barrier item probability`);
			}
		}

		// Simulate main.js item generation logic for Attack stage (80 destructible blocks)
		const attackBlocks = 80;
		const attackProb = Number(blockmapData.itemProb[attackStageIdx][ITEM_TYPE.BARRIER]) * attackBlocks;
		assert.ok(Math.abs(attackProb - 2.8) < 0.001);
		// Guaranteed 2 items, 80% chance of 3rd item -> always 2 or 3 items!
		let attackBarrierItemCount = 0;
		let prob = attackProb;
		while (prob >= 1) {
			attackBarrierItemCount++;
			prob -= 1;
		}
		assert.equal(attackBarrierItemCount, 2, 'Attack stage should have at least 2 guaranteed barrier items');
		assert.ok(prob >= 0.8 && prob < 1.0, 'Remaining probability should be 0.8 for the 3rd item');

		// Simulate main.js item generation logic for Hybrid stage (71 destructible blocks)
		const hybridBlocks = 71;
		const hybridProb = Number(blockmapData.itemProb[hybridStageIdx][ITEM_TYPE.BARRIER]) * hybridBlocks;
		assert.ok(Math.abs(hybridProb - 2.485) < 0.001);
		let hybridBarrierItemCount = 0;
		prob = hybridProb;
		while (prob >= 1) {
			hybridBarrierItemCount++;
			prob -= 1;
		}
		assert.equal(hybridBarrierItemCount, 2, 'Hybrid stage should have at least 2 guaranteed barrier items');
		assert.ok(Math.abs(prob - 0.485) < 0.001, 'Remaining probability should be ~0.485 for the 3rd item');
	});

	await t.test('Help screen includes barrier item preview canvas and description', () => {
		const sm = new ScreenManage();
		const itemCtrl = new ItemScreenControl(sm, 'screen_item');

		const barrierCanvas = document.getElementById('help_item_barrier');
		assert.ok(barrierCanvas, 'help_item_barrier canvas should exist in DOM');
		assert.equal(barrierCanvas.getAttribute('data-item-type'), '16');

		let renderedType = null;
		const mockImgData = {
			drawItem(type, ctx) {
				if (type === 16) {
					renderedType = type;
				}
			}
		};
		itemCtrl.getGame = () => ({ imgData: mockImgData, preset: { blockWidth: 50, blockHeight: 20 } });
		itemCtrl.onOpen();

		assert.equal(renderedType, 16, 'ItemScreenControl should render barrier item (type 16) to preview canvas');

		itemCtrl.destructor();
		sm.destructor();
	});
});
