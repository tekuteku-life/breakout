// test/system/gamePlayLoop.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';
import Balloon from '../../src/Balloon.js';

describe('System Test SYS-02 & SYS-03: Game Play, Launch, and Loop', () => {
	beforeEach(() => {
		setupEnvironment();
		window.init(0);
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('SYS-02: handles mouse press to launch ball and inhibits duplicate launches', () => {
		// Verify initial state
		assert.equal(window.balls.length, 0);

		// Mouse down to charge launch
		window.dynamicCanvas.onmousedown();
		assert.ok(window.mouseDownTime > 0, 'Mouse down time should be recorded');

		// Mouse up to launch
		window.dynamicCanvas.onmouseup({ button: 0 });
		assert.equal(window.balls.length, 1, 'Ball should be launched');
		assert.equal(window.mouseDownTime, 0, 'Mouse down time should reset');

		// Attempt duplicate launch while ball is in play
		window.dynamicCanvas.onmousedown();
		window.dynamicCanvas.onmouseup({ button: 0 });
		assert.equal(window.balls.length, 1, 'Duplicate ball launch should be prevented');
	});

	it('SYS-02: handles weapon firing and absorbed ball relaunching on click', () => {
		// Set bar weapon
		window.bar.weapon = 1; // Gun
		window.bar.weaponInter = 0;

		window.dynamicCanvas.onmousedown();
		assert.equal(window.weapons.length, 1, 'Weapon should be fired on mousedown');

		// Absorbed ball relaunch
		window.bar.absorptionNum = 1;
		let relaunched = false;
		window.bar.relaunch = () => { relaunched = true; window.bar.absorptionNum = 0; };
		window.dynamicCanvas.onmouseup({ button: 0 });
		assert.ok(relaunched, 'Absorbed ball should be relaunched on mouseup');
	});

	it('SYS-03: executes rendering pipeline (drawAll, drawOnce, statusView) and cloud effects', () => {
		// Populate block with exploded > 0
		const b = window.blockMap[0][0];
		if (b) {
			b.exploded = 5;
		}

		// Add balloon
		const balloon = new Balloon(100, 100, 'Test Balloon');
		window.balloons.push(balloon);

		// Activate disturbance
		window.bar.disturbStatusTime = 10;

		// Execute drawAll
		window.drawAll(window.dynamicCtx);

		// Execute drawOnce
		window.drawOnce(window.staticCtx);

		// Expire balloon
		balloon.endFlag = 1;
		window.drawAll(window.dynamicCtx);

		// Status view updates DOM element
		const playInfo = document.getElementById('play_info');
		assert.ok(playInfo.innerHTML.includes('Score:'));
		assert.ok(playInfo.innerHTML.includes('Stage:'));
	});

	it('SYS-03: handles keyboard movement updates in game loop', () => {
		window.ctrl.autoSwitch = 0;
		window.ctrl.ctrlSwitch = 1; // Keyboard control mode
		window.keyStr = 'Right';
		window.keyPressIncr = 5;
		const initX = window.pointX;

		// Simulate key right increment
		window.getKeyPress({ keyCode: 76 }, 'down'); // L key
		assert.equal(window.keyStr, 'Right');

		// Simulate left movement
		window.getKeyPress({ keyCode: 65 }, 'down'); // A key
		assert.equal(window.keyStr, 'Left');

		window.getKeyPress({ keyCode: 65 }, 'up');
		assert.equal(window.keyStr, '');
	});

	it('SYS-03: executes game loop step updating positions, status, timers, and form controls', () => {
		// When pauseSwitch is 0 and ball is in play
		window.balls = [new window.Ball(window.BALL_CREATE_MODE.INIT)];
		window.gameLoopTick();
		assert.equal(window.ctrl.formSelector['continue'].disabled, true);
		assert.equal(window.ctrl.formSelector['stage'].disabled, true);

		// With keyboard controls
		window.ctrl.autoSwitch = 0;
		window.ctrl.ctrlSwitch = 1;
		window.keyStr = 'Right';
		window.gameLoopTick();
		window.keyStr = 'Left';
		window.gameLoopTick();

		// With autoSwitch = 1
		window.ctrl.autoSwitch = 1;
		window.gameLoopTick();

		// With weapons and items active
		window.items = [new window.Item(0, 100, 100, '#000', '#fff')];
		window.weapons = [new window.Weapon(1, 100, 100, 1)];
		window.gameLoopTick();

		// With balls empty
		window.ctrl.autoSwitch = 0;
		window.balls = [];
		window.gameLoopTick();
		assert.equal(window.ctrl.formSelector['continue'].disabled, false);
		assert.equal(window.ctrl.formSelector['stage'].disabled, false);

		// Event handlers attached on window / canvas
		window.onclick();
		window.onmousemove({ clientX: 300, clientY: 400 });
		window.ontouchmove({ touches: [{ pageX: 300, pageY: 400 }], preventDefault: () => {} });
		window.dynamicCanvas.ontouchstart({ touches: [{ pageX: 300, pageY: 400 }], preventDefault: () => {} });
		window.dynamicCanvas.ontouchstart({ touches: [{ pageX: 300 }, { pageX: 320 }], preventDefault: () => {} });
		window.dynamicCanvas.ontouchstart({ touches: [{ pageX: 300 }, { pageX: 320 }, { pageX: 340 }], preventDefault: () => {} });
		window.dynamicCanvas.ontouchend({ preventDefault: () => {} });
		window.onresize();
		document.onkeydown({ keyCode: 37, preventDefault: () => {} });
		document.onkeyup({ keyCode: 37, preventDefault: () => {} });
	});
});
