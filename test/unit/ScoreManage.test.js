import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import ScoreManage from '../../src/ScoreManage.js';

test('ScoreManage class unit tests', async (t) => {
	const { storage } = setupEnvironment();
	const createMockGame = (overrides = {}) => ({
		storage,
		stageTitle: ['Stage 1', 'Stage 2'],
		ctrl: { stageIndex: 0 },
		statusMng: {
			life: 3,
			isAlive: () => true,
			getPlaySecTime: () => '30.0',
			getPlayMinTime: () => '0',
		},
		balls: [
			{ status: 1, breakNum: 5 },
			{ status: 0, breakNum: 2 },
		],
		pointPerLife: [50],
		pointPerBall: [100],
		strongBallClear: [200],
		pointPerContBreak: [30],
		clearTimeThreashould: [60],
		pointPerClearTime: [10],
		pointPerGetItem: [20],
		pointPerFallBall: [10],
		...overrides,
	});

	await t.test('constructor initializes properties and loads hiScore', () => {
		storage.setItem('record_hiScore', '9999');
		const sm = new ScoreManage(createMockGame());
		assert.equal(sm.hiScore, '9999');
		assert.equal(sm.score, 0);
	});

	await t.test('init resets awardNum and awardPt', () => {
		const sm = new ScoreManage(createMockGame());
		sm.awardNum['ballNum'] = 5;
		sm.init();
		assert.equal(sm.awardNum['ballNum'], 0);
		assert.equal(sm.awardPt['ballNum'], 0);
	});

	await t.test('calculateAwardPoint handles all awards and score adjustment', () => {
		const game = createMockGame();
		const sm = new ScoreManage(game);
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

		// 死亡状態でのタイムボーナス計算テスト
		game.statusMng.isAlive = () => false;
		sm.calculateAwardPoint();
		assert.equal(sm.awardPt.clearTime, 0);

		// スコア補正テスト
		sm.sumPrevScore = 999999;
		sm.calculateAwardPoint();
		assert.equal(sm.stageScore, 0);
	});

	await t.test('recordScore records plays, clears, and best/ave/worst stats', () => {
		const game = createMockGame();
		const sm = new ScoreManage(game);
		sm.stageScore = 500;
		sm.awardNum = {
			clearTime: 45,
			fallBallNum: 2,
			getItemNum: 10,
		};

		sm.recordScore(1);

		const stageName = String(game.stageTitle[game.ctrl.stageIndex]).replace(/_/g, '__');
		assert.equal(storage.getItem(`record_${stageName}_playNum`), '1');
		assert.equal(storage.getItem(`record_${stageName}_clearNum`), '1');
		assert.equal(storage.getItem(`record_best_${stageName}_stageScore`), '500');

		// 2回目のスコア記録
		sm.stageScore = 200;
		sm.awardNum.clearTime = 30;
		sm.awardNum.fallBallNum = 5;
		sm.awardNum.getItemNum = 15;
		sm.recordScore(1);

		assert.equal(storage.getItem(`record_${stageName}_playNum`), '2');
		assert.equal(storage.getItem(`record_worst_${stageName}_stageScore`), '200');
		assert.equal(storage.getItem(`record_best_${stageName}_clearTime`), '30');
		assert.equal(storage.getItem(`record_best_${stageName}_getItemNum`), '15');

		// storageがnullのケース
		game.storage = null;
		assert.doesNotThrow(() => sm.recordScore(1));
	});

	await t.test('deleteRecord removes all record_ keys and calls MessageBox', () => {
		const game = createMockGame();
		const sm = new ScoreManage(game);
		storage.setItem('record_test_1', 'abc');
		storage.setItem('record_test_2', 'def');
		storage.setItem('other_key', 'ghi');

		sm.deleteRecord();
		assert.equal(storage.getItem('record_test_1'), null);
		assert.equal(storage.getItem('record_test_2'), null);
		assert.equal(storage.getItem('other_key'), 'ghi');
	});

	await t.test('destructor can be called', () => {
		const sm = new ScoreManage(createMockGame());
		assert.doesNotThrow(() => sm.destructor());
	});

	await t.test('ScoreManage getters access injected game properties', () => {
		const mockStorage = { getItem: () => null, storageProp: true };
		const mockStatusMng = { statusProp: true };
		const mockCtrl = { ctrlProp: true };
		const mockBalls = [{ ballProp: true }];
		const mockGame = {
			storage: mockStorage,
			statusMng: mockStatusMng,
			ctrl: mockCtrl,
			objectManage: {
				balls: mockBalls,
			},
		};

		const sm = new ScoreManage(mockGame);
		assert.equal(sm.getStorage(), mockStorage);
		assert.equal(sm.getStatusMng(), mockStatusMng);
		assert.equal(sm.getCtrl(), mockCtrl);
		assert.equal(sm.getBalls(), mockBalls);
	});
});


