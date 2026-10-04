// src/screens/StageClearScreenControl.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import ScreenControl from "./ScreenControl.js";

export default class StageClearScreenControl extends ScreenControl {
	constructor(screenManage, screenId = 'screen_stageClear') {
		super(screenManage, screenId);
	}

	render(stats = {}) {
		let screenData = String(this.screenManage.getScreenData(this.screenId));
		if (stats.stageTitle !== undefined) {
			screenData = screenData.replace('<!--stage_title-->', stats.stageTitle);
		}
		if (stats.awardPt && stats.awardNum) {
			screenData = screenData.replace('<!--remainder_life_pt-->', stats.awardPt.remainderLife || 0);
			screenData = screenData.replace('<!--remainder_life_num-->', stats.awardNum.remainderLife || 0);
			screenData = screenData.replace('<!--ball_number_pt-->', stats.awardPt.ballNum || 0);
			screenData = screenData.replace('<!--ball_number_num-->', stats.awardNum.ballNum || 0);
			screenData = screenData.replace('<!--strengthened_clear_pt-->', stats.awardPt.strengClear || 0);
			screenData = screenData.replace('<!--strengthened_clear_num-->', stats.awardNum.strengClear || 0);
			screenData = screenData.replace('<!--continuous_break_number_pt-->', stats.awardPt.continuousBreakNum || 0);
			screenData = screenData.replace('<!--continuous_break_number_num-->', stats.awardNum.continuousBreakNum || 0);
			screenData = screenData.replace('<!--continuous_break_clear_pt-->', stats.awardPt.continuousBreakClear || 0);
			screenData = screenData.replace('<!--continuous_break_clear_num-->', stats.awardNum.continuousBreakClear || 0);
			screenData = screenData.replace('<!--clear_time_pt-->', stats.awardPt.clearTime || 0);
			screenData = screenData.replace('<!--clear_time_num-->', stats.awardNum.clearTime || 0);
			screenData = screenData.replace('<!--get_item_number_pt-->', stats.awardPt.getItemNum || 0);
			screenData = screenData.replace('<!--get_item_number_num-->', stats.awardNum.getItemNum || 0);
			screenData = screenData.replace('<!--fall_ball_number_pt-->', stats.awardPt.fallBallNum || 0);
			screenData = screenData.replace('<!--fall_ball_number_num-->', stats.awardNum.fallBallNum || 0);
		}
		if (stats.sumPoint !== undefined) {
			screenData = screenData.replace('<!--sum_point-->', stats.sumPoint);
		}
		if (stats.score !== undefined) {
			screenData = screenData.replace('<!--point-->', stats.score);
		}

		this.screenManage.replaceScreenData(this.screenId, screenData);
	}
}

