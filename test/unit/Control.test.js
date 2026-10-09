import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import Control from '../../src/Control.js';

test('Control class unit tests', async (t) => {
	let origScreenManage;
	t.before(() => {
		origScreenManage = globalThis.screenManage;
	});

	t.beforeEach(() => {
		setupEnvironment();
		globalThis.screenManage = {
			allClose: () => {},
			openScreen: () => {},
			closeScreen: () => {},
		};
	});

	t.after(() => {
		if (origScreenManage !== undefined) {
			globalThis.screenManage = origScreenManage;
		} else {
			delete globalThis.screenManage;
		}
	});

	const createMockGame = (overrides = {}) => ({
		storage,
		blockMapSet: (globalThis.blockMapSet && globalThis.blockMapSet.length > 0) ? globalThis.blockMapSet : [[], [], []],
		...overrides,
	});

	await t.test('constructor initializes properties and formSelectors', () => {
		const ctrl = new Control(createMockGame());
		assert.equal(ctrl.autoSwitch, 0);
		assert.equal(ctrl.pauseSwitch, 0);
		assert.equal(ctrl.soundSwitch, 0);
		assert.equal(ctrl.scale, 1);
		assert.ok(ctrl.formSelector['stage']);
	});

	await t.test('load and record methods for storage integration', () => {
		const ctrl = new Control(createMockGame());

		// Sound
		ctrl.soundSwitch = 1;
		ctrl.recordSoundSwitch();
		assert.equal(storage.getItem('setting_soundSwitch'), '1');
		ctrl.soundSwitch = 0;
		ctrl.loadSoundSwitch();
		assert.equal(ctrl.soundSwitch, '1');

		// SizeFit
		ctrl.sizeFitSwitch = 1;
		ctrl.recordSizeFitSwitch();
		ctrl.sizeFitSwitch = 0;
		ctrl.loadSizeFitSwitch();
		assert.equal(ctrl.sizeFitSwitch, '1');

		// Continue
		ctrl.continueSwitch = 1;
		ctrl.recordContinueSwitch();
		ctrl.continueSwitch = 0;
		ctrl.loadContinueSwitch();
		assert.equal(ctrl.continueSwitch, '1');

		// Ctrl
		ctrl.ctrlSwitch = 1;
		ctrl.recordCtrlSwitch();
		ctrl.ctrlSwitch = 0;
		ctrl.loadCtrlSwitch();
		assert.equal(ctrl.ctrlSwitch, '1');

		// PointerLock
		ctrl.pointerLockSwitch = 1;
		ctrl.recordPointerLockSwitch();
		assert.equal(storage.getItem('setting_pointerLockSwitch'), '1');
		ctrl.pointerLockSwitch = 0;
		ctrl.loadPointerLockSwitch();
		assert.equal(ctrl.pointerLockSwitch, 1);

		// StageIndex
		ctrl.stageIndex = 3;
		ctrl.recordStageIndex();
		ctrl.stageIndex = 0;
		ctrl.continueSwitch = 1;
		storage.setItem('continue_stageIndex', '3');
		ctrl.loadStageIndex();
		assert.equal(ctrl.stageIndex, '3');
	});

	await t.test('toggle methods toggle state and update selectors', () => {
		const ctrl = new Control(createMockGame());
		globalThis.ctrl = ctrl;

		// autoSwitch
		ctrl.autoSwitchToggle();
		assert.equal(ctrl.autoSwitch, 1);
		ctrl.autoSwitchToggle();
		assert.equal(ctrl.autoSwitch, 0);

		// pauseSwitch
		ctrl.pauseSwitchOn();
		assert.equal(ctrl.pauseSwitch, 1);
		ctrl.pauseSwitchOff();
		assert.equal(ctrl.pauseSwitch, 0);
		ctrl.pauseSwitchToggle();
		assert.equal(ctrl.pauseSwitch, 1);
		ctrl.pauseSwitchToggle();
		assert.equal(ctrl.pauseSwitch, 0);

		// soundSwitch
		ctrl.soundSwitchToggle();
		assert.equal(ctrl.soundSwitch, 1);
		ctrl.soundSwitchToggle();
		assert.equal(ctrl.soundSwitch, 0);

		// ctrlSwitch
		ctrl.ctrlSwitchToggle();
		assert.equal(ctrl.ctrlSwitch, 1);
		ctrl.ctrlSwitchToggle();
		assert.equal(ctrl.ctrlSwitch, 0);

		// pointerLockSwitch
		ctrl.pointerLockSwitchToggle();
		assert.equal(ctrl.pointerLockSwitch, 0);
		ctrl.pointerLockSwitchToggle();
		assert.equal(ctrl.pointerLockSwitch, 1);
	});

	await t.test('stage navigation methods handle bounds and clear storage', () => {
		const game = createMockGame();
		const ctrl = new Control(game);
		game.ctrl = ctrl;

		// setStageIndex
		ctrl.setStageIndex(2);
		assert.equal(ctrl.stageIndex, 2);
		ctrl.setStageIndex(-5);
		assert.equal(ctrl.stageIndex, 0);
		ctrl.setStageIndex(9999);
		assert.equal(ctrl.stageIndex, 0);

		// forwardStageIndex
		ctrl.setStageIndex(0);
		ctrl.forwardStageIndex();
		assert.equal(ctrl.stageIndex, 1);
		assert.equal(storage.getItem('continue_score'), '0');

		// Loop past max
		ctrl.setStageIndex(game.blockMapSet.length - 1);
		ctrl.forwardStageIndex();
		assert.equal(ctrl.stageIndex, 0);
		assert.equal(ctrl.stageEnded, 1);

		// backwardStageIndex
		ctrl.setStageIndex(2);
		ctrl.backwardStageIndex();
		assert.equal(ctrl.stageIndex, 1);

		ctrl.setStageIndex(0);
		ctrl.backwardStageIndex();
		assert.equal(ctrl.stageIndex, 0);

		// Backward stage overflow handling
		ctrl.stageIndex = globalThis.blockMapSet.length + 2;
		ctrl.backwardStageIndex();
		assert.equal(ctrl.stageIndex, 0);
		assert.equal(ctrl.stageEnded, 1);

		// sizefitSwitchToggle off and on
		ctrl.sizeFitSwitch = 1;
		ctrl.sizefitSwitchToggle();
		assert.equal(ctrl.sizeFitSwitch, 0);
		ctrl.sizefitSwitchToggle();
		assert.equal(ctrl.sizeFitSwitch, 1);
	});

	await t.test('fixSize computes aspect ratio scales for different viewport shapes', () => {
		const ctrl = new Control();
		ctrl.sizeFitSwitch = 1;

		// Tall viewport (horizontalRatio < verticalRatio)
		globalThis.window.innerWidth = 500;
		globalThis.window.innerHeight = 1000;
		ctrl.fixSize();
		assert.ok(ctrl.scale < 1);

		// Wide viewport (verticalRatio < horizontalRatio)
		globalThis.window.innerWidth = 1200;
		globalThis.window.innerHeight = 600;
		ctrl.fixSize();
		assert.ok(ctrl.scale > 0);

		// Fixed size mode
		ctrl.sizeFitSwitch = 0;
		ctrl.fixSize();
		assert.equal(ctrl.scale, 1);

		// document.all branch
		globalThis.document.all = {};
		globalThis.document.clientWidth = 600;
		globalThis.document.clientHeight = 400;
		ctrl.sizeFitSwitch = 1;
		ctrl.fixSize();
		assert.ok(ctrl.scale > 0);
		globalThis.document.all = null;
	});

	await t.test('destructor can be called without error', () => {
		const ctrl = new Control();
		assert.doesNotThrow(() => ctrl.destructor());
	});
});
