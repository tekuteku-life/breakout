// test/system/recordManagement.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';

describe('System Test SYS-09: Record Management and Viewing', () => {
	beforeEach(() => {
		setupEnvironment();
		window.onload();
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('SYS-09: renders record screen for Best, Average, and Worst across stages', () => {
		const stageName = window.stageTitle[0];
		window.storage.setItem(`record_${stageName}_playNum`, '10');
		window.storage.setItem(`record_${stageName}_clearNum`, '8');
		window.storage.setItem(`record_best_${stageName}_stageScore`, '9999');

		// Render Best for stage 0
		window.printRecordScreen(0, 0);

		const screenRecord = document.getElementById('screen_record');
		assert.ok(screenRecord.innerHTML.includes('10times'), 'ACTUAL HTML: ' + screenRecord.innerHTML);
		assert.ok(screenRecord.innerHTML.includes('8times'));
		assert.ok(screenRecord.innerHTML.includes('80%')); // Clear ratio
		assert.ok(screenRecord.innerHTML.includes('9999pt'));

		// Test stage change event
		const stageSel = document.getElementById('record_stage');
		stageSel.selectedIndex = 1;
		stageSel.onchange();

		// Test record type change event (Average)
		const typeSel = document.getElementById('record_type');
		typeSel.selectedIndex = 1;
		typeSel.onchange();

		// Test reload button
		const reloadBtn = document.getElementById('reload_record');
		reloadBtn.onclick();
	});

	it('SYS-09: handles record reset confirmation and deletion', () => {
		const stageName = window.stageTitle[0];
		window.storage.setItem(`record_${stageName}_playNum`, '5');

		// Click reset record button and cancel first
		const resetBtn = document.getElementById('reset_record');
		resetBtn.onclick();
		const cancelBtn = document.getElementById('cancel');
		assert.ok(cancelBtn, 'Cancel button should exist on confirm dialog');
		cancelBtn.onclick();
		assert.equal(window.storage.getItem(`record_${stageName}_playNum`), '5', 'Records should not be deleted on cancel');

		// Click reset record button and confirm
		resetBtn.onclick();
		const okBtn = document.getElementById('ok');
		assert.ok(okBtn, 'OK button should exist on confirm dialog');
		okBtn.onclick();
		assert.equal(window.storage.getItem(`record_${stageName}_playNum`), null, 'Records should be deleted on OK');
	});
});
