// test/integration/itemBar.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';
import Item from '../../src/Item.js';
import Block from '../../src/Block.js';
import Ball from '../../src/Ball.js';
import EventBus from '../../src/EventBus.js';
import { BLOCK_FUNCTION, BALL_STATUS, BALL_CREATE_MODE } from '../../src/const.js';

describe('Integration Test: Item Spawning, Bar Collisions, and Status Effects', () => {
	beforeEach(() => {
		setupEnvironment();
		window.gameManage.init(0);
		clearInterval(window.timer_All);
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('spawns item on block break and falls with gravity', () => {
		const g = window.gameManage;
		const block = new Block(5, 4, 1, BLOCK_FUNCTION.NORMAL, 1, 0, 0, g);
		block.item = 0; // Ball duplicate item
		g.objectManage.items = [];

		// Break block
		block.break(null);
		assert.equal(g.objectManage.items.length, 1, 'Item should be spawned upon block break');

		const item = g.objectManage.items[0];
		assert.equal(item.type, 0);
		const initialY = item.y;

		// Move item
		item.move();
		assert.ok(item.y > initialY, 'Item should fall downwards');
	});

	it('destroys item when falling below canvas height', () => {
		const g = window.gameManage;
		const item = new Item(0, 100, g.canvasHeight + 10, '#000', '#fff', g);
		g.objectManage.items = [item];
		item.move();
		assert.equal(g.objectManage.items.length, 0, 'Item falling below canvas should be removed');
	});

	it('triggers collision when bar catches falling item', () => {
		const g = window.gameManage;
		const bar = g.objectManage.bar;
		bar.x = 200;
		bar.y = 500;
		bar.width = 100;
		bar.height = 15;

		// Item positioned right above bar
		const item = new Item(0, bar.getCenterX(), bar.getTopY() - 5, '#000', '#fff', g);
		g.objectManage.items = [item];

		// Check collision logic
		assert.ok(item.checkCollision(bar));

		// Move should detect collision, apply effect and remove item
		const initialScoreAward = g.scoreMng.awardNum.getItemNum;
		item.move();
		g.objectManage.resolveCollisions();
		assert.equal(g.objectManage.items.length, 0, 'Item should be consumed upon bar collision');
		assert.equal(g.scoreMng.awardNum.getItemNum, initialScoreAward + 1);
	});

	it('applies ball multiplication item (type 0) up to ballMaxNum', () => {
		const g = window.gameManage;
		const ballMaxNum = g.ballMaxNum || 4;
		g.objectManage.balls = [new Ball(BALL_CREATE_MODE.INIT, g)];
		const item = new Item(0, g.objectManage.bar.x, g.objectManage.bar.y, '#000', '#fff', g);
		item.applyEffect();
		assert.equal(g.objectManage.balls.length, 2, 'Ball count should double');

		// Duplicate again
		item.applyEffect();
		assert.equal(g.objectManage.balls.length, 4);

		// Clamp test at ballMaxNum
		g.objectManage.balls = [];
		for (let i = 0; i < ballMaxNum; i++) {
			g.objectManage.balls.push(new Ball(BALL_CREATE_MODE.INIT, g));
		}
		item.applyEffect();
		assert.equal(g.objectManage.balls.length, ballMaxNum, 'Ball count should not exceed ballMaxNum');
	});

	it('applies strong ball (type 1) and ultimate ball (type 2) status', () => {
		const g = window.gameManage;
		const ball = new Ball(BALL_CREATE_MODE.INIT, g);
		g.objectManage.balls = [ball];

		// Strong ball
		const strongItem = new Item(1, g.objectManage.bar.x, g.objectManage.bar.y, '#000', '#fff', g);
		strongItem.applyEffect();
		assert.equal(ball.status, BALL_STATUS.STRONG);
		assert.ok(ball.statusTime > 0);

		// Ultimate ball
		const ultimateItem = new Item(2, g.objectManage.bar.x, g.objectManage.bar.y, '#000', '#fff', g);
		ultimateItem.applyEffect();
		assert.equal(ball.status, BALL_STATUS.ULTIMATE);
		assert.ok(ball.statusTime > 0);
	});

	it('applies bar width modification items (type 3: expand, type 4: shrink)', () => {
		const g = window.gameManage;
		const bar = g.objectManage.bar;
		const barMaxWidth = g.barMaxWidth || 140;
		const barMinWidth = g.barMinWidth || 50;
		bar.width = 100;

		// Expand width
		const expandItem = new Item(3, bar.x, bar.y, '#000', '#fff', g);
		expandItem.applyEffect();
		assert.equal(bar.width, 130);
		assert.ok(bar.widthStatusTime > 0);

		// Expand clamp to max
		bar.width = barMaxWidth - 10;
		expandItem.applyEffect();
		assert.equal(bar.width, barMaxWidth);

		// Shrink width
		const shrinkItem = new Item(4, bar.x, bar.y, '#000', '#fff', g);
		shrinkItem.applyEffect();
		assert.ok(bar.width < barMaxWidth);
		assert.ok(bar.widthStatusTime > 0);

		// Shrink clamp to min
		bar.width = barMinWidth + 5;
		shrinkItem.applyEffect();
		assert.equal(bar.width, barMinWidth);
	});

	it('applies life modification items (type 5: life+1, type 6: life-1)', () => {
		const g = window.gameManage;
		const initialLife = g.statusMng.life;

		const healItem = new Item(5, g.objectManage.bar.x, g.objectManage.bar.y, '#000', '#fff', g);
		healItem.applyEffect();
		assert.equal(g.statusMng.life, initialLife + 1);

		const hurtItem = new Item(6, g.objectManage.bar.x, g.objectManage.bar.y, '#000', '#fff', g);
		hurtItem.applyEffect();
		assert.equal(g.statusMng.life, initialLife);
	});

	it('applies ball speed modification items (type 7: speed up, type 8: speed down)', () => {
		const g = window.gameManage;
		const ball = new Ball(BALL_CREATE_MODE.INIT, g);
		ball.vx = 4;
		ball.vy = -4;
		g.objectManage.balls = [ball];

		const speedUpItem = new Item(7, g.objectManage.bar.x, g.objectManage.bar.y, '#000', '#fff', g);
		speedUpItem.applyEffect();
		assert.ok(Math.abs(ball.vx) >= 4);

		const speedDownItem = new Item(8, g.objectManage.bar.x, g.objectManage.bar.y, '#000', '#fff', g);
		speedDownItem.applyEffect();
		assert.ok(Math.abs(ball.vx) <= 10);
	});

	it('equips bar with weapons (type 9: gun, type 10: missile)', () => {
		const g = window.gameManage;
		const bar = g.objectManage.bar;

		// Gun item
		const gunItem = new Item(9, bar.x, bar.y, '#000', '#fff', g);
		gunItem.applyEffect();
		assert.equal(bar.weapon, 1);
		assert.ok(bar.weaponTime > 0);

		// Missile item
		const missileItem = new Item(10, bar.x, bar.y, '#000', '#fff', g);
		missileItem.applyEffect();
		assert.equal(bar.weapon, 2);
		assert.ok(bar.weaponTime > 0);
	});

	it('applies bar mobility and status items (type 11: slow, type 12: vibrate, type 13: magnet, type 14: immortal, type 15: disturb)', () => {
		const g = window.gameManage;
		const bar = g.objectManage.bar;
		const barDefaultSpeed = g.barDefaultSpeed || 75;
		const barMinSpeed = g.barMinSpeed || 10;
		const barImmortalColor = g.barImmortalColor || '#ffff00';

		// Type 11: Slow
		const slowItem = new Item(11, bar.x, bar.y, '#000', '#fff', g);
		slowItem.applyEffect();
		assert.ok(bar.vxMax < barDefaultSpeed || bar.vxMax === barMinSpeed);
		assert.ok(bar.speedStatusTime > 0);

		// Type 12: Vibration
		const vibrateItem = new Item(12, bar.x, bar.y, '#000', '#fff', g);
		vibrateItem.applyEffect();
		assert.ok(bar.vibrationTime > 0);

		// Type 13: Absorption
		const magnetItem = new Item(13, bar.x, bar.y, '#000', '#fff', g);
		magnetItem.applyEffect();
		assert.ok(bar.absorptionStatusTime > 0);

		// Type 14: Immortal
		const immortalItem = new Item(14, bar.x, bar.y, '#000', '#fff', g);
		immortalItem.applyEffect();
		assert.ok(bar.immortalStatusTime > 0);
		assert.equal(bar.color, barImmortalColor);

		// Type 15: Disturb
		const disturbItem = new Item(15, bar.x, bar.y, '#000', '#fff', g);
		disturbItem.applyEffect();
		assert.ok(bar.disturbStatusTime > 0);
	});

	it('resets bar status when status effect timers expire via EventBus or reset methods', () => {
		const g = window.gameManage;
		const bar = g.objectManage.bar;
		const barDefaultWidth = g.barDefaultWidth || 80;
		const barDefaultSpeed = g.barDefaultSpeed || 75;
		const barDefaultHeight = g.barDefaultHeight || 7;
		const barImmortalColor = g.barImmortalColor || '#ffff00';
		const barColor = g.barColor || '#114400';

		// Width timer expiration via EventBus
		bar.applyItemEffect(3); // LONG
		assert.ok(bar.width > barDefaultWidth);
		EventBus.tickTimers(15000);
		assert.equal(bar.width, barDefaultWidth, 'Width should reset to default');

		// Speed timer expiration via EventBus
		bar.applyItemEffect(11); // SLOW
		assert.ok(bar.vxMax < barDefaultSpeed);
		EventBus.tickTimers(15000);
		assert.equal(bar.vxMax, barDefaultSpeed, 'Speed should reset to default');
		assert.equal(bar.height, barDefaultHeight, 'Height should reset to default');

		// Weapon timer expiration via EventBus
		bar.applyItemEffect(9); // GUN
		assert.equal(bar.weapon, 1);
		EventBus.tickTimers(15000);
		assert.equal(bar.weapon, 0, 'Weapon should reset to 0');

		// Immortal timer expiration via EventBus
		bar.applyItemEffect(14); // IMMORTAL
		assert.equal(bar.color, barImmortalColor);
		EventBus.tickTimers(15000);
		assert.equal(bar.color, barColor, 'Bar color should reset to default');

		// Disturb timer expiration via EventBus
		bar.applyItemEffect(15); // DISTURB
		assert.ok(bar.disturbStatusTime > 0);
		EventBus.tickTimers(15000);
		assert.equal(bar.disturbStatusTime, 0);

		// Absorption timer expiration relaunches absorbed balls
		bar.applyItemEffect(13); // ABSORB
		const ball = new Ball(BALL_CREATE_MODE.INIT, g);
		ball.isAbsorption = 1;
		g.objectManage.balls = [ball];
		bar.absorptionNum = 1;
		EventBus.tickTimers(15000);
		assert.equal(bar.absorptionNum, 0, 'Absorbed balls should be relaunched');
		assert.equal(ball.isAbsorption, 0);
	});

	it('exercises autoPlay.step() dodging harmful items and targeting beneficial items', () => {
		const g = window.gameManage;
		const input = window.inputManage;
		const bar = g.objectManage.bar;
		bar.x = 300;
		bar.y = 500;
		g.objectManage.balls = [new Ball(BALL_CREATE_MODE.INIT, g)];
		g.objectManage.balls[0].y = 100;
		g.objectManage.balls[0].vy = 2;

		// 1. Beneficial item falling nearby
		const goodItem = new Item(0, 320, 400, '#000', '#fff', g);
		g.objectManage.items = [goodItem];
		g.autoPlay.step();
		assert.ok(input.pointX !== undefined);

		// 2. Harmful item (type 6: life decrease) falling right above bar
		const badItem = new Item(6, bar.getCenterX(), bar.y - 15, '#000', '#fff', g);
		g.objectManage.items = [badItem];
		g.autoPlay.step();
		// AI should attempt to steer away from the bad item
		assert.ok(Math.abs(input.pointX - badItem.getCenterX()) >= 0);

		// 3. Harmful item near left/right screen boundary
		badItem.x = 10;
		g.autoPlay.step();

		badItem.x = g.canvasWidth - 10;
		g.autoPlay.step();
	});

	it('draws items and bar absorption graphics without errors', () => {
		const g = window.gameManage;
		const item = new Item(0, 100, 100, '#000', '#fff', g);
		item.draw(g.staticCtx);

		// Draw bar with absorption effects active
		const bar = g.objectManage.bar;
		bar.absorptionStatusTime = 100;
		bar.draw(g.staticCtx);
		bar.absorptionStatusTime = 0;
	});

	it('returns duplicated balls to normal state over time when cloned in special status', () => {
		const g = window.gameManage;
		const ball = new Ball(BALL_CREATE_MODE.INIT, g);
		g.objectManage.balls = [ball];

		// Apply HARD status (type 1)
		const hardItem = new Item(1, g.objectManage.bar.x, g.objectManage.bar.y, '#000', '#fff', g);
		hardItem.applyEffect();
		assert.equal(ball.status, BALL_STATUS.STRONG);

		// Duplicate balls (type 0: DOUBLE)
		const doubleItem = new Item(0, g.objectManage.bar.x, g.objectManage.bar.y, '#000', '#fff', g);
		doubleItem.applyEffect();
		assert.equal(g.objectManage.balls.length, 2);
		assert.equal(g.objectManage.balls[0].status, BALL_STATUS.STRONG);
		assert.equal(g.objectManage.balls[1].status, BALL_STATUS.STRONG);

		// Advance timer past status duration
		const statusDurationMs = (g.ballStatusTime || 10) * 1000 + 100;
		EventBus.tickTimers(statusDurationMs);

		// Both original and duplicated balls should return to NORMAL
		assert.equal(g.objectManage.balls[0].status, BALL_STATUS.NORMAL);
		assert.equal(g.objectManage.balls[1].status, BALL_STATUS.NORMAL);
	});
});
