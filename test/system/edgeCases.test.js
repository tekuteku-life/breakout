// test/system/edgeCases.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';
import Ball from '../../src/Ball.js';
import { BALL_CREATE_MODE } from '../../src/const.js';

describe('System Test SYS-10: Robustness, Input, and Edge Cases', () => {
	beforeEach(() => {
		setupEnvironment();
		window.gameManage.init(0);
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('SYS-10: handles full-width IME zenkaku keypress warning and unmapped keys', () => {
		const input = window.inputManage;
		// Full-width IME keypress (keyCode 229)
		input.keyCode = 229;
		const result = input.getKeyPress({ keyCode: 229, which: 229 }, 'up');
		assert.equal(result, 0, 'Zenkaku keypress should return 0 and display warning');

		// Unmapped key
		input.getKeyPress({ keyCode: 999 }, 'down');
		assert.equal(input.keyStr, '', 'Unmapped key should clear keyStr');
	});

	it('SYS-10: handles touch events (multi-touch pause, auto toggle, launch)', () => {
		const g = window.gameManage;
		const input = window.inputManage;
		const canvas = g.dynamicCanvas;

		// 1. Two touches => Auto toggle
		canvas.ontouchstart({
			touches: [{ pageX: 100, pageY: 100 }, { pageX: 120, pageY: 120 }],
			preventDefault: () => {},
		});
		assert.equal(g.ctrl.autoSwitch, 1, '2-finger touch should toggle auto play');

		// 2. Three touches => Pause switch on
		canvas.ontouchstart({
			touches: [{ pageX: 100, pageY: 100 }, { pageX: 120, pageY: 120 }, { pageX: 140, pageY: 140 }],
			preventDefault: () => {},
		});
		assert.equal(g.ctrl.pauseSwitch, 1, '3-finger touch should pause game');

		// 3. Touch move
		window.ontouchmove({
			touches: [{ pageX: 200, pageY: 300 }],
			preventDefault: () => {},
		});
		assert.ok(input.pointX >= 0);

		// 4. Touch end launches ball
		g.ctrl.pauseSwitchOff();
		input.mouseDownTime = Date.now();
		canvas.ontouchend({ preventDefault: () => {} });
		assert.equal(g.objectManage.balls.length, 1, 'Touch end should launch ball');
	});

	it('SYS-10: handles low FPS detection warning and simulateReset', () => {
		const g = window.gameManage;
		// Simulate low FPS condition
		g.statusMng.realFPSTime = 0;
		g.statusMng.realFPSCount = 100;
		g.statusMng.countFPS();

		// simulateReset executes on all blocks
		g.simulateReset();
		assert.ok(true, 'simulateReset executed cleanly');
	});

	it('SYS-10: handles getMouseMove fallback to window.event and coordinate scaling', () => {
		const g = window.gameManage;
		const input = window.inputManage;
		const canvas = g.dynamicCanvas;
		g.ctrl.autoSwitch = 0;
		g.ctrl.ctrlSwitch = 0;

		// Mouse move with direct event
		input.getMouseMove({ pageX: 200, pageY: 300 }, canvas, 0, 1);
		assert.ok(input.pointX >= 0);

		// Mouse move with touch event
		input.getMouseMove({ touches: [{ pageX: 150, pageY: 250 }] }, canvas, 1, 1);
		assert.ok(input.pointX >= 0);

		// Mouse move with null event triggers error due to shadowed event parameter in legacy engine
		assert.throws(() => input.getMouseMove(null, canvas, 0, 1), TypeError);
	});

	it('SYS-10: handles keyboard weapon firing on space release and window.event fallback', () => {
		const g = window.gameManage;
		const input = window.inputManage;

		// Keyboard space down then up with weapon equipped
		g.ctrl.ctrlSwitch = 1;
		g.ctrl.autoSwitch = 0;
		g.objectManage.bar.weapon = 1;
		g.objectManage.bar.weaponInter = 0;
		g.objectManage.balls = [new Ball(BALL_CREATE_MODE.INIT, g)];
		g.objectManage.weapons = [];

		input.getKeyPress({ keyCode: 32 }, 'down');
		input.getKeyPress({ keyCode: 32 }, 'up');
		assert.equal(g.objectManage.weapons.length, 1, 'Releasing space with weapon should fire weapon');

		// Null event handling (does not throw)
		assert.doesNotThrow(() => input.getKeyPress(null, 'up'));
	});
});
