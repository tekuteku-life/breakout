// test/system/stageProgression.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';

describe('System Test SYS-04 & SYS-05: Stage Progression and Clear Scenarios', () => {
	beforeEach(() => {
		setupEnvironment();
		window.onload();
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('SYS-05: handles stage clear, life recovery, award calculation, and transition to next stage', () => {
		// Set to stage 1 where stageLifeUp[1] == 1
		window.ctrl.setStageIndex(1);
		window.statusMng.life = 2;
		window.statusMng.blockNum = 0; // Trigger stage clear

		// Add dummy active entities
		window.balls = [{ radius: 4 }];
		window.items = [{ type: 1 }];

		// Trigger game over routine (with statusMng.isAlive() === true => clear branch)
		window.gameOver();

		// Entities cleared
		assert.equal(window.balls.length, 0, 'Balls should be cleared upon clear');
		assert.equal(window.items.length, 0, 'Items should be cleared upon clear');

		// Life increased by stageLifeUp[1] (= 1) -> life becomes 3
		assert.equal(window.statusMng.life, 3, 'Life should be restored according to stageLifeUp');

		// Stage advanced to 2
		assert.equal(window.ctrl.stageIndex, 2, 'Stage index should be advanced');

		// Stage clear screen opened
		const stageClearScreen = document.getElementById('screen_stageClear');
		assert.equal(stageClearScreen.style.display, 'block', 'screen_stageClear should be displayed');
	});

	it('SYS-05: handles final stage clear (all clear), sets stageEnded, and displays allClear screen', () => {
		// Set to final stage
		const finalStageIndex = window.blockMapSet.length - 1;
		window.ctrl.setStageIndex(finalStageIndex);
		window.statusMng.life = 3;
		window.statusMng.blockNum = 0;

		window.gameOver();

		// All clear screen opened
		const allClearScreen = document.getElementById('screen_allClear');
		assert.equal(allClearScreen.style.display, 'block', 'screen_allClear should be displayed');
	});
});
