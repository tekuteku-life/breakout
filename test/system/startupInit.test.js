// test/system/startupInit.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';
import { APP_VER } from '../../src/const.js';


describe('System Test SYS-01: Startup and Initialization', () => {
	beforeEach(() => {
		setupEnvironment();
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('initializes game components, canvases, and storage on init(0)', () => {
		// Run init(0)
		window.gameManage.init(0);
		const gm = window.gameManage;

		// 1. Canvas verification
		assert.ok(gm.dynamicCanvas, 'dynamicCanvas should be initialized');
		assert.ok(gm.staticCanvas, 'staticCanvas should be initialized');
		assert.equal(gm.dynamicCanvas.width, gm.canvasWidth);
		assert.equal(gm.dynamicCanvas.height, gm.canvasHeight);

		// 2. Control and storage initialization
		assert.ok(gm.ctrl, 'Control instance created');
		assert.equal(gm.ctrl.stageIndex, 0);

		// 3. Game entities initialization
		assert.ok(gm.bar, 'Bar instance created');
		assert.ok(gm.statusMng, 'StatusManage instance created');
		assert.ok(gm.scoreMng, 'ScoreManage instance created');
		assert.ok(gm.sounds, 'Sound instance created');
		assert.ok(gm.imgData, 'ImageData instance created');
		assert.ok(Array.isArray(gm.balls));
		assert.ok(Array.isArray(gm.items));
		assert.ok(Array.isArray(gm.weapons));
		assert.ok(gm.blockMap, 'blockMap loaded from stage 0');

		// 4. Form selectors set up
		assert.ok(gm.ctrl.formSelector['stage'], 'Stage selector populated');
		assert.ok(gm.ctrl.formSelector['stage'].children.length > 0);
		assert.ok(gm.ctrl.formSelector['setting'], 'Setting selector configured');
		assert.ok(gm.ctrl.formSelector['sound'], 'Sound selector configured');
		assert.ok(gm.ctrl.formSelector['sizefit'], 'SizeFit selector configured');
		assert.ok(gm.ctrl.formSelector['continue'], 'Continue selector configured');
		assert.ok(gm.ctrl.formSelector['ctrl'], 'Ctrl selector configured');
	});


	it('executes window.onload setting up start screen, backups, records, and button sounds', () => {
		// Execute window.onload
		window.onload();

		// Start screen displayed
		const startScreen = document.getElementById('screen_start');
		assert.equal(startScreen.style.display, 'block', 'Start screen should be open on startup');

		// Screen templates saved
		assert.ok(window.screenManage.getScreenData('screen_stageClear'), 'Stage clear template saved');
		assert.ok(window.screenManage.getScreenData('screen_allClear'), 'All clear template saved');
		assert.ok(window.screenManage.getScreenData('screen_gameOver'), 'Game over template saved');
		assert.ok(window.screenManage.getScreenData('screen_record'), 'Record template saved');
		assert.ok(window.screenManage.getScreenData('screen_about'), 'About template saved');

		// Version placeholder replaced in about screen
		const aboutScreen = document.getElementById('screen_about');
		assert.ok(aboutScreen.innerHTML.includes(APP_VER), 'About screen displays app version');

		// Button mouseover sound
		const barButtons = document.getElementById('screenStock').getElementsByTagName('a');
		if (barButtons.length > 0 && barButtons[0].onmouseover) {
			barButtons[0].onmouseover();
		}
	});

	it('handles init(0) when localStorage is unavailable', () => {
		const origStorage = window.localStorage;
		window.localStorage = null;
		window.gameManage.init(0);
		assert.equal(window.gameManage.storage, null);
		window.localStorage = origStorage;

	});

	it('exercises Array extension methods (copy, copyMap)', () => {
		// copy
		const nestedArr = [[1, 2], [3, 4]];
		const copiedArr = nestedArr.copy();
		assert.deepEqual(copiedArr, [[1, 2], [3, 4]]);

		// copyMap
		window.gameManage.init(0);
		const mapCopy = window.blockMapSet[0].copyMap();
		assert.ok(Array.isArray(mapCopy));

		// oncontextmenu
		assert.equal(window.oncontextmenu(), false);
	});
});
