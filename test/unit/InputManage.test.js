// test/unit/InputManage.test.js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import EventBus from '../../src/EventBus.js';
import InputManage from '../../src/InputManage.js';
import Control from '../../src/Control.js';

describe('InputManage class unit tests', () => {
	let mockGame;
	let mockCanvas;

	beforeEach(() => {
		setupEnvironment();

		mockCanvas = document.getElementById('dynamic');
		if (!mockCanvas) {
			mockCanvas = document.createElement('canvas');
			mockCanvas.id = 'dynamic';
			document.body.appendChild(mockCanvas);
		}
		mockCanvas.width = 480;
		mockCanvas.height = 480;
		mockCanvas.offsetWidth = 480;
		mockCanvas.offsetHeight = 480;

		mockGame = {
			storage,
			canvasWidth: 480,
			canvasHeight: 480,
			ctrl: null,
			objectManage: {
				bar: {
					pointX: 240,
					pointY: 440,
					width: 60,
					weapon: 0,
					weaponInter: 0,
					absorptionNum: 0,
					getTopY: () => 430,
					getCenterX: () => 240,
				},
				balls: [],
				weapons: [],
			},
			statusMng: {
				isAlive: () => true,
				life: 3,
			},
			dynamicCanvas: mockCanvas,
		};
		mockGame.ctrl = new Control(mockGame);
	});

	it('initializes InputManage with default properties and EventBus listeners', () => {
		const input = new InputManage(mockGame);
		assert.equal(typeof input.pointX, 'number');
		assert.equal(input.isPointerLocked, false);
		assert.equal(input.mouseDownTime, 0);

		input.destructor();
	});

	it('requestPointerLock and exitPointerLock delegate to DOM APIs and manage isPointerLocked state', () => {
		const input = new InputManage(mockGame);

		let requested = false;
		const el = {
			requestPointerLock: () => {
				requested = true;
			},
		};

		input.requestPointerLock(el);
		assert.equal(requested, true);

		let exited = false;
		const doc = {
			pointerLockElement: el,
			exitPointerLock: () => {
				exited = true;
			},
		};

		input.isPointerLocked = true;
		input.exitPointerLock(doc);
		assert.equal(exited, true);
		assert.equal(input.isPointerLocked, false);

		input.destructor();
	});

	it('bind sets up listeners and canvasMouseDown requests pointer lock when enabled', () => {
		const input = new InputManage(mockGame);
		input.bind(mockCanvas, document, window);

		mockGame.ctrl.pointerLockSwitch = 1;
		mockGame.ctrl.ctrlSwitch = 0;

		let lockCalled = false;
		mockCanvas.requestPointerLock = () => {
			lockCalled = true;
		};

		mockCanvas.dispatchEvent({ type: 'mousedown', button: 0, clientX: 200, clientY: 300 });
		assert.equal(lockCalled, true);

		// If pointerLockSwitch is 0, requestPointerLock is not called
		lockCalled = false;
		mockGame.ctrl.pointerLockSwitch = 0;
		mockCanvas.dispatchEvent({ type: 'mousedown', button: 0, clientX: 200, clientY: 300 });
		assert.equal(lockCalled, false);

		input.destructor();
	});

	it('handles pointerlockchange and pointerlockerror events to sync state', () => {
		const input = new InputManage(mockGame);
		input.bind(mockCanvas, document, window);

		document.pointerLockElement = mockCanvas;
		document.dispatchEvent({ type: 'pointerlockchange' });
		assert.equal(input.isPointerLocked, true);

		document.pointerLockElement = null;
		document.dispatchEvent({ type: 'pointerlockchange' });
		assert.equal(input.isPointerLocked, false);

		input.isPointerLocked = true;
		document.dispatchEvent({ type: 'pointerlockerror' });
		assert.equal(input.isPointerLocked, false);

		input.destructor();
	});

	it('getMouseMove in Pointer Lock mode tracks movementX and clamps to [0, canvasWidth]', () => {
		const input = new InputManage(mockGame);
		input.pointX = 240;
		input.pointY = 400;
		input.isPointerLocked = true;

		// Move right by 50px
		input.getMouseMove({ movementX: 50, movementY: 10 }, mockCanvas, 0, 1);
		assert.equal(input.pointX, 290);
		assert.equal(input.pointY, 410);

		// Move far right beyond canvas width (480) -> clamped at 480
		input.getMouseMove({ movementX: 500, movementY: 0 }, mockCanvas, 0, 1);
		assert.equal(input.pointX, 480);

		// Move far left beyond 0 -> clamped at 0
		input.getMouseMove({ movementX: -600, movementY: 0 }, mockCanvas, 0, 1);
		assert.equal(input.pointX, 0);

		input.destructor();
	});

	it('getMouseMove outside Pointer Lock uses getBoundingClientRect and clamps to [0, canvasWidth]', () => {
		const input = new InputManage(mockGame);
		input.isPointerLocked = false;

		mockCanvas.getBoundingClientRect = () => ({
			left: 100,
			top: 50,
			width: 480,
			height: 480,
		});

		// Mouse within canvas: clientX = 200 -> rawX = 100
		input.getMouseMove({ clientX: 200, clientY: 150 }, mockCanvas, 0, 1);
		assert.equal(input.pointX, 100);
		assert.equal(input.pointY, 100);

		// Mouse to the left outside canvas: clientX = 50 -> rawX = -50 -> clamped to 0
		input.getMouseMove({ clientX: 50, clientY: 150 }, mockCanvas, 0, 1);
		assert.equal(input.pointX, 0);

		// Mouse to the right outside canvas: clientX = 700 -> rawX = 600 -> clamped to 480
		input.getMouseMove({ clientX: 700, clientY: 150 }, mockCanvas, 0, 1);
		assert.equal(input.pointX, 480);

		// Touch event
		input.getMouseMove({ touches: [{ clientX: 300, clientY: 200 }] }, mockCanvas, 1, 1);
		assert.equal(input.pointX, 200);
		assert.equal(input.pointY, 150);

		input.destructor();
	});

	it('getMouseMove ignores movement if autoSwitch or ctrlSwitch is active', () => {
		const input = new InputManage(mockGame);
		input.pointX = 200;

		mockGame.ctrl.autoSwitch = 1;
		input.getMouseMove({ movementX: 100, movementY: 0 }, mockCanvas, 0, 1);
		assert.equal(input.pointX, 200);

		mockGame.ctrl.autoSwitch = 0;
		mockGame.ctrl.ctrlSwitch = 1;
		input.getMouseMove({ movementX: 100, movementY: 0 }, mockCanvas, 0, 1);
		assert.equal(input.pointX, 200);

		input.destructor();
	});

	it('globalMouseDown fires weapon or sets mouseDownTime outside canvas, but ignores UI elements', () => {
		const input = new InputManage(mockGame);
		input.bind(mockCanvas, document, window);

		let weaponSpawned = false;
		EventBus.addOnEvent('weapon:spawn', () => {
			weaponSpawned = true;
		});

		// Equip weapon on bar
		mockGame.objectManage.bar.weapon = 1;
		mockGame.objectManage.balls = [{ x: 100, y: 100 }];

		// Outside canvas click on generic background div
		const outsideDiv = document.createElement('div');
		document.body.appendChild(outsideDiv);

		document.dispatchEvent({
			type: 'mousedown',
			target: outsideDiv,
			button: 0,
		});
		assert.equal(weaponSpawned, true);

		// Click on a UI button -> should NOT fire weapon
		weaponSpawned = false;
		const uiButton = document.createElement('button');
		document.body.appendChild(uiButton);

		document.dispatchEvent({
			type: 'mousedown',
			target: uiButton,
			button: 0,
		});
		assert.equal(weaponSpawned, false);

		// Click on a select element -> should NOT fire weapon
		const uiSelect = document.createElement('select');
		document.body.appendChild(uiSelect);

		document.dispatchEvent({
			type: 'mousedown',
			target: uiSelect,
			button: 0,
		});
		assert.equal(weaponSpawned, false);

		input.destructor();
	});

	it('globalMouseUp triggers ball launch when clicked outside canvas', () => {
		const input = new InputManage(mockGame);
		input.bind(mockCanvas, document, window);

		let ballLaunched = false;
		EventBus.addOnEvent('ball:launch', () => {
			ballLaunched = true;
		});

		mockGame.objectManage.balls = []; // No balls yet, ready to launch
		input.mouseDownTime = 5;

		const outsideDiv = document.createElement('div');
		document.dispatchEvent({
			type: 'mouseup',
			target: outsideDiv,
			button: 0,
		});

		assert.equal(ballLaunched, true);
		assert.equal(input.mouseDownTime, 0);

		input.destructor();
	});

	it('exits pointer lock on pause, menu screen open, or input:exitPointerLock events', () => {
		const input = new InputManage(mockGame);
		input.bind(mockCanvas, document, window);

		let exitCalled = false;
		document.exitPointerLock = () => {
			exitCalled = true;
			document.pointerLockElement = null;
		};

		// 1. control:togglePause
		input.isPointerLocked = true;
		document.pointerLockElement = mockCanvas;
		exitCalled = false;
		EventBus.emitEvent('control:togglePause');
		assert.equal(exitCalled, true);
		assert.equal(input.isPointerLocked, false);

		// 2. screen:open
		input.isPointerLocked = true;
		document.pointerLockElement = mockCanvas;
		exitCalled = false;
		EventBus.emitEvent('screen:open', 'screen_setting');
		assert.equal(exitCalled, true);
		assert.equal(input.isPointerLocked, false);

		// 3. input:exitPointerLock
		input.isPointerLocked = true;
		document.pointerLockElement = mockCanvas;
		exitCalled = false;
		EventBus.emitEvent('input:exitPointerLock');
		assert.equal(exitCalled, true);
		assert.equal(input.isPointerLocked, false);

		input.destructor();
	});

	it('exits pointer lock on beforeunload, pagehide, visibilitychange, and blur to prevent invisible cursor', () => {
		const input = new InputManage(mockGame);
		input.bind(mockCanvas, document, window);

		let exitCalled = false;
		document.exitPointerLock = () => {
			exitCalled = true;
			document.pointerLockElement = null;
		};

		// 1. window blur
		input.isPointerLocked = true;
		document.pointerLockElement = mockCanvas;
		exitCalled = false;
		window.dispatchEvent({ type: 'blur' });
		assert.equal(exitCalled, true);
		assert.equal(input.isPointerLocked, false);

		// 2. document visibilitychange
		input.isPointerLocked = true;
		document.pointerLockElement = mockCanvas;
		exitCalled = false;
		document.dispatchEvent({ type: 'visibilitychange' });
		assert.equal(exitCalled, true);
		assert.equal(input.isPointerLocked, false);

		// 3. window beforeunload
		input.isPointerLocked = true;
		document.pointerLockElement = mockCanvas;
		exitCalled = false;
		window.dispatchEvent({ type: 'beforeunload' });
		assert.equal(exitCalled, true);
		assert.equal(input.isPointerLocked, false);

		// 4. window pagehide
		input.isPointerLocked = true;
		document.pointerLockElement = mockCanvas;
		exitCalled = false;
		window.dispatchEvent({ type: 'pagehide' });
		assert.equal(exitCalled, true);
		assert.equal(input.isPointerLocked, false);

		input.destructor();
	});

	it('handles SecurityError (Promise rejection and synchronous throw) in requestPointerLock and enforces cooldown', async () => {
		const input = new InputManage(mockGame);
		mockGame.ctrl.pointerLockSwitch = 1;
		mockGame.ctrl.ctrlSwitch = 0;

		// 1. Promise rejection (SecurityError)
		let rejectPromise;
		const elPromise = {
			requestPointerLock: () => {
				return new Promise((_, reject) => {
					rejectPromise = reject;
				});
			},
		};

		input.isPointerLocked = true;
		input.requestPointerLock(elPromise);
		// Promise rejection を発生させる
		rejectPromise(new Error('SecurityError: Pointer lock cannot be acquired immediately after the user has exited the lock.'));
		// マイクロタスクキューを消化
		await Promise.resolve();

		assert.equal(input.isPointerLocked, false);
		assert.ok(input.pointerLockCooldownUntil > Date.now());

		// 2. クールダウン期間中は requestPointerLock がスキップされる
		let calledDuringCooldown = false;
		const elCheck = {
			requestPointerLock: () => {
				calledDuringCooldown = true;
			},
		};
		input.requestPointerLock(elCheck);
		assert.equal(calledDuringCooldown, false);

		// 3. 同期例外の try-catch
		input.pointerLockCooldownUntil = 0;
		const elThrow = {
			requestPointerLock: () => {
				throw new Error('SecurityError synchronously thrown');
			},
		};
		input.isPointerLocked = true;
		assert.doesNotThrow(() => {
			input.requestPointerLock(elThrow);
		});
		assert.equal(input.isPointerLocked, false);
		assert.ok(input.pointerLockCooldownUntil > Date.now());

		input.destructor();
	});

	it('skips requestPointerLock while in cooldown period after user exits pointer lock via ESC', () => {
		const input = new InputManage(mockGame);
		input.bind(mockCanvas, document, window);
		mockGame.ctrl.pointerLockSwitch = 1;
		mockGame.ctrl.ctrlSwitch = 0;

		// ユーザーがポインターロックに入っている状態
		input.isPointerLocked = true;
		document.pointerLockElement = mockCanvas;

		// ユーザーが ESC キー等でロックを解除
		document.pointerLockElement = null;
		document.dispatchEvent({ type: 'pointerlockchange' });

		assert.equal(input.isPointerLocked, false);
		assert.ok(input.pointerLockCooldownUntil > Date.now());

		// ESC直後に画面をクリックしても requestPointerLock は呼ばれない
		let lockCalled = false;
		mockCanvas.requestPointerLock = () => {
			lockCalled = true;
		};
		mockCanvas.dispatchEvent({ type: 'mousedown', button: 0, clientX: 200, clientY: 300 });
		assert.equal(lockCalled, false);

		// クールダウン解除後は再び受け付ける
		input.pointerLockCooldownUntil = Date.now() - 1;
		mockCanvas.dispatchEvent({ type: 'mousedown', button: 0, clientX: 200, clientY: 300 });
		assert.equal(lockCalled, true);

		input.destructor();
	});

	it('destructor cleanly removes all listeners and resets state', () => {
		const input = new InputManage(mockGame);
		input.bind(mockCanvas, document, window);

		input.destructor();
		assert.equal(input.boundCanvas, null);
		assert.equal(input.boundDoc, null);
		assert.equal(input.boundWin, null);
		assert.equal(input.isPointerLocked, false);
	});
});
