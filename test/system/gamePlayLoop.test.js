// test/system/gamePlayLoop.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';
import Balloon from '../../src/Balloon.js';
import Ball from '../../src/Ball.js';
import Item from '../../src/Item.js';
import Weapon from '../../src/Weapon.js';
import { BALL_CREATE_MODE } from '../../src/const.js';

describe('System Test SYS-02 & SYS-03: Game Play, Launch, and Loop', () => {
	beforeEach(() => {
		setupEnvironment();
		window.gameManage.init(0);
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('SYS-02: handles mouse press to launch ball and inhibits duplicate launches', () => {
		const g = window.gameManage;
		const input = window.inputManage;

		// Verify initial state
		assert.equal(g.balls.length, 0);

		// Mouse down to charge launch
		g.dynamicCanvas.onmousedown();
		assert.ok(input.mouseDownTime > 0, 'Mouse down time should be recorded');

		// Mouse up to launch
		g.dynamicCanvas.onmouseup({ button: 0 });
		assert.equal(g.balls.length, 1, 'Ball should be launched');
		assert.equal(input.mouseDownTime, 0, 'Mouse down time should reset');

		// Attempt duplicate launch while ball is in play
		g.dynamicCanvas.onmousedown();
		g.dynamicCanvas.onmouseup({ button: 0 });
		assert.equal(g.balls.length, 1, 'Duplicate ball launch should be prevented');
	});

	it('SYS-02: handles weapon firing and absorbed ball relaunching on click', () => {
		const g = window.gameManage;

		// Set bar weapon
		g.bar.weapon = 1; // Gun
		g.bar.weaponInter = 0;

		g.dynamicCanvas.onmousedown();
		assert.equal(g.weapons.length, 1, 'Weapon should be fired on mousedown');

		// Absorbed ball relaunch
		g.bar.absorptionNum = 1;
		let relaunched = false;
		g.bar.relaunch = () => { relaunched = true; g.bar.absorptionNum = 0; };
		g.dynamicCanvas.onmouseup({ button: 0 });
		assert.ok(relaunched, 'Absorbed ball should be relaunched on mouseup');
	});

	it('SYS-03: executes rendering pipeline (drawAll, drawOnce, statusView) and cloud effects', () => {
		const g = window.gameManage;

		// Populate block with exploded > 0
		const b = g.blockMap[0][0];
		if (b) {
			b.exploded = 5;
		}

		// Add balloon
		const balloon = new Balloon(100, 100, 'Test Balloon', g);
		g.balloons.push(balloon);

		// Activate disturbance
		g.bar.disturbStatusTime = 10;

		// Execute drawAll
		g.drawAll(g.dynamicCtx);

		// Execute drawOnce
		g.drawOnce(g.staticCtx);

		// Expire balloon
		balloon.endFlag = 1;
		g.drawAll(g.dynamicCtx);

		// Status view updates DOM element
		const playInfo = document.getElementById('play_info');
		assert.ok(playInfo.innerHTML.includes('Score:'));
		assert.ok(playInfo.innerHTML.includes('Stage:'));
	});

	it('SYS-03: handles keyboard movement updates in game loop', () => {
		const g = window.gameManage;
		const input = window.inputManage;

		g.ctrl.autoSwitch = 0;
		g.ctrl.ctrlSwitch = 1; // Keyboard control mode
		input.keyStr = 'Right';
		input.keyPressIncr = 5;

		// Simulate key right increment
		input.getKeyPress({ keyCode: 76 }, 'down'); // L key
		assert.equal(input.keyStr, 'Right');

		// Simulate left movement
		input.getKeyPress({ keyCode: 65 }, 'down'); // A key
		assert.equal(input.keyStr, 'Left');

		input.getKeyPress({ keyCode: 65 }, 'up');
		assert.equal(input.keyStr, '');
	});

	it('SYS-03: executes game loop step updating positions, status, timers, and form controls', () => {
		const g = window.gameManage;
		const input = window.inputManage;

		// When pauseSwitch is 0 and ball is in play
		g.balls = [new Ball(BALL_CREATE_MODE.INIT, g)];
		window.gameLoopTick();
		assert.equal(g.ctrl.formSelector['continue'].disabled, true);
		assert.equal(g.ctrl.formSelector['stage'].disabled, true);

		// With keyboard controls
		g.ctrl.autoSwitch = 0;
		g.ctrl.ctrlSwitch = 1;
		input.keyStr = 'Right';
		window.gameLoopTick();
		input.keyStr = 'Left';
		window.gameLoopTick();

		// With autoSwitch = 1
		g.ctrl.autoSwitch = 1;
		window.gameLoopTick();

		// With weapons and items active
		g.items = [new Item(0, 100, 100, '#000', '#fff', g)];
		g.weapons = [new Weapon(1, 100, 100, 1, null, g)];
		window.gameLoopTick();

		// With balls empty
		g.ctrl.autoSwitch = 0;
		g.balls = [];
		window.gameLoopTick();
		assert.equal(g.ctrl.formSelector['continue'].disabled, false);
		assert.equal(g.ctrl.formSelector['stage'].disabled, false);

		// Event handlers attached on window / canvas
		window.onclick();
		window.onmousemove({ clientX: 300, clientY: 400 });
		window.ontouchmove({ touches: [{ pageX: 300, pageY: 400 }], preventDefault: () => {} });
		g.dynamicCanvas.ontouchstart({ touches: [{ pageX: 300, pageY: 400 }], preventDefault: () => {} });
		g.dynamicCanvas.ontouchstart({ touches: [{ pageX: 300 }, { pageX: 320 }], preventDefault: () => {} });
		g.dynamicCanvas.ontouchstart({ touches: [{ pageX: 300 }, { pageX: 320 }, { pageX: 340 }], preventDefault: () => {} });
		g.dynamicCanvas.ontouchend({ preventDefault: () => {} });
		window.onresize();
		document.onkeydown({ keyCode: 37, preventDefault: () => {} });
		document.onkeyup({ keyCode: 37, preventDefault: () => {} });
	});
});
