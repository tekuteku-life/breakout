import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import Sound from '../../src/Sound.js';

test('Sound class unit tests', async (t) => {
	setupEnvironment();

	await t.test('constructor initializes sound objects for existing sound files', () => {
		const sound = new Sound();
		assert.ok(sound.soundKeys.length > 0);
		assert.ok(sound.soundObj['bomb']);
		assert.ok(sound.soundObj['bomb'].length > 0);
		assert.equal(sound.bufSize, Math.min(10, globalThis.ballMaxNum * 4));
	});

	await t.test('play executes audio play and advances turn when soundSwitch is 1', () => {
		const sound = new Sound();
		globalThis.ctrl.soundSwitch = 1;

		const firstAudio = sound.soundObj['bomb'][0];
		assert.equal(firstAudio.played, false);

		sound.play('bomb');
		assert.equal(firstAudio.played, true);
		assert.equal(sound.soundTurn['bomb'], 1);

		// Play until wrapping around bufSize
		for (let i = 1; i < sound.bufSize; i++) {
			sound.play('bomb');
		}
		assert.equal(sound.soundTurn['bomb'], 0);
	});

	await t.test('play does not execute when soundSwitch is 0 or key is invalid', () => {
		const sound = new Sound();
		globalThis.ctrl.soundSwitch = 0;

		const audio = sound.soundObj['bomb'][0];
		audio.played = false;
		sound.play('bomb');
		assert.equal(audio.played, false);

		// Invalid key
		globalThis.ctrl.soundSwitch = 1;
		assert.doesNotThrow(() => sound.play('non_existent_key'));
	});

	await t.test('destructor pauses all audio objects', () => {
		const sound = new Sound();
		globalThis.ctrl.soundSwitch = 1;
		sound.play('bomb');

		sound.destructor();
		assert.equal(sound.soundObj['bomb'][0].paused, true);
	});
});
