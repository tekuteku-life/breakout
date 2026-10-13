// test/unit/PresetManage.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupEnvironment } from '../helpers/setupEnv.js';
import PresetManage from '../../src/PresetManage.js';
import GameManage from '../../src/GameManage.js';
import EventBus from '../../src/EventBus.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const presetsRoot = path.resolve(__dirname, '../../presets');

test('PresetManage and presets directory unit tests', async (t) => {
	setupEnvironment();

	await t.test('verifies presets directory structure (common.json, stage/manifest.json, and stage/<preset>/*.json)', () => {
		assert.ok(fs.existsSync(path.join(presetsRoot, 'common.json')), 'presets/common.json should exist');
		assert.ok(fs.existsSync(path.join(presetsRoot, 'stage', 'manifest.json')), 'presets/stage/manifest.json should exist');

		const expectedStageDirs = ['default', 'default_debug'];
		const expectedFiles = ['blockmap.json', 'block.json', 'item.json', 'weapon.json', 'award.json', 'ball.json'];

		for (const stageKey of expectedStageDirs) {
			const stageDir = path.join(presetsRoot, 'stage', stageKey);
			assert.ok(fs.existsSync(stageDir), `presets/stage/${stageKey} directory should exist`);
			for (const file of expectedFiles) {
				assert.ok(fs.existsSync(path.join(stageDir, file)), `presets/stage/${stageKey}/${file} should exist`);
			}
		}

		// Verify old top-level category directories and root manifest no longer exist
		const removedPaths = ['manifest.json', 'common.js', 'block', 'item', 'weapon', 'award', 'map'];
		for (const rel of removedPaths) {
			assert.equal(fs.existsSync(path.join(presetsRoot, rel)), false, `Legacy presets/${rel} should not exist`);
		}
	});

	await t.test('verifies common.json holds stage-independent settings and blockmap.json holds backGroundImage', () => {
		const commonJson = JSON.parse(fs.readFileSync(path.join(presetsRoot, 'common.json'), 'utf8'));
		assert.equal(commonJson.FPS, 50);
		assert.equal(commonJson.lowFPSAlartRatio, 0.8);
		assert.equal(commonJson.canvasWidth, 750);
		assert.equal(commonJson.canvasHeight, 530);
		assert.equal(commonJson.statusBarHeight, 22);
		assert.equal(commonJson.defaultLife, 3);
		assert.equal(commonJson.maxLife, 5);
		assert.equal(commonJson.backGroundImage, undefined, 'backGroundImage should not be in common.json');

		const heartJson = JSON.parse(fs.readFileSync(path.join(presetsRoot, 'heart.json'), 'utf8'));
		assert.equal(heartJson.color, '#F00B3F');
		assert.equal(heartJson.width, 7);
		assert.equal(heartJson.height, 9);

		const barJson = JSON.parse(fs.readFileSync(path.join(presetsRoot, 'bar.json'), 'utf8'));
		assert.equal(barJson.defaultWidth, 80);
		assert.equal(barJson.maxWidth, 140);
		assert.equal(barJson.minWidth, 50);
		assert.equal(barJson.defaultHeight, 7);
		assert.equal(barJson.color, '#114400');
		assert.equal(barJson.immortalColor, '#ffff00');

		const balloonJson = JSON.parse(fs.readFileSync(path.join(presetsRoot, 'balloon.json'), 'utf8'));
		assert.equal(balloonJson.popBalloonBackColor, '#B5F002');
		assert.equal(balloonJson.popBalloonFontColor, '#000000');

		const defaultBlockmap = JSON.parse(fs.readFileSync(path.join(presetsRoot, 'stage', 'default', 'blockmap.json'), 'utf8'));
		const debugBlockmap = JSON.parse(fs.readFileSync(path.join(presetsRoot, 'stage', 'default_debug', 'blockmap.json'), 'utf8'));
		assert.ok(Array.isArray(defaultBlockmap.backGroundImage), 'default/blockmap.json should contain backGroundImage');
		assert.ok(Array.isArray(debugBlockmap.backGroundImage), 'default_debug/blockmap.json should contain backGroundImage');
	});

	await t.test('loads default preset and resolves common, block, item, weapon, award, ball, and blockmap data', () => {
		const pm = new PresetManage();
		const data = pm.getPresetData();

		assert.equal(pm.currentPresetKey, 'default');
		assert.equal(data.title, 'Default');
		assert.equal(data.canvasWidth, 750);
		assert.equal(data.canvasHeight, 530);
		assert.equal(data.FPS, 50);
		assert.equal(data.lowFPSAlartRatio, 0.8);
		assert.equal(data.heartColor, '#F00B3F');
		assert.equal(data.barColor, '#114400');
		assert.equal(data.popBalloonBackColor, '#B5F002');
		assert.equal(data.ballSize, 5);
		assert.equal(data.ballDefaultSpeed, 3.5);
		assert.equal(data.ballMaxNum, 4);
		assert.deepEqual(data.backGroundImage, []);

		// Block definitions
		assert.equal(data.blockWidth, 50);
		assert.equal(data.blockHeight, 20);
		assert.equal(data.blockColor.length, 18);
		assert.equal(data.blockText[2], 'Bomb');
		assert.equal(data.blockText[10], '▲▲▲');
		assert.equal(data.blockText[17], 'Attack');
		assert.equal(data.blockFunction[17], 13);

		// Item definitions
		assert.equal(data.itemFontSize, 14);
		assert.equal(data.itemText.length, 13);
		assert.equal(data.itemText[0].length, 16);
		assert.equal(data.itemText[0][0], 'Double');
		assert.equal(data.itemText[0][15], 'Disturb');

		// Weapon definitions
		assert.deepEqual(data.weaponSpeed, [7, 5]);
		assert.deepEqual(data.weaponMaxNum, [5, 3]);
		assert.deepEqual(data.weaponColor, ['#000000', '#fefefe']);

		// Award definitions resolved per stage
		assert.equal(data.pointPerLife.length, 13);
		assert.equal(data.pointPerLife[0], 50);
		assert.equal(data.pointPerLife[12], 550);
		assert.equal(data.pointPerBall[12], 580);

		// Stage and Map definitions from blockmap.json
		assert.equal(data.stageTitle.length, 13);
		assert.equal(data.stageTitle[0], 'Beginner');
		assert.equal(data.stageTitle[12], 'Warp');
		assert.equal(data.blockMapSet.length, 13);
		assert.ok(Array.isArray(data.blockMapSet[0]));

		pm.destructor();
	});

	await t.test('loads default_debug preset and resolves debug-specific stage object definitions while keeping common settings', async () => {
		const pm = new PresetManage(null, { preset: 'default_debug' });
		const data = pm.getPresetData();

		assert.equal(pm.currentPresetKey, 'default_debug');
		assert.equal(data.title, 'Debug');
		// Common settings remain consistent across stages
		assert.equal(data.FPS, 50);
		assert.equal(data.lowFPSAlartRatio, 0.8);
		assert.equal(data.heartColor, '#F00B3F');
		assert.equal(data.barColor, '#114400');
		assert.equal(data.popBalloonBackColor, '#B5F002');

		// Debug ball definitions from stage/default_debug/ball.json
		assert.equal(data.ballSize, 1);
		assert.equal(data.ballDefaultSpeed, 5);
		assert.equal(data.ballMaxNum, 4000);
		assert.equal(data.ballInfBoundCancel, 0);

		// Debug block definitions (12 types, arrows ↑↑↑ / ↓↓↓)
		assert.equal(data.blockColor.length, 12);
		assert.equal(data.blockText[10], '↑↑↑');
		assert.equal(data.blockText[11], '↓↓↓');

		// Debug item definitions (12 types, Life color #2E9260)
		assert.equal(data.itemColor[0].length, 12);
		assert.equal(data.itemColor[0][5], '#2E9260');
		assert.equal(data.itemTextColor[0][5], '#ffffff');

		// Debug stage & map definitions from stage/default_debug/blockmap.json
		assert.equal(data.stageTitle.length, 9);
		assert.equal(data.stageTitle[5], 'Practice2');
		assert.equal(data.blockMapSet.length, 10);
		assert.equal(data.itemProb.length, 10);

		// Switch back to default via async loadPreset
		const switched = await pm.loadPreset('default');
		assert.equal(pm.currentPresetKey, 'default');
		assert.equal(switched.ballSize, 5);
		assert.equal(switched.stageTitle.length, 13);

		pm.destructor();
	});

	await t.test('reports JSON loading status messages to Loading screen and progress callbacks on sync/async load', async () => {
		const pm = new PresetManage();
		const syncMessages = [];
		const busMessages = [];
		const onBusMsg = (msg) => busMessages.push(msg);
		EventBus.addOnEvent('loading:message', onBusMsg);

		pm.loadPresetSync('default', (ratio, text) => {
			syncMessages.push({ ratio, text });
		});

		const expectedFiles = [
			'common.json',
			'bar.json',
			'heart.json',
			'ball.json',
			'weapon.json',
			'item.json',
			'balloon.json',
			'block.json',
			'sound.json',
			'manifest.json',
			'block.json',
			'item.json',
			'weapon.json',
			'award.json',
			'ball.json',
			'blockmap.json',
		];

		assert.equal(syncMessages.length, expectedFiles.length);
		for (let i = 0; i < expectedFiles.length; i++) {
			assert.equal(syncMessages[i].text, `Loading JSON data (${expectedFiles[i]})...`);
			assert.ok(syncMessages[i].ratio > 0 && syncMessages[i].ratio <= 1);
		}
		assert.equal(busMessages.length, expectedFiles.length);

		// Also verify async loadPreset reports every JSON file
		const asyncMessages = [];
		await pm.loadPreset('default_debug', (ratio, text) => {
			asyncMessages.push({ ratio, text });
		});
		assert.equal(asyncMessages.length, expectedFiles.length);
		assert.equal(asyncMessages[0].text, 'Loading JSON data (common.json)...');
		assert.equal(asyncMessages[9].text, 'Loading JSON data (manifest.json)...');
		assert.equal(asyncMessages[asyncMessages.length - 1].text, 'Loading JSON data (blockmap.json)...');
		assert.equal(asyncMessages[asyncMessages.length - 1].ratio, 1);

		EventBus.removeOnEvent('loading:message', onBusMsg);
		pm.destructor();
	});

	await t.test('resolves map block keys, stage award/map numeric IDs, backGroundImage in blockmap, and object-based itemProb in buildPresetData', () => {
		const pm = new PresetManage();
		const customBuilt = pm.buildPresetData('custom', {
			common: {
				FPS: 60,
			},
			heart: {
				color: '#123456',
			},
			block: {
				width: 40,
				height: 16,
				types: [
					{ id: 0, key: 'empty', color: '', lineColor: '', text: '', textColor: '', life: 0, through: 0, infinit: 0, breakLimit: 0, func: 0 },
					{ id: 1, key: 'hard', color: '#111111', lineColor: '#ffffff', text: 'H', textColor: '#000000', life: 2, through: 0, infinit: 0, breakLimit: 0, func: 0 },
					{ id: 2, key: 'bomb', color: '#ff0000', lineColor: '#ffffff', text: 'B', textColor: '#000000', life: 0, through: 0, infinit: 0, breakLimit: 0, func: 1 },
				],
			},
			item: {
				fontSize: 12,
				defaultSpeed: 5,
				types: [
					{ id: 0, key: 'double', text: 'Double', color: '#00f', textColor: '#fff', lineColor: '#fff' },
					{ id: 1, key: 'hard', text: 'Hard', color: '#0f0', textColor: '#fff', lineColor: '#fff' },
				],
			},
			weapon: {
				types: [
					{ id: 0, key: 'gun', speed: 9, maxNum: 6, color: '#111', lineColor: '#222' },
				],
			},
			award: {
				awards: [
					{ id: 0, key: 'custom_award', pointPerLife: 77, pointPerBall: 88, pointPerContBreak: 11, strongBallClear: 222, clearTimeThreashould: 60, pointPerClearTime: 9, pointPerGetItem: 6, pointPerFallBall: 15 },
				],
			},
			ball: {
				size: 7,
				defaultSpeed: 4.5,
				maxNum: 10,
			},
			blockmap: {
				title: 'CustomStagePreset',
				backGroundImage: ['./image/bg01.jpg'],
				stages: [
					{
						title: 'StageOne',
						lifeUp: 2,
						map: 'custom_map',
						award: 'custom_award',
						itemProb: { double: '0.25', hard: '0.1' },
					},
					{
						title: 'StageTwoByNumericId',
						map: 0,
						award: 0,
						itemSpeed: 6,
						itemProb: ['0.5', '0.5'],
						backGroundImage: './image/bg02.jpg',
					},
				],
				maps: [
					{
						id: 0,
						key: 'custom_map',
						grid: [
							['empty', 'hard', 'bomb', 999],
							[1, 2, 'unknown_key'],
						],
					},
				],
			},
		});

		assert.equal(customBuilt.FPS, 60);
		assert.equal(customBuilt.heartColor, '#123456');
		assert.equal(customBuilt.ballSize, 7);
		assert.equal(customBuilt.ballDefaultSpeed, 4.5);
		assert.equal(customBuilt.ballMaxNum, 10);
		assert.equal(customBuilt.blockWidth, 40);
		assert.equal(customBuilt.blockHeight, 16);
		assert.deepEqual(customBuilt.backGroundImage, ['./image/bg01.jpg', './image/bg02.jpg']);
		assert.deepEqual(customBuilt.blockMapSet[0], [
			[0, 1, 2, 0],
			[1, 2, 0],
		]);
		assert.deepEqual(customBuilt.itemProb[0], ['0.25', '0.1']);
		assert.equal(customBuilt.itemSpeed[0], 5);
		assert.equal(customBuilt.itemSpeed[1], 6);
		assert.equal(customBuilt.pointPerLife[0], 77);
		assert.equal(customBuilt.pointPerBall[0], 88);
		assert.equal(customBuilt.weaponSpeed[0], 9);
		assert.equal(customBuilt.weaponMaxNum[0], 6);

		pm.destructor();
	});

	await t.test('normalizes preset keys and falls back gracefully on unknown preset or missing files', async () => {
		const pm = new PresetManage();

		assert.equal(pm.normalizePresetKey('default'), 'default');
		assert.equal(pm.normalizePresetKey('default_debug'), 'default_debug');
		assert.equal(pm.normalizePresetKey('./presets/stage/default_debug'), 'default_debug');
		assert.equal(pm.normalizePresetKey('non_existent_preset'), 'default');
		assert.equal(pm.normalizePresetKey(null), 'default');

		const available = pm.getAvailablePresets();
		assert.equal(available.length, 2);
		assert.equal(available[0].key, 'default');
		assert.equal(available[1].key, 'default_debug');

		// Test fallback when basePath points to non-existent directory
		const brokenPm = new PresetManage(null, { presetsBasePath: './non_existent_presets_dir' });
		const fallbackData = brokenPm.getPresetData();
		assert.equal(fallbackData.presetKey, 'default');
		assert.equal(fallbackData.canvasWidth, 750);
		const asyncFallback = await brokenPm.loadPreset('default');
		assert.equal(asyncFallback.canvasWidth, 750);
		brokenPm.destructor();
		pm.destructor();
	});

	await t.test('verifies stage/manifest.json integrity and stageCache cleanup', async () => {
		const pm = new PresetManage();
		const stageManifest = pm.stageManifest;
		assert.equal(stageManifest.defaultPreset, 'default');

		for (const [presetKey, entry] of Object.entries(stageManifest.presets)) {
			const stageDir = path.resolve(presetsRoot, 'stage', entry.dir);
			assert.ok(fs.existsSync(stageDir), `Stage preset directory ${stageDir} should exist`);
			for (const [objKey, relFile] of Object.entries(entry.files)) {
				const targetFile = path.resolve(stageDir, relFile);
				assert.ok(fs.existsSync(targetFile), `Stage '${presetKey}' ${objKey} file ${targetFile} should exist`);
			}
		}

		assert.ok(pm.stageCache.has('default'));
		const cachedBlock = pm.loadStageObjectSync('default', 'block');
		const asyncCachedBlock = await pm.loadStageObjectAsync('default', 'block');
		assert.equal(cachedBlock, asyncCachedBlock);

		pm.destructor();
		assert.equal(pm.stageCache.size, 0);
		assert.equal(pm.presetData, null);
	});

	await t.test('GameManage distributes preset data to all child classes and screen controllers, and updates on preset change', async () => {
		const gm = new GameManage({ ballMaxNum: 8 });
		gm.init(0);
		gm.stop();

		// Verify all child classes and screen controllers received effectivePreset (including option overrides)
		const targets = [
			gm.objectManage,
			gm.ctrl,
			gm.statusMng,
			gm.scoreMng,
			gm.sounds,
			gm.imgData,
			gm.screenManage,
			gm.inputManage,
			gm.autoPlay,
			gm.screenManage.getController('screen_setting'),
			gm.screenManage.getController('screen_record'),
		];
		for (const target of targets) {
			assert.ok(target && target.preset, 'Child class/controller should receive preset from GameManage');
			assert.equal(target.preset.presetKey, 'default');
			assert.equal(target.preset.ballMaxNum, 8);
		}

		const settingSel = gm.ctrl.formSelector['setting'];
		assert.ok(settingSel);
		assert.equal(settingSel.children.length, 2);
		assert.equal(settingSel.children[0].value, 'default');
		assert.equal(settingSel.children[1].value, 'default_debug');

		// Trigger setting selector onchange to switch to default_debug
		const gmSwitch = new GameManage();
		gmSwitch.init(0);
		gmSwitch.stop();
		const switchSel = gmSwitch.ctrl.formSelector['setting'];
		switchSel.value = 'default_debug';
		switchSel.onchange({ target: { value: 'default_debug' } });
		gmSwitch.stop();

		assert.equal(gmSwitch.presetManage.currentPresetKey, 'default_debug');
		assert.equal(gmSwitch.ballSize, 1);
		assert.equal(gmSwitch.objectManage.preset.ballSize, 1);
		assert.equal(gmSwitch.ctrl.preset.stageTitle[5], 'Practice2');
		assert.equal(gmSwitch.statusMng.preset.lowFPSAlartRatio, 0.8);
		assert.equal(gmSwitch.scoreMng.preset.pointPerBall[0], 10);
		assert.equal(gmSwitch.imgData.preset.blockText[10], '↑↑↑');
		assert.equal(gmSwitch.sounds.preset.presetKey, 'default_debug');
		assert.equal(gmSwitch.inputManage.preset.presetKey, 'default_debug');
		assert.equal(gmSwitch.autoPlay.preset.presetKey, 'default_debug');
		assert.equal(gmSwitch.screenManage.getController('screen_setting').preset.presetKey, 'default_debug');
		assert.equal(gmSwitch.screenManage.getController('screen_record').preset.presetKey, 'default_debug');

		gmSwitch.destructor();
		gm.destructor();
	});
});
