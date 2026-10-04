// src/screens/SettingScreenControl.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import ScreenControl from "./ScreenControl.js";
import { DEFAULT_CONFIG } from "../const.js";

export default class SettingScreenControl extends ScreenControl {
	constructor(screenManage, screenId = 'screen_setting', ctrl = null, storage = null, gameManage = null) {
		super(screenManage, screenId);
		this.ctrl = ctrl;
		this.storage = storage;
		this.gameManage = gameManage;
	}

	getEventBus() {
		return (this.gameManage && this.gameManage.eventBus) || (this.screenManage && this.screenManage.game && this.screenManage.game.eventBus) || null;
	}

	getCtrl() {
		if (this.ctrl) return this.ctrl;
		if (this.gameManage && this.gameManage.ctrl) return this.gameManage.ctrl;
		if (this.screenManage && this.screenManage.game && this.screenManage.game.ctrl) return this.screenManage.game.ctrl;
		return null;
	}

	getStorage() {
		if (this.storage) return this.storage;
		if (this.gameManage && this.gameManage.storage) return this.gameManage.storage;
		if (this.screenManage && this.screenManage.game && this.screenManage.game.storage) return this.screenManage.game.storage;
		return null;
	}

	bindControls() {
		const ctrl = this.getCtrl();
		const storage = this.getStorage();
		if (!ctrl || !ctrl.formSelector) return;

		// セッティングセレクタのセット
		if (ctrl.formSelector["setting"]) {
			ctrl.formSelector["setting"].onchange = (e) => {
				const val = e ? e.target.value : ctrl.formSelector["setting"].value;
				this.getEventBus()?.emitEvent('setting:change', val);
			};
		}

		// ステージセレクタのセット
		if (ctrl.formSelector["stage"]) {
			const stageTitles = (this.gameManage && this.gameManage.stageTitle) || (this.screenManage && this.screenManage.game && this.screenManage.game.stageTitle) || [];
			const stageSel = ctrl.formSelector["stage"];
			while (stageSel.firstChild) {
				stageSel.removeChild(stageSel.firstChild);
			}
			for (let i = 0, len = stageTitles.length; i < len; i++) {
				const option = document.createElement('option');
				option.value = i;
				option.innerHTML = stageTitles[i];
				if (ctrl.stageIndex === i) option.selected = 'selected';
				stageSel.appendChild(option);
			}
			stageSel.onchange = () => {
				ctrl.setStageIndex(stageSel.value);
				if (storage != null) {
					ctrl.recordStageIndex();
					const defLife = (this.gameManage && this.gameManage.defaultLife) || (this.screenManage && this.screenManage.game && this.screenManage.game.defaultLife) || DEFAULT_CONFIG.defaultLife;
					storage.setItem("continue_life", defLife);
					storage.setItem("continue_time", 0);
					storage.setItem("continue_score", 0);
				}
				this.getEventBus()?.emitEvent('game:init', stageSel.value);
			};
		}

		// 画面調整セレクタのセット
		if (ctrl.formSelector["sizefit"]) {
			const sfSel = ctrl.formSelector["sizefit"];
			while (sfSel.firstChild) {
				sfSel.removeChild(sfSel.firstChild);
			}
			for (let i = 0; i < 2; i++) {
				const option = document.createElement('option');
				option.value = i;
				option.innerHTML = i === 0 ? 'OFF' : 'ON';
				if (ctrl.sizeFitSwitch == i) option.selected = 'selected';
				sfSel.appendChild(option);
			}
			sfSel.onchange = () => {
				ctrl.sizeFitSwitch = sfSel.value;
				if (storage != null) ctrl.recordSizeFitSwitch();
				ctrl.fixSize();
			};
		}

		// 音セレクタのセット
		if (ctrl.formSelector["sound"]) {
			const sndSel = ctrl.formSelector["sound"];
			while (sndSel.firstChild) {
				sndSel.removeChild(sndSel.firstChild);
			}
			for (let i = 0; i < 2; i++) {
				const option = document.createElement('option');
				option.value = i;
				option.innerHTML = i === 0 ? 'OFF' : 'ON';
				if (ctrl.soundSwitch == i) option.selected = 'selected';
				sndSel.appendChild(option);
			}
			sndSel.onchange = () => {
				ctrl.soundSwitch = sndSel.value;
				if (storage != null) ctrl.recordSoundSwitch();
			};
		}

		// ゲーム開始位置セレクタのセット
		if (ctrl.formSelector["continue"]) {
			const cntSel = ctrl.formSelector["continue"];
			while (cntSel.firstChild) {
				cntSel.removeChild(cntSel.firstChild);
			}
			for (let i = 0; i < 2; i++) {
				const option = document.createElement('option');
				option.value = i;
				option.innerHTML = i === 0 ? 'New' : 'Continue';
				if (ctrl.continueSwitch == i) option.selected = 'selected';
				cntSel.appendChild(option);
			}
			cntSel.onchange = () => {
				ctrl.continueSwitch = cntSel.value;
				if (storage != null) ctrl.recordContinueSwitch();
			};
		}

		// 操作方法セレクタのセット
		if (ctrl.formSelector["ctrl"]) {
			const cSel = ctrl.formSelector["ctrl"];
			while (cSel.firstChild) {
				cSel.removeChild(cSel.firstChild);
			}
			for (let i = 0; i < 2; i++) {
				const option = document.createElement('option');
				option.value = i;
				option.innerHTML = i === 0 ? 'Mouse' : 'Keyboard';
				if (ctrl.ctrlSwitch == i) option.selected = 'selected';
				cSel.appendChild(option);
			}
			cSel.onchange = () => {
				ctrl.ctrlSwitch = cSel.value;
				if (storage != null) ctrl.recordCtrlSwitch();
			};
		}
	}

	destructor() {
		const ctrl = this.getCtrl();
		if (ctrl && ctrl.formSelector) {
			for (const key of Object.keys(ctrl.formSelector)) {
				if (ctrl.formSelector[key]) {
					ctrl.formSelector[key].onchange = null;
				}
			}
		}
		this.ctrl = null;
		this.storage = null;
		this.gameManage = null;
		super.destructor();
	}
}

