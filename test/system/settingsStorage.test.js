// test/system/settingsStorage.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';

describe('System Test SYS-08: Settings, Storage, and Continue Mode', () => {
	beforeEach(() => {
		setupEnvironment();
		window.init(0);
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('SYS-08: handles form selector onchange events and persists settings', () => {
		// 1. Stage selector onchange
		const stageSel = window.ctrl.formSelector['stage'];
		stageSel.value = 2;
		stageSel.onchange();
		assert.equal(window.ctrl.stageIndex, 2);
		assert.equal(window.storage.getItem('continue_stageIndex'), '2');

		// 2. Sound selector onchange
		const soundSel = window.ctrl.formSelector['sound'];
		soundSel.value = 1;
		soundSel.onchange();
		assert.equal(window.ctrl.soundSwitch, 1);
		assert.equal(window.storage.getItem('setting_soundSwitch'), '1');

		// 3. SizeFit selector onchange
		const sizeSel = window.ctrl.formSelector['sizefit'];
		sizeSel.value = 1;
		sizeSel.onchange();
		assert.equal(window.ctrl.sizeFitSwitch, 1);
		assert.equal(window.storage.getItem('setting_sizeFitSwitch'), '1');

		// 4. Continue selector onchange
		const contSel = window.ctrl.formSelector['continue'];
		contSel.value = 1;
		contSel.onchange();
		assert.equal(window.ctrl.continueSwitch, 1);
		assert.equal(window.storage.getItem('setting_continueSwitch'), '1');

		// 5. Ctrl selector onchange
		const ctrlSel = window.ctrl.formSelector['ctrl'];
		ctrlSel.value = 1;
		ctrlSel.onchange();
		assert.equal(window.ctrl.ctrlSwitch, 1);
		assert.equal(window.storage.getItem('setting_ctrlSwitch'), '1');
	});

	it('SYS-08: restores previous life, score, and time when continueSwitch is ON', () => {
		// Populate continue data
		window.storage.setItem('setting_continueSwitch', '1');
		window.storage.setItem('continue_life', '4');
		window.storage.setItem('continue_score', '1250');
		window.storage.setItem('continue_time', '42');

		// Re-initialize with continue mode active
		window.init(1);

		assert.equal(window.statusMng.life, '4', 'Life should be restored from continue data');
		assert.equal(window.scoreMng.score, '1250', 'Score should be restored from continue data');
		assert.equal(window.statusMng.playTime, '42', 'Play time should be restored from continue data');
	});

	it('SYS-08: executes changeSetting to switch script configuration', () => {
		// Mock script replacement
		window.changeSetting('./setup/default_debug.js');
		const newScr = document.getElementById('setup');
		assert.ok(newScr, 'New setup script should be injected');
		assert.equal(newScr.src, './setup/default_debug.js');
		// Trigger load callback
		newScr.onload();
		assert.ok(window.ctrl, 'init should run after script load');
	});
});
