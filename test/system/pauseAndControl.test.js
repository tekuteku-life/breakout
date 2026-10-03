// test/system/pauseAndControl.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';

describe('System Test SYS-07: Pause, Controls, and Settings Shortcuts', () => {
	beforeEach(() => {
		setupEnvironment();
		window.init(0);
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('SYS-07: handles context menu right-click and P-key pause toggles', () => {
		assert.equal(window.ctrl.pauseSwitch, 0, 'Game starts unpaused');

		// Right click on context menu
		const menuResult = window.oncontextmenu();
		assert.equal(menuResult, false, 'Context menu should be prevented');
		assert.equal(window.ctrl.pauseSwitch, 1, 'Pause switch should be ON');

		// Resume via pauseSwitchOff
		window.ctrl.pauseSwitchOff();
		assert.equal(window.ctrl.pauseSwitch, 0, 'Pause switch should be OFF');

		// Pause via P key (keyCode 80)
		window.getKeyPress({ keyCode: 80 }, 'up');
		assert.equal(window.ctrl.pauseSwitch, 1, 'P key should toggle pause ON');

		// Unpause via P key
		window.getKeyPress({ keyCode: 80 }, 'up');
		assert.equal(window.ctrl.pauseSwitch, 0, 'P key should toggle pause OFF');
	});

	it('SYS-07: handles shortcut keys for Auto (Z), Ctrl (C), Sound (S), SizeFit (F), and Stage (U/R)', () => {
		// Auto play toggle (Z key, keyCode 90)
		assert.equal(window.ctrl.autoSwitch, 0);
		window.getKeyPress({ keyCode: 90 }, 'up');
		assert.equal(window.ctrl.autoSwitch, 1, 'Z key should toggle autopilot ON');

		// Operation mode toggle (C key, keyCode 67)
		assert.equal(window.ctrl.ctrlSwitch, 0);
		window.getKeyPress({ keyCode: 67 }, 'up');
		assert.equal(window.ctrl.ctrlSwitch, 1, 'C key should toggle keyboard control ON');

		// Sound switch toggle (S key, keyCode 83)
		const initialSound = window.ctrl.soundSwitch;
		window.getKeyPress({ keyCode: 83 }, 'up');
		assert.notEqual(window.ctrl.soundSwitch, initialSound, 'S key should toggle sound switch');

		// Size fit switch toggle (F key, keyCode 70)
		const initialSizeFit = window.ctrl.sizeFitSwitch;
		window.getKeyPress({ keyCode: 70 }, 'up');
		assert.notEqual(window.ctrl.sizeFitSwitch, initialSizeFit, 'F key should toggle sizeFit');

		// Stage forward (U key, keyCode 85)
		assert.equal(window.ctrl.stageIndex, 0);
		window.getKeyPress({ keyCode: 85 }, 'down');
		assert.equal(window.ctrl.stageIndex, 1, 'U key should forward stage index');

		// Stage backward (R key, keyCode 82)
		window.getKeyPress({ keyCode: 82 }, 'down');
		assert.equal(window.ctrl.stageIndex, 0, 'R key should reverse stage index');
	});
});
