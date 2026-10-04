// src/screens/AboutScreenControl.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import ScreenControl from "./ScreenControl.js";
import MessageBox from "../MessageBox.js";
import { APP_VER, APP_ID } from "../const.js";

export default class AboutScreenControl extends ScreenControl {
	constructor(screenManage, screenId = 'screen_about') {
		super(screenManage, screenId);
		this.appVer = APP_VER;
		this.appId = APP_ID;
	}

	render(updateVer = null) {
		let screenData = String(this.screenManage.getScreenData('screen_about'));
		screenData = screenData.replace('<!--version-->', this.appVer);
		if (updateVer !== null) {
			screenData = screenData.replace('<!--last_version-->', updateVer);
		}
		this.screenManage.replaceScreenData('screen_about', screenData);
	}

	versionCheck() {
		const updateURI = "http://xxxxx.xxx/widget/updates.js";
		let updateVer = this.appVer;

		let xhr = null;
		if (typeof XMLHttpRequest !== 'undefined') {
			xhr = new XMLHttpRequest();
			if (typeof xhr.overrideMimeType === 'function') {
				xhr.overrideMimeType('text/xml');
			}
		}

		if (xhr !== null) {
			xhr.open("GET", updateURI, true);
			xhr.onreadystatechange = () => {
				if (xhr.readyState === 4) {
					if (xhr.status === 200 || xhr.status === 201) {
						try {
							eval(xhr.responseText);
						} catch (e) {}

						const uvMap = (this.screenManage && this.screenManage.game && this.screenManage.game.updateVersion) || {};
						updateVer = uvMap[this.appId];
						const curV = parseFloat(String(this.appVer).replace(/^v/, '')) || 0;
						const newV = parseFloat(String(updateVer).replace(/^v/, '')) || 0;
						if (updateVer != null && (Number(this.appVer) < Number(updateVer) || curV < newV)) {
							new MessageBox(
								"更新バージョンがリリースされています。<br><br>" + "現行Version: " + this.appVer + "<br>" + "最新Version: " + updateVer,
								false,
								null
							);

							let screenData = String(this.screenManage.getScreenData('screen_about'));
							screenData = screenData.replace('<!--version-->', this.appVer);
							screenData = screenData.replace('<!--last_version-->', updateVer);
							this.screenManage.replaceScreenData('screen_about', screenData);
						}
					}
				}
			};
			xhr.send();
		}

		let screenData = String(this.screenManage.getScreenData('screen_about'));
		screenData = screenData.replace('<!--version-->', this.appVer);
		screenData = screenData.replace('<!--last_version-->', updateVer);
		this.screenManage.replaceScreenData('screen_about', screenData);
	}
}

