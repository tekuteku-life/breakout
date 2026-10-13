// src/screens/ItemScreenControl.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import ScreenControl from "./ScreenControl.js";
import PresetManage from "../PresetManage.js";
import ImageData from "../ImageData.js";

export default class ItemScreenControl extends ScreenControl {
	constructor(screenManage, screenId = 'screen_item') {
		super(screenManage, screenId);
		this._fallbackImageData = null;
	}

	getGame() {
		return (this.screenManage && this.screenManage.game) || null;
	}

	getImageData() {
		const game = this.getGame();
		if (game && game.imgData) {
			return game.imgData;
		}
		if (!this._fallbackImageData) {
			this._fallbackImageData = new ImageData(null, game);
			const preset = this.preset || (game && game.preset) || null;
			if (preset) {
				this._fallbackImageData.applyPreset(preset);
			}
		}
		return this._fallbackImageData;
	}

	applyPreset(preset = null) {
		super.applyPreset(preset);
		if (this._fallbackImageData) {
			this._fallbackImageData.applyPreset(this.preset);
		}
		this.renderPreviews();
	}

	onOpen() {
		this.renderPreviews();
	}

	renderPreviews() {
		const screen = this.getElement();
		if (!screen) { return; }

		let canvases = [];
		if (typeof screen.getElementsByTagName === 'function') {
			canvases = screen.getElementsByTagName('canvas');
		} else if (typeof screen.querySelectorAll === 'function') {
			canvases = screen.querySelectorAll('canvas');
		}

		const imgData = this.getImageData();
		const def = PresetManage.getDefaultPreset();
		const preset = this.preset || (this.getGame() && this.getGame().preset) || def;
		const blockWidth = preset.blockWidth !== undefined ? preset.blockWidth : def.blockWidth;
		const blockHeight = preset.blockHeight !== undefined ? preset.blockHeight : def.blockHeight;

		for (let i = 0; i < canvases.length; i++) {
			const canvas = canvases[i];
			if (!canvas || typeof canvas.getContext !== 'function') { continue; }
			const itemTypeAttr = typeof canvas.getAttribute === 'function' ? canvas.getAttribute('data-item-type') : null;
			if (itemTypeAttr === null || itemTypeAttr === undefined) { continue; }

			const type = Number(itemTypeAttr);
			if (isNaN(type)) { continue; }

			const ctx = canvas.getContext('2d');
			if (!ctx) { continue; }

			canvas.width = blockWidth;
			canvas.height = blockHeight;
			if (typeof ctx.clearRect === 'function') {
				ctx.clearRect(0, 0, blockWidth, blockHeight);
			}

			if (imgData && typeof imgData.drawItem === 'function') {
				imgData.drawItem(type, ctx);
			}
		}
	}

	destructor() {
		if (this._fallbackImageData && typeof this._fallbackImageData.destructor === 'function') {
			this._fallbackImageData.destructor();
		}
		this._fallbackImageData = null;
		super.destructor();
	}
}

