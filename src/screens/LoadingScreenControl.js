// src/screens/LoadingScreenControl.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import ScreenControl from "./ScreenControl.js";

export default class LoadingScreenControl extends ScreenControl {
	constructor(screenManage, screenId = 'screen_loading') {
		super(screenManage, screenId);
		this.progressText = null;
		this.message = '';
	}

	onOpen() {
		this.bindElements();
		this.reset();
	}

	bindElements() {
		if (typeof document === 'undefined') return;
		this.progressText = document.getElementById('loading_progress_text');
	}

	reset() {
		this.setMessage('Initializing...');
	}

	setMessage(text) {
		this.message = text || '';
		if (!this.progressText) {
			this.bindElements();
		}
		if (this.progressText) {
			this.progressText.textContent = this.message;
		}
	}

	onClose() {
		this.message = '';
	}

	destructor() {
		super.destructor();
		this.progressText = null;
		this.message = '';
	}
}
