// test/unit/RecordScreenControl.test.js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import RecordScreenControl from '../../src/screens/RecordScreenControl.js';
import ScreenManage from '../../src/ScreenManage.js';

describe('RecordScreenControl unit tests', () => {
	let screenManage;
	let storage;

	beforeEach(() => {
		const env = setupEnvironment();
		storage = env.storage;
		screenManage = new ScreenManage();
	});

	it('initializes with default settings and falls back to storage and scoreMng', () => {
		const ctrl = new RecordScreenControl(screenManage);
		assert.equal(ctrl.screenId, 'screen_record');
		assert.equal(ctrl.getStorage(), storage);
		assert.equal(ctrl.getScoreMng(), null);
	});

	it('onOpen triggers render and updates DOM from storage', () => {
		const ctrl = new RecordScreenControl(screenManage);
		screenManage.registerController('screen_record', ctrl);

		storage.setItem('record_Beginner_playNum', '7');
		storage.setItem('record_Beginner_clearNum', '5');
		storage.setItem('record_best_Beginner_stageScore', '8500');

		// Call onOpen directly
		ctrl.onOpen();

		const screenEl = document.getElementById('screen_record');
		assert.ok(screenEl.innerHTML.includes('7times'), 'Should display playNum 7times');
		assert.ok(screenEl.innerHTML.includes('5times (勝率：71.42%）'), 'Should display clear ratio');
		assert.ok(screenEl.innerHTML.includes('8500pt'), 'Should display stage score 8500pt');

		const stageSel = document.getElementById('record_stage');
		assert.ok(stageSel.options.length >= 13, 'Stage selector should have stage options');
	});

	it('preserves selection across stage and type selector changes', () => {
		const ctrl = new RecordScreenControl(screenManage);
		ctrl.render(0, 0);

		const stageSel = document.getElementById('record_stage');
		const typeSel = document.getElementById('record_type');

		// Select stage 2 (Fly)
		stageSel.selectedIndex = 2;
		stageSel.onchange();

		// Change type to 1 (Average)
		typeSel.selectedIndex = 1;
		typeSel.onchange();

		const updatedStageSel = document.getElementById('record_stage');
		const updatedTypeSel = document.getElementById('record_type');
		assert.equal(updatedStageSel.selectedIndex, 2, 'Stage selection should remain index 2');
		assert.equal(updatedTypeSel.selectedIndex, 1, 'Type selection should remain index 1');
	});

	it('handles reload button and reset button clicks', () => {
		const ctrl = new RecordScreenControl(screenManage);
		ctrl.render(0, 0);

		const reloadBtn = document.getElementById('reload_record');
		assert.ok(reloadBtn && typeof reloadBtn.onclick === 'function');
		assert.doesNotThrow(() => reloadBtn.onclick());

		const resetBtn = document.getElementById('reset_record');
		assert.ok(resetBtn && typeof resetBtn.onclick === 'function');
		assert.doesNotThrow(() => resetBtn.onclick());
	});

	it('renders clean 0 statistics without NaN or leftover comments when storage is empty', () => {
		const ctrl = new RecordScreenControl(screenManage);
		ctrl.render(0, 0);

		const screenEl = document.getElementById('screen_record');
		assert.ok(!screenEl.innerHTML.includes('<!--'), 'No comment placeholders should remain in rendered HTML');
		assert.ok(!screenEl.innerHTML.includes('NaN'), 'No NaN values should appear');
		assert.ok(screenEl.innerHTML.includes('0times (勝率：0%）'), 'Should display 0% win rate');
		assert.ok(screenEl.innerHTML.includes('0pt'), 'Should display 0pt');
	});

	it('preserves template across repeated renders with changing storage data', () => {
		const ctrl = new RecordScreenControl(screenManage);
		ctrl.render(0, 0);

		storage.setItem('record_Beginner_playNum', '10');
		storage.setItem('record_Beginner_clearNum', '10');
		storage.setItem('record_best_Beginner_stageScore', '5000');
		ctrl.render(0, 0);

		const screenEl = document.getElementById('screen_record');
		assert.ok(screenEl.innerHTML.includes('10times'), 'Should display updated 10times');
		assert.ok(screenEl.innerHTML.includes('100%'), 'Should display 100% win rate');
		assert.ok(screenEl.innerHTML.includes('5000pt'), 'Should display 5000pt');

		// Render again with different stage
		storage.setItem('record_Square_playNum', '2');
		storage.setItem('record_Square_clearNum', '1');
		storage.setItem('record_best_Square_stageScore', '3333');
		ctrl.render(0, 1);

		assert.ok(screenEl.innerHTML.includes('2times'), 'Should display 2times for Square');
		assert.ok(screenEl.innerHTML.includes('50%'), 'Should display 50% win rate for Square');
		assert.ok(screenEl.innerHTML.includes('3333pt'), 'Should display 3333pt for Square');
	});

	it('getTemplate falls back to DEFAULT_RECORD_TEMPLATE when element is empty', () => {
		const screenEl = document.getElementById('screen_record');
		screenEl.innerHTML = '<div>corrupted</div>';
		screenManage.screenData['screen_record'] = null;

		const ctrl = new RecordScreenControl(screenManage);
		const tmpl = ctrl.getTemplate();
		assert.ok(tmpl.includes('<!--play_num-->'), 'Template should contain placeholder comments from default template');
	});

	it('destructor cleans up event handlers and references', () => {
		const ctrl = new RecordScreenControl(screenManage);
		ctrl.render(0, 0);
		ctrl.destructor();

		const resetBtn = document.getElementById('reset_record');
		assert.equal(resetBtn.onclick, null);
		const reloadBtn = document.getElementById('reload_record');
		assert.equal(reloadBtn.onclick, null);
		assert.equal(ctrl.template, null);
	});
});

