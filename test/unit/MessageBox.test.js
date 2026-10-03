import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import MessageBox from '../../src/MessageBox.js';

test('MessageBox class unit tests', async (t) => {
	setupEnvironment();

	await t.test('creates message box with OK button only when confirm is false', () => {
		let callbackCalled = false;
		const msgBox = new MessageBox('Hello World', false, () => {
			callbackCalled = true;
		});

		assert.ok(msgBox.messageBox);
		assert.ok(msgBox.darkCover);
		assert.equal(msgBox.value, false);
		assert.equal(msgBox.messageBox.id, 'msg_box');
		assert.equal(msgBox.darkCover.id, 'dark_cover');

		// Check OK button exists and triggers close(true)
		const okBtn = msgBox.messageBox.children.find((c) => c.id === 'ok');
		assert.ok(okBtn);
		assert.equal(typeof okBtn.onclick, 'function');

		// Cancel button should not exist
		const cancelBtn = msgBox.messageBox.children.find((c) => c.id === 'cancel');
		assert.equal(cancelBtn, undefined);

		// Click OK
		okBtn.onclick();
		assert.equal(msgBox.value, true);
		assert.equal(callbackCalled, true);
	});

	await t.test('creates Cancel button when confirm is true and handles cancel click', () => {
		let callbackCalled = false;
		const msgBox = new MessageBox('Are you sure?', true, () => {
			callbackCalled = true;
		});

		const cancelBtn = msgBox.messageBox.children.find((c) => c.id === 'cancel');
		assert.ok(cancelBtn);
		assert.equal(typeof cancelBtn.onclick, 'function');

		cancelBtn.onclick();
		assert.equal(msgBox.value, false);
		assert.equal(callbackCalled, true);
	});

	await t.test('destructor cleanly removes elements from parent', () => {
		const msgBox = new MessageBox('Test destructor', false, null);
		assert.ok(msgBox.parentElm.children.includes(msgBox.messageBox));
		assert.ok(msgBox.parentElm.children.includes(msgBox.darkCover));

		msgBox.destructor();
		assert.ok(!msgBox.parentElm.children.includes(msgBox.messageBox));
		assert.ok(!msgBox.parentElm.children.includes(msgBox.darkCover));

		// Calling destructor again should not throw
		assert.doesNotThrow(() => msgBox.destructor());
	});

	await t.test('close works when backto is null', () => {
		const msgBox = new MessageBox('No callback', false, null);
		assert.doesNotThrow(() => msgBox.close(true));
		assert.equal(msgBox.value, true);
	});
});
