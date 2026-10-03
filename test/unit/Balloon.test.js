import test from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment, createMock2DContext } from '../helpers/setupEnv.js';
import Balloon from '../../src/Balloon.js';

test('Balloon class unit tests', async (t) => {
	setupEnvironment();

	await t.test('constructor initializes properties and arcPos array', () => {
		const balloon = new Balloon('100pts', 50, 60, 40, 20, 0.2, '#ffffff', '#000000', 14);
		assert.equal(balloon.text, '100pts');
		assert.equal(balloon.x, 50);
		assert.equal(balloon.y, 60);
		assert.equal(balloon.boxWidth, 40);
		assert.equal(balloon.boxHeight, 20);
		assert.equal(balloon.decrStep, 0.2);
		assert.equal(balloon.backColor, '#ffffff');
		assert.equal(balloon.fontColor, '#000000');
		assert.equal(balloon.fontSize, 14);
		assert.equal(balloon.endFlag, 0);
		assert.equal(balloon.alpha, 1);
		// arcNumX = 5, arcNumY = 3 -> 15 arcs
		assert.equal(balloon.arcPos.length, 15);
	});

	await t.test('draw renders background and text, and decreases alpha', () => {
		const ctx = createMock2DContext();
		const balloon = new Balloon('Bonus', 10, 20, 30, 15, 0.3, '#123456', '#abcdef', 12);

		let rectDrawn = false;
		let textDrawn = false;
		ctx.rect = (x, y, w, h) => {
			rectDrawn = true;
			assert.equal(x, 10);
			assert.equal(y, 20);
			assert.equal(w, 30);
			assert.equal(h, 15);
		};
		ctx.fillText = (txt, x, y, maxW) => {
			textDrawn = true;
			assert.equal(txt, 'Bonus');
			assert.equal(x, 10 + 30 / 2);
			assert.equal(y, 20 + 15 / 2);
		};

		balloon.draw(ctx);
		assert.ok(rectDrawn);
		assert.ok(textDrawn);
		assert.ok(balloon.alpha < 1);
	});

	await t.test('draw sets endFlag and calls destructor when alpha reaches below 0', () => {
		const ctx = createMock2DContext();
		const balloon = new Balloon('Fade', 10, 20, 30, 15, 0.9, '#fff', '#000', 12);
		balloon.alpha = 0.05;

		balloon.draw(ctx);
		assert.equal(balloon.endFlag, 1);

		// Subsequent draw should immediately return
		let drawn = false;
		ctx.rect = () => { drawn = true; };
		balloon.draw(ctx);
		assert.equal(drawn, false);
	});

	await t.test('destructor sets endFlag to 1', () => {
		const balloon = new Balloon('Test', 0, 0, 10, 10, 0.1, '#fff', '#000', 10);
		balloon.destructor();
		assert.equal(balloon.endFlag, 1);
	});
});
