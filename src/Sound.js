// src/Sound.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import { DEFAULT_CONFIG } from "./const.js";

//--------------------------------------------------
// 効果音
//--------------------------------------------------
export default class Sound
{
	constructor(game = null)
	{
		this.game = game;
		this.soundKeys = new Array('bomb', 'block', 'spBlock', 'bar', 'fall', 'wall', 'warp', 'clear', 'gun', 'missile', 'plusItem', 'minusItem', 'touchButton', 'game_over');
		this.soundObj = new Array();
		this.soundTurn = new Array();

		const ballMaxNum = (this.game && this.game.ballMaxNum !== undefined) ? this.game.ballMaxNum : DEFAULT_CONFIG.ballMaxNum;
		const soundFiles = (this.game && this.game.soundFile) || DEFAULT_CONFIG.soundFile || {};

		// 音源の準備
		this.bufSize = ballMaxNum * 4;
		if( this.bufSize > 10 ) { this.bufSize = 10; }
		const AudioCtor = typeof Audio !== 'undefined' ? Audio : null;
		for( var i = 0, len = this.soundKeys.length; i < len; i++ ) {
			var key = this.soundKeys[i];
			if( soundFiles[key] ) {
				this.soundTurn[key] = 0;
				this.soundObj[key] = new Array();

				// ロード
				for( var j = 0; j < this.bufSize; j++ ) {
					if (AudioCtor) {
						this.soundObj[key][j] = new AudioCtor(soundFiles[key]);
						if (typeof this.soundObj[key][j].load === 'function') {
							this.soundObj[key][j].load();
						}
					}
				}
			}
		}
	}

	destructor()
	{
		for( var key in this.soundObj ) {
			if( this.soundObj[key] ) {
				for( var j = 0; j < this.soundObj[key].length; j++ ) {
					if( this.soundObj[key][j] && typeof this.soundObj[key][j].pause === 'function' ) {
						this.soundObj[key][j].pause();
					}
				}
			}
		}
		this.game = null;
	}


	//--------------------------------------------------
	// 再生
	//--------------------------------------------------
	play(key)
	{
		const ctrl = (this.game && this.game.ctrl) || null;
		if( ctrl && ctrl.soundSwitch == 1 && this.soundObj[key] != null ) {
			var turn = this.soundTurn[key];

			// 再生
			if (this.soundObj[key][turn] && typeof this.soundObj[key][turn].play === 'function') {
				this.soundObj[key][turn].play();
			}

			// 順序の計算
			this.soundTurn[key] = (turn + 1) % this.bufSize;
		}
	}
}

