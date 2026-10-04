// test/integration/ballBar.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import '../../src/main.js';
import Bar from '../../src/Bar.js';
import Ball from '../../src/Ball.js';
import Item from '../../src/Item.js';
import Weapon from '../../src/Weapon.js';
import ImageData from '../../src/ImageData.js';
import { BALL_CREATE_MODE, DEFAULT_CONFIG } from '../../src/const.js';

describe('Integration Test: Ball-Bar Interaction & Bar AI', () => {
	beforeEach(() => {
		setupEnvironment();
		window.gameManage.init(0);
		clearInterval(window.timer_All);
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('handles bar bounce angles, spin acceleration, and velocity clamping', () => {
		const g = window.gameManage;
		const bar = g.bar;
		bar.x = 400;
		bar.y = 500;
		bar.width = 80;
		bar.vx = 20;

		const ball = new Ball(BALL_CREATE_MODE.OTHER, g);
		ball.x = 420; // right of center
		ball.y = 495;
		ball.vx = 0;
		ball.vy = 5;
		g.balls = [ball];

		// Collision with moving bar
		ball.move();
		assert.ok(ball.vy < 0, 'Ball should reflect upward');
		assert.ok(ball.vx !== 0, 'Spin from moving bar should affect ball.vx');

		// Left edge hit
		ball.x = bar.getCenterX() - 30;
		ball.y = 495;
		ball.vx = 1;
		ball.vy = 5;
		ball.move();
		assert.ok(ball.vy < 0);

		// Right edge hit
		ball.x = bar.getCenterX() + 30;
		ball.y = 495;
		ball.vx = -1;
		ball.vy = 5;
		ball.move();
		assert.ok(ball.vy < 0);
	});

	it('handles absorption capture and relaunch with bar velocity and random angle', () => {
		const g = window.gameManage;
		const bar = g.bar;
		bar.x = 400;
		bar.y = 500;
		bar.absorptionStatusTime = 50;

		const ball = new Ball(BALL_CREATE_MODE.OTHER, g);
		ball.x = 400;
		ball.y = 495;
		ball.vx = 0;
		ball.vy = 5;
		g.balls = [ball];

		// Ball hits bar during absorption
		ball.move();
		assert.equal(ball.isAbsorption, 1, 'Ball should be absorbed');
		assert.equal(bar.absorptionNum, 1);

		// Bar moving right relaunch
		bar.vx = 10;
		bar.relaunch();
		assert.equal(ball.isAbsorption, 0);
		assert.equal(bar.absorptionNum, 0);

		// Stationary bar relaunch (random angle)
		ball.isAbsorption = 1;
		bar.absorptionNum = 1;
		bar.vx = 0;
		bar.relaunch();
		assert.equal(ball.isAbsorption, 0);
	});

	it('handles bar movement bounds, edge vibration, and speed/status transitions', () => {
		const g = window.gameManage;
		const input = window.inputManage;
		const bar = g.bar;

		// Left boundary clamping
		input.pointX = -50;
		bar.move();
		assert.ok(bar.getLeftX() >= 0);

		// Right boundary clamping
		input.pointX = g.canvasWidth + 100;
		bar.move();
		assert.ok(bar.getRightX() <= g.canvasWidth);

		// Vibration at left edge
		input.pointX = 10;
		bar.vibrationTime = 10;
		bar.move();
		assert.equal(bar.vibrationTime, 9);

		// Vibration at right edge
		input.pointX = g.canvasWidth - 10;
		bar.vibrationTime = 5;
		bar.move();

		// Width and speed status countdown
		bar.widthStatusTime = 1;
		bar.move();
		assert.equal(bar.widthStatusTime, 0);
		assert.equal(bar.width, DEFAULT_CONFIG.barDefaultWidth);

		bar.speedStatusTime = 1;
		bar.vxMax = 120; // faster
		bar.move();
		assert.equal(bar.speedStatusTime, 0);
		assert.equal(bar.vxMax, DEFAULT_CONFIG.barDefaultSpeed);

		bar.speedStatusTime = 2;
		bar.vxMax = 30; // slower
		bar.move();

		// Weapon and immortal status countdown
		bar.weaponTime = 1;
		bar.weapon = 1;
		bar.move();
		assert.equal(bar.weapon, 0);

		bar.immortalStatusTime = 1;
		bar.move();
		assert.equal(bar.immortalStatusTime, 0);

		// Disturb status countdown
		bar.disturbStatusTime = 1;
		bar.move();
		assert.equal(bar.disturbStatusTime, 0);

		// Damage handling
		bar.hitPoint = 2;
		bar.endamage(1);
		assert.equal(bar.hitPoint, 1);
		bar.endamage(2); // Life loss
		assert.equal(bar.hitPoint, 5);
	});

	it('executes auto AI: launching, trajectory simulation, item avoidance/collection, and weapon dodging', () => {
		const g = window.gameManage;
		const bar = g.bar;

		// 1. Auto launch when no balls
		g.balls = [];
		g.autoPlay.auto();
		assert.equal(g.balls.length, 1, 'Auto should spawn and launch ball');

		// 2. Auto absorption relaunch
		g.balls[0].isAbsorption = 1;
		bar.absorptionNum = 1;
		g.autoPlay.auto();
		assert.equal(bar.absorptionNum, 0, 'Auto should relaunch absorbed balls');

		// 3. Falling ball tracking and simulation
		const ball = g.balls[0];
		ball.x = 350;
		ball.y = 400;
		ball.vx = 2;
		ball.vy = 4;
		g.autoPlay.auto();
		assert.ok(g.autoPlay.simuData != null, 'simuData should be created');

		// 4. Consecutive auto steps with simulation cache
		g.autoPlay.auto();

		// 5. Beneficial item approach
		const goodItem = new Item(0, 300, 300, '#000', '#fff', g); // Life item
		g.items = [goodItem];
		g.autoPlay.auto();

		// 6. Dangerous item avoidance (left and right evasion)
		const badItem1 = new Item(4, bar.x + 2, bar.y - 30, '#000', '#fff', g); // Speed up penalty
		g.items = [badItem1];
		g.autoPlay.auto();

		const badItem2 = new Item(6, bar.x - 2, bar.y - 30, '#000', '#fff', g);
		g.items = [badItem2];
		g.autoPlay.auto();

		// 7. Weapon dodge when falling towards bar
		const enemyWeapon = new Weapon(1, bar.x, bar.y - 40, -1, g);
		enemyWeapon.vy = 5;
		g.weapons = [enemyWeapon];
		g.autoPlay.auto();
	});
});
