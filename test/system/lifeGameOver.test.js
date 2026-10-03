// test/system/lifeGameOver.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';

describe('System Test SYS-06: Life Decrement and Game Over Scenario', () => {
	beforeEach(() => {
		setupEnvironment();
		window.onload();
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('SYS-06: handles ball drop, life loss, and gameOver when life reaches 0', () => {
		// Launch a ball
		window.dynamicCanvas.onmousedown();
		window.dynamicCanvas.onmouseup({ button: 0 });
		assert.equal(window.balls.length, 1);

		// Set player to 1 life remaining
		window.statusMng.life = 1;
		window.scoreMng.score = 500;

		// Ball falls off the screen
		const ball = window.balls[0];
		ball.fall();

		// Ball removed, life decremented to 0
		assert.equal(window.balls.length, 0);
		assert.equal(window.statusMng.isAlive(), false, 'Player should be dead (life <= 0)');

		// Execute gameOver routine
		window.gameOver();

		// Check storage updates
		assert.equal(window.storage.getItem('continue_life'), String(window.defaultLife));
		assert.equal(window.storage.getItem('continue_score'), '0');
		assert.equal(window.storage.getItem('continue_time'), '0');
		assert.ok(Number(window.storage.getItem('record_hiScore')) > 0);

		// Check game over screen display
		const gameOverScreen = document.getElementById('screen_gameOver');
		assert.equal(gameOverScreen.style.display, 'block', 'screen_gameOver should be shown');
		assert.ok(gameOverScreen.innerHTML.includes('Game Over'), 'Game Over text should be present');
	});
});
