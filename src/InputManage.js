// src/InputManage.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import MessageBox from "./MessageBox.js";
import { DEFAULT_CONFIG } from "./const.js";
import EventBus from "./EventBus.js";

//--------------------------------------------------
// 入力管理クラス
//--------------------------------------------------
export default class InputManage {
	constructor(game = null) {
		this.game = game;
		this.pointX = 375;
		this.pointY = 0;
		this.mouseDownTime = 0;
		this.keyPressIncr = 0;
		this.keyStr = '';
		this.keyCode = '';
		this.boundHandlers = {};

		// EventBusへの入力制御リスナーの登録
		this.onSetPointXHandler = (x) => {
			this.pointX = x;
		};
		this.onSetMouseDownTimeHandler = (time) => {
			this.mouseDownTime = time;
		};
		EventBus.addOnEvent('input:setPointX', this.onSetPointXHandler);
		EventBus.addOnEvent('input:setMouseDownTime', this.onSetMouseDownTimeHandler);
	}

	destructor() {
		this.unbind();
		if (this.onSetPointXHandler) EventBus.removeOnEvent('input:setPointX', this.onSetPointXHandler);
		if (this.onSetMouseDownTimeHandler) EventBus.removeOnEvent('input:setMouseDownTime', this.onSetMouseDownTimeHandler);
		this.onSetPointXHandler = null;
		this.onSetMouseDownTimeHandler = null;
		this.game = null;
		this.boundHandlers = {};
	}

	getCtrl() {
		return (this.game && this.game.ctrl) || null;
	}

	getObjectManage() {
		return (this.game && this.game.objectManage) || null;
	}

	getBar() {
		const om = this.getObjectManage();
		return om ? om.bar : null;
	}

	getBalls() {
		const om = this.getObjectManage();
		return om ? om.balls : [];
	}

	getWeapons() {
		const om = this.getObjectManage();
		return om ? om.weapons : [];
	}

	getStatusMng() {
		return (this.game && this.game.statusMng) || null;
	}

	getCanvasWidth() {
		return (this.game && this.game.canvasWidth) || DEFAULT_CONFIG.canvasWidth;
	}

	getCanvasHeight() {
		return (this.game && this.game.canvasHeight) || DEFAULT_CONFIG.canvasHeight;
	}

	bind(canvas, doc = null, win = null) {
		this.unbind();

		const targetDoc = doc || (typeof document !== 'undefined' ? document : null);
		const targetWin = win || (typeof window !== 'undefined' ? window : null);
		const targetCanvas = canvas || (targetDoc ? targetDoc.getElementById('dynamic') : null);

		if (!targetCanvas && !targetDoc && !targetWin) return;

		this.boundCanvas = targetCanvas;
		this.boundDoc = targetDoc;
		this.boundWin = targetWin;

		// マウス移動
		if (targetWin && targetCanvas) {
			const onMouseMove = (event) => {
				const g = this.game;
				const scale = (g && g.ctrl) ? g.ctrl.scale : ((targetWin.ctrl) ? targetWin.ctrl.scale : 1);
				this.getMouseMove(event, targetCanvas, 0, scale);
			};
			targetWin.onmousemove = onMouseMove;
			this.boundHandlers.winMouseMove = onMouseMove;
		}

		// マウスダウン
		if (targetCanvas) {
			const onMouseDown = (e) => {
				this.handlePointerDown(0);
			};
			targetCanvas.onmousedown = onMouseDown;
			this.boundHandlers.canvasMouseDown = onMouseDown;

			const onMouseUp = (e) => {
				this.handlePointerUp(e ? e.button : 0);
			};
			targetCanvas.onmouseup = onMouseUp;
			this.boundHandlers.canvasMouseUp = onMouseUp;
		}

		// コンテキストメニュー、クリック、リサイズ
		if (targetWin) {
			targetWin.onclick = () => {};
			this.boundHandlers.winClick = targetWin.onclick;

			targetWin.onresize = () => {
				const g = this.game;
				const ctrl = g ? g.ctrl : targetWin.ctrl;
				if (ctrl && typeof ctrl.fixSize === 'function') ctrl.fixSize();
			};
			this.boundHandlers.winResize = targetWin.onresize;

			const onContextMenu = () => {
				EventBus.emitEvent('control:togglePause');
				return false;
			};
			targetWin.oncontextmenu = onContextMenu;
			this.boundHandlers.winContextMenu = onContextMenu;
		}

		// タッチ操作
		if (targetWin && targetCanvas) {
			const onTouchMove = (event) => {
				const g = this.game;
				const scale = (g && g.ctrl) ? g.ctrl.scale : ((targetWin.ctrl) ? targetWin.ctrl.scale : 1);
				this.getMouseMove(event, targetCanvas, 1, scale);
				if (event && typeof event.preventDefault === 'function') {
					event.preventDefault();
				}
			};
			targetWin.ontouchmove = onTouchMove;
			this.boundHandlers.winTouchMove = onTouchMove;

			const onTouchStart = (event) => {
				if (event && event.touches) {
					if (event.touches.length === 2) {
						EventBus.emitEvent('control:toggleAuto');
						return;
					} else if (event.touches.length === 3) {
						EventBus.emitEvent('control:togglePause');
						return;
					}
				}
				this.handlePointerDown(0);
				if (event && typeof event.preventDefault === 'function') {
					event.preventDefault();
				}
			};
			targetCanvas.ontouchstart = onTouchStart;
			this.boundHandlers.canvasTouchStart = onTouchStart;

			const onTouchEnd = (event) => {
				this.handlePointerUp(0);
				if (event && typeof event.preventDefault === 'function') {
					event.preventDefault();
				}
			};
			targetCanvas.ontouchend = onTouchEnd;
			this.boundHandlers.canvasTouchEnd = onTouchEnd;
		}

		// キーボード操作
		if (targetDoc) {
			const onKeyDown = (e) => {
				this.getKeyPress(e, 'down');
			};
			const onKeyUp = (e) => {
				this.getKeyPress(e, 'up');
			};
			targetDoc.onkeydown = onKeyDown;
			targetDoc.onkeyup = onKeyUp;
			this.boundHandlers.docKeyDown = onKeyDown;
			this.boundHandlers.docKeyUp = onKeyUp;
		}
	}

	unbind() {
		if (this.boundWin) {
			if (this.boundWin.onmousemove === this.boundHandlers.winMouseMove) this.boundWin.onmousemove = null;
			if (this.boundWin.ontouchmove === this.boundHandlers.winTouchMove) this.boundWin.ontouchmove = null;
			if (this.boundWin.oncontextmenu === this.boundHandlers.winContextMenu) this.boundWin.oncontextmenu = null;
		}
		if (this.boundCanvas) {
			if (this.boundCanvas.onmousedown === this.boundHandlers.canvasMouseDown) this.boundCanvas.onmousedown = null;
			if (this.boundCanvas.onmouseup === this.boundHandlers.canvasMouseUp) this.boundCanvas.onmouseup = null;
			if (this.boundCanvas.ontouchstart === this.boundHandlers.canvasTouchStart) this.boundCanvas.ontouchstart = null;
			if (this.boundCanvas.ontouchend === this.boundHandlers.canvasTouchEnd) this.boundCanvas.ontouchend = null;
		}
		if (this.boundDoc) {
			if (this.boundDoc.onkeydown === this.boundHandlers.docKeyDown) this.boundDoc.onkeydown = null;
			if (this.boundDoc.onkeyup === this.boundHandlers.docKeyUp) this.boundDoc.onkeyup = null;
		}
		this.boundHandlers = {};
		this.boundCanvas = null;
		this.boundDoc = null;
		this.boundWin = null;
	}

	handlePointerDown(button = 0) {
		const g = this.game;
		const ctrl = this.getCtrl();
		const bar = this.getBar();
		const weapons = this.getWeapons();
		const weaponMaxNum = (g && g.weaponMaxNum) || [3, 2];

		if (ctrl && ctrl.ctrlSwitch == 0) {
			this.mouseDownTime = Date.now();
			EventBus.emitEvent('input:mouseDownTime', this.mouseDownTime);
			EventBus.emitEvent('input:pointerDown', { button, mouseDownTime: this.mouseDownTime });
		}

		// 武器の発射（EventBus経由で通知）
		if (bar && bar.weapon != 0 && weapons && weapons.length < weaponMaxNum[bar.weapon - 1] && bar.weaponInter <= 0) {
			EventBus.emitEvent('weapon:spawn', {
				type: bar.weapon,
				x: bar.getCenterX()
			});
		}
	}

	handlePointerUp(button = 0) {
		const ctrl = this.getCtrl();
		const bar = this.getBar();
		const balls = this.getBalls();
		const statusMng = this.getStatusMng();

		const isAlive = statusMng ? (typeof statusMng.isAlive === 'function' ? statusMng.isAlive() : statusMng.life > 0) : true;
		const mdTime = this.mouseDownTime;

		// 発射制御（EventBus経由で通知）
		if (ctrl && ctrl.ctrlSwitch == 0 && button != 2 && balls && balls.length == 0 && isAlive && mdTime != 0) {
			EventBus.emitEvent('ball:launch', { mouseDownTime: mdTime });
			this.mouseDownTime = 0;
			EventBus.emitEvent('input:mouseDownTime', 0);
			EventBus.emitEvent('input:pointerUp', { button });
		}

		// 吸着状態からの再発射（EventBus経由で通知）
		if (bar && bar.absorptionNum > 0) {
			EventBus.emitEvent('bar:relaunch');
		}
	}

	getMouseMove(event, canvas, touch, scale) {
		const ctrl = this.getCtrl();
		if (ctrl && (ctrl.autoSwitch == 1 || ctrl.ctrlSwitch == 1)) {
			return;
		}

		const c = canvas || (typeof document !== 'undefined' ? document.getElementById('dynamic') : null);
		if (!c) return;

		const cWidth = this.getCanvasWidth();
		const cHeight = this.getCanvasHeight();
		const sc = Number(scale) || 1;

		if (event != null) {
			if (touch == 0) {
				this.pointX = (event.pageX !== undefined ? event.pageX : (event.offsetX || 0)) - (c.offsetLeft || 0);
				this.pointY = (event.pageY !== undefined ? event.pageY : (event.offsetY || 0)) - (c.offsetTop || 0);
			} else if (event.touches && event.touches[0]) {
				this.pointX = event.touches[0].pageX - (c.offsetLeft || 0);
				this.pointY = event.touches[0].pageY - (c.offsetTop || 0);
			}
		} else {
			this.pointX = event.offsetX - (c.offsetLeft || 0);
			this.pointY = event.offsetY - (c.offsetTop || 0);
		}

		// 座標修正
		const offW = c.offsetWidth || cWidth;
		const offH = c.offsetHeight || cHeight;
		this.pointX *= (cWidth / offW) / sc;
		this.pointY *= (cHeight / offH) / sc;

		// EventBusへの入力通知
		EventBus.emitEvent('input:pointX', this.pointX);
		EventBus.emitEvent('input:pointY', this.pointY);
		EventBus.emitEvent('input:mouseMove', {
			pointX: this.pointX,
			pointY: this.pointY,
			touch,
			scale: sc,
		});
	}

	getKeyPress(e, action) {
		let keyHist = "";
		const prevCode = (this.keyCode !== null && this.keyCode !== "") ? this.keyCode : null;
		if (prevCode != null && prevCode !== "" && action === "up") {
			keyHist = prevCode;
		}

		const evt = e || {};
		this.keyCode = evt.keyCode || evt.which;

		// 全角入力への対処
		if (this.keyCode != 244 && keyHist == 229) {
			new MessageBox("全角入力では利用できません。<br>半角入力にしてください。", false, null);
			return 0;
		}

		const code = this.keyCode;
		if (code == 32 || code == 53 || code == 101) this.keyStr = 'Launch';
		else if (code == 83 || code == 49 || code == 97) this.keyStr = 'Sound';
		else if (code == 90 || code == 56 || code == 104) this.keyStr = 'Auto';
		else if (code == 67 || code == 57 || code == 105) this.keyStr = 'Ctrl';
		else if (code == 80 || code == 48 || code == 96) this.keyStr = 'Pause';
		else if (code == 76 || code == 54 || code == 102) this.keyStr = 'Right';
		else if (code == 65 || code == 52 || code == 100) this.keyStr = 'Left';
		else if (code == 70 || code == 55 || code == 103) this.keyStr = 'sizeFit';
		else if (code == 85) this.keyStr = 'nextStage';
		else if (code == 82) this.keyStr = 'prevStage';
		else this.keyStr = '';

		const g = this.game;
		const ctrl = this.getCtrl();
		if (this.keyStr !== '' &&
			(this.keyStr !== 'Auto' && this.keyStr !== 'Ctrl' && this.keyStr !== 'Pause' && this.keyStr !== 'Sound' && this.keyStr !== 'sizeFit' && this.keyStr !== 'nextStage' && this.keyStr !== 'prevStage') &&
			ctrl && (ctrl.autoSwitch == 1 || ctrl.ctrlSwitch == 0)) {
			this.keyStr = '';
		}

		// EventBusへの入力値通知
		EventBus.emitEvent('input:keyCode', this.keyCode);
		EventBus.emitEvent('input:keyStr', this.keyStr);
		EventBus.emitEvent('input:keyPress', {
			keyCode: this.keyCode,
			keyStr: this.keyStr,
			keyPressIncr: this.keyPressIncr,
			action,
		});

		// 処理の実行
		if (this.keyStr === 'Launch') {
			if (action === 'down') {
				this.mouseDownTime = Date.now();
				EventBus.emitEvent('input:mouseDownTime', this.mouseDownTime);
			} else {
				const balls = this.getBalls();
				const statusMng = this.getStatusMng();
				const isAlive = statusMng ? (typeof statusMng.isAlive === 'function' ? statusMng.isAlive() : statusMng.life > 0) : true;
				const bar = this.getBar();
				const weapons = this.getWeapons();
				const weaponMaxNum = (g && g.weaponMaxNum) || [3, 2];

				if (balls.length === 0 && isAlive && this.mouseDownTime !== 0) {
					EventBus.emitEvent('ball:launch', { mouseDownTime: this.mouseDownTime });
					this.mouseDownTime = 0;
					EventBus.emitEvent('input:mouseDownTime', 0);
				} else if (bar && bar.weapon != 0 && weapons.length < weaponMaxNum[bar.weapon - 1] && bar.weaponInter <= 0) {
					EventBus.emitEvent('weapon:spawn', {
						type: bar.weapon,
						x: bar.getCenterX()
					});
				}
			}
		} else if (this.keyStr === 'Pause') {
			if (action === 'up') {
				EventBus.emitEvent('control:togglePause');
			}
		} else if (this.keyStr === 'Sound') {
			if (action === 'up') {
				EventBus.emitEvent('control:toggleSound');
			}
		} else if (this.keyStr === 'Auto') {
			if (action === 'up') {
				EventBus.emitEvent('control:toggleAuto');
			}
		} else if (this.keyStr === 'Ctrl') {
			if (action === 'up') {
				EventBus.emitEvent('control:toggleCtrl');
			}
		} else if (this.keyStr === 'sizeFit') {
			if (action === 'up') {
				EventBus.emitEvent('control:toggleSizeFit');
			}
		} else if (this.keyStr === 'Right') {
			if (action === 'up') {
				this.keyStr = '';
			} else {
				this.keyPressIncr = 5;
				EventBus.emitEvent('input:keyPressIncr', this.keyPressIncr);
			}
		} else if (this.keyStr === 'Left') {
			if (action === 'up') {
				this.keyStr = '';
			} else {
				this.keyPressIncr = 5;
				EventBus.emitEvent('input:keyPressIncr', this.keyPressIncr);
			}
		} else if (this.keyStr === 'nextStage') {
			if (action === 'down') {
				EventBus.emitEvent('control:forwardStage');
			} else {
				this.keyStr = '';
			}
		} else if (this.keyStr === 'prevStage') {
			if (action === 'down') {
				EventBus.emitEvent('control:backwardStage');
			} else {
				this.keyStr = '';
			}
		}
	}

	updateKeyboardBarMove(canvasWidth) {
		const ctrl = this.getCtrl();
		if (!ctrl || ctrl.autoSwitch != 0 || ctrl.ctrlSwitch != 1) { return; }

		const cWidth = canvasWidth || this.getCanvasWidth();
		if (this.keyStr === 'Right') {
			this.pointX += this.keyPressIncr;
			this.keyPressIncr *= 1.2;
		} else if (this.keyStr === 'Left') {
			this.pointX -= this.keyPressIncr;
			this.keyPressIncr *= 1.2;
		}

		if (this.pointX < 0) this.pointX = 0;
		else if (this.pointX > cWidth) this.pointX = cWidth;

		EventBus.emitEvent('input:pointX', this.pointX);
		EventBus.emitEvent('input:keyPressIncr', this.keyPressIncr);
	}
}
