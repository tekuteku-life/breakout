// test/helpers/setupEnv.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import GameManage from '../../src/GameManage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Mock DOM Node
export class MockElement {
	constructor(tagName = 'div', id = '') {
		this.tagName = tagName.toUpperCase();
		this.id = id;
		this.className = '';
		this.style = {};
		this.children = [];
		this.childNodes = this.children;
		this.parentNode = null;
		this.innerHTML = '';
		this.value = '';
		this.type = '';
		this.width = 0;
		this.height = 0;
		this.offsetWidth = 100;
		this.offsetHeight = 50;
		this.offsetTop = 0;
		this.offsetLeft = 0;
		this.attributes = {};
		this.selected = '';
		this.selectedIndex = 0;
		this.src = '';
		this.onload = null;
		this.onclick = null;
		this.onchange = null;
		this.onmouseover = null;
		this.onmousedown = null;
		this.onmouseup = null;
		this.ontouchstart = null;
		this.ontouchend = null;
		this.ontouchmove = null;
	}

	get firstChild() {
		return this.children[0] || null;
	}

	appendChild(child) {
		if (!child) return null;
		if (child.parentNode) {
			child.parentNode.removeChild(child);
		}
		child.parentNode = this;
		this.children.push(child);
		return child;
	}

	removeChild(child) {
		const index = this.children.indexOf(child);
		if (index >= 0) {
			this.children.splice(index, 1);
			child.parentNode = null;
			return child;
		}
		return null;
	}

	getElementsByTagName(tagName) {
		const result = [];
		const target = tagName.toUpperCase();
		const walk = (node) => {
			for (const c of node.children) {
				if (target === '*' || c.tagName === target) {
					result.push(c);
				}
				walk(c);
			}
		};
		walk(this);
		return result;
	}

	setAttribute(name, val) {
		this.attributes[name] = String(val);
		if (name === 'id') this.id = val;
		if (name === 'class') this.className = val;
	}

	getAttribute(name) {
		return this.attributes[name] || null;
	}

	focus() {}

	getContext(type) {
		if (type === '2d') {
			if (!this._ctx) {
				this._ctx = createMock2DContext(this);
			}
			return this._ctx;
		}
		return null;
	}
}

export function createMock2DContext(canvas) {
	return {
		canvas: canvas || null,
		fillStyle: '#000000',
		strokeStyle: '#000000',
		globalAlpha: 1,
		font: '10px sans-serif',
		textBaseline: 'alphabetic',
		textAlign: 'start',
		clearRect: () => {},
		beginPath: () => {},
		closePath: () => {},
		arc: () => {},
		rect: () => {},
		fillRect: () => {},
		fill: () => {},
		stroke: () => {},
		moveTo: () => {},
		lineTo: () => {},
		fillText: () => {},
		scale: () => {},
		putImageData: () => {},
		getImageData: (x, y, w, h) => {
			const width = Math.max(1, Math.round(w || 1));
			const height = Math.max(1, Math.round(h || 1));
			return {
				width,
				height,
				data: new Uint8ClampedArray(width * height * 4),
			};
		},
	};
}

export class MockStorage {
	constructor() {
		this.store = new Map();
	}
	get length() {
		return this.store.size;
	}
	getItem(key) {
		return this.store.has(String(key)) ? this.store.get(String(key)) : null;
	}
	setItem(key, val) {
		this.store.set(String(key), String(val));
	}
	removeItem(key) {
		this.store.delete(String(key));
	}
	clear() {
		this.store.clear();
	}
	key(idx) {
		const keys = Array.from(this.store.keys());
		return keys[idx] !== undefined ? keys[idx] : null;
	}
}

export class MockAudio {
	constructor(src) {
		this.src = src;
		this.played = false;
		this.loaded = false;
		this.paused = false;
	}
	load() {
		this.loaded = true;
	}
	play() {
		this.played = true;
		this.paused = false;
	}
	pause() {
		this.paused = true;
	}
}

export class MockXHR {
	constructor() {
		this.readyState = 0;
		this.status = 0;
		this.responseText = 'window.updateVersion = { breakout: "v1.8.0" };';
		this.onreadystatechange = null;
	}
	overrideMimeType(mime) {}
	open(method, url) {
		this.method = method;
		this.url = url;
		this.readyState = 1;
	}
	send() {
		this.readyState = 4;
		this.status = 200;
		this.responseText = 'window.updateVersion = { breakout: "v1.8.0" };';
		queueMicrotask(() => {
			if (this.onreadystatechange) {
				this.onreadystatechange();
			}
		});
	}
}

const sharedStorage = new MockStorage();

let animFrameCallbacks = [];
let nextFrameId = 1;

globalThis.requestAnimationFrame = function (cb) {
	const id = nextFrameId++;
	animFrameCallbacks.push({ id, cb });
	return id;
};

globalThis.cancelAnimationFrame = function (id) {
	animFrameCallbacks = animFrameCallbacks.filter(item => item.id !== id);
};

const origSetInterval = globalThis.setInterval;
globalThis.setInterval = function (fn, ms, ...args) {
	globalThis._lastIntervalFn = fn;
	return origSetInterval(fn, ms, ...args);
};

globalThis.gameLoopTick = function (timestamp = Date.now()) {
	if (typeof globalThis._lastIntervalFn === 'function') {
		globalThis._lastIntervalFn();
	}
	const current = [...animFrameCallbacks];
	animFrameCallbacks = [];
	for (const item of current) {
		item.cb(timestamp);
	}
};

export function setupEnvironment() {
	const elementsById = new Map();

	function getOrCreate(id, tag = 'div') {
		if (!elementsById.has(id)) {
			const el = new MockElement(tag, id);
			elementsById.set(id, el);
		}
		return elementsById.get(id);
	}

	const body = new MockElement('body');
	const head = new MockElement('head');
	const setupScript = getOrCreate('setup', 'script');
	head.appendChild(setupScript);

	const screenStock = getOrCreate('screenStock', 'div');
	body.appendChild(screenStock);

	// Load screens from index.html
	globalThis.screenData = new Array();
	const htmlPath = path.join(rootDir, 'index.html');
	const indexHtml = fs.readFileSync(htmlPath, 'utf8');
	const screenRegex = new RegExp('<div id="(screen_[a-zA-Z0-9_]+)"[^>]*>([\\s\\S]*?)<\\/div>\\s*(?=<div id="screen_|<\\/div>\\s*<\\/body>)', 'g');
	let m;
	while ((m = screenRegex.exec(indexHtml)) !== null) {
		const screenId = m[1];
		const innerContent = m[2];
		const sc = getOrCreate(screenId, 'div');
		sc.innerHTML = innerContent;
		screenStock.appendChild(sc);
	}

	// Add anchors with class barButton for screenStock
	for (let i = 0; i < 5; i++) {
		const a = new MockElement('a');
		a.className = 'barButton';
		screenStock.appendChild(a);
	}

	// Canvas and display elements
	getOrCreate('static', 'canvas');
	getOrCreate('dynamic', 'canvas');
	getOrCreate('canvas_background', 'div');
	getOrCreate('play_info', 'div');
	getOrCreate('debug_info', 'div');

	// Record elements
	getOrCreate('record_type', 'select');
	getOrCreate('record_stage', 'select');
	getOrCreate('reload_record', 'input');
	getOrCreate('reset_record', 'input');

	// Setting select elements
	const selectIds = [
		'setup_select',
		'stage_select',
		'continue_select',
		'sound_select',
		'sizefit_select',
		'ctrl_select',
	];
	for (const selId of selectIds) {
		const sel = getOrCreate(selId, 'select');
		for (let o = 0; o < 25; o++) {
			const opt = new MockElement('option');
			opt.value = String(o);
			sel.appendChild(opt);
		}
	}

	const mockDocument = {
		body,
		head,
		documentElement: { clientWidth: 800, clientHeight: 600 },
		all: null,
		getElementById: (id) => {
			let found = null;
			const search = (node) => {
				if (!node || found) return;
				if (node.id === id) {
					found = node;
					return;
				}
				for (const child of node.children) {
					search(child);
				}
			};
			search(head);
			search(body);
			return found || elementsById.get(id) || null;
		},
		getElementsByTagName: (tag) => {
			const target = tag.toUpperCase();
			if (target === 'BODY') return [body];
			if (target === 'HEAD') return [head];
			const all = [];
			for (const el of elementsById.values()) {
				if (el.tagName === target) all.push(el);
			}
			return all;
		},
		createElement: (tag) => {
			const el = new MockElement(tag);
			return el;
		},
		onkeydown: null,
		onkeyup: null,
	};

	sharedStorage.clear();

	// Inject globals
	globalThis.window = globalThis;
	globalThis.document = mockDocument;
	globalThis.localStorage = sharedStorage;
	globalThis.storage = sharedStorage;
	globalThis.Audio = MockAudio;
	globalThis.XMLHttpRequest = MockXHR;
	globalThis.alert = (msg) => {
		globalThis.__lastAlert = msg;
	};

	// Load setup/default.js constants
	const defaultJsPath = path.join(rootDir, 'setup/default.js');
	const defaultJs = fs.readFileSync(defaultJsPath, 'utf8');
	eval.call(globalThis, defaultJs);

	// Ensure Array prototype extensions exist
	if (!Array.prototype.copy) {
		Array.prototype.copy = function () {
			const obj = [];
			for (let i = 0; i < this.length; i++) {
				if (this[i] && typeof this[i].copy === 'function') {
					obj[i] = this[i].copy();
				} else {
					obj[i] = this[i];
				}
			}
			return obj;
		};
	}

	globalThis.dynamicCanvas = getOrCreate('dynamic', 'canvas');
	globalThis.staticCanvas = getOrCreate('static', 'canvas');
	globalThis.dynamicCtx = globalThis.dynamicCanvas.getContext('2d');
	globalThis.staticCtx = globalThis.staticCanvas.getContext('2d');
	globalThis.balls = [];
	globalThis.items = [];
	globalThis.balloons = [];
	globalThis.weapons = [];
	globalThis.blockMap = [];
	globalThis.pointX = globalThis.canvasWidth / 2;
	globalThis.pointY = 0;
	if (!globalThis.simulateReset) {
		globalThis.simulateReset = () => {};
	}

	globalThis.awardKeyList = [
		'remainderLife',
		'ballNum',
		'strengClear',
		'continuousBreakNum',
		'continuousBreakClear',
		'clearTime',
		'getItemNum',
		'fallBallNum',
	];

	globalThis.ctrl = {
		stageIndex: 0,
		soundSwitch: 1,
		pauseSwitch: 0,
		autoSwitch: 0,
		sizeFitSwitch: 0,
		scale: 1,
		pauseSwitchOn: function () {
			this.pauseSwitch = 1;
		},
		pauseSwitchOff: function () {
			this.pauseSwitch = 0;
		},
		pauseSwitchToggle: function () {
			this.pauseSwitch = this.pauseSwitch === 0 ? 1 : 0;
		},
		stageEnded: 0,
		setStageIndex: function (idx) {
			this.stageIndex = idx;
		},
		forwardStageIndex: function () {
			this.stageIndex++;
			const blockMapSet = (globalThis.gameManage && globalThis.gameManage.blockMapSet) || globalThis.blockMapSet || [];
			if (blockMapSet.length > 0 && this.stageIndex >= blockMapSet.length) {
				this.stageIndex = 0;
				this.stageEnded = 1;
			}
		},
		recordStageIndex: function (idx = this.stageIndex) {},
		fixSize: () => {},
	};

	globalThis.sounds = {
		play: () => {},
	};

	globalThis.imgData = {
		ball: [],
		block: [],
		item: [],
		heart: [],
		drawBall: () => {},
		drawBlock: () => {},
		drawItem: () => {},
		drawHeart: () => {},
	};

	globalThis.statusMng = {
		life: 3,
		addLife: (n) => {
			globalThis.statusMng.life += n;
		},
		isAlive: () => globalThis.statusMng.life > 0,
		getPlaySecTime: () => '10.0',
		getPlayMinTime: () => '1',
		countBlockNum: () => {},
		blockNum: 10,
	};

	globalThis.scoreMng = {
		score: 0,
		awardNum: {
			getItemNum: 0,
			fallBallNum: 0,
			strengClear: 0,
			continuousBreakNum: 0,
			continuousBreakClear: 0,
		},
		awardPt: {},
		calculateAwardPoint: () => {},
		recordScore: () => {},
		deleteRecord: () => {
			for (let i = 0; i < sharedStorage.length; i++) {
				const key = sharedStorage.key(i);
				if (String(key).indexOf('record_') >= 0) {
					sharedStorage.removeItem(key);
					i--;
				}
			}
		},
		init: () => {},
	};

	globalThis.bar = {
		x: globalThis.canvasWidth / 2,
		y: 500,
		vx: 0,
		width: 80,
		height: 7,
		hitPoint: 5,
		weapon: 0,
		weaponTime: 0,
		weaponInter: 0,
		widthStatusTime: 0,
		speedStatusTime: 0,
		vibrationTime: 0,
		absorptionStatusTime: 0,
		immortalStatusTime: 0,
		disturbStatusTime: 0,
		color: '#114400',
		getLeftX: function () {
			return this.x - this.width * 0.5;
		},
		getCenterX: function () {
			return this.x;
		},
		getRightX: function () {
			return this.x + this.width * 0.5;
		},
		getTopY: function () {
			return this.y;
		},
		getCenterY: function () {
			return this.y + this.height * 0.5;
		},
		getBottomY: function () {
			return this.y + this.height;
		},
		endamage: (d) => {},
	};

	// テスト環境用のGameManageインスタンス生成（ブラウザのwindow.onloadに相当）
	const gm = new GameManage();
	globalThis.eventBus = gm.eventBus;
	globalThis.gameManage = gm;
	globalThis.window.gameManage = gm;
	globalThis.window.screenManage = gm.screenManage;
	globalThis.window.inputManage = gm.inputManage;
	globalThis.window.eventBus = gm.eventBus;

	gm.storage = sharedStorage;
	gm.ctrl = globalThis.ctrl;
	gm.statusMng = globalThis.statusMng;
	gm.scoreMng = globalThis.scoreMng;
	gm.sounds = globalThis.sounds;
	gm.bar = globalThis.bar;
	gm.weapons = globalThis.weapons;
	gm.items = globalThis.items;
	gm.balls = globalThis.balls;
	gm.balloons = globalThis.balloons;
	gm.blockMap = globalThis.blockMap;
	gm.loadSetupVariables(globalThis);
	if (gm.screenManage && typeof gm.screenManage.printRecordScreen === 'function') {
		gm.screenManage.printRecordScreen(0, 0);
	}

	return {
		document: mockDocument,
		storage: sharedStorage,
		elementsById,
		gameManage: gm,
	};
}

// Auto-run on module import so window/document exist before static imports
setupEnvironment();
