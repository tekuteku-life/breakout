// test/system/pauseAndControl.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';

describe('System Test SYS-07: Pause, Controls, and Settings Shortcuts', () => {
	beforeEach(() => {
		setupEnvironment();
		window.gameManage.init(0);
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('SYS-07: handles context menu right-click and P-key pause toggles', () => {
		const ctrl = window.gameManage.ctrl;
		assert.equal(ctrl.pauseSwitch, 0, 'Game starts unpaused');

		// Right click on context menu
		const menuResult = window.oncontextmenu();
		assert.equal(menuResult, false, 'Context menu should be prevented');
		assert.equal(ctrl.pauseSwitch, 1, 'Pause switch should be ON');

		// Resume via pauseSwitchOff
		ctrl.pauseSwitchOff();
		assert.equal(ctrl.pauseSwitch, 0, 'Pause switch should be OFF');

		// Pause via P key (keyCode 80)
		window.inputManage.getKeyPress({ keyCode: 80 }, 'up');
		assert.equal(ctrl.pauseSwitch, 1, 'P key should toggle pause ON');

		// Unpause via P key
		window.inputManage.getKeyPress({ keyCode: 80 }, 'up');
		assert.equal(ctrl.pauseSwitch, 0, 'P key should toggle pause OFF');
	});

	it('SYS-07: handles shortcut keys for Auto (Z), Ctrl (C), Sound (S), SizeFit (F), and Stage (U/R)', () => {
		const ctrl = window.gameManage.ctrl;
		// Auto play toggle (Z key, keyCode 90)
		assert.equal(ctrl.autoSwitch, 0);
		window.inputManage.getKeyPress({ keyCode: 90 }, 'up');
		assert.equal(ctrl.autoSwitch, 1, 'Z key should toggle autopilot ON');

		// Operation mode toggle (C key, keyCode 67)
		assert.equal(ctrl.ctrlSwitch, 0);
		window.inputManage.getKeyPress({ keyCode: 67 }, 'up');
		assert.equal(ctrl.ctrlSwitch, 1, 'C key should toggle keyboard control ON');

		// Sound switch toggle (S key, keyCode 83)
		const initialSound = ctrl.soundSwitch;
		window.inputManage.getKeyPress({ keyCode: 83 }, 'up');
		assert.notEqual(ctrl.soundSwitch, initialSound, 'S key should toggle sound switch');

		// Size fit switch toggle (F key, keyCode 70)
		const initialSizeFit = ctrl.sizeFitSwitch;
		window.inputManage.getKeyPress({ keyCode: 70 }, 'up');
		assert.notEqual(ctrl.sizeFitSwitch, initialSizeFit, 'F key should toggle sizeFit');

		// Stage forward (U key, keyCode 85)
		assert.equal(window.gameManage.ctrl.stageIndex, 0);
		window.inputManage.getKeyPress({ keyCode: 85 }, 'down');
		assert.equal(window.gameManage.ctrl.stageIndex, 1, 'U key should forward stage index');

		// Stage backward (R key, keyCode 82)
		window.inputManage.getKeyPress({ keyCode: 82 }, 'down');
		assert.equal(window.gameManage.ctrl.stageIndex, 0, 'R key should reverse stage index');
	});

});
