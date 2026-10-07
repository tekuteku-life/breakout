// test/system/lifeGameOver.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';
import EventBus from '../../src/EventBus.js';

describe('System Test SYS-06: Life Decrement and Game Over Scenario', () => {
	beforeEach(() => {
		setupEnvironment();
		window.onload();
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('SYS-06: handles ball drop, life loss, and gameOver when life reaches 0', () => {
		const g = window.gameManage;

		// Launch a ball
		g.dynamicCanvas.onmousedown();
		g.dynamicCanvas.onmouseup({ button: 0 });
		assert.equal(g.balls.length, 1);

		// Set player to 1 life remaining
		g.statusMng.life = 1;
		g.scoreMng.score = 500;

		// Ball falls off the screen
		const ball = g.balls[0];
		ball.fall();

		// Ball removed, life decremented to 0
		assert.equal(g.balls.length, 0);
		assert.equal(g.statusMng.isAlive(), false, 'Player should be dead (life <= 0)');

		// Execute gameOver routine
		g.gameOver();

		// Check storage updates
		assert.equal(g.storage.getItem('continue_life'), String(g.defaultLife));
		assert.equal(g.storage.getItem('continue_score'), '0');
		assert.equal(g.storage.getItem('continue_time'), '0');
		assert.ok(Number(g.storage.getItem('record_hiScore')) > 0);

		// Check game over screen display
		const gameOverScreen = document.getElementById('screen_gameOver');
		assert.equal(gameOverScreen.style.display, 'block', 'screen_gameOver should be shown');
		assert.ok(gameOverScreen.innerHTML.includes('Game Over'), 'Game Over text should be present');
	});

	it('SYS-06-B: does NOT trigger gameOver when life is 0 but balls are still in play', () => {
		const g = window.gameManage;

		// Launch a ball
		g.dynamicCanvas.onmousedown();
		g.dynamicCanvas.onmouseup({ button: 0 });
		assert.equal(g.balls.length, 1);

		// Reduce player life to 0 while ball is still active (e.g. poison item or bar damage)
		g.statusMng.life = 0;
		assert.equal(g.statusMng.isAlive(), false);

		let gameOverTriggered = false;
		const origGameOver = g.gameOver.bind(g);
		g.gameOver = () => {
			gameOverTriggered = true;
			origGameOver();
		};

		// Run step(): should NOT trigger gameOver because ball is still in play
		g.step();
		assert.equal(gameOverTriggered, false, 'Should not game over when balls.length > 0');
		assert.equal(g.balls.length, 1);

		// Now drop the ball
		const ball = g.balls[0];
		ball.fall();
		assert.equal(g.balls.length, 0);

		// Now step(): should trigger gameOver because balls are 0 and life is 0
		g.step();
		assert.equal(gameOverTriggered, true, 'Should trigger gameOver when ball is lost and life <= 0');
	});

	it('SYS-06-C: does NOT trigger gameOver when ball drops and life is still > 0', () => {
		const g = window.gameManage;

		// Launch a ball
		g.dynamicCanvas.onmousedown();
		g.dynamicCanvas.onmouseup({ button: 0 });
		assert.equal(g.balls.length, 1);

		// Player has 2 lives
		g.statusMng.life = 2;

		let gameOverTriggered = false;
		g.gameOver = () => { gameOverTriggered = true; };

		// Ball falls off the screen
		const ball = g.balls[0];
		ball.fall();

		// Ball removed, life decremented from 2 to 1
		assert.equal(g.balls.length, 0);
		assert.equal(g.statusMng.life, 1);
		assert.equal(g.statusMng.isAlive(), true);

		// Run step(): should NOT trigger gameOver because life > 0
		g.step();
		assert.equal(gameOverTriggered, false, 'Should not game over because player still has 1 life');
	});

	it('SYS-06-D: clears stage even if life is 0 when all blocks are destroyed', () => {
		const g = window.gameManage;
		g.statusMng.life = 0;
		g.statusMng.blockNum = 0;
		g.ctrl.stageIndex = 0;
		g.ctrl.stageEnded = 0;

		let stageClearShown = false;
		g.screenManage.showStageClear = () => { stageClearShown = true; };

		g.gameOver();

		assert.equal(stageClearShown, true, 'Stage clear should be shown when blockNum <= 0 even if life is 0');
	});

	it('SYS-06-E: does NOT decrement life when a ball falls while other balls are still in play (multiball)', () => {
		const g = window.gameManage;

		// Launch initial ball
		g.dynamicCanvas.onmousedown();
		g.dynamicCanvas.onmouseup({ button: 0 });
		assert.equal(g.balls.length, 1);

		// Duplicate balls via DOUBLE item effect
		EventBus.emitEvent('ball:applyItem', 0);
		assert.equal(g.balls.length, 2, 'Should have 2 balls in play');

		const initialLife = g.statusMng.life;
		assert.ok(initialLife >= 2);

		// One ball falls
		const ball1 = g.balls[0];
		ball1.fall();

		// Ball removed, but 1 ball still active in play
		assert.equal(g.balls.length, 1, '1 ball should still be alive');
		assert.equal(g.statusMng.life, initialLife, 'Life MUST NOT decrease while balls are still in play');

		// The second ball falls
		const ball2 = g.balls[0];
		ball2.fall();

		// All balls gone, now life decreases by 1
		assert.equal(g.balls.length, 0);
		assert.equal(g.statusMng.life, initialLife - 1, 'Life decreases by 1 only when all balls are lost');
	});
});
