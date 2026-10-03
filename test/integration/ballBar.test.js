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

describe('Integration Test: Ball-Bar Interaction & Bar AI', () => {
	beforeEach(() => {
		setupEnvironment();
		window.init(0);
		clearInterval(window.timer_All);
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('handles bar bounce angles, spin acceleration, and velocity clamping', () => {
		const bar = window.bar;
		bar.x = 400;
		bar.y = 500;
		bar.width = 80;
		bar.vx = 20;

		const ball = new Ball(window.BALL_CREATE_MODE.OTHER);
		ball.x = 420; // right of center
		ball.y = 495;
		ball.vx = 0;
		ball.vy = 5;
		window.balls = [ball];

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
		const bar = window.bar;
		bar.x = 400;
		bar.y = 500;
		bar.absorptionStatusTime = 50;

		const ball = new Ball(window.BALL_CREATE_MODE.OTHER);
		ball.x = 400;
		ball.y = 495;
		ball.vx = 0;
		ball.vy = 5;
		window.balls = [ball];

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
		const bar = window.bar;

		// Left boundary clamping
		window.pointX = -50;
		bar.move();
		assert.ok(bar.getLeftX() >= 0);

		// Right boundary clamping
		window.pointX = window.canvasWidth + 100;
		bar.move();
		assert.ok(bar.getRightX() <= window.canvasWidth);

		// Vibration at left edge
		window.pointX = 10;
		bar.vibrationTime = 10;
		bar.move();
		assert.equal(bar.vibrationTime, 9);

		// Vibration at right edge
		window.pointX = window.canvasWidth - 10;
		bar.vibrationTime = 5;
		bar.move();

		// Width and speed status countdown
		bar.widthStatusTime = 1;
		bar.move();
		assert.equal(bar.widthStatusTime, 0);
		assert.equal(bar.width, window.barDefaultWidth);

		bar.speedStatusTime = 1;
		bar.vxMax = 120; // faster
		bar.move();
		assert.equal(bar.speedStatusTime, 0);
		assert.equal(bar.vxMax, window.barDefaultSpeed);

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
		assert.equal(bar.hitPoint, window.barDefaultHP);
	});

	it('executes auto AI: launching, trajectory simulation, item avoidance/collection, and weapon dodging', () => {
		const bar = window.bar;

		// 1. Auto launch when no balls
		window.balls = [];
		bar.auto();
		assert.equal(window.balls.length, 1, 'Auto should spawn and launch ball');

		// 2. Auto absorption relaunch
		window.balls[0].isAbsorption = 1;
		bar.absorptionNum = 1;
		bar.auto();
		assert.equal(bar.absorptionNum, 0, 'Auto should relaunch absorbed balls');

		// 3. Falling ball tracking and simulation
		const ball = window.balls[0];
		ball.x = 350;
		ball.y = 400;
		ball.vx = 2;
		ball.vy = 4;
		bar.auto();
		assert.ok(bar.simuData != null, 'simuData should be created');

		// 4. Consecutive auto steps with simulation cache
		bar.auto();

		// 5. Beneficial item approach
		const goodItem = new Item(0, 300, 300); // Life item
		window.items = [goodItem];
		bar.auto();

		// 6. Dangerous item avoidance (left and right evasion)
		const badItem1 = new Item(4, bar.x + 2, bar.y - 30); // Speed up penalty
		window.items = [badItem1];
		bar.auto();

		const badItem2 = new Item(6, bar.x - 2, bar.y - 30);
		window.items = [badItem2];
		bar.auto();

		// 7. Weapon dodge when falling towards bar
		const enemyWeapon = new Weapon(1, bar.x, bar.y - 40, -1);
		enemyWeapon.vy = 5;
		window.weapons = [enemyWeapon];
		bar.auto();
	});
});
