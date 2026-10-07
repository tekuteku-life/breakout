// src/screens/StartScreenControl.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import ScreenControl from "./ScreenControl.js";
import EventBus from "../EventBus.js";

export default class StartScreenControl extends ScreenControl {
	constructor(screenManage, screenId = 'screen_start') {
		super(screenManage, screenId);
	}

	setupButtonSounds() {
		if (typeof document === 'undefined') return;
		const screenStock = document.getElementById('screenStock');
		if (!screenStock) return;
		const anchors = screenStock.getElementsByTagName('a');
		for (let i = 0, len = anchors.length; i < len; i++) {
			const anc = anchors[i];
			if (anc.className === 'barButton') {
				anc.onmouseover = () => {
					EventBus.emitEvent('sound:play', 'touchButton');
				};
			}
		}
	}
}

