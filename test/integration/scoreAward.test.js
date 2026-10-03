// test/integration/scoreAward.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';
import Ball from '../../src/Ball.js';
import Block from '../../src/Block.js';

describe('Integration Test: Score Calculation, Award Bonuses, and Stage Completion', () => {
	beforeEach(() => {
		setupEnvironment();
		window.init(0);
		clearInterval(window.timer_All);
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('calculates full award bonuses for life, balls, items, and speed', () => {
		const scoreMng = window.scoreMng;
		const statusMng = window.statusMng;

		scoreMng.init();
		scoreMng.score = 1000;
		statusMng.life = 3;

		// Setup 3 balls, one strengthened
		const ball1 = new Ball(window.BALL_CREATE_MODE.INIT);
		const ball2 = new Ball(window.BALL_CREATE_MODE.INIT);
		ball2.status = window.BALL_STATUS.STRONG;
		ball2.breakNum = 5;
		window.balls = [ball1, ball2];

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
		const scoreMng = window.scoreMng;
		const statusMng = window.statusMng;

		scoreMng.init();
		scoreMng.score = 500;
		scoreMng.sumPrevScore = 500;
		statusMng.life = 1;
		window.balls = [new Ball(window.BALL_CREATE_MODE.INIT)];

		// Heavy penalty
		scoreMng.awardNum.fallBallNum = 1000;
		scoreMng.calculateAwardPoint();

		assert.equal(scoreMng.stageScore, 0, 'Stage score should be clamped at 0');
		assert.equal(scoreMng.score, 500, 'Score should be restored to sumPrevScore');
	});

	it('triggers combo pop balloons on continuous block breaks', () => {
		const ball = new Ball(window.BALL_CREATE_MODE.INIT);
		window.balls = [ball];
		window.balloons = [];

		const block1 = new Block(5, 4, 1, window.BLOCK_FUNCTION.NORMAL, 0);
		const block2 = new Block(6, 4, 1, window.BLOCK_FUNCTION.NORMAL, 0);
		window.blockMap = [[], [], [], [], [null, null, null, null, null, block1, block2]];

		// First break
		block1.action(ball, 0);
		assert.equal(ball.breakNum, 1);
		assert.equal(window.scoreMng.awardNum.continuousBreakNum, 1);
		assert.equal(window.balloons.length, 1, 'Should create combo balloon for first break');

		// Second consecutive break
		block2.action(ball, 0);
		assert.equal(ball.breakNum, 2);
		assert.equal(window.scoreMng.awardNum.continuousBreakNum, 2);
		assert.equal(window.balloons.length, 2, 'Should create combo balloon for second break');

		// Step balloons
		window.balloons[0].draw(window.dynamicCtx);
	});

	it('records play statistics and award rankings to persistent storage', () => {
		const scoreMng = window.scoreMng;
		const stageIndex = window.ctrl.stageIndex;
		const stageName = String(window.stageTitle[stageIndex]).replace(/_/g, '__');

		scoreMng.stageScore = 2500;
		scoreMng.awardNum.clearTime = 45;
		scoreMng.awardNum.fallBallNum = 2;
		scoreMng.awardNum.continuousBreakNum = 10;

		// First record
		scoreMng.recordScore(1);

		assert.equal(Number(window.storage.getItem(`record_${stageName}_playNum`)), 1);
		assert.equal(Number(window.storage.getItem(`record_${stageName}_clearNum`)), 1);
		assert.equal(Number(window.storage.getItem(`record_best_${stageName}_stageScore`)), 2500);
		assert.equal(Number(window.storage.getItem(`record_best_${stageName}_clearTime`)), 45);

		// Second record with better clearTime (lower is better for clearTime)
		scoreMng.stageScore = 3000;
		scoreMng.awardNum.clearTime = 30; // Better time
		scoreMng.awardNum.fallBallNum = 1; // Better fall count
		scoreMng.awardNum.continuousBreakNum = 15; // Higher is better
		scoreMng.recordScore(1);

		assert.equal(Number(window.storage.getItem(`record_${stageName}_playNum`)), 2);
		assert.equal(Number(window.storage.getItem(`record_${stageName}_clearNum`)), 2);
		assert.equal(Number(window.storage.getItem(`record_best_${stageName}_stageScore`)), 3000);
		assert.equal(Number(window.storage.getItem(`record_best_${stageName}_clearTime`)), 30, 'Best clear time should be the minimum');
		assert.equal(Number(window.storage.getItem(`record_worst_${stageName}_clearTime`)), 45, 'Worst clear time should be the maximum');
		assert.equal(Number(window.storage.getItem(`record_best_${stageName}_continuousBreakNum`)), 15);

		// Delete record functionality
		scoreMng.deleteRecord();
		assert.equal(window.storage.getItem(`record_${stageName}_playNum`), null);
		assert.equal(window.storage.getItem(`record_best_${stageName}_stageScore`), null);
	});

	it('handles stage clear flow in gameOver() when player is alive', () => {
		window.statusMng.life = 2;
		window.ctrl.stageIndex = 0;
		window.ctrl.stageEnded = 0;
		window.scoreMng.score = 5000;

		// Execute gameOver (stage clear flow)
		window.gameOver();

		// Should have advanced stage
		assert.equal(window.ctrl.stageIndex, 1);
		assert.ok(Number(window.storage.getItem('continue_score')) >= 5000);
		assert.ok(Number(window.storage.getItem('record_hiScore')) >= 5000);
	});

	it('handles game over flow in gameOver() when player life is 0', () => {
		window.statusMng.life = 0;
		window.ctrl.stageIndex = 1;
		window.scoreMng.score = 3000;

		// Execute gameOver (player death flow)
		window.gameOver();

		// Should reset continue data
		assert.equal(Number(window.storage.getItem('continue_score')), 0);
		assert.equal(Number(window.storage.getItem('continue_time')), 0);
	});

	it('handles all clear flow when final stage is beaten', () => {
		window.statusMng.life = 2;
		window.ctrl.stageIndex = window.blockMapSet.length - 1;
		window.ctrl.stageEnded = 1;
		window.scoreMng.score = 99999;

		window.gameOver();

		assert.equal(Number(window.storage.getItem('continue_stageIndex')), 0);
		assert.ok(Number(window.storage.getItem('record_hiScore')) >= 99999);
	});
});
