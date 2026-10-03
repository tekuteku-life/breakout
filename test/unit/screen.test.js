import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/screen.js';

test('screen.js functions unit tests', async (t) => {
	setupEnvironment();

	await t.test('openScreen displays existing screen and alerts for missing screen', () => {
		globalThis.openScreen('screen_start');
		const screen = document.getElementById('screen_start');
		assert.equal(screen.style.display, 'block');
		assert.equal(screen.style.zIndex, 100);

		// Missing screen
		globalThis.__lastAlert = '';
		globalThis.openScreen('invalid_screen');
		assert.equal(globalThis.__lastAlert, 'Not Found Screen');
	});

	await t.test('closeScreen hides screen and alerts for missing screen', () => {
		globalThis.closeScreen('screen_start');
		const screen = document.getElementById('screen_start');
		assert.equal(screen.style.display, 'none');
		assert.equal(screen.style.zIndex, 0);

		globalThis.__lastAlert = '';
		globalThis.closeScreen('invalid_screen');
		assert.equal(globalThis.__lastAlert, 'Not Found Screen');
	});

	await t.test('toggleScreen toggles display state', () => {
		const screen = document.getElementById('screen_help');
		screen.style.display = 'none';

		globalThis.toggleScreen('screen_help');
		assert.equal(screen.style.display, 'block');

		globalThis.toggleScreen('screen_help');
		assert.equal(screen.style.display, 'none');

		globalThis.__lastAlert = '';
		globalThis.toggleScreen('invalid_screen');
		assert.equal(globalThis.__lastAlert, 'Not Found Screen');
	});

	await t.test('saveScreenData, getScreenData, and replaceScreenData handle screen innerHTML', () => {
		const screen = document.getElementById('screen_about');
		screen.innerHTML = '<p>Original</p>';

		globalThis.saveScreenData('screen_about');
		assert.equal(globalThis.getScreenData('screen_about'), '<p>Original</p>');

		globalThis.replaceScreenData('screen_about', '<p>Replaced</p>');
		assert.equal(screen.innerHTML, '<p>Replaced</p>');

		// Missing screen
		globalThis.saveScreenData('missing');
		assert.equal(globalThis.getScreenData('missing'), undefined);
	});

	await t.test('allClose hides all screens inside screenStock', () => {
		document.getElementById('screen_start').style.display = 'block';
		document.getElementById('screen_pause').style.display = 'block';

		globalThis.allClose();
		assert.equal(document.getElementById('screen_start').style.display, 'none');
		assert.equal(document.getElementById('screen_pause').style.display, 'none');
	});
});
