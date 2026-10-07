// test/integration/weaponBlock.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnvironment } from '../helpers/setupEnv.js';
import '../../src/main.js';
import Weapon from '../../src/Weapon.js';
import Block from '../../src/Block.js';
import { BLOCK_FUNCTION } from '../../src/const.js';

describe('Integration Test: Weapon-Block Interactions & Bar Damage', () => {
	beforeEach(() => {
		setupEnvironment();
		window.gameManage.init(0);
		clearInterval(window.timer_All);
	});

	afterEach(() => {
		clearInterval(window.timer_All);
	});

	it('handles gun weapon hitting blocks, dealing damage, and despawning', () => {
		const g = window.gameManage;
		g.objectManage.blockMap = [];
		for (let r = 0; r < 10; r++) {
			g.objectManage.blockMap[r] = [];
			for (let c = 0; c < 15; c++) {
				g.objectManage.blockMap[r][c] = null;
			}
		}

		// Block at col=5, row=4 (life=2)
		const targetBlock = new Block(5, 4, 1, BLOCK_FUNCTION.NORMAL, 2, 0, 0, g);
		g.objectManage.blockMap[4][5] = targetBlock;

		// Gun weapon moving upward towards targetBlock
		const gun = new Weapon(0, targetBlock.getCenterX(), targetBlock.getBottomY() + 5, 1, g);
		gun.vy = 10;
		g.objectManage.weapons = [gun];

		// Step movement -> hits block
		gun.movePosition();
		gun.updateState();
		g.objectManage.resolveCollisions();
		assert.equal(targetBlock.life, 1, 'Gun should decrease block life by 1');
		assert.equal(g.objectManage.weapons.length, 0, 'Gun should despawn after impact');
	});

	it('handles missile weapon hitting durable blocks and destroying them in one hit', () => {
		const g = window.gameManage;
		g.objectManage.blockMap = [];
		for (let r = 0; r < 10; r++) {
			g.objectManage.blockMap[r] = [];
			for (let c = 0; c < 15; c++) {
				g.objectManage.blockMap[r][c] = null;
			}
		}

		// Durable block at col=5, row=4 (life=5)
		const durableBlock = new Block(5, 4, 1, BLOCK_FUNCTION.NORMAL, 5, 0, 0, g);
		g.objectManage.blockMap[4][5] = durableBlock;

		// Missile moving upward (type = 2 for missile)
		const missile = new Weapon(2, durableBlock.getCenterX(), durableBlock.getBottomY() + 5, 1, g);
		missile.vy = 10;
		g.objectManage.weapons = [missile];

		missile.movePosition();
		missile.updateState();
		g.objectManage.resolveCollisions();
		assert.equal(durableBlock.type, 0, 'Durable block should be destroyed in one hit by missile');
		assert.equal(g.objectManage.weapons.length, 0, 'Missile should despawn after impact');
	});

	it('handles downward enemy weapon hitting bar and dealing HP damage', () => {
		const g = window.gameManage;
		const bar = g.objectManage.bar;
		bar.x = 400;
		bar.y = 500;
		bar.hitPoint = 5;

		// Downward weapon (vect = -1) above bar
		const enemyWeapon = new Weapon(0, bar.getCenterX(), bar.y - 10, -1, g);
		enemyWeapon.vy = 15;
		g.objectManage.weapons = [enemyWeapon];

		enemyWeapon.movePosition();
		enemyWeapon.updateState();
		g.objectManage.resolveCollisions();
		assert.ok(bar.hitPoint < 5, 'Bar should take damage from downward enemy weapon');
		assert.equal(g.objectManage.weapons.length, 0, 'Enemy weapon should despawn upon hitting bar');
	});

	it('removes weapons that fly beyond upper or lower screen boundaries', () => {
		const g = window.gameManage;
		// Top screen exit
		const upWeapon = new Weapon(0, 200, 5, 1, g);
		upWeapon.vy = 20;
		g.objectManage.weapons = [upWeapon];
		upWeapon.movePosition();
		upWeapon.updateState();
		assert.equal(g.objectManage.weapons.length, 0, 'Weapon flying above screen should despawn');

		// Bottom screen exit
		const downWeapon = new Weapon(0, 200, g.canvasHeight - 5, -1, g);
		downWeapon.vy = 20;
		g.objectManage.weapons = [downWeapon];
		downWeapon.movePosition();
		downWeapon.updateState();
		assert.equal(g.objectManage.weapons.length, 0, 'Weapon flying below screen should despawn');
	});
});
