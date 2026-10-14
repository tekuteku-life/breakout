// src/PresetManage.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import EventBus from "./EventBus.js";
import { PRESET_PARAM } from "./const.js";

const COMMON_FILE_KEYS = Object.freeze(Object.keys(PRESET_PARAM.COMMON_FILES));
const STAGE_OBJECT_KEYS = Object.freeze(Object.keys(PRESET_PARAM.STAGE_OBJECT_FILES));

//--------------------------------------------------
// プリセット管理（presets下の共通JSON群・stage/manifest.json・各ステージディレクトリ配下JSONの読込・解決・保持）
//--------------------------------------------------
export default class PresetManage {
	static _defaultPresetCache = null;
	static _isBuildingDefault = false;

	/**
	 * デフォルトプリセットデータ（共通JSON群 + stage/default/*.json）の取得（キャッシュ済）
	 * @returns {Object}
	 */
	static getDefaultPreset() {
		if (!PresetManage._defaultPresetCache && !PresetManage._isBuildingDefault) {
			PresetManage._isBuildingDefault = true;
			try {
				const defaultPm = new PresetManage(null, {
					presetsBasePath: PRESET_PARAM.BASE_PATH,
					preset: PRESET_PARAM.DEFAULT_PRESET_KEY,
				});
				PresetManage._defaultPresetCache = defaultPm.getPresetData();
			} finally {
				PresetManage._isBuildingDefault = false;
			}
		}
		return PresetManage._defaultPresetCache || {};
	}

	constructor(game = null, options = {}) {
		this.game = game;
		this.basePath = (options && options.presetsBasePath) || PRESET_PARAM.BASE_PATH;
		this.commonData = null;
		this.stageManifest = null;
		this.stageCache = new Map();
		this.currentPresetKey = (options && options.preset) || PRESET_PARAM.DEFAULT_PRESET_KEY;
		this.presetData = null;
		this.isConstructing = true;

		this.initSync(this.currentPresetKey);
		this.isConstructing = false;
	}

	destructor() {
		this.game = null;
		this.commonData = null;
		this.stageManifest = null;
		if (this.stageCache) {
			this.stageCache.clear();
		}
		this.presetData = null;
	}

	/**
	 * JSON読み込み時のステータスメッセージ整形
	 * @param {string} fileOrUrl
	 * @returns {string}
	 */
	formatJsonLoadingMessage(fileOrUrl) {
		const fileName = String(fileOrUrl || '').split('/').pop() || 'json';
		return `Loading JSON data (${fileName})...`;
	}

	/**
	 * Loading画面およびコールバックへのJSON読み込みステータス通知
	 * @param {string} message
	 * @param {number} [ratio=0]
	 * @param {Function|null} [onProgress=null]
	 */
	notifyLoadingStatus(message, ratio = 0, onProgress = null) {
		if (!this.isConstructing) {
			if (this.game && this.game.screenManage && typeof this.game.screenManage.setLoadingMessage === 'function') {
				this.game.screenManage.setLoadingMessage(message);
			}
			EventBus.emitEvent('loading:message', message);
		}
		if (typeof onProgress === 'function') {
			onProgress(ratio, message);
		}
	}

	/**
	 * プリセット識別子の正規化
	 * @param {string} nameOrPath
	 * @returns {string}
	 */
	normalizePresetKey(nameOrPath) {
		const defaultKey = (this.stageManifest && this.stageManifest.defaultPreset) || PRESET_PARAM.DEFAULT_PRESET_KEY;
		if (!nameOrPath || typeof nameOrPath !== 'string') {
			return defaultKey;
		}
		const trimmed = nameOrPath.trim().replace(/\/+$/, '');
		const presetsMap = (this.stageManifest && this.stageManifest.presets) || {};

		if (presetsMap[trimmed]) {
			return trimmed;
		}

		const baseMatch = trimmed.match(/([^/\\]+)$/);
		if (baseMatch && baseMatch[1] && presetsMap[baseMatch[1]]) {
			return baseMatch[1];
		}

		return defaultKey;
	}

	/**
	 * 相対パスの結合
	 * @param {string} baseDir
	 * @param {string} relPath
	 * @returns {string}
	 */
	joinPath(baseDir, relPath) {
		const cleanBase = String(baseDir || '').replace(/\/+$/, '');
		const cleanRel = String(relPath || '').replace(/^\.\//, '');
		return `${cleanBase}/${cleanRel}`;
	}

	/**
	 * JSONファイルの同期読み込み（Node.js環境またはブラウザXHR）
	 * @param {string} relUrl
	 * @returns {Object|null}
	 */
	readJsonSync(relUrl) {
		if (typeof process !== 'undefined' && typeof process.getBuiltinModule === 'function') {
			try {
				const fs = process.getBuiltinModule('fs');
				const path = process.getBuiltinModule('path');
				const url = process.getBuiltinModule('url');
				if (fs && path && url) {
					const currentDir = path.dirname(url.fileURLToPath(import.meta.url));
					const projectRoot = path.resolve(currentDir, '..');
					const targetPath = path.resolve(projectRoot, relUrl.replace(/^\.\//, ''));
					const content = fs.readFileSync(targetPath, 'utf8');
					return JSON.parse(content);
				}
			} catch (_) {
				return null;
			}
		}

		if (typeof XMLHttpRequest !== 'undefined') {
			try {
				const xhr = new XMLHttpRequest();
				xhr.open('GET', relUrl, false);
				if (typeof xhr.overrideMimeType === 'function') {
					xhr.overrideMimeType('application/json');
				}
				xhr.send(null);
				if ((xhr.status >= 200 && xhr.status < 300) || (xhr.status === 0 && xhr.responseText)) {
					return JSON.parse(xhr.responseText);
				}
			} catch (_) {
				return null;
			}
		}

		return null;
	}

	/**
	 * JSONファイルの非同期読み込み（fetch優先、フォールバックとして同期読み込み）
	 * @param {string} relUrl
	 * @returns {Promise<Object|null>}
	 */
	async readJsonAsync(relUrl) {
		const isNode = typeof process !== 'undefined' && Boolean(process.versions && process.versions.node);
		if (!isNode && typeof fetch === 'function') {
			try {
				const response = await fetch(relUrl);
				if (response && response.ok) {
					return await response.json();
				}
			} catch (_) {
				// フォールバックへ
			}
		}
		return this.readJsonSync(relUrl);
	}

	/**
	 * 共通JSONファイル群（common, bar, heart, ball, weapon, item, balloon, block, sound）の同期読み込み
	 * @param {Function|null} [onProgress=null]
	 * @param {number} [startStep=1]
	 * @param {number} [totalSteps=COMMON_FILE_KEYS.length]
	 * @returns {Object}
	 */
	loadCommonSync(onProgress = null, startStep = 1, totalSteps = COMMON_FILE_KEYS.length) {
		const needLoad = !this.commonData;
		if (needLoad) {
			this.commonData = {};
		}
		for (let i = 0; i < COMMON_FILE_KEYS.length; i++) {
			const key = COMMON_FILE_KEYS[i];
			const fileName = PRESET_PARAM.COMMON_FILES[key];
			const fileUrl = this.joinPath(this.basePath, fileName);
			const ratio = (startStep + i) / totalSteps;
			this.notifyLoadingStatus(this.formatJsonLoadingMessage(fileUrl), ratio, onProgress);
			if (needLoad) {
				this.commonData[key] = this.readJsonSync(fileUrl) || {};
			}
		}
		return this.commonData;
	}

	/**
	 * 共通JSONファイル群（common, bar, heart, ball, weapon, item, balloon, block, sound）の非同期読み込み
	 * @param {Function|null} [onProgress=null]
	 * @param {number} [startStep=1]
	 * @param {number} [totalSteps=COMMON_FILE_KEYS.length]
	 * @returns {Promise<Object>}
	 */
	async loadCommonAsync(onProgress = null, startStep = 1, totalSteps = COMMON_FILE_KEYS.length) {
		const needLoad = !this.commonData;
		if (needLoad) {
			this.commonData = {};
		}
		for (let i = 0; i < COMMON_FILE_KEYS.length; i++) {
			const key = COMMON_FILE_KEYS[i];
			const fileName = PRESET_PARAM.COMMON_FILES[key];
			const fileUrl = this.joinPath(this.basePath, fileName);
			const ratio = (startStep + i) / totalSteps;
			this.notifyLoadingStatus(this.formatJsonLoadingMessage(fileUrl), ratio, onProgress);
			if (needLoad) {
				this.commonData[key] = (await this.readJsonAsync(fileUrl)) || {};
			}
		}
		return this.commonData;
	}

	/**
	 * stage/manifest.jsonの同期読み込み
	 * @param {Function|null} [onProgress=null]
	 * @param {number} [ratio=0]
	 * @returns {Object}
	 */
	loadManifestSync(onProgress = null, ratio = 0) {
		const manifestUrl = this.joinPath(this.basePath, PRESET_PARAM.STAGE_MANIFEST_PATH);
		this.notifyLoadingStatus(this.formatJsonLoadingMessage(manifestUrl), ratio, onProgress);
		if (!this.stageManifest) {
			this.stageManifest = this.readJsonSync(manifestUrl) || {
				defaultPreset: PRESET_PARAM.DEFAULT_PRESET_KEY,
				presets: {
					[PRESET_PARAM.DEFAULT_PRESET_KEY]: {
						title: PRESET_PARAM.DEFAULT_PRESET_TITLE,
						dir: PRESET_PARAM.DEFAULT_STAGE_DIR,
						files: { ...PRESET_PARAM.STAGE_OBJECT_FILES },
					},
				},
			};
		}
		return this.stageManifest;
	}

	/**
	 * stage/manifest.jsonの非同期読み込み
	 * @param {Function|null} [onProgress=null]
	 * @param {number} [ratio=0]
	 * @returns {Promise<Object>}
	 */
	async loadManifestAsync(onProgress = null, ratio = 0) {
		const manifestUrl = this.joinPath(this.basePath, PRESET_PARAM.STAGE_MANIFEST_PATH);
		this.notifyLoadingStatus(this.formatJsonLoadingMessage(manifestUrl), ratio, onProgress);
		if (!this.stageManifest) {
			this.stageManifest = (await this.readJsonAsync(manifestUrl)) || {
				defaultPreset: PRESET_PARAM.DEFAULT_PRESET_KEY,
				presets: {
					[PRESET_PARAM.DEFAULT_PRESET_KEY]: {
						title: PRESET_PARAM.DEFAULT_PRESET_TITLE,
						dir: PRESET_PARAM.DEFAULT_STAGE_DIR,
						files: { ...PRESET_PARAM.STAGE_OBJECT_FILES },
					},
				},
			};
		}
		return this.stageManifest;
	}

	/**
	 * ステージプリセット配下のオブジェクト設定JSONファイルパスを解決
	 * @param {string} presetKey
	 * @param {string} objectKey
	 * @returns {string}
	 */
	resolveStageObjectUrl(presetKey, objectKey) {
		const manifest = this.stageManifest || {};
		const presets = manifest.presets || {};
		const defaultKey = manifest.defaultPreset || PRESET_PARAM.DEFAULT_PRESET_KEY;
		const entry = presets[presetKey] || presets[defaultKey] || {};
		const stageRelDir = entry.dir || `./${presetKey}`;
		const fileName = (entry.files && entry.files[objectKey])
			|| PRESET_PARAM.STAGE_OBJECT_FILES[objectKey]
			|| `${objectKey}.json`;
		const stageDirUrl = this.joinPath(`${this.basePath}/${PRESET_PARAM.STAGE_DIR_NAME}`, stageRelDir);
		return this.joinPath(stageDirUrl, fileName);
	}

	/**
	 * 指定ステージプリセット・オブジェクト種別のJSONデータを同期取得（キャッシュ対応）
	 * @param {string} presetKey
	 * @param {string} objectKey
	 * @param {Function|null} [onProgress=null]
	 * @param {number} [ratio=0]
	 * @returns {Object|null}
	 */
	loadStageObjectSync(presetKey, objectKey, onProgress = null, ratio = 0) {
		const url = this.resolveStageObjectUrl(presetKey, objectKey);
		this.notifyLoadingStatus(this.formatJsonLoadingMessage(url), ratio, onProgress);

		let stageEntry = this.stageCache.get(presetKey);
		if (stageEntry && stageEntry.has(objectKey)) {
			return stageEntry.get(objectKey);
		}
		const data = this.readJsonSync(url);
		if (data) {
			if (!stageEntry) {
				stageEntry = new Map();
				this.stageCache.set(presetKey, stageEntry);
			}
			stageEntry.set(objectKey, data);
		}
		return data;
	}

	/**
	 * 指定ステージプリセット・オブジェクト種別のJSONデータを非同期取得（キャッシュ対応）
	 * @param {string} presetKey
	 * @param {string} objectKey
	 * @param {Function|null} [onProgress=null]
	 * @param {number} [ratio=0]
	 * @returns {Promise<Object|null>}
	 */
	async loadStageObjectAsync(presetKey, objectKey, onProgress = null, ratio = 0) {
		const url = this.resolveStageObjectUrl(presetKey, objectKey);
		this.notifyLoadingStatus(this.formatJsonLoadingMessage(url), ratio, onProgress);

		let stageEntry = this.stageCache.get(presetKey);
		if (stageEntry && stageEntry.has(objectKey)) {
			return stageEntry.get(objectKey);
		}
		const data = await this.readJsonAsync(url);
		if (data) {
			if (!stageEntry) {
				stageEntry = new Map();
				this.stageCache.set(presetKey, stageEntry);
			}
			stageEntry.set(objectKey, data);
		}
		return data;
	}

	/**
	 * 同期初期化・プリセット読み込み
	 * @param {string} [presetName=PRESET_PARAM.DEFAULT_PRESET_KEY]
	 * @param {Function|null} [onProgress=null]
	 * @returns {Object}
	 */
	initSync(presetName = PRESET_PARAM.DEFAULT_PRESET_KEY, onProgress = null) {
		return this.loadPresetSync(presetName, onProgress);
	}

	/**
	 * 指定プリセットの同期読み込みと内部形式への変換
	 * @param {string} [presetName=PRESET_PARAM.DEFAULT_PRESET_KEY]
	 * @param {Function|null} [onProgress=null]
	 * @returns {Object}
	 */
	loadPresetSync(presetName = PRESET_PARAM.DEFAULT_PRESET_KEY, onProgress = null) {
		const commonCount = COMMON_FILE_KEYS.length;
		const totalSteps = commonCount + 1 + STAGE_OBJECT_KEYS.length;
		this.loadCommonSync(onProgress, 1, totalSteps);
		this.loadManifestSync(onProgress, (commonCount + 1) / totalSteps);

		const key = this.normalizePresetKey(presetName);
		this.currentPresetKey = key;

		const rawObjects = {};
		for (let i = 0; i < STAGE_OBJECT_KEYS.length; i++) {
			const objKey = STAGE_OBJECT_KEYS[i];
			const ratio = (commonCount + 2 + i) / totalSteps;
			rawObjects[objKey] = this.loadStageObjectSync(key, objKey, onProgress, ratio);
		}

		if (!rawObjects.blockmap) {
			this.presetData = this.createFallbackPresetData();
			return this.presetData;
		}

		this.presetData = this.buildPresetData(key, rawObjects);
		if (key === PRESET_PARAM.DEFAULT_PRESET_KEY && this.basePath === PRESET_PARAM.BASE_PATH && !PresetManage._defaultPresetCache) {
			PresetManage._defaultPresetCache = this.presetData;
		}
		return this.presetData;
	}

	/**
	 * 指定プリセットの非同期読み込みと内部形式への変換
	 * @param {string} [presetName=PRESET_PARAM.DEFAULT_PRESET_KEY]
	 * @param {Function|null} [onProgress=null]
	 * @returns {Promise<Object>}
	 */
	async loadPreset(presetName = PRESET_PARAM.DEFAULT_PRESET_KEY, onProgress = null) {
		const commonCount = COMMON_FILE_KEYS.length;
		const totalSteps = commonCount + 1 + STAGE_OBJECT_KEYS.length;
		await this.loadCommonAsync(onProgress, 1, totalSteps);
		await this.loadManifestAsync(onProgress, (commonCount + 1) / totalSteps);

		const key = this.normalizePresetKey(presetName);
		this.currentPresetKey = key;

		const rawObjects = {};
		for (let i = 0; i < STAGE_OBJECT_KEYS.length; i++) {
			const objKey = STAGE_OBJECT_KEYS[i];
			const ratio = (commonCount + 2 + i) / totalSteps;
			rawObjects[objKey] = await this.loadStageObjectAsync(key, objKey, onProgress, ratio);
		}

		if (!rawObjects.blockmap) {
			this.presetData = this.createFallbackPresetData();
			return this.presetData;
		}

		this.presetData = this.buildPresetData(key, rawObjects);
		if (key === PRESET_PARAM.DEFAULT_PRESET_KEY && this.basePath === PRESET_PARAM.BASE_PATH && !PresetManage._defaultPresetCache) {
			PresetManage._defaultPresetCache = this.presetData;
		}
		return this.presetData;
	}

	/**
	 * common.jsonおよびステージ配下の各オブジェクトJSON定義を結合・解決して内部利用形式のデータ構造を構築
	 * @param {string} presetKey
	 * @param {Object} raw
	 * @returns {Object}
	 */
	buildPresetData(presetKey, raw = {}) {
		const def = PresetManage._defaultPresetCache || (PresetManage._isBuildingDefault ? {} : PresetManage.getDefaultPreset());
		const baseCommon = this.commonData || {};
		const commonData = { ...(baseCommon.common || {}), ...(raw.common || {}) };
		const barData = { ...(baseCommon.bar || {}), ...(raw.bar || {}) };
		const heartData = { ...(baseCommon.heart || {}), ...(raw.heart || {}) };
		const balloonData = { ...(baseCommon.balloon || {}), ...(raw.balloon || {}) };
		const soundData = { ...(baseCommon.sound || {}), ...(raw.sound || {}) };
		const blockCommon = baseCommon.block || {};
		const blockData = { ...blockCommon, ...(raw.block || {}) };
		const itemCommon = baseCommon.item || {};
		const itemData = { ...itemCommon, ...(raw.item || {}) };
		const weaponCommon = baseCommon.weapon || {};
		const weaponData = { ...weaponCommon, ...(raw.weapon || {}) };
		const ballCommon = baseCommon.ball || {};
		const ballData = { ...ballCommon, ...(raw.ball || {}) };
		const awardData = raw.award || {};
		const blockmapData = raw.blockmap || {};

		// 1. Block 定義の展開
		const blockTypes = Array.isArray(blockData.types)
			? blockData.types
			: (Array.isArray(blockCommon.types) ? blockCommon.types : []);
		const blockColor = [];
		const blockLineColor = [];
		const blockText = [];
		const blockTextColor = [];
		const blockLife = [];
		const blockThrough = [];
		const blockInfinit = [];
		const blockBreakLimit = [];
		const blockFunction = [];
		const blockKeyToId = new Map();
		const blockIdSet = new Set();

		for (let i = 0; i < blockTypes.length; i++) {
			const bt = blockTypes[i];
			const id = bt.id !== undefined ? Number(bt.id) : i;
			blockColor[id] = bt.color !== undefined ? bt.color : '';
			blockLineColor[id] = bt.lineColor !== undefined ? bt.lineColor : '';
			blockText[id] = bt.text !== undefined ? bt.text : '';
			blockTextColor[id] = bt.textColor !== undefined ? bt.textColor : '';
			blockLife[id] = bt.life !== undefined ? Number(bt.life) : 0;
			blockThrough[id] = bt.through !== undefined ? Number(bt.through) : 0;
			blockInfinit[id] = bt.infinit !== undefined ? Number(bt.infinit) : 0;
			blockBreakLimit[id] = bt.breakLimit !== undefined ? Number(bt.breakLimit) : 0;
			const rawFunc = bt.funcs !== undefined ? bt.funcs : (bt.func !== undefined ? bt.func : (bt.functions !== undefined ? bt.functions : 0));
			if (Array.isArray(rawFunc)) {
				blockFunction[id] = rawFunc.map(Number);
			} else if (typeof rawFunc === 'string' && rawFunc.includes(',')) {
				blockFunction[id] = rawFunc.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
			} else if (rawFunc !== undefined && rawFunc !== null) {
				blockFunction[id] = Number(rawFunc);
			} else {
				blockFunction[id] = 0;
			}
			blockIdSet.add(id);
			if (bt.key) {
				blockKeyToId.set(String(bt.key), id);
			}
		}

		// 2. Weapon 定義の展開
		const weaponTypes = Array.isArray(weaponData.types)
			? weaponData.types
			: (Array.isArray(weaponCommon.types) ? weaponCommon.types : []);
		const weaponSpeed = [];
		const weaponMaxNum = [];
		const weaponColor = [];
		const weaponLineColor = [];

		for (let i = 0; i < weaponTypes.length; i++) {
			const wt = weaponTypes[i];
			const id = wt.id !== undefined ? Number(wt.id) : i;
			weaponSpeed[id] = wt.speed !== undefined ? Number(wt.speed) : (def.weaponSpeed && def.weaponSpeed[i]);
			weaponMaxNum[id] = wt.maxNum !== undefined ? Number(wt.maxNum) : (def.weaponMaxNum && def.weaponMaxNum[i]);
			weaponColor[id] = wt.color !== undefined ? wt.color : (def.weaponColor && def.weaponColor[i]);
			weaponLineColor[id] = wt.lineColor !== undefined ? wt.lineColor : (def.weaponLineColor && def.weaponLineColor[i]);
		}

		// 3. Item 定義の展開
		const itemTypes = Array.isArray(itemData.types)
			? itemData.types
			: (Array.isArray(itemCommon.types) ? itemCommon.types : []);
		const baseItemColor = [];
		const baseItemTextColor = [];
		const baseItemLineColor = [];
		const baseItemText = [];
		const itemKeyToId = new Map();

		for (let i = 0; i < itemTypes.length; i++) {
			const it = itemTypes[i];
			const id = it.id !== undefined ? Number(it.id) : i;
			baseItemColor[id] = it.color !== undefined ? it.color : '';
			baseItemTextColor[id] = it.textColor !== undefined ? it.textColor : '';
			baseItemLineColor[id] = it.lineColor !== undefined ? it.lineColor : '';
			baseItemText[id] = it.text !== undefined ? it.text : '';
			if (it.key) {
				itemKeyToId.set(String(it.key), id);
			}
		}

		// 4. Award 定義のインデックス化
		const awardEntries = Array.isArray(awardData.awards) ? awardData.awards : [];
		const awardByKey = new Map();
		const awardById = new Map();
		for (let i = 0; i < awardEntries.length; i++) {
			const aw = awardEntries[i];
			const id = aw.id !== undefined ? Number(aw.id) : i;
			awardById.set(id, aw);
			if (aw.key) {
				awardByKey.set(String(aw.key), aw);
			}
		}

		// 5. Blockmap 内の Map グリッド定義の解決（Block定義のIDまたはkeyを解決して2次元配列を生成）
		const resolveGrid = (rawGrid) => {
			if (!Array.isArray(rawGrid)) return [];
			return rawGrid.map((row) => {
				if (!Array.isArray(row)) return [0];
				return row.map((cell) => {
					if (typeof cell === 'string') {
						if (blockKeyToId.has(cell)) {
							return blockKeyToId.get(cell);
						}
						const parsed = Number(cell);
						return Number.isNaN(parsed) ? 0 : parsed;
					}
					const num = Number(cell);
					if (Number.isNaN(num)) return 0;
					if (blockIdSet.size > 0 && !blockIdSet.has(num)) return 0;
					return num;
				});
			});
		};

		const mapEntries = Array.isArray(blockmapData.maps) ? blockmapData.maps : [];
		const mapByKey = new Map();
		const mapById = new Map();
		for (let i = 0; i < mapEntries.length; i++) {
			const mp = mapEntries[i];
			const id = mp.id !== undefined ? Number(mp.id) : i;
			const resolvedGrid = resolveGrid(mp.grid);
			mapById.set(id, resolvedGrid);
			if (mp.key) {
				mapByKey.set(String(mp.key), resolvedGrid);
			}
		}

		// 6. Blockmap 内の Stage 定義の解決（Map, Award, Item, Block, Weapon を組み合わせてステージデータを生成）
		const stageEntries = Array.isArray(blockmapData.stages) ? blockmapData.stages : [];
		const stageTitle = [];
		const stageLifeUp = [];
		const pointPerLife = [];
		const pointPerBall = [];
		const pointPerContBreak = [];
		const strongBallClear = [];
		const clearTimeThreashould = [];
		const pointPerClearTime = [];
		const pointPerGetItem = [];
		const pointPerFallBall = [];
		const itemSpeed = [];
		const itemProb = [];
		const itemColor = [];
		const itemTextColor = [];
		const itemLineColor = [];
		const itemText = [];
		const blockMapSet = [];
		const backGroundImage = Array.isArray(blockmapData.backGroundImage) ? [...blockmapData.backGroundImage] : [];

		const resolveStageItemProb = (probDef) => {
			if (Array.isArray(probDef)) {
				return [...probDef];
			}
			if (probDef && typeof probDef === 'object') {
				const arr = new Array(baseItemText.length).fill('0');
				for (const [k, v] of Object.entries(probDef)) {
					if (itemKeyToId.has(k)) {
						arr[itemKeyToId.get(k)] = v;
					}
				}
				return arr;
			}
			return [];
		};

		const resolveStageMap = (stageEntry, fallbackIdx) => {
			if (stageEntry && Array.isArray(stageEntry.grid)) {
				return resolveGrid(stageEntry.grid);
			}
			const mapRef = stageEntry ? stageEntry.map : undefined;
			if (typeof mapRef === 'string' && mapByKey.has(mapRef)) {
				return mapByKey.get(mapRef).map(r => [...r]);
			}
			if (typeof mapRef === 'number' && mapById.has(mapRef)) {
				return mapById.get(mapRef).map(r => [...r]);
			}
			if (mapById.has(fallbackIdx)) {
				return mapById.get(fallbackIdx).map(r => [...r]);
			}
			return [];
		};

		const resolveStageAward = (awardRef, fallbackIdx) => {
			if (typeof awardRef === 'string' && awardByKey.has(awardRef)) {
				return awardByKey.get(awardRef);
			}
			if (typeof awardRef === 'number' && awardById.has(awardRef)) {
				return awardById.get(awardRef);
			}
			return awardById.get(fallbackIdx) || {};
		};

		for (let i = 0; i < stageEntries.length; i++) {
			const st = stageEntries[i];
			stageTitle[i] = st.title !== undefined ? st.title : `Stage_${i + 1}`;
			if (st.lifeUp !== undefined) {
				stageLifeUp[i] = Number(st.lifeUp);
			}
			if (st.backGroundImage !== undefined) {
				backGroundImage[i] = st.backGroundImage;
			}

			const aw = resolveStageAward(st.award, i);
			pointPerLife[i] = aw.pointPerLife !== undefined ? Number(aw.pointPerLife) : (def.pointPerLife && def.pointPerLife[i] !== undefined ? def.pointPerLife[i] : 50);
			pointPerBall[i] = aw.pointPerBall !== undefined ? Number(aw.pointPerBall) : (def.pointPerBall && def.pointPerBall[i] !== undefined ? def.pointPerBall[i] : 100);
			pointPerContBreak[i] = aw.pointPerContBreak !== undefined ? Number(aw.pointPerContBreak) : (def.pointPerContBreak && def.pointPerContBreak[i] !== undefined ? def.pointPerContBreak[i] : 10);
			strongBallClear[i] = aw.strongBallClear !== undefined ? Number(aw.strongBallClear) : (def.strongBallClear && def.strongBallClear[i] !== undefined ? def.strongBallClear[i] : 100);
			clearTimeThreashould[i] = aw.clearTimeThreashould !== undefined ? Number(aw.clearTimeThreashould) : (def.clearTimeThreashould && def.clearTimeThreashould[i] !== undefined ? def.clearTimeThreashould[i] : 90);
			pointPerClearTime[i] = aw.pointPerClearTime !== undefined ? Number(aw.pointPerClearTime) : (def.pointPerClearTime && def.pointPerClearTime[i] !== undefined ? def.pointPerClearTime[i] : 8);
			pointPerGetItem[i] = aw.pointPerGetItem !== undefined ? Number(aw.pointPerGetItem) : (def.pointPerGetItem && def.pointPerGetItem[i] !== undefined ? def.pointPerGetItem[i] : 5);
			pointPerFallBall[i] = aw.pointPerFallBall !== undefined ? Number(aw.pointPerFallBall) : (def.pointPerFallBall && def.pointPerFallBall[i] !== undefined ? def.pointPerFallBall[i] : 30);

			itemSpeed[i] = st.itemSpeed !== undefined
				? Number(st.itemSpeed)
				: (itemData.defaultSpeed !== undefined ? Number(itemData.defaultSpeed) : (def.itemDefaultSpeed !== undefined ? Number(def.itemDefaultSpeed) : 4));
			itemColor[i] = [...baseItemColor];
			itemTextColor[i] = [...baseItemTextColor];
			itemLineColor[i] = [...baseItemLineColor];
			itemText[i] = [...baseItemText];
			itemProb[i] = resolveStageItemProb(st.itemProb);

			blockMapSet[i] = resolveStageMap(st, i);
		}

		// 追加マップ・アイテム確率定義がある場合（デバッグ用テストステージ等）の解決
		if (Array.isArray(blockmapData.extraStages)) {
			for (let i = 0; i < blockmapData.extraStages.length; i++) {
				const extra = blockmapData.extraStages[i];
				const nextIdx = stageEntries.length + i;
				if (extra.map !== undefined || Array.isArray(extra.grid)) {
					blockMapSet.push(resolveStageMap(extra, nextIdx));
				}
				if (extra.itemProb !== undefined) {
					itemProb.push(resolveStageItemProb(extra.itemProb));
				}
			}
		}

		const pick = (obj, key, fallbackKey = null) => {
			if (obj && obj[key] !== undefined) return obj[key];
			if (fallbackKey && obj && obj[fallbackKey] !== undefined) return obj[fallbackKey];
			if (fallbackKey && commonData[fallbackKey] !== undefined) return commonData[fallbackKey];
			if (commonData[key] !== undefined) return commonData[key];
			if (fallbackKey && def[fallbackKey] !== undefined) return def[fallbackKey];
			return def[key];
		};

		return {
			presetKey,
			title: blockmapData.title || PRESET_PARAM.DEFAULT_PRESET_TITLE,
			common: commonData,
			commonObjects: {
				common: commonData,
				bar: barData,
				heart: heartData,
				ball: ballData,
				weapon: weaponData,
				item: itemData,
				balloon: balloonData,
				block: blockData,
				sound: soundData,
			},
			stageObjects: {
				block: blockData,
				item: itemData,
				weapon: weaponData,
				award: awardData,
				ball: ballData,
				blockmap: blockmapData,
			},
			// common
			canvasWidth: pick(commonData, 'canvasWidth'),
			canvasHeight: pick(commonData, 'canvasHeight'),
			statusBarHeight: pick(commonData, 'statusBarHeight'),
			FPS: pick(commonData, 'FPS'),
			lowFPSAlartRatio: pick(commonData, 'lowFPSAlartRatio'),
			stepTime: pick(commonData, 'stepTime'),
			maxAccumulator: pick(commonData, 'maxAccumulator'),
			simulateMaxPredict: pick(commonData, 'simulateMaxPredict'),
			defaultLife: pick(commonData, 'defaultLife'),
			maxLife: pick(commonData, 'maxLife'),
			pointerLockSwitch: pick(commonData, 'pointerLockSwitch'),
			disturbOverlayColor: pick(commonData, 'disturbOverlayColor'),
			// heart
			heartColor: pick(heartData, 'color', 'heartColor'),
			heartWidth: pick(heartData, 'width', 'heartWidth'),
			heartHeight: pick(heartData, 'height', 'heartHeight'),
			// bar
			barDefaultWidth: pick(barData, 'defaultWidth', 'barDefaultWidth'),
			barMaxWidth: pick(barData, 'maxWidth', 'barMaxWidth'),
			barMinWidth: pick(barData, 'minWidth', 'barMinWidth'),
			barDefaultHeight: pick(barData, 'defaultHeight', 'barDefaultHeight'),
			barColor: pick(barData, 'color', 'barColor'),
			barDefaultSpeed: pick(barData, 'defaultSpeed', 'barDefaultSpeed'),
			barMinSpeed: pick(barData, 'minSpeed', 'barMinSpeed'),
			barStatusDefaultTime: pick(barData, 'statusDefaultTime', 'barStatusDefaultTime'),
			barWeaponDefaultTime: pick(barData, 'weaponDefaultTime', 'barWeaponDefaultTime'),
			barEdge: pick(barData, 'edge', 'barEdge'),
			barSpin: pick(barData, 'spin', 'barSpin'),
			barImmortalColor: pick(barData, 'immortalColor', 'barImmortalColor'),
			barDefaultHP: pick(barData, 'defaultHP', 'barDefaultHP'),
			barSpeedDownHeightRatio: pick(barData, 'speedDownHeightRatio', 'barSpeedDownHeightRatio'),
			barLongWidthRatio: pick(barData, 'longWidthRatio', 'barLongWidthRatio'),
			barShortWidthRatio: pick(barData, 'shortWidthRatio', 'barShortWidthRatio'),
			barBlinkTimeRatio: pick(barData, 'blinkTimeRatio', 'barBlinkTimeRatio'),
			barBlinkAlphaStep: pick(barData, 'blinkAlphaStep', 'barBlinkAlphaStep'),
			barBlinkAlphaMin: pick(barData, 'blinkAlphaMin', 'barBlinkAlphaMin'),
			// ball
			ballSize: pick(ballData, 'size', 'ballSize'),
			ballDefaultSpeed: pick(ballData, 'defaultSpeed', 'ballDefaultSpeed'),
			ballMaxSpeed: pick(ballData, 'maxSpeed', 'ballMaxSpeed'),
			ballColor: pick(ballData, 'color', 'ballColor'),
			ballStrongColor: pick(ballData, 'strongColor', 'ballStrongColor'),
			ballUltimateColor: pick(ballData, 'ultimateColor', 'ballUltimateColor'),
			ballMaxNum: pick(ballData, 'maxNum', 'ballMaxNum'),
			ballStatusTime: pick(ballData, 'statusTime', 'ballStatusTime'),
			ballInfBoundCancel: pick(ballData, 'infBoundCancel', 'ballInfBoundCancel'),
			ballHistMax: pick(ballData, 'histMax', 'ballHistMax'),
			ballDefaultPointIncr: pick(ballData, 'defaultPointIncr', 'ballDefaultPointIncr'),
			ballMinVyRatio: pick(ballData, 'minVyRatio', 'ballMinVyRatio'),
			ballMinVxRatio: pick(ballData, 'minVxRatio', 'ballMinVxRatio'),
			ballEdgeAccelRatio: pick(ballData, 'edgeAccelRatio', 'ballEdgeAccelRatio'),
			ballVyUpStep: pick(ballData, 'vyUpStep', 'ballVyUpStep'),
			ballVyDownStep: pick(ballData, 'vyDownStep', 'ballVyDownStep'),
			ballSpeedUpRatio: pick(ballData, 'speedUpRatio', 'ballSpeedUpRatio'),
			ballSpeedDownRatio: pick(ballData, 'speedDownRatio', 'ballSpeedDownRatio'),
			// balloon
			popBalloonBackColor: pick(balloonData, 'popBalloonBackColor'),
			popBalloonFontColor: pick(balloonData, 'popBalloonFontColor'),
			balloonDefaultWidth: pick(balloonData, 'defaultWidth', 'balloonDefaultWidth'),
			balloonDefaultHeight: pick(balloonData, 'defaultHeight', 'balloonDefaultHeight'),
			balloonDefaultAlpha: pick(balloonData, 'defaultAlpha', 'balloonDefaultAlpha'),
			balloonDefaultFontSize: pick(balloonData, 'defaultFontSize', 'balloonDefaultFontSize'),
			contBreakBalloon: balloonData.contBreakBalloon || commonData.contBreakBalloon || def.contBreakBalloon,
			damageBalloon: balloonData.damageBalloon || commonData.damageBalloon || def.damageBalloon,
			// awards
			pointPerLife,
			pointPerBall,
			pointPerContBreak,
			strongBallClear,
			clearTimeThreashould,
			pointPerClearTime,
			pointPerGetItem,
			pointPerFallBall,
			// item
			itemFontSize: itemData.fontSize !== undefined ? Number(itemData.fontSize) : def.itemFontSize,
			itemDefaultSpeed: itemData.defaultSpeed !== undefined ? Number(itemData.defaultSpeed) : def.itemDefaultSpeed,
			itemSpeed,
			itemProb,
			itemColor,
			itemTextColor,
			itemLineColor,
			itemText,
			// weapon
			weaponFireInterval: weaponData.fireInterval !== undefined ? Number(weaponData.fireInterval) : (def.weaponFireInterval !== undefined ? def.weaponFireInterval : 10),
			weaponMissileAccelRatio: weaponData.missileAccelRatio !== undefined ? Number(weaponData.missileAccelRatio) : (def.weaponMissileAccelRatio !== undefined ? def.weaponMissileAccelRatio : 1.05),
			weaponSpeed: weaponSpeed.length > 0 ? weaponSpeed : (def.weaponSpeed ? [...def.weaponSpeed] : []),
			weaponMaxNum: weaponMaxNum.length > 0 ? weaponMaxNum : (def.weaponMaxNum ? [...def.weaponMaxNum] : []),
			weaponColor: weaponColor.length > 0 ? weaponColor : (def.weaponColor ? [...def.weaponColor] : []),
			weaponLineColor: weaponLineColor.length > 0 ? weaponLineColor : (def.weaponLineColor ? [...def.weaponLineColor] : []),
			// block
			blockWidth: blockData.width !== undefined ? Number(blockData.width) : def.blockWidth,
			blockHeight: blockData.height !== undefined ? Number(blockData.height) : def.blockHeight,
			blockMotionTime: blockData.motionTime !== undefined ? Number(blockData.motionTime) : def.blockMotionTime,
			blockDefaultPoint: blockData.defaultPoint !== undefined ? Number(blockData.defaultPoint) : def.blockDefaultPoint,
			blockIncrPoint: blockData.incrPoint !== undefined ? Number(blockData.incrPoint) : def.blockIncrPoint,
			blockMoveInter: blockData.moveInter !== undefined ? Number(blockData.moveInter) : def.blockMoveInter,
			blockFontSize: blockData.fontSize !== undefined ? Number(blockData.fontSize) : def.blockFontSize,
			blockBlinkInter: blockData.blinkInter !== undefined ? Number(blockData.blinkInter) : def.blockBlinkInter,
			blockDrawingDistance: blockData.drawingDistance !== undefined ? Number(blockData.drawingDistance) : def.blockDrawingDistance,
			blockAttackInter: blockData.attackInter !== undefined ? Number(blockData.attackInter) : def.blockAttackInter,
			blockMagnetAccelBase: blockData.magnetAccelBase !== undefined ? Number(blockData.magnetAccelBase) : def.blockMagnetAccelBase,
			blockMagnetDistPow: blockData.magnetDistPow !== undefined ? Number(blockData.magnetDistPow) : def.blockMagnetDistPow,
			blockMagnetVxRatio: blockData.magnetVxRatio !== undefined ? Number(blockData.magnetVxRatio) : def.blockMagnetVxRatio,
			blockMagnetVyRelNegRatio: blockData.magnetVyRelNegRatio !== undefined ? Number(blockData.magnetVyRelNegRatio) : def.blockMagnetVyRelNegRatio,
			blockMagnetVyRelPosRatio: blockData.magnetVyRelPosRatio !== undefined ? Number(blockData.magnetVyRelPosRatio) : def.blockMagnetVyRelPosRatio,
			blockMaxDuarationLimit: blockData.maxDuarationLimit !== undefined ? Number(blockData.maxDuarationLimit) : def.blockMaxDuarationLimit,
			blockColor: blockColor.length > 0 ? blockColor : (def.blockColor ? [...def.blockColor] : []),
			blockLineColor: blockLineColor.length > 0 ? blockLineColor : (def.blockLineColor ? [...def.blockLineColor] : []),
			blockText: blockText.length > 0 ? blockText : (def.blockText ? [...def.blockText] : []),
			blockTextColor: blockTextColor.length > 0 ? blockTextColor : (def.blockTextColor ? [...def.blockTextColor] : []),
			blockLife: blockLife.length > 0 ? blockLife : (def.blockLife ? [...def.blockLife] : []),
			blockThrough: blockThrough.length > 0 ? blockThrough : (def.blockThrough ? [...def.blockThrough] : []),
			blockInfinit: blockInfinit.length > 0 ? blockInfinit : (def.blockInfinit ? [...def.blockInfinit] : []),
			blockBreakLimit: blockBreakLimit.length > 0 ? blockBreakLimit : (def.blockBreakLimit ? [...def.blockBreakLimit] : []),
			blockFunction: blockFunction.length > 0
				? blockFunction.map(f => Array.isArray(f) ? [...f] : f)
				: (def.blockFunction ? def.blockFunction.map(f => Array.isArray(f) ? [...f] : f) : []),
			// stage
			stageTitle,
			stageLifeUp,
			blockMapSet,
			backGroundImage,
			// sound
			soundBufSize: soundData.bufSize !== undefined ? Number(soundData.bufSize) : def.soundBufSize,
			soundFile: soundData.soundFile ? { ...soundData.soundFile } : (def.soundFile ? { ...def.soundFile } : {}),
		};
	}

	/**
	 * プリセット読込失敗時のフォールバックデータ生成
	 * @returns {Object}
	 */
	createFallbackPresetData() {
		const def = PresetManage._defaultPresetCache || (PresetManage._isBuildingDefault ? {} : PresetManage.getDefaultPreset());
		return {
			...def,
			presetKey: PRESET_PARAM.DEFAULT_PRESET_KEY,
			title: PRESET_PARAM.DEFAULT_PRESET_TITLE,
			common: {},
			stageObjects: {},
		};
	}

	/**
	 * 保持している現在のプリセットデータを取得
	 * @returns {Object}
	 */
	getPresetData() {
		if (!this.presetData) {
			this.initSync(this.currentPresetKey);
		}
		return this.presetData;
	}

	/**
	 * 利用可能なステージプリセット一覧を取得
	 * @returns {Array<{key: string, title: string, dir: string}>}
	 */
	getAvailablePresets() {
		const stageManifest = this.stageManifest || {};
		const presets = stageManifest.presets || {};
		return Object.entries(presets).map(([key, val]) => ({
			key,
			title: (val && val.title) || key,
			dir: (val && val.dir) || `./${key}`,
		}));
	}
}
