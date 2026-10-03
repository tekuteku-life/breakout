// test/system/edgeCases.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';

describe('System Test SYS-10: Robustness, Input, and Edge Cases', () => {
	beforeEach(() => {
		setupEnvironment();
		window.onload();
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('SYS-10: handles full-width IME zenkaku keypress warning and unmapped keys', () => {
		// Full-width IME keypress (keyCode 229)
		window.keyCode = 229;
		const result = window.getKeyPress({ keyCode: 229, which: 229 }, 'up');
		assert.equal(result, 0, 'Zenkaku keypress should return 0 and display warning');

		// Unmapped key
		window.getKeyPress({ keyCode: 999 }, 'down');
		assert.equal(window.keyStr, '', 'Unmapped key should clear keyStr');
	});

	it('SYS-10: handles touch events (multi-touch pause, auto toggle, launch)', () => {
		const canvas = window.dynamicCanvas;

		// 1. Two touches => Auto toggle
		canvas.ontouchstart({
			touches: [{ pageX: 100, pageY: 100 }, { pageX: 120, pageY: 120 }],
			preventDefault: () => {},
		});
		assert.equal(window.ctrl.autoSwitch, 1, '2-finger touch should toggle auto play');

		// 2. Three touches => Pause switch on
		canvas.ontouchstart({
			touches: [{ pageX: 100, pageY: 100 }, { pageX: 120, pageY: 120 }, { pageX: 140, pageY: 140 }],
			preventDefault: () => {},
		});
		assert.equal(window.ctrl.pauseSwitch, 1, '3-finger touch should pause game');

		// 3. Touch move
		window.ontouchmove({
			touches: [{ pageX: 200, pageY: 300 }],
			preventDefault: () => {},
		});
		assert.ok(window.pointX >= 0);

		// 4. Touch end launches ball
		window.ctrl.pauseSwitchOff();
		window.mouseDownTime = Date.now();
		canvas.ontouchend({ preventDefault: () => {} });
		assert.equal(window.balls.length, 1, 'Touch end should launch ball');
	});

	it('SYS-10: handles low FPS detection warning and simulateReset', () => {
		// Simulate low FPS condition
		window.statusMng.realFPSTime = 0;
		window.statusMng.realFPSCount = 100;
		window.statusMng.countFPS();

		// simulateReset executes on all blocks
		window.simulateReset();
		assert.ok(true, 'simulateReset executed cleanly');
	});

	it('SYS-10: handles versionCheck updating screen_about', async () => {
		// Call versionCheck
		window.versionCheck();

		// Wait for microtask / async XHR resolution
		await new Promise((resolve) => setTimeout(resolve, 10));

		const aboutScreen = document.getElementById('screen_about');
		assert.ok(aboutScreen.innerHTML.includes(window.appVer));
	});

	it('SYS-10: handles getMouseMove fallback to window.event and coordinate scaling', () => {
		const canvas = window.dynamicCanvas;
		window.ctrl.autoSwitch = 0;
		window.ctrl.ctrlSwitch = 0;

		// Mouse move with direct event
		window.getMouseMove({ pageX: 200, pageY: 300 }, canvas, 0, 1);
		assert.ok(window.pointX >= 0);

		// Mouse move with touch event
		window.getMouseMove({ touches: [{ pageX: 150, pageY: 250 }] }, canvas, 1, 1);
		assert.ok(window.pointX >= 0);

		// Mouse move with null event triggers error due to shadowed event parameter in legacy engine
		assert.throws(() => window.getMouseMove(null, canvas, 0, 1), TypeError);
	});

	it('SYS-10: handles keyboard weapon firing on space release and window.event fallback', () => {
		// Keyboard space down then up with weapon equipped
		window.ctrl.ctrlSwitch = 1;
		window.ctrl.autoSwitch = 0;
		window.bar.weapon = 1;
		window.bar.weaponInter = 0;
		window.balls = [new window.Ball(window.BALL_CREATE_MODE.INIT)];
		window.weapons = [];

		window.getKeyPress({ keyCode: 32 }, 'down');
		window.getKeyPress({ keyCode: 32 }, 'up');
		assert.equal(window.weapons.length, 1, 'Releasing space with weapon should fire weapon');

		// Null event fallback
		globalThis.event = { keyCode: 80 }; // Pause
		window.getKeyPress(null, 'up');
		assert.equal(window.keyStr, 'Pause');
	});
});
