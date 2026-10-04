// src/screens/RecordScreenControl.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import ScreenControl from "./ScreenControl.js";
import MessageBox from "../MessageBox.js";
import { AWARD_KEY_LIST } from "../const.js";

export default class RecordScreenControl extends ScreenControl {
	constructor(screenManage, screenId = 'screen_record', storage = null, scoreMng = null) {
		super(screenManage, screenId);
		this.storage = storage;
		this.scoreMng = scoreMng;
		this.recordTypeTitle = ["Best", "Average", "Worst"];
		this.recordTypeCtrl = ["best", "ave", "worst"];
	}

	getStorage() {
		if (this.storage) return this.storage;
		if (this.screenManage && this.screenManage.game && this.screenManage.game.storage) return this.screenManage.game.storage;
		return null;
	}

	getScoreMng() {
		if (this.scoreMng) return this.scoreMng;
		if (this.screenManage && this.screenManage.game && this.screenManage.game.scoreMng) return this.screenManage.game.scoreMng;
		return null;
	}

	printRecordScreen(recordType = null, recordStage = null) {
		this.render(recordType, recordStage);
	}

	render(recordType = null, recordStage = null) {
		const storage = this.getStorage();
		if (!storage) return;

		const typeElem = document.getElementById('record_type');
		const stageElem = document.getElementById('record_stage');

		if (recordType === null && recordStage === null) {
			recordType = typeElem ? typeElem.selectedIndex : 0;
			recordStage = stageElem ? stageElem.selectedIndex : 0;
		} else {
			if (recordType === null) recordType = typeElem ? typeElem.selectedIndex : 0;
			if (recordStage === null) recordStage = stageElem ? stageElem.selectedIndex : 0;
		}

		if (recordType < 0) recordType = 0;
		if (recordStage < 0) recordStage = 0;

		const stageTitles = (this.screenManage && this.screenManage.game && this.screenManage.game.stageTitle) || [];
		const stageNameRaw = stageTitles[recordStage] || 'Stage_' + (recordStage + 1);
		const stageName = String(stageNameRaw).replace(/_/g, '__');
		const typePrefix = this.recordTypeCtrl[recordType] || 'best';

		const record = {};
		const keyList = AWARD_KEY_LIST;
		for (let i = 0; i < keyList.length; i++) {
			const awardKey = keyList[i];
			const safeKey = awardKey.replace(/_/g, '__');
			const recordKey = `record_${typePrefix}_${stageName}_${safeKey}`;
			record[awardKey] = storage.getItem(recordKey) !== null ? storage.getItem(recordKey) : 0;
		}
		record.stageScore = storage.getItem(`record_${typePrefix}_${stageName}_stageScore`) || 0;
		record.playNum = storage.getItem(`record_${stageName}_playNum`) || 0;
		record.clearNum = storage.getItem(`record_${stageName}_clearNum`) || 0;

		let clearRatio = 0;
		if (Number(record.playNum) > 0) {
			clearRatio = Math.floor(Number(record.clearNum) / Number(record.playNum) * 10000) / 100;
		}

		let screenData = String(this.screenManage.getScreenData('screen_record'));
		screenData = screenData.replace('<!--play_num-->', record.playNum);
		screenData = screenData.replace('<!--clear_num-->', record.clearNum);
		screenData = screenData.replace('<!--clear_ratio-->', clearRatio);
		screenData = screenData.replace('<!--remainder_life_num-->', record.remainderLife);
		screenData = screenData.replace('<!--ball_number_num-->', record.ballNum);
		screenData = screenData.replace('<!--strengthened_clear_num-->', record.strengClear);
		screenData = screenData.replace('<!--continuous_break_number_num-->', record.continuousBreakNum);
		screenData = screenData.replace('<!--continuous_break_clear_num-->', record.continuousBreakClear);
		screenData = screenData.replace('<!--clear_time_num-->', record.clearTime);
		screenData = screenData.replace('<!--get_item_number_num-->', record.getItemNum);
		screenData = screenData.replace('<!--fall_ball_number_num-->', record.fallBallNum);
		screenData = screenData.replace('<!--stageScor-->', record.stageScore);

		this.screenManage.replaceScreenData('screen_record', screenData);

		this.setupSelectors(recordType, recordStage, stageTitles);
		this.setupButtons();
	}

	setupSelectors(recordType, recordStage, stageTitles) {
		const stageSelector = document.getElementById('record_stage');
		if (stageSelector) {
			while (stageSelector.firstChild) {
				stageSelector.removeChild(stageSelector.firstChild);
			}
			for (let i = 0; i < stageTitles.length; i++) {
				const option = document.createElement('option');
				option.value = i;
				option.innerHTML = stageTitles[i];
				if (recordStage === i) option.selected = 'selected';
				stageSelector.appendChild(option);
			}
			stageSelector.onchange = () => {
				this.render(recordType, stageSelector.selectedIndex);
				stageSelector.focus();
			};
		}

		const typeSelector = document.getElementById('record_type');
		if (typeSelector) {
			while (typeSelector.firstChild) {
				typeSelector.removeChild(typeSelector.firstChild);
			}
			for (let i = 0; i < this.recordTypeTitle.length; i++) {
				const option = document.createElement('option');
				option.value = i;
				option.innerHTML = this.recordTypeTitle[i];
				if (recordType === i) option.selected = 'selected';
				typeSelector.appendChild(option);
			}
			typeSelector.onchange = () => {
				this.render(typeSelector.selectedIndex, recordStage);
			};
		}
	}

	setupButtons() {
		const resetButton = document.getElementById('reset_record');
		if (resetButton) {
			resetButton.onclick = () => {
				const scoreMng = this.getScoreMng();
				const msgBox = new MessageBox(
					"プレイ成績をすべて削除します。よろしいですか？",
					true,
					() => {
						if (msgBox.value && scoreMng) {
							scoreMng.deleteRecord();
						}
						return 0;
					}
				);
			};
		}

		const reloadButton = document.getElementById('reload_record');
		if (reloadButton) {
			reloadButton.onclick = () => {
				this.render(null, null);
			};
		}
	}

	destructor() {
		const resetButton = document.getElementById('reset_record');
		if (resetButton) resetButton.onclick = null;
		const reloadButton = document.getElementById('reload_record');
		if (reloadButton) reloadButton.onclick = null;
		const stageSelector = document.getElementById('record_stage');
		if (stageSelector) stageSelector.onchange = null;
		const typeSelector = document.getElementById('record_type');
		if (typeSelector) typeSelector.onchange = null;
		this.storage = null;
		this.scoreMng = null;
		super.destructor();
	}
}

