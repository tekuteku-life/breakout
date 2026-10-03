import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import Cloud from '../../src/Cloud.js';

test('Cloud function unit tests', async (t) => {
	setupEnvironment();

	await t.test('Cloud calls fill and rect on context for particle drawing', () => {
		const ctx = createMock2DContext();
		let rectCount = 0;
		let fillCount = 0;
		ctx.rect = (x, y, w, h) => {
			rectCount++;
			assert.ok(typeof x === 'number');
			assert.ok(typeof y === 'number');
			assert.ok(w > 0);
			assert.ok(h > 0);
		};
		ctx.fill = () => {
			fillCount++;
		};

		Cloud(ctx, 50, 100);
		// NumX = 10, NumY = 8 -> 80 particles
		assert.equal(rectCount, 80);
		assert.equal(fillCount, 80);
	});
});
