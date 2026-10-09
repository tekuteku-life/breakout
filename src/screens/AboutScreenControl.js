// src/screens/AboutScreenControl.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import ScreenControl from "./ScreenControl.js";

export default class AboutScreenControl extends ScreenControl {
	constructor(screenManage, screenId = 'screen_about') {
		super(screenManage, screenId);
	}

	render(updateVer = null) {
		let screenData = String(this.screenManage.getScreenData('screen_about'));
		this.screenManage.replaceScreenData('screen_about', screenData);
	}
}

