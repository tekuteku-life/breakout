//--------------------------------------------------
// 武器 (Main Thread - View)
//--------------------------------------------------
export default class WeaponView {
	constructor(initialState, imgDataArr) {
		this.imgData = imgDataArr;
		this.updateState(initialState);
	}

	updateState(state) {
		this.type = state.type;
		this.x = state.x;
		this.y = state.y;
		this.width = state.width;
		this.height = state.height;
	}

	getCenterX() { return this.x; }
	getCenterY() { return this.y; }

	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	draw(ctx) {
        let drawType = this.type;
        if (drawType === -1) { drawType = 3; } // Example mapping for enemy weapon

        if (this.imgData && this.imgData[drawType - 1]) {
		    ctx.putImageData(this.imgData[drawType - 1], this.x - this.width / 2, this.y - this.height / 2);
        }
	}
}
