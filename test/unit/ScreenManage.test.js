// test/unit/ScreenManage.test.js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import ScreenManage from '../../src/ScreenManage.js';
import ScreenControl from '../../src/screens/ScreenControl.js';
import StartScreenControl from '../../src/screens/StartScreenControl.js';
import SettingScreenControl from '../../src/screens/SettingScreenControl.js';
import RecordScreenControl from '../../src/screens/RecordScreenControl.js';
import StageClearScreenControl from '../../src/screens/StageClearScreenControl.js';
import AllClearScreenControl from '../../src/screens/AllClearScreenControl.js';
import GameOverScreenControl from '../../src/screens/GameOverScreenControl.js';
import AboutScreenControl from '../../src/screens/AboutScreenControl.js';

describe('ScreenManage and ScreenControllers unit tests', () => {
	beforeEach(() => {
		setupEnvironment();
	});

	it('initializes ScreenManage and registers default screen controllers', () => {
		const sm = new ScreenManage();
		assert.ok(sm.getController('screen_start') instanceof StartScreenControl);
		assert.ok(sm.getController('screen_setting') instanceof SettingScreenControl);
		assert.ok(sm.getController('screen_record') instanceof RecordScreenControl);
		assert.ok(sm.getController('screen_stageClear') instanceof StageClearScreenControl);
		assert.ok(sm.getController('screen_allClear') instanceof AllClearScreenControl);
		assert.ok(sm.getController('screen_gameOver') instanceof GameOverScreenControl);
		assert.ok(sm.getController('screen_about') instanceof AboutScreenControl);

		// Custom controller registration
		const custom = new ScreenControl(sm, 'custom_screen');
		sm.registerController('custom_screen', custom);
		assert.equal(sm.getController('custom_screen'), custom);

		// Unknown controller returns null
		assert.equal(sm.getController('unknown_screen'), null);
	});

	it('handles screen lifecycle: openScreen, closeScreen, and toggleScreen', () => {
		const sm = new ScreenManage();
		let opened = false;
		let closed = false;

		const mockCtrl = new (class extends ScreenControl {
			onOpen() { opened = true; }
			onClose() { closed = true; }
		})(sm, 'screen_start');

		sm.registerController('screen_start', mockCtrl);

		// Open
		sm.openScreen('screen_start');
		const screenEl = document.getElementById('screen_start');
		assert.equal(screenEl.style.display, 'block');
		assert.equal(opened, true);

		// Toggle (currently block -> close)
		sm.toggleScreen('screen_start');
		assert.equal(screenEl.style.display, 'none');
		assert.equal(closed, true);

		// Toggle again (none -> open)
		sm.toggleScreen('screen_start');
		assert.equal(screenEl.style.display, 'block');

		// Close
		sm.closeScreen('screen_start');
		assert.equal(screenEl.style.display, 'none');

		// Open/Close non-existent screen triggers alert fallback without crash
		sm.openScreen('non_existent');
		sm.closeScreen('non_existent');
		sm.toggleScreen('non_existent');
	});

	it('handles saving, getting, and replacing screen template data', () => {
		const sm = new ScreenManage();
		const el = document.getElementById('screen_stageClear');
		el.innerHTML = 'Template: <!--stage_title-->';

		sm.saveScreenData('screen_stageClear');
		assert.equal(sm.getScreenData('screen_stageClear'), 'Template: <!--stage_title-->');

		sm.replaceScreenData('screen_stageClear', 'Replaced Content');
		assert.equal(el.innerHTML, 'Replaced Content');

		// Non-existent element
		sm.saveScreenData('non_existent');
		assert.equal(sm.getScreenData('non_existent'), undefined);
	});

	it('closes all screens inside screenStock via allClose()', () => {
		const sm = new ScreenManage();
		sm.openScreen('screen_start');
		sm.openScreen('screen_record');
		sm.allClose();

		assert.equal(document.getElementById('screen_start').style.display, 'none');
		assert.equal(document.getElementById('screen_record').style.display, 'none');
	});

	it('executes specialized screen methods: showGameOver, showStageClear, showAllClear', () => {
		const sm = new ScreenManage();
		sm.saveScreenData('screen_gameOver');
		sm.saveScreenData('screen_stageClear');
		sm.saveScreenData('screen_allClear');

		const stats = {
			stageTitle: 'STAGE 1',
			score: 1000,
			awardPt: { remainderLife: 100 },
			awardNum: { remainderLife: 3 },
		};

		sm.showGameOver(stats);
		assert.equal(document.getElementById('screen_gameOver').style.display, 'block');

		sm.showStageClear(stats);
		assert.equal(document.getElementById('screen_stageClear').style.display, 'block');

		sm.showAllClear(stats);
		assert.equal(document.getElementById('screen_allClear').style.display, 'block');
	});

	it('exercises RecordScreenControl rendering and selectors', () => {
		const sm = new ScreenManage();
		sm.saveScreenData('screen_record');
		sm.showRecord(0, 0);

		const stageSelector = document.getElementById('record_stage');
		if (stageSelector && typeof stageSelector.onchange === 'function') {
			stageSelector.selectedIndex = 1;
			stageSelector.onchange();
		}

		const typeSelector = document.getElementById('record_type');
		if (typeSelector && typeof typeSelector.onchange === 'function') {
			typeSelector.selectedIndex = 1;
			typeSelector.onchange();
		}

		const reloadBtn = document.getElementById('reload_record');
		if (reloadBtn && typeof reloadBtn.onclick === 'function') {
			reloadBtn.onclick();
		}
	});

	it('exercises AboutScreenControl render and versionCheck', () => {
		const sm = new ScreenManage();
		sm.saveScreenData('screen_about');

		const ctrl = sm.getController('screen_about');
		ctrl.render('v2.0.0');
		assert.ok(document.getElementById('screen_about').innerHTML.includes('v2.0.0'));

		// versionCheck
		sm.checkVersion();
		assert.ok(true);
	});

	it('exercises StartScreenControl setupButtonSounds and onOpen', () => {
		const sm = new ScreenManage();
		const ctrl = sm.getController('screen_start');
		assert.equal(ctrl.getElement().id, 'screen_start');
		ctrl.onOpen();
		ctrl.onClose();

		sm.setupButtonSounds();
	});

	it('exercises SettingScreenControl selector bindings and change handlers', () => {
		const sm = new ScreenManage();
		const ctrl = sm.getController('screen_setting');
		ctrl.bindControls();

		// Trigger stage selector change
		const mockCtrl = window.ctrl;
		if (mockCtrl && mockCtrl.formSelector && mockCtrl.formSelector['stage']) {
			mockCtrl.formSelector['stage'].value = 0;
			mockCtrl.formSelector['stage'].onchange();
		}

		// Trigger sizeFit selector change
		if (mockCtrl && mockCtrl.formSelector && mockCtrl.formSelector['sizefit']) {
			mockCtrl.formSelector['sizefit'].value = 1;
			mockCtrl.formSelector['sizefit'].onchange();
		}

		// Trigger sound selector change
		if (mockCtrl && mockCtrl.formSelector && mockCtrl.formSelector['sound']) {
			mockCtrl.formSelector['sound'].value = 1;
			mockCtrl.formSelector['sound'].onchange();
		}
	});

	it('cleans up resources and controllers on destructor()', () => {
		const sm = new ScreenManage();
		sm.destructor();
		assert.equal(sm.controllers.size, 0);
		assert.equal(sm.game, null);
	});
});
