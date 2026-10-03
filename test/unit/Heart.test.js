import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import Heart from '../../src/Heart.js';
import ImageData from '../../src/ImageData.js';

test('Heart class unit tests', async (t) => {
	setupEnvironment();
	const mockCtx = createMock2DContext();
	globalThis.imgData = new ImageData(mockCtx);
	globalThis.imgData.init();

	await t.test('constructor initializes coordinates and imgData', () => {
		const heartFilled = new Heart(100, 50, 1);
		assert.equal(heartFilled.x, 100);
		assert.equal(heartFilled.y, 50);
		assert.ok(heartFilled.imgData);

		const heartEmpty = new Heart(120, 60, 0);
		assert.equal(heartEmpty.x, 120);
		assert.equal(heartEmpty.y, 60);
		assert.ok(heartEmpty.imgData);
	});

	await t.test('draw calls putImageData with calculated coordinates', () => {
		const heart = new Heart(100, 50, 1);
		let called = false;
		const ctx = {
			putImageData: (img, x, y) => {
				called = true;
				assert.equal(img, heart.imgData);
				assert.equal(x, 100 - globalThis.heartWidth);
				assert.equal(y, 50 - globalThis.heartHeight);
			},
		};
		heart.draw(ctx);
		assert.ok(called);
	});

	await t.test('destructor can be called without error', () => {
		const heart = new Heart(100, 50, 1);
		assert.doesNotThrow(() => heart.destructor());
	});
});
