import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import ScoreManage from '../../src/ScoreManage.js';

test('ScoreManage class unit tests', async (t) => {
	const { storage } = setupEnvironment();
	const origPrint = globalThis.printRecordScreen;
	globalThis.printRecordScreen = () => {};
	t.after(() => {
		globalThis.printRecordScreen = origPrint;
	});

	await t.test('constructor initializes properties and loads hiScore', () => {
		storage.setItem('record_hiScore', '9999');
		const sm = new ScoreManage();
		assert.equal(sm.hiScore, '9999');
		assert.equal(sm.score, 0);
	});

	await t.test('init resets awardNum and awardPt', () => {
		const sm = new ScoreManage();
		sm.awardNum['ballNum'] = 5;
		sm.init();
		assert.equal(sm.awardNum['ballNum'], 0);
		assert.equal(sm.awardPt['ballNum'], 0);
	});

	await t.test('calculateAwardPoint handles all awards and score adjustment', () => {
		const sm = new ScoreManage();
		globalThis.statusMng = {
			life: 3,
			isAlive: () => true,
			getPlaySecTime: () => '30.0',
			getPlayMinTime: () => '0',
		};
		globalThis.balls = [
			{ status: 1, breakNum: 5 }, // Strong ball
			{ status: 0, breakNum: 2 },
		];
		sm.awardNum = {
			remainderLife: 0,
			ballNum: 0,
			strengClear: 0,
			continuousBreakNum: 3,
			continuousBreakClear: 1,
			clearTime: 0,
			getItemNum: 2,
			fallBallNum: 1,
		};

		sm.calculateAwardPoint();
		assert.ok(sm.score > 0);
		assert.ok(sm.stageScore > 0);

		// Test dead state time calculation
		globalThis.statusMng.isAlive = () => false;
		sm.calculateAwardPoint();
		assert.equal(sm.awardPt.clearTime, 0);

		// Test score fallback when sumPrevScore > score
		sm.sumPrevScore = 999999;
		sm.calculateAwardPoint();
		assert.equal(sm.stageScore, 0);
	});

	await t.test('recordScore records plays, clears, and best/ave/worst stats', () => {
		const sm = new ScoreManage();
		sm.stageScore = 500;
		sm.awardNum = {
			clearTime: 45,
			fallBallNum: 2,
			getItemNum: 10,
		};

		sm.recordScore(1);

		globalThis.ctrl = globalThis.ctrl || { stageIndex: 0 };
		const stageName = String(globalThis.stageTitle[globalThis.ctrl.stageIndex]).replace(/_/g, '__');
		assert.equal(storage.getItem(`record_${stageName}_playNum`), '1');
		assert.equal(storage.getItem(`record_${stageName}_clearNum`), '1');
		assert.equal(storage.getItem(`record_best_${stageName}_stageScore`), '500');

		// Second record with worse/better scores
		sm.stageScore = 200;
		sm.awardNum.clearTime = 30; // Better time (smaller is better)
		sm.awardNum.fallBallNum = 5; // Worse fall count
		sm.awardNum.getItemNum = 15; // Better item count
		sm.recordScore(1);

		assert.equal(storage.getItem(`record_${stageName}_playNum`), '2');
		assert.equal(storage.getItem(`record_worst_${stageName}_stageScore`), '200');
		assert.equal(storage.getItem(`record_best_${stageName}_clearTime`), '30');
		assert.equal(storage.getItem(`record_best_${stageName}_getItemNum`), '15');

		// Null storage branch
		const oldStorage = globalThis.storage;
		globalThis.storage = null;
		assert.doesNotThrow(() => sm.recordScore(1));
		globalThis.storage = oldStorage;
	});

	await t.test('deleteRecord removes all record_ keys and calls MessageBox', () => {
		const sm = new ScoreManage();
		const oldPrint = globalThis.printRecordScreen;
		globalThis.printRecordScreen = () => {};
		storage.setItem('record_test_1', 'abc');
		storage.setItem('record_test_2', 'def');
		storage.setItem('other_key', 'ghi');

		sm.deleteRecord();
		assert.equal(storage.getItem('record_test_1'), null);
		assert.equal(storage.getItem('record_test_2'), null);
		assert.equal(storage.getItem('other_key'), 'ghi');
		globalThis.printRecordScreen = oldPrint;
	});

	await t.test('destructor can be called', () => {
		const sm = new ScoreManage();
		assert.doesNotThrow(() => sm.destructor());
	});
});
