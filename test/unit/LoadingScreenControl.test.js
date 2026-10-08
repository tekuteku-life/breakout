// test/unit/LoadingScreenControl.test.js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import LoadingScreenControl from '../../src/screens/LoadingScreenControl.js';
import ScreenManage from '../../src/ScreenManage.js';

describe('LoadingScreenControl unit tests', () => {
	beforeEach(() => {
		setupEnvironment();
	});

	it('initializes LoadingScreenControl with correct defaults', () => {
		const sm = new ScreenManage();
		const ctrl = new LoadingScreenControl(sm, 'screen_loading');
		assert.equal(ctrl.screenId, 'screen_loading');
		assert.equal(ctrl.message, '');
		assert.equal(ctrl.progressText, null);
	});

	it('binds DOM elements and updates text via setMessage', () => {
		const sm = new ScreenManage();
		const ctrl = new LoadingScreenControl(sm, 'screen_loading');
		ctrl.onOpen();

		const text = document.getElementById('loading_progress_text');
		assert.equal(text.textContent, 'Initializing...', 'Initial message set on onOpen');

		// setMessage updates message property and textContent
		ctrl.setMessage('Loading audio data...');
		assert.equal(ctrl.message, 'Loading audio data...');
		assert.equal(text.textContent, 'Loading audio data...');

		ctrl.setMessage('Generating graphics...');
		assert.equal(ctrl.message, 'Generating graphics...');
		assert.equal(text.textContent, 'Generating graphics...');

		// setMessage with empty/null defaults to empty string
		ctrl.setMessage(null);
		assert.equal(ctrl.message, '');
		assert.equal(text.textContent, '');
	});

	it('auto-binds DOM elements if setMessage called before onOpen', () => {
		const sm = new ScreenManage();
		const ctrl = new LoadingScreenControl(sm, 'screen_loading');
		ctrl.setMessage('Loading script...');
		assert.equal(ctrl.message, 'Loading script...');
		assert.equal(ctrl.progressText.textContent, 'Loading script...');
	});

	it('handles reset and onClose', () => {
		const sm = new ScreenManage();
		const ctrl = new LoadingScreenControl(sm, 'screen_loading');
		ctrl.onOpen();
		ctrl.setMessage('Preparing game screen...');
		assert.equal(ctrl.message, 'Preparing game screen...');

		ctrl.reset();
		assert.equal(ctrl.message, 'Initializing...');

		ctrl.setMessage('Setup complete');
		ctrl.onClose();
		assert.equal(ctrl.message, '');
	});

	it('destructor cleanly removes references', () => {
		const sm = new ScreenManage();
		const ctrl = new LoadingScreenControl(sm, 'screen_loading');
		ctrl.onOpen();
		ctrl.destructor();
		assert.equal(ctrl.progressText, null);
		assert.equal(ctrl.message, '');
		assert.equal(ctrl.screenManage, null);
	});
});
