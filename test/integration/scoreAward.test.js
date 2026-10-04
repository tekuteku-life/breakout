// test/integration/scoreAward.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';
import Ball from '../../src/Ball.js';
import Block from '../../src/Block.js';
import { BLOCK_FUNCTION, BALL_STATUS, BALL_CREATE_MODE } from '../../src/const.js';

describe('Integration Test: Score Calculation, Award Bonuses, and Stage Completion', () => {
	beforeEach(() => {
		setupEnvironment();
		window.gameManage.init(0);
		clearInterval(window.timer_All);
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('calculates full award bonuses for life, balls, items, and speed', () => {
		const g = window.gameManage;
		const scoreMng = g.scoreMng;
		const statusMng = g.statusMng;

		scoreMng.init();
		scoreMng.score = 1000;
		statusMng.life = 3;

		// Setup 3 balls, one strengthened
		const ball1 = new Ball(BALL_CREATE_MODE.INIT, g);
		const ball2 = new Ball(BALL_CREATE_MODE.INIT, g);
		ball2.status = BALL_STATUS.STRONG;
		ball2.breakNum = 5;
		g.balls = [ball1, ball2];

		scoreMng.awardNum.continuousBreakNum = 4;
		scoreMng.awardNum.getItemNum = 3;
		scoreMng.awardNum.fallBallNum = 1;

		// Calculate awards
		scoreMng.calculateAwardPoint();

		assert.ok(scoreMng.awardPt.remainderLife > 0, 'Should award points for remaining lives');
		assert.ok(scoreMng.awardPt.ballNum > 0, 'Should award points for multiple balls');
		assert.ok(scoreMng.awardPt.strengClear > 0, 'Should award points for strong ball clear');
		assert.ok(scoreMng.awardPt.continuousBreakNum > 0, 'Should award points for continuous breaks');
		assert.ok(scoreMng.awardPt.continuousBreakClear > 0, 'Should award points for continuous break clear');
		assert.ok(scoreMng.awardPt.getItemNum > 0, 'Should award points for collected items');
		assert.ok(scoreMng.awardPt.fallBallNum <= 0, 'Should penalize fallen balls');
		assert.ok(scoreMng.score > 1000, 'Total score should have increased');
		assert.ok(scoreMng.stageScore > 0, 'Stage score should be positive');
	});

	it('prevents negative stage score when penalties exceed awards', () => {
		const g = window.gameManage;
		const scoreMng = g.scoreMng;
		const statusMng = g.statusMng;

		scoreMng.init();
		scoreMng.score = 500;
		scoreMng.sumPrevScore = 500;
		statusMng.life = 1;
		g.balls = [new Ball(BALL_CREATE_MODE.INIT, g)];

		// Heavy penalty
		scoreMng.awardNum.fallBallNum = 1000;
		scoreMng.calculateAwardPoint();

		assert.equal(scoreMng.stageScore, 0, 'Stage score should be clamped at 0');
		assert.equal(scoreMng.score, 500, 'Score should be restored to sumPrevScore');
	});

	it('triggers combo pop balloons on continuous block breaks', () => {
		const g = window.gameManage;
		const ball = new Ball(BALL_CREATE_MODE.INIT, g);
		g.balls = [ball];
		g.balloons = [];

		const block1 = new Block(5, 4, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, g);
		const block2 = new Block(6, 4, 1, BLOCK_FUNCTION.NORMAL, 0, 0, 0, g);
		g.blockMap = [[], [], [], [], [null, null, null, null, null, block1, block2]];

		// First break
		block1.action(ball, 0);
		assert.equal(ball.breakNum, 1);
		assert.equal(g.scoreMng.awardNum.continuousBreakNum, 1);
		assert.equal(g.balloons.length, 1, 'Should create combo balloon for first break');

		// Second consecutive break
		block2.action(ball, 0);
		assert.equal(ball.breakNum, 2);
		assert.equal(g.scoreMng.awardNum.continuousBreakNum, 2);
		assert.equal(g.balloons.length, 2, 'Should create combo balloon for second break');

		// Step balloons
		g.balloons[0].draw(g.dynamicCtx);
	});

	it('records play statistics and award rankings to persistent storage', () => {
		const g = window.gameManage;
		const scoreMng = g.scoreMng;
		const stageIndex = g.ctrl.stageIndex;
		const stageName = String(g.stageTitle[stageIndex]).replace(/_/g, '__');

		scoreMng.stageScore = 2500;
		scoreMng.awardNum.clearTime = 45;
		scoreMng.awardNum.fallBallNum = 2;
		scoreMng.awardNum.continuousBreakNum = 10;

		// First record
		scoreMng.recordScore(1);

		assert.equal(Number(g.storage.getItem(`record_${stageName}_playNum`)), 1);
		assert.equal(Number(g.storage.getItem(`record_${stageName}_clearNum`)), 1);
		assert.equal(Number(g.storage.getItem(`record_best_${stageName}_stageScore`)), 2500);
		assert.equal(Number(g.storage.getItem(`record_best_${stageName}_clearTime`)), 45);

		// Second record with better clearTime (lower is better for clearTime)
		scoreMng.stageScore = 3000;
		scoreMng.awardNum.clearTime = 30; // Better time
		scoreMng.awardNum.fallBallNum = 1; // Better fall count
		scoreMng.awardNum.continuousBreakNum = 15; // Higher is better
		scoreMng.recordScore(1);

		assert.equal(Number(g.storage.getItem(`record_${stageName}_playNum`)), 2);
		assert.equal(Number(g.storage.getItem(`record_${stageName}_clearNum`)), 2);
		assert.equal(Number(g.storage.getItem(`record_best_${stageName}_stageScore`)), 3000);
		assert.equal(Number(g.storage.getItem(`record_best_${stageName}_clearTime`)), 30, 'Best clear time should be the minimum');
		assert.equal(Number(g.storage.getItem(`record_worst_${stageName}_clearTime`)), 45, 'Worst clear time should be the maximum');
		assert.equal(Number(g.storage.getItem(`record_best_${stageName}_continuousBreakNum`)), 15);

		// Delete record functionality
		scoreMng.deleteRecord();
		assert.equal(g.storage.getItem(`record_${stageName}_playNum`), null);
		assert.equal(g.storage.getItem(`record_best_${stageName}_stageScore`), null);
	});

	it('handles stage clear flow in gameOver() when player is alive', () => {
		const g = window.gameManage;
		g.statusMng.life = 2;
		g.statusMng.blockNum = 0;
		g.ctrl.stageIndex = 0;
		g.ctrl.stageEnded = 0;
		g.scoreMng.score = 5000;

		// Execute gameOver (stage clear flow)
		g.gameOver();

		// Should have advanced stage
		assert.equal(g.ctrl.stageIndex, 1);
		assert.ok(Number(g.storage.getItem('continue_score')) >= 5000);
		assert.ok(Number(g.storage.getItem('record_hiScore')) >= 5000);
	});

	it('handles game over flow in gameOver() when player life is 0', () => {
		const g = window.gameManage;
		g.statusMng.life = 0;
		g.ctrl.stageIndex = 1;
		g.scoreMng.score = 3000;

		// Execute gameOver (player death flow)
		g.gameOver();

		// Should reset continue data
		assert.equal(Number(g.storage.getItem('continue_score')), 0);
		assert.equal(Number(g.storage.getItem('continue_time')), 0);
	});

	it('handles all clear flow when final stage is beaten', () => {
		const g = window.gameManage;
		g.statusMng.life = 2;
		g.statusMng.blockNum = 0;
		g.ctrl.stageIndex = g.blockMapSet.length - 1;
		g.ctrl.stageEnded = 1;
		g.scoreMng.score = 99999;

		g.gameOver();

		assert.equal(Number(g.storage.getItem('continue_stageIndex')), 0);
		assert.ok(Number(g.storage.getItem('record_hiScore')) >= 99999);
	});
});
