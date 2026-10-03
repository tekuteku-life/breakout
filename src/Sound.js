//--------------------------------------------------
// 効果音
//--------------------------------------------------
class Sound
{
	constructor()
	{
		this.soundKeys = new Array('bomb', 'block', 'spBlock', 'bar', 'fall', 'wall', 'warp', 'clear', 'gun', 'missile', 'plusItem', 'minusItem', 'touchButton', 'game_over');
		this.soundObj = new Array();
		this.soundTurn = new Array();

		// 音源の準備
		this.bufSize = ballMaxNum * 4;
		if( this.bufSize > 10 ) { this.bufSize = 10; }
		for( var i = 0, len = this.soundKeys.length; i < len; i++ ) {
			var key = this.soundKeys[i];
			if( soundFile[key] ) {
				this.soundTurn[key] = 0;
				this.soundObj[key] = new Array();

				// ロード
				for( var j = 0; j < this.bufSize; j++ ) {
					this.soundObj[key][j] = new Audio(soundFile[key]);
					this.soundObj[key][j].load();
				}
			}
		}
	}

	destructor()
	{
		for( var key in this.soundObj ) {
			if( this.soundObj[key] ) {
				for( var j = 0; j < this.soundObj[key].length; j++ ) {
					if( this.soundObj[key][j] ) {
						this.soundObj[key][j].pause();
					}
				}
			}
		}
	}


	//--------------------------------------------------
	// 再生
	//--------------------------------------------------
	play(key)
	{
		if( ctrl.soundSwitch == 1 && this.soundObj[key] != null ) {
			var turn = this.soundTurn[key];

			// 再生
			this.soundObj[key][turn].play();

			// 順序の計算
			this.soundTurn[key] = (turn + 1) % this.bufSize;
		}
	}
}

export default Sound;
