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
		assert.equal(sound.bufSize, 4);
	});

	await t.test('play executes audio play and advances turn when soundSwitch is 1', () => {
		const mockGame = { ctrl: { soundSwitch: 1 } };
		const sound = new Sound(mockGame);

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
		const mockGame = { ctrl: { soundSwitch: 0 } };
		const sound = new Sound(mockGame);

		const audio = sound.soundObj['bomb'][0];
		audio.played = false;
		sound.play('bomb');
		assert.equal(audio.played, false);

		// Invalid key
		mockGame.ctrl.soundSwitch = 1;
		assert.doesNotThrow(() => sound.play('non_existent_key'));
	});

	await t.test('plays via Web Audio API when audioBuffers are present', async () => {
		let sourceStarted = false;
		let contextResumed = false;
		const mockAudioCtx = {
			state: 'suspended',
			destination: {},
			resume: () => { contextResumed = true; return Promise.resolve(); },
			close: () => Promise.resolve(),
			createBufferSource: () => ({
				buffer: null,
				connect: () => {},
				start: (t) => { sourceStarted = true; },
			}),
			decodeAudioData: (ab) => Promise.resolve({ duration: 1 }),
		};

		const mockGame = { ctrl: { soundSwitch: 1 } };
		const sound = new Sound(mockGame);
		sound.audioCtx = mockAudioCtx;
		sound.audioBuffers.set('bomb', { length: 100 });

		sound.play('bomb');
		assert.equal(contextResumed, true);
		assert.equal(sourceStarted, true);
		sound.destructor();
	});

	await t.test('destructor pauses all audio objects and closes audio context', () => {
		let ctxClosed = false;
		const mockAudioCtx = {
			close: () => { ctxClosed = true; return Promise.resolve(); },
		};
		const mockGame = { ctrl: { soundSwitch: 1 } };
		const sound = new Sound(mockGame);
		sound.audioCtx = mockAudioCtx;
		sound.play('bomb');

		sound.destructor();
		assert.equal(sound.soundObj['bomb'][0].paused, true);
		assert.equal(ctxClosed, true);
	});

	await t.test('subscribes to sound:play on EventBus and unbinds on destructor', async () => {
		const { default: EventBus } = await import('../../src/EventBus.js');
		EventBus.destructor();
		const mockGame = { ctrl: { soundSwitch: 1 } };
		const sound = new Sound(mockGame);

		let playedKey = null;
		sound.play = (key) => { playedKey = key; };

		EventBus.emitEvent('sound:play', 'bomb');
		assert.equal(playedKey, 'bomb');

		sound.destructor();
		playedKey = null;
		EventBus.emitEvent('sound:play', 'bomb');
		assert.equal(playedKey, null);
	});

	await t.test('handles play promise rejections and destructor removes attributes gracefully', async () => {
		const mockGame = { ctrl: { soundSwitch: 1 } };
		const sound = new Sound(mockGame);

		let removed = false;
		sound.soundObj['bomb'][0] = {
			currentTime: 1,
			play: () => Promise.reject(new Error('play rejected')),
			pause: () => {},
			removeAttribute: (attr) => { if (attr === 'src') removed = true; },
			load: () => {},
		};

		assert.doesNotThrow(() => sound.play('bomb'));
		await new Promise(r => setTimeout(r, 10));

		sound.destructor();
		assert.equal(removed, true);
	});

	await t.test('preloadAudioBuffers fetches and decodes audio when available', async () => {
		const origFetch = globalThis.fetch;
		globalThis.fetch = async (url) => ({
			ok: true,
			arrayBuffer: async () => new ArrayBuffer(8),
		});

		const mockAudioCtx = {
			decodeAudioData: async (ab) => ({ duration: 0.5 }),
		};

		const sound = new Sound();
		sound.audioCtx = mockAudioCtx;
		await sound.preloadAudioBuffers();

		assert.ok(sound.audioBuffers.has('bomb'));

		// Failure case (CORS or network error)
		globalThis.fetch = async () => { throw new Error('Network failed'); };
		sound.audioBuffers.clear();
		await sound.preloadAudioBuffers();
		assert.equal(sound.audioBuffers.size, 0);

		globalThis.fetch = origFetch;
	});

	await t.test('initializes Web Audio API via AudioContext when available in window', () => {
		let gainConnected = false;
		class MockAudioContext {
			constructor() {
				this.destination = {};
			}
			createGain() {
				return {
					connect: (dest) => {
						if (dest === this.destination) gainConnected = true;
					},
				};
			}
			close() {
				return Promise.reject(new Error('close failed'));
			}
		}

		globalThis.window.AudioContext = MockAudioContext;
		const sound = new Sound();
		assert.ok(sound.audioCtx instanceof MockAudioContext);
		assert.equal(gainConnected, true);

		// Test Web Audio fallback when createBufferSource throws
		const mockGame = { ctrl: { soundSwitch: 1 } };
		sound.game = mockGame;
		sound.audioBuffers.set('bomb', { length: 100 });
		sound.audioCtx.createBufferSource = () => {
			throw new Error('createBufferSource failed');
		};

		const audio = sound.soundObj['bomb'][0];
		audio.played = false;
		sound.play('bomb');
		assert.equal(audio.played, true);

		assert.doesNotThrow(() => sound.destructor());
		delete globalThis.window.AudioContext;
	});
});
