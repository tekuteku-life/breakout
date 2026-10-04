// src/screens/ScreenControl.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

export default class ScreenControl {
	constructor(screenManage, screenId) {
		this.screenManage = screenManage;
		this.screenId = screenId;
	}

	getElement() {
		if (typeof document === 'undefined') return null;
		return document.getElementById(this.screenId);
	}

	onOpen() {}

	onClose() {}

	destructor() {
		this.screenManage = null;
	}
}

