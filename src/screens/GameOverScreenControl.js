// src/screens/GameOverScreenControl.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import StageClearScreenControl from "./StageClearScreenControl.js";

export default class GameOverScreenControl extends StageClearScreenControl {
	constructor(screenManage, screenId = 'screen_gameOver') {
		super(screenManage, screenId);
	}
}

