//--------------------------------------------------
// アイテム (Main Thread - View)
//--------------------------------------------------
export default class ItemView {
	constructor(initialState, imgDataArr) {
		this.imgData = imgDataArr;
		this.updateState(initialState);
	}

	updateState(state) {
		this.x = state.x;
		this.y = state.y;
		this.type = state.type;
		this.width = state.width;
		this.height = state.height;
	}

	getCenterX() { return this.x; }
	getCenterY() { return this.y; }

	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	draw(ctx) {
		var imgType = this.type;
		if( imgType >= 100 ) { imgType = 14; } // (Assuming 100 was SCORE_ITEM offset etc)

        if (this.imgData && this.imgData[imgType]) {
		    ctx.putImageData(this.imgData[imgType], this.x - this.width / 2, this.y - this.height / 2);
        }
	}
}
