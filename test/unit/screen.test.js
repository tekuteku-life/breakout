import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import ScreenManage from '../../src/ScreenManage.js';

test('ScreenManage core screen operations unit tests', async (t) => {
	setupEnvironment();
	const sm = new ScreenManage();

	await t.test('openScreen displays existing screen and alerts for missing screen', () => {
		sm.openScreen('screen_start');
		const screen = document.getElementById('screen_start');
		assert.equal(screen.style.display, 'block');
		assert.equal(screen.style.zIndex, 100);

		// Missing screen
		globalThis.__lastAlert = '';
		sm.openScreen('invalid_screen');
		assert.equal(globalThis.__lastAlert, 'Not Found Screen');
	});

	await t.test('closeScreen hides screen and alerts for missing screen', () => {
		sm.closeScreen('screen_start');
		const screen = document.getElementById('screen_start');
		assert.equal(screen.style.display, 'none');
		assert.equal(screen.style.zIndex, 0);

		// Missing screen
		globalThis.__lastAlert = '';
		sm.closeScreen('invalid_screen');
		assert.equal(globalThis.__lastAlert, 'Not Found Screen');
	});

	await t.test('toggleScreen toggles display state', () => {
		const screen = document.getElementById('screen_help');
		screen.style.display = 'none';

		sm.toggleScreen('screen_help');
		assert.equal(screen.style.display, 'block');

		sm.toggleScreen('screen_help');
		assert.equal(screen.style.display, 'none');

		globalThis.__lastAlert = '';
		sm.toggleScreen('invalid_screen');
		assert.equal(globalThis.__lastAlert, 'Not Found Screen');
	});

	await t.test('saveScreenData, getScreenData, and replaceScreenData handle screen innerHTML', () => {
		const screen = document.getElementById('screen_about');
		screen.innerHTML = '<p>Original</p>';

		sm.saveScreenData('screen_about');
		assert.equal(sm.getScreenData('screen_about'), '<p>Original</p>');

		sm.replaceScreenData('screen_about', '<p>Replaced</p>');
		assert.equal(screen.innerHTML, '<p>Replaced</p>');

		// Missing screen
		sm.saveScreenData('missing');
		assert.equal(sm.getScreenData('missing'), undefined);
	});

	await t.test('allClose hides all screens inside screenStock', () => {
		document.getElementById('screen_start').style.display = 'block';
		document.getElementById('screen_pause').style.display = 'block';

		sm.allClose();
		assert.equal(document.getElementById('screen_start').style.display, 'none');
		assert.equal(document.getElementById('screen_pause').style.display, 'none');
	});
});
