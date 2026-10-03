// test/integration/weaponBlock.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';
import Weapon from '../../src/Weapon.js';
import Block from '../../src/Block.js';

describe('Integration Test: Weapon-Block Interactions & Bar Damage', () => {
	beforeEach(() => {
		setupEnvironment();
		window.init(0);
		clearInterval(window.timer_All);
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('handles gun weapon hitting blocks, dealing damage, and despawning', () => {
		window.blockMap = [];
		for (let r = 0; r < 10; r++) {
			window.blockMap[r] = [];
			for (let c = 0; c < 15; c++) {
				window.blockMap[r][c] = null;
			}
		}

		// Block at col=5, row=4 (life=2)
		const targetBlock = new Block(5, 4, 1, window.BLOCK_FUNCTION.NORMAL, 2);
		window.blockMap[4][5] = targetBlock;

		// Gun weapon moving upward towards targetBlock
		const gun = new Weapon(0, targetBlock.getCenterX(), targetBlock.getBottomY() + 5, 1);
		gun.vy = 10;
		window.weapons = [gun];

		// Step movement -> hits block
		gun.move();
		assert.equal(targetBlock.life, 1, 'Gun should decrease block life by 1');
		assert.equal(window.weapons.length, 0, 'Gun should despawn after impact');
	});

	it('handles missile weapon hitting durable blocks and destroying them in one hit', () => {
		window.blockMap = [];
		for (let r = 0; r < 10; r++) {
			window.blockMap[r] = [];
			for (let c = 0; c < 15; c++) {
				window.blockMap[r][c] = null;
			}
		}

		// Durable block at col=5, row=4 (life=5)
		const durableBlock = new Block(5, 4, 1, window.BLOCK_FUNCTION.NORMAL, 5);
		window.blockMap[4][5] = durableBlock;

		// Missile moving upward (type = 2 for missile)
		const missile = new Weapon(2, durableBlock.getCenterX(), durableBlock.getBottomY() + 5, 1);
		missile.vy = 10;
		window.weapons = [missile];

		missile.move();
		assert.equal(durableBlock.type, 0, 'Durable block should be destroyed in one hit by missile');
		assert.equal(window.weapons.length, 0, 'Missile should despawn after impact');
	});

	it('handles downward enemy weapon hitting bar and dealing HP damage', () => {
		const bar = window.bar;
		bar.x = 400;
		bar.y = 500;
		bar.hitPoint = 5;

		// Downward weapon (vect = -1) above bar
		const enemyWeapon = new Weapon(0, bar.getCenterX(), bar.y - 10, -1);
		enemyWeapon.vy = 15;
		window.weapons = [enemyWeapon];

		enemyWeapon.move();
		assert.ok(bar.hitPoint < 5, 'Bar should take damage from downward enemy weapon');
		assert.equal(window.weapons.length, 0, 'Enemy weapon should despawn upon hitting bar');
	});

	it('removes weapons that fly beyond upper or lower screen boundaries', () => {
		// Top screen exit
		const upWeapon = new Weapon(0, 200, 5, 1);
		upWeapon.vy = 20;
		window.weapons = [upWeapon];
		upWeapon.move();
		assert.equal(window.weapons.length, 0, 'Weapon flying above screen should despawn');

		// Bottom screen exit
		const downWeapon = new Weapon(0, 200, window.canvasHeight - 5, -1);
		downWeapon.vy = 20;
		window.weapons = [downWeapon];
		downWeapon.move();
		assert.equal(window.weapons.length, 0, 'Weapon flying below screen should despawn');
	});
});
