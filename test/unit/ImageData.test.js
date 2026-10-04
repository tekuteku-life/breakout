import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import ImageData from '../../src/ImageData.js';

test('ImageData class unit tests', async (t) => {
	setupEnvironment();
	const mockCtx = createMock2DContext();

	await t.test('constructor initializes image data structures', () => {
		const img = new ImageData(mockCtx);
		assert.ok(img.imgData['ball']);
		assert.ok(img.imgData['block']);
		assert.ok(img.imgData['item']);
		assert.ok(img.imgData['heart']);
		assert.ok(img.imgData['bar']);
		assert.ok(img.imgData['weapon']);
	});

	await t.test('init generates image data for ball, block, item, and heart', () => {
		const img = new ImageData(mockCtx);
		img.init();

		assert.ok(img.getData('ball', 'normal'));
		assert.ok(img.getData('ball', 'hard'));
		assert.ok(img.getData('ball', 'hard_tail0'));
		assert.ok(img.getData('ball', 'fire'));
		assert.ok(img.getData('ball', 'fire_tail0'));
		assert.ok(img.getData('block', 0));
		assert.ok(img.getData('block', 1));
		assert.ok(img.getData('item', 0));
		assert.ok(img.getData('heart', 0));
		assert.ok(img.getData('heart', 1));
		assert.equal(img.getDataArr('ball'), img.imgData['ball']);
	});

	await t.test('drawBall handles different status and negative/positive i values', () => {
		const img = new ImageData(mockCtx);
		// Normal ball
		assert.doesNotThrow(() => img.drawBall(0, -1));
		assert.doesNotThrow(() => img.drawBall(0, 2));

		// Strong ball
		assert.doesNotThrow(() => img.drawBall(1, -1));
		assert.doesNotThrow(() => img.drawBall(1, 2));

		// Ultimate ball
		assert.doesNotThrow(() => img.drawBall(2, 0));
	});

	await t.test('drawBlock handles blocks with and without text', () => {
		const filledTexts = [];
		const testCtx = {
			...mockCtx,
			fillText: (text, x, y, maxWidth) => {
				filledTexts.push({ text, x, y, maxWidth });
			},
		};
		const img = new ImageData(testCtx);
		// block 0 has no text
		img.drawBlock(0);
		assert.equal(filledTexts.length, 0);

		// block 2 has Bomb text
		img.drawBlock(2);
		assert.equal(filledTexts.length, 1);
		assert.equal(filledTexts[0].text, 'Bomb');
	});

	await t.test('drawItem renders items', () => {
		const img = new ImageData(mockCtx);
		for (let i = 0; i < 16; i++) {
			assert.doesNotThrow(() => img.drawItem(i));
		}
	});

	await t.test('drawHeart renders filled and empty hearts', () => {
		const img = new ImageData(mockCtx);
		assert.doesNotThrow(() => img.drawHeart(0));
		assert.doesNotThrow(() => img.drawHeart(1));
	});

	await t.test('destructor resets imgData', () => {
		const img = new ImageData(mockCtx);
		img.init();
		img.destructor();
		assert.equal(img.imgData.length, 0);
	});
});
