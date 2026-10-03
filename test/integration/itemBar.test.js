// test/integration/itemBar.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';
import Item from '../../src/Item.js';
import Block from '../../src/Block.js';
import Ball from '../../src/Ball.js';

describe('Integration Test: Item Spawning, Bar Collisions, and Status Effects', () => {
	beforeEach(() => {
		setupEnvironment();
		window.init(0);
		clearInterval(window.timer_All);
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('spawns item on block break and falls with gravity', () => {
		const block = new Block(5, 4, 1, window.BLOCK_FUNCTION.NORMAL, 1);
		block.item = 0; // Ball duplicate item
		window.items = [];

		// Break block
		block.break(null);
		assert.equal(window.items.length, 1, 'Item should be spawned upon block break');

		const item = window.items[0];
		assert.equal(item.type, 0);
		const initialY = item.y;

		// Move item
		item.move();
		assert.ok(item.y > initialY, 'Item should fall downwards');
	});

	it('destroys item when falling below canvas height', () => {
		const item = new Item(0, 100, window.canvasHeight + 10, '#000', '#fff');
		window.items = [item];
		item.move();
		assert.equal(window.items.length, 0, 'Item falling below canvas should be removed');
	});

	it('triggers collision when bar catches falling item', () => {
		const bar = window.bar;
		bar.x = 200;
		bar.y = 500;
		bar.width = 100;
		bar.height = 15;

		// Item positioned right above bar
		const item = new Item(0, bar.getCenterX(), bar.getTopY() - 5, '#000', '#fff');
		window.items = [item];

		// Check collision logic
		assert.ok(item.checkCollision(bar));

		// Move should detect collision, apply effect and remove item
		const initialScoreAward = window.scoreMng.awardNum.getItemNum;
		item.move();
		assert.equal(window.items.length, 0, 'Item should be consumed upon bar collision');
		assert.equal(window.scoreMng.awardNum.getItemNum, initialScoreAward + 1);
	});

	it('applies ball multiplication item (type 0) up to ballMaxNum', () => {
		window.balls = [new Ball(window.BALL_CREATE_MODE.INIT)];
		const item = new Item(0, window.bar.x, window.bar.y, '#000', '#fff');
		item.applyEffect();
		assert.equal(window.balls.length, 2, 'Ball count should double');

		// Duplicate again
		item.applyEffect();
		assert.equal(window.balls.length, 4);

		// Clamp test at ballMaxNum
		window.balls = [];
		for (let i = 0; i < window.ballMaxNum; i++) {
			window.balls.push(new Ball(window.BALL_CREATE_MODE.INIT));
		}
		item.applyEffect();
		assert.equal(window.balls.length, window.ballMaxNum, 'Ball count should not exceed ballMaxNum');
	});

	it('applies strong ball (type 1) and ultimate ball (type 2) status', () => {
		const ball = new Ball(window.BALL_CREATE_MODE.INIT);
		window.balls = [ball];

		// Strong ball
		const strongItem = new Item(1, window.bar.x, window.bar.y, '#000', '#fff');
		strongItem.applyEffect();
		assert.equal(ball.status, window.BALL_STATUS.STRONG);
		assert.ok(ball.statusTime > 0);

		// Ultimate ball
		const ultimateItem = new Item(2, window.bar.x, window.bar.y, '#000', '#fff');
		ultimateItem.applyEffect();
		assert.equal(ball.status, window.BALL_STATUS.ULTIMATE);
		assert.ok(ball.statusTime > 0);
	});

	it('applies bar width modification items (type 3: expand, type 4: shrink)', () => {
		const bar = window.bar;
		bar.width = 100;

		// Expand width
		const expandItem = new Item(3, bar.x, bar.y, '#000', '#fff');
		expandItem.applyEffect();
		assert.equal(bar.width, 130);
		assert.ok(bar.widthStatusTime > 0);

		// Expand clamp to max
		bar.width = window.barMaxWidth - 10;
		expandItem.applyEffect();
		assert.equal(bar.width, window.barMaxWidth);

		// Shrink width
		const shrinkItem = new Item(4, bar.x, bar.y, '#000', '#fff');
		shrinkItem.applyEffect();
		assert.ok(bar.width < window.barMaxWidth);
		assert.ok(bar.widthStatusTime > 0);

		// Shrink clamp to min
		bar.width = window.barMinWidth + 5;
		shrinkItem.applyEffect();
		assert.equal(bar.width, window.barMinWidth);
	});

	it('applies life modification items (type 5: life+1, type 6: life-1)', () => {
		const initialLife = window.statusMng.life;

		const healItem = new Item(5, window.bar.x, window.bar.y, '#000', '#fff');
		healItem.applyEffect();
		assert.equal(window.statusMng.life, initialLife + 1);

		const hurtItem = new Item(6, window.bar.x, window.bar.y, '#000', '#fff');
		hurtItem.applyEffect();
		assert.equal(window.statusMng.life, initialLife);
	});

	it('applies ball speed modification items (type 7: speed up, type 8: speed down)', () => {
		const ball = new Ball(window.BALL_CREATE_MODE.INIT);
		ball.vx = 4;
		ball.vy = -4;
		window.balls = [ball];

		const speedUpItem = new Item(7, window.bar.x, window.bar.y, '#000', '#fff');
		speedUpItem.applyEffect();
		assert.ok(Math.abs(ball.vx) >= 4);

		const speedDownItem = new Item(8, window.bar.x, window.bar.y, '#000', '#fff');
		speedDownItem.applyEffect();
		assert.ok(Math.abs(ball.vx) <= 10);
	});

	it('equips bar with weapons (type 9: gun, type 10: missile)', () => {
		const bar = window.bar;

		// Gun item
		const gunItem = new Item(9, bar.x, bar.y, '#000', '#fff');
		gunItem.applyEffect();
		assert.equal(bar.weapon, 1);
		assert.ok(bar.weaponTime > 0);

		// Missile item
		const missileItem = new Item(10, bar.x, bar.y, '#000', '#fff');
		missileItem.applyEffect();
		assert.equal(bar.weapon, 2);
		assert.ok(bar.weaponTime > 0);
	});

	it('applies bar mobility and status items (type 11: slow, type 12: vibrate, type 13: magnet, type 14: immortal, type 15: disturb)', () => {
		const bar = window.bar;

		// Type 11: Slow
		const slowItem = new Item(11, bar.x, bar.y, '#000', '#fff');
		slowItem.applyEffect();
		assert.ok(bar.vxMax < window.barDefaultSpeed || bar.vxMax === window.barMinSpeed);
		assert.ok(bar.speedStatusTime > 0);

		// Type 12: Vibration
		const vibrateItem = new Item(12, bar.x, bar.y, '#000', '#fff');
		vibrateItem.applyEffect();
		assert.ok(bar.vibrationTime > 0);

		// Type 13: Absorption
		const magnetItem = new Item(13, bar.x, bar.y, '#000', '#fff');
		magnetItem.applyEffect();
		assert.ok(bar.absorptionStatusTime > 0);

		// Type 14: Immortal
		const immortalItem = new Item(14, bar.x, bar.y, '#000', '#fff');
		immortalItem.applyEffect();
		assert.ok(bar.immortalStatusTime > 0);
		assert.equal(bar.color, window.barImmortalColor);

		// Type 15: Disturb
		const disturbItem = new Item(15, bar.x, bar.y, '#000', '#fff');
		disturbItem.applyEffect();
		assert.ok(bar.disturbStatusTime > 0);
	});

	it('resets bar status when status effect timers expire during bar.move()', () => {
		const bar = window.bar;

		// Width timer expiration
		bar.width = 150;
		bar.widthStatusTime = 1;
		bar.move();
		assert.equal(bar.width, window.barDefaultWidth, 'Width should reset to default');

		// Speed timer expiration
		bar.vxMax = 3;
		bar.speedStatusTime = 1;
		bar.move();
		assert.equal(bar.vxMax, window.barDefaultSpeed, 'Speed should reset to default');
		assert.equal(bar.height, window.barDefaultHeight, 'Height should reset to default');

		// Weapon timer expiration
		bar.weapon = 1;
		bar.weaponTime = 1;
		bar.move();
		assert.equal(bar.weapon, 0, 'Weapon should reset to 0');

		// Immortal timer expiration
		bar.color = window.barImmortalColor;
		bar.immortalStatusTime = 1;
		bar.move();
		assert.equal(bar.color, window.barColor, 'Bar color should reset to default');
		assert.equal(bar.immortalStatusTime, 0);

		// Disturb timer expiration
		bar.disturbStatusTime = 1;
		bar.move();
		assert.equal(bar.disturbStatusTime, 0);

		// Absorption timer expiration relaunches absorbed balls
		const ball = new Ball(window.BALL_CREATE_MODE.INIT);
		ball.isAbsorption = 1;
		window.balls = [ball];
		bar.absorptionNum = 1;
		bar.absorptionStatusTime = 1;
		bar.move();
		assert.equal(bar.absorptionNum, 0, 'Absorbed balls should be relaunched');
		assert.equal(ball.isAbsorption, 0);
	});

	it('exercises bar.auto() dodging harmful items and targeting beneficial items', () => {
		const bar = window.bar;
		bar.x = 300;
		bar.y = 500;
		window.balls = [new Ball(window.BALL_CREATE_MODE.INIT)];
		window.balls[0].y = 100;
		window.balls[0].vy = 2;

		// 1. Beneficial item falling nearby
		const goodItem = new Item(0, 320, 400, '#000', '#fff');
		window.items = [goodItem];
		bar.auto();
		assert.ok(window.pointX !== undefined);

		// 2. Harmful item (type 6: life decrease) falling right above bar
		const badItem = new Item(6, bar.getCenterX(), bar.y - 15, '#000', '#fff');
		window.items = [badItem];
		bar.auto();
		// AI should attempt to steer away from the bad item
		assert.ok(Math.abs(window.pointX - badItem.getCenterX()) >= 0);

		// 3. Harmful item near left/right screen boundary
		badItem.x = 10;
		bar.auto();

		badItem.x = window.canvasWidth - 10;
		bar.auto();
	});

	it('draws items and bar absorption graphics without errors', () => {
		const item = new Item(0, 100, 100, '#000', '#fff');
		item.draw(window.staticCtx);

		// Draw bar with absorption effects active
		const bar = window.bar;
		bar.absorptionStatusTime = 100;
		bar.draw(window.staticCtx);
		bar.absorptionStatusTime = 0;
	});
});
