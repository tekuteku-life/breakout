//--------------------------------------------------
// ボール (Main Thread - View)
//--------------------------------------------------
export default class BallView {
	constructor(initialState, imgDataArr) {
		this.imgData = imgDataArr;
		this.updateState(initialState);
	}

	updateState(state) {
		this.radius = state.radius;
		this.x = state.x;
		this.y = state.y;
		this.status = state.status;
		this.statusTime = state.statusTime;
		this.histX = state.histX || [];
		this.histY = state.histY || [];
        this.color = state.color;
        this.strongColor = state.strongColor;
        this.ultimateColor = state.ultimateColor;
        this.ballStatusTime = state.ballStatusTime;
	}

	getCenterX() { return this.x; }
	getCenterY() { return this.y; }

	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	draw(ctx) {
		// 色の選択
        // (Assuming BALL_STATUS.NORMAL = 0, STRONG = 1, ULTIMATE = 2 are mapped via state.color/strongColor etc)
		if( this.status == 0 /* NORMAL */ ) { ctx.fillStyle = this.color; }
		else if( this.status == 1 /* STRONG */ ) { ctx.fillStyle = this.strongColor; }
		else if( this.status == 2 /* ULTIMATE */ ) { ctx.fillStyle = this.ultimateColor; }

		// 強化・無敵球の残像
		if( this.status != 0 )
		{
			// 球の描画
			ctx.beginPath();

			// 残像の描画
			var scale = this.statusTime / this.ballStatusTime / /* FPS */ 60 + 0.25;
			var len = (this.histX.length < 4 ? this.histX.length : 4) * (scale > 1 ? 1 : scale);
			for( var i = 0; i < len; i++ )
			{
				var radius = this.radius * (1 - 0.08 * i);
				ctx.globalAlpha = 1 - i * 0.2;
				ctx.arc(this.histX[i], this.histY[i], radius, Math.PI * 2, false);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
		}

		// 球の描画
		ctx.beginPath();
		ctx.arc(this.getCenterX(), this.getCenterY(), this.radius, 0, Math.PI * 2, false);
		ctx.fill();
	}
}
