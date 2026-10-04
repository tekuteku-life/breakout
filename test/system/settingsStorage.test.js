// test/system/settingsStorage.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';

describe('System Test SYS-08: Settings, Storage, and Continue Mode', () => {
	beforeEach(() => {
		setupEnvironment();
		window.gameManage.init(0);
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('SYS-08: handles form selector onchange events and persists settings', () => {
		const g = window.gameManage;
		// 1. Stage selector onchange
		const stageSel = g.ctrl.formSelector['stage'];
		stageSel.value = 2;
		stageSel.onchange();
		assert.equal(g.ctrl.stageIndex, 2);
		assert.equal(g.storage.getItem('continue_stageIndex'), '2');

		// 2. Sound selector onchange
		const soundSel = g.ctrl.formSelector['sound'];
		soundSel.value = 1;
		soundSel.onchange();
		assert.equal(g.ctrl.soundSwitch, 1);
		assert.equal(g.storage.getItem('setting_soundSwitch'), '1');

		// 3. SizeFit selector onchange
		const sizeSel = g.ctrl.formSelector['sizefit'];
		sizeSel.value = 1;
		sizeSel.onchange();
		assert.equal(g.ctrl.sizeFitSwitch, 1);
		assert.equal(g.storage.getItem('setting_sizeFitSwitch'), '1');

		// 4. Continue selector onchange
		const contSel = g.ctrl.formSelector['continue'];
		contSel.value = 1;
		contSel.onchange();
		assert.equal(g.ctrl.continueSwitch, 1);
		assert.equal(g.storage.getItem('setting_continueSwitch'), '1');

		// 5. Ctrl selector onchange
		const ctrlSel = g.ctrl.formSelector['ctrl'];
		ctrlSel.value = 1;
		ctrlSel.onchange();
		assert.equal(g.ctrl.ctrlSwitch, 1);
		assert.equal(g.storage.getItem('setting_ctrlSwitch'), '1');
	});

	it('SYS-08: restores previous life, score, and time when continueSwitch is ON', () => {
		const g = window.gameManage;
		// Populate continue data
		g.storage.setItem('setting_continueSwitch', '1');
		g.storage.setItem('continue_life', '4');
		g.storage.setItem('continue_score', '1250');
		g.storage.setItem('continue_time', '42');

		// Re-initialize with continue mode active
		g.init(1);

		assert.equal(g.statusMng.life, '4', 'Life should be restored from continue data');
		assert.equal(g.scoreMng.score, '1250', 'Score should be restored from continue data');
		assert.equal(g.statusMng.playTime, '42', 'Play time should be restored from continue data');
	});

	it('SYS-08: executes changeSetting to switch script configuration', () => {
		const g = window.gameManage;
		// Mock script replacement
		g.changeSetting('./setup/default_debug.js');
		const newScr = document.getElementById('setup');
		assert.ok(newScr, 'New setup script should be injected');
		assert.equal(newScr.src, './setup/default_debug.js');
		// Trigger load callback
		newScr.onload();
		assert.ok(g.ctrl, 'init should run after script load');
	});
});
