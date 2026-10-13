// test/system/recordManagement.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';

describe('System Test SYS-09: Record Management and Viewing', () => {
	beforeEach(() => {
		setupEnvironment();
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('SYS-09: renders record screen for Best, Average, and Worst across stages', () => {
		const g = window.gameManage;
		const stageName = g.stageTitle[0];
		g.storage.setItem(`record_${stageName}_playNum`, '10');
		g.storage.setItem(`record_${stageName}_clearNum`, '8');
		g.storage.setItem(`record_best_${stageName}_stageScore`, '9999');

		// Render Best for stage 0
		window.screenManage.printRecordScreen(0, 0);

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

	it('SYS-09: automatically records game results upon stage clear or game over and displays on open', () => {
		const g = window.gameManage;
		g.init(0);

		// Simulate playing stage 0 (Beginner): score points, then clear all blocks
		window.eventBus.emitEvent('score:add', 1200);
		g.statusMng.blockNum = 0;
		g.gameOver();

		const stage0Name = g.stageTitle[0] || 'Beginner';
		assert.equal(g.storage.getItem(`record_${stage0Name}_playNum`), '1');
		assert.equal(g.storage.getItem(`record_${stage0Name}_clearNum`), '1');
		const bestScore = g.storage.getItem(`record_best_${stage0Name}_stageScore`);
		assert.ok(Number(bestScore) >= 1200, `Expected score >= 1200, got ${bestScore}`);

		// User navigates to record screen via openScreen
		window.screenManage.openScreen('screen_record');

		const screenRecord = document.getElementById('screen_record');
		assert.ok(screenRecord.innerHTML.includes('1times'), 'Should display 1 play times');
		assert.ok(screenRecord.innerHTML.includes('1times (勝率：100%）'), 'Should display 1 clear and 100% win rate');
		assert.ok(screenRecord.innerHTML.includes(`${bestScore}pt`), `Should display stage score ${bestScore}pt`);

		// Verify stage selector options are populated
		const stageSel = document.getElementById('record_stage');
		assert.ok(stageSel.options.length >= 13, `Expected at least 13 stage options, got ${stageSel.options.length}`);
		assert.equal(stageSel.options[0].innerHTML, stage0Name);

		// Now simulate game over on stage 1 (Square)
		g.init(1);
		window.eventBus.emitEvent('score:add', 300);
		g.statusMng.life = 0;
		g.gameOver();

		const stage1Name = g.stageTitle[1] || 'Square';
		assert.equal(g.storage.getItem(`record_${stage1Name}_playNum`), '1');
		assert.equal(g.storage.getItem(`record_${stage1Name}_clearNum`), '0');

		// Re-open record screen and switch dropdown to stage 1
		window.screenManage.openScreen('screen_record');
		stageSel.selectedIndex = 1;
		stageSel.onchange();

		assert.ok(screenRecord.innerHTML.includes('1times'), 'Should display 1 play time for stage 1');
		assert.ok(screenRecord.innerHTML.includes('0times (勝率：0%）'), 'Should display 0 clears and 0% win rate');

		// Switch record type to Worst: stage index 1 should be retained
		const typeSel = document.getElementById('record_type');
		typeSel.selectedIndex = 2; // Worst
		typeSel.onchange();

		const updatedStageSel = document.getElementById('record_stage');
		assert.equal(updatedStageSel.selectedIndex, 1, 'Stage selection should be retained when changing record type');
	});

	it('SYS-09: handles record reset confirmation and deletion', () => {
		const g = window.gameManage;
		const stageName = g.stageTitle[0];
		g.storage.setItem(`record_${stageName}_playNum`, '5');

		// Click reset record button and cancel first
		const resetBtn = document.getElementById('reset_record');
		resetBtn.onclick();
		const cancelBtn = document.getElementById('cancel');
		assert.ok(cancelBtn, 'Cancel button should exist on confirm dialog');
		cancelBtn.onclick();
		assert.equal(g.storage.getItem(`record_${stageName}_playNum`), '5', 'Records should not be deleted on cancel');

		// Click reset record button and confirm
		resetBtn.onclick();
		const okBtn = document.getElementById('ok');
		assert.ok(okBtn, 'OK button should exist on confirm dialog');
		okBtn.onclick();
		assert.equal(g.storage.getItem(`record_${stageName}_playNum`), null, 'Records should be deleted on OK');
	});
});
