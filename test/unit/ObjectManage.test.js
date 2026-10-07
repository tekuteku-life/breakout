// test/unit/ObjectManage.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import GameManage from '../../src/GameManage.js';
import ObjectManage from '../../src/ObjectManage.js';
import EventBus from '../../src/EventBus.js';
import Block from '../../src/Block.js';
import Ball from '../../src/Ball.js';
import Bar from '../../src/Bar.js';
import Item from '../../src/Item.js';
import Weapon from '../../src/Weapon.js';
import {
	BALL_CREATE_MODE,
	BALL_STATUS,
	ITEM_TYPE,
	BLOCK_FUNCTION,
	WEAPON_TYPE,
} from '../../src/const.js';

test('ObjectManage class unit tests', async (t) => {
	setupEnvironment();

	await t.test('initializes ObjectManage with empty collections and EventBus bindings', () => {
		const gm = new GameManage();
		const om = new ObjectManage(gm);

		assert.equal(om.bar, null);
		assert.deepEqual(om.balls, []);
		assert.deepEqual(om.items, []);
		assert.deepEqual(om.weapons, []);
		assert.deepEqual(om.balloons, []);
		assert.deepEqual(om.blockMap, []);
		assert.equal(om.eventBusSetup, true);

		om.destructor();
		gm.destructor();
	});

	await t.test('init(stageIndex) initializes Bar and loads blockMap from blockMapSet', () => {
		const gm = new GameManage();
		const mockBlock = new Block(1, 1, 1, 0, 1, 0, 0, gm);
		gm.blockMapSet = [
			{
				copyMap: () => [[mockBlock]],
			},
		];

		const om = new ObjectManage(gm);
		om.init(0);

		assert.ok(om.bar instanceof Bar);
		assert.equal(om.blockMap.length, 1);
		assert.equal(om.blockMap[0][0], mockBlock);

		om.destructor();
		gm.destructor();
	});

	await t.test('spawnItem resolves lineColor and color from stageIndex and game config when passed only { type, x, y }', () => {
		const gm = new GameManage();
		gm.ctrl = { stageIndex: 1 };
		gm.itemLineColor = [
			['#111111', '#222222', '#333333'],
			['#444444', '#555555', '#666666'],
		];
		gm.itemColor = [
			['#aaaaaa', '#bbbbbb', '#cccccc'],
			['#dddddd', '#eeeeee', '#ffffff'],
		];

		const om = new ObjectManage(gm);

		// Block passes only type, x, y (decoupled format)
		const item = om.spawnItem({ type: 1, x: 50, y: 80 });

		assert.ok(item instanceof Item);
		assert.equal(om.items.length, 1);
		assert.equal(item.type, 1);
		assert.equal(item.x, 50);
		assert.equal(item.y, 80);
		assert.equal(item.lineColor, '#555555');
		assert.equal(item.color, '#eeeeee');

		// Null input returns null
		assert.equal(om.spawnItem(null), null);

		// Explicit lineColor / color overrides
		const item2 = om.spawnItem({ type: 2, x: 20, y: 30, lineColor: '#red', color: '#blue' });
		assert.equal(item2.lineColor, '#red');
		assert.equal(item2.color, '#blue');

		om.destructor();
		gm.destructor();
	});

	await t.test('spawnWeapon spawns weapon and computes default y using bar.getTopY(), setting bar.weaponInter', () => {
		const gm = new GameManage();
		const om = new ObjectManage(gm);
		om.initBar();
		om.bar.weaponInter = 0;

		const weapon = om.spawnWeapon(1, 100);
		assert.ok(weapon instanceof Weapon);
		assert.equal(om.weapons.length, 1);
		assert.equal(weapon.x, 100);
		assert.equal(weapon.y, ~~(om.bar.getTopY()));
		assert.ok(om.bar.weaponInter > 0);

		// Enemy weapon with explicit y and negative vect
		const enemyWeapon = om.spawnWeapon(1, 150, 50, -1);
		assert.equal(enemyWeapon.y, 50);
		assert.equal(enemyWeapon.vect, -1);

		om.destructor();
		gm.destructor();
	});

	await t.test('launchBall launches and stores ball, spawnBalloon creates and stores balloon', () => {
		const gm = new GameManage();
		const om = new ObjectManage(gm);
		om.initBar();

		const ball = om.launchBall(Date.now());
		assert.ok(ball instanceof Ball);
		assert.equal(om.balls.length, 1);

		const balloon = om.spawnBalloon({
			text: '100',
			x: 50,
			y: 60,
			width: 30,
			height: 20,
			alpha: 1,
			backColor: '#fff',
			fontColor: '#000',
			fontSize: 12,
		});
		assert.ok(balloon !== null);
		assert.equal(om.balloons.length, 1);
		assert.equal(om.spawnBalloon(null), null);

		om.destructor();
		gm.destructor();
	});

	await t.test('applyBallItem handles DOUBLE, HARD, FIRE, SPEED_UP, SPEED_DOWN', () => {
		const gm = new GameManage();
		const om = new ObjectManage(gm);
		om.initBar();

		const b1 = om.launchBall();
		b1.vx = 4;
		b1.vy = -4;

		// 1. HARD
		om.applyBallItem(ITEM_TYPE.HARD);
		assert.equal(b1.status, BALL_STATUS.STRONG);

		// 2. FIRE
		om.applyBallItem(ITEM_TYPE.FIRE);
		assert.equal(b1.status, BALL_STATUS.ULTIMATE);

		// 3. SPEED_UP
		const prevVx = b1.vx;
		om.applyBallItem(ITEM_TYPE.SPEED_UP);
		assert.ok(Math.abs(b1.vx) > Math.abs(prevVx));

		// 4. SPEED_DOWN
		const boostedVx = b1.vx;
		om.applyBallItem(ITEM_TYPE.SPEED_DOWN);
		assert.ok(Math.abs(b1.vx) < Math.abs(boostedVx));

		// 5. DOUBLE
		om.applyBallItem(ITEM_TYPE.DOUBLE);
		assert.equal(om.balls.length, 2);

		om.destructor();
		gm.destructor();
	});

	await t.test('onBallAllLost clears items, weapons, reinitializes bar and emits status:addLife', () => {
		let lifeAdded = 0;
		EventBus.addOnEvent('status:addLife', (amount) => { lifeAdded = amount; });

		const gm = new GameManage();
		const om = new ObjectManage(gm);
		om.initBar();

		om.spawnItem({ type: 1, x: 10, y: 10 });
		om.spawnWeapon(1, 50, 50);
		assert.equal(om.items.length, 1);
		assert.equal(om.weapons.length, 1);

		om.onBallAllLost();

		assert.equal(om.items.length, 0);
		assert.equal(om.weapons.length, 0);
		assert.ok(om.bar instanceof Bar);
		assert.equal(lifeAdded, -1);

		om.destructor();
		gm.destructor();
	});

	await t.test('getNearbyBlocks and simulateReset operate correctly on blockMap', () => {
		const gm = new GameManage();
		gm.blockWidth = 50;
		gm.blockHeight = 20;
		gm.statusBarHeight = 30;

		const om = new ObjectManage(gm);
		let resetCalled = false;
		const block1 = new Block(1, 1, 1, 0, 1, 0, 0, gm);
		block1.simulateReset = () => { resetCalled = true; };
		om.blockMap = [[null, block1]];

		const nearby = om.getNearbyBlocks(75, 55, 30, 1, 1);
		assert.equal(nearby.length, 1);
		assert.equal(nearby[0], block1);

		om.simulateReset();
		assert.equal(resetCalled, true);

		om.destructor();
		gm.destructor();
	});

	await t.test('updateEntities, updateStates, updatePositions, applyFieldEffects, and resolveCollisions step physics', () => {
		const gm = new GameManage();
		const om = new ObjectManage(gm);
		om.initBar();

		let barStateUpdated = false;
		let barPositionMoved = false;
		om.bar.updateState = () => { barStateUpdated = true; };
		om.bar.movePosition = () => { barPositionMoved = true; };

		const ball = om.launchBall();
		let ballStateUpdated = false;
		let ballPositionMoved = false;
		ball.updateState = () => { ballStateUpdated = true; };
		ball.movePosition = () => { ballPositionMoved = true; };

		const item = om.spawnItem({ type: 0, x: 20, y: 20 });
		let itemStateUpdated = false;
		let itemPositionMoved = false;
		item.updateState = () => { itemStateUpdated = true; };
		item.movePosition = () => { itemPositionMoved = true; };

		const weapon = om.spawnWeapon(1, 30, 30);
		let weaponStateUpdated = false;
		let weaponPositionMoved = false;
		weapon.updateState = () => { weaponStateUpdated = true; };
		weapon.movePosition = () => { weaponPositionMoved = true; };

		const block = new Block(1, 1, 1, 0, 1, 0, 0, gm);
		let blockStateUpdated = false;
		let blockPositionMoved = false;
		block.updateState = () => { blockStateUpdated = true; };
		block.movePosition = () => { blockPositionMoved = true; };
		om.blockMap = [[block]];

		// updateEntities
		om.updateEntities();
		assert.equal(barStateUpdated, true);
		assert.equal(barPositionMoved, true);
		assert.equal(ballStateUpdated, true);
		assert.equal(ballPositionMoved, true);
		assert.equal(itemStateUpdated, true);
		assert.equal(itemPositionMoved, true);
		assert.equal(weaponStateUpdated, true);
		assert.equal(weaponPositionMoved, true);
		assert.equal(blockStateUpdated, true);
		assert.equal(blockPositionMoved, true);

		// applyFieldEffects with MAGNET block
		block.func = BLOCK_FUNCTION.MAGNET;
		let magnetApplied = false;
		block.applyMagneticForce = () => { magnetApplied = true; };
		om.applyFieldEffects();
		assert.equal(magnetApplied, true);

		// resolveCollisions (item vs bar)
		item.checkCollision = () => true;
		let effectApplied = false;
		item.applyEffect = () => { effectApplied = true; };
		om.resolveCollisions();
		assert.equal(effectApplied, true);

		om.destructor();
		gm.destructor();
	});

	await t.test('drawStatic and drawDynamic render objects and mounted weapons, removing ended balloons', () => {
		const gm = new GameManage();
		const om = new ObjectManage(gm);
		om.initBar();

		const mockCtx = createMock2DContext();

		let blockDrawn = false;
		const block = new Block(1, 1, 1, 0, 1, 0, 0, gm);
		block.draw = () => { blockDrawn = true; };
		block.exploded = 2; // exercise Cloud rendering
		om.blockMap = [[block]];

		om.drawStatic(mockCtx);
		assert.equal(blockDrawn, true);

		// Dynamic draw with mounted weapon and balloon
		om.bar.weapon = 1;
		const balloon = om.spawnBalloon({
			text: 'test',
			x: 10, y: 10, width: 20, height: 10,
			alpha: 1, backColor: '#fff', fontColor: '#000', fontSize: 10,
		});
		balloon.endFlag = true;

		om.drawDynamic(mockCtx);
		om.draw(mockCtx);
		// ended balloon should be removed
		assert.equal(om.balloons.length, 0);

		om.destructor();
		gm.destructor();
	});

	await t.test('subscribes and handles EventBus event triggers: item:spawn, weapon:spawn, balloon:spawn, ball:launch, ball:applyItem, ball:allLost', () => {
		const gm = new GameManage();
		const om = new ObjectManage(gm);
		om.initBar();

		// item:spawn
		EventBus.emitEvent('item:spawn', { type: 3, x: 20, y: 40 });
		assert.equal(om.items.length, 1);

		// weapon:spawn
		EventBus.emitEvent('weapon:spawn', { type: 1, x: 60 });
		assert.equal(om.weapons.length, 1);

		// balloon:spawn
		EventBus.emitEvent('balloon:spawn', {
			text: 'hit', x: 10, y: 20, width: 20, height: 10, alpha: 1, backColor: '#000', fontColor: '#fff', fontSize: 10
		});
		assert.equal(om.balloons.length, 1);

		// ball:launch
		EventBus.emitEvent('ball:launch', { mouseDownTime: 1234 });
		assert.equal(om.balls.length, 1);

		// ball:applyItem
		EventBus.emitEvent('ball:applyItem', ITEM_TYPE.HARD);
		assert.equal(om.balls[0].status, BALL_STATUS.STRONG);

		// ball:allLost
		EventBus.emitEvent('ball:allLost');
		assert.equal(om.items.length, 0);
		assert.equal(om.weapons.length, 0);

		om.destructor();
		gm.destructor();
	});

	await t.test('updatePositions and updateStates can be called independently without cross-interference', () => {
		const gm = new GameManage();
		const om = new ObjectManage(gm);
		om.initBar();

		let posCalled = false;
		let stateCalled = false;
		om.bar.movePosition = () => { posCalled = true; };
		om.bar.updateState = () => { stateCalled = true; };

		// Call updatePositions only
		om.updatePositions();
		assert.equal(posCalled, true);
		assert.equal(stateCalled, false, 'updatePositions must not call updateState');

		// Reset flags and call updateStates only
		posCalled = false;
		stateCalled = false;
		om.updateStates();
		assert.equal(posCalled, false, 'updateStates must not call movePosition');
		assert.equal(stateCalled, true);

		om.destructor();
		gm.destructor();
	});
});
