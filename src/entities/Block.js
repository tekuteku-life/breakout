//--------------------------------------------------
// ブロック (Main Thread - View)
//--------------------------------------------------
export default class BlockView {
	constructor(initialState, imgData) {
		this.imgData = imgData;
		this.updateState(initialState);
	}

	updateState(state) {
		this.width = state.width;
		this.height = state.height;
		this.x = state.x;
		this.y = state.y;
		this.type = state.type;
		this.func = state.func;
		this.text = state.text;
		this.life = state.life;
		this.exploded = state.exploded;
        this.maxLife = state.maxLife; // We need to know blockLife[type]
        this.fontSize = state.fontSize;
        this.textColor = state.textColor;
	}

	getCenterX() { return this.x + this.width * 0.5; }
	getCenterY() { return this.y + this.height * 0.5; }

	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	draw(ctx) {
		// ブロックを描画
		if (this.imgData) {
			ctx.putImageData(this.imgData, this.x - 0.5, this.y - 0.5);
		}

		// ブロックの文字を描画
		var text = this.text;
		if( text != null )
		{
			ctx.textBaseline = 'middle';
			ctx.textAlign = 'center';
			ctx.font = this.fontSize + "px 'ＭＳ Ｐゴシック'";
			ctx.fillStyle = this.textColor;
			ctx.fillText(text, this.getCenterX() - 0.5, this.getCenterY() - 0.5, this.width);
		}

		// 耐久性を透過率で表現
		if( this.life < this.maxLife )
		{
			ctx.globalAlpha = ( this.life + 1 ) / ( this.maxLife + 1 );
			ctx.beginPath();
			ctx.strokeStyle = "#ffffff";
			ctx.fillStyle = "#ffffff";
			ctx.rect(this.x - 0.5, this.y - 0.5, this.width, this.height);
			ctx.fill();
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}

	clear(ctx) {
		ctx.clearRect(this.x - 0.5, this.y - 0.5, this.width, this.height);
	}
}
