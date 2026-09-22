//--------------------------------------------------
// ポップアップバルーン
//--------------------------------------------------
function Balloon(text, x, y, width, height, step, bcolor, fcolor, fsize)
{
	this.arcPos = new Array();
	this.arcNumX = 5;
	this.arcNumY = 3;
	this.arcSize = width / this.arcNumX * 1.8;
	this.x = x;
	this.y = y;
	this.boxWidth = width;
	this.boxHeight = height;
	this.text = text;
	this.alpha = 1;
	this.decrStep = step;
	this.endFlag = 0;
	this.backColor = bcolor;
	this.fontColor = fcolor;
	this.fontSize = fsize;

	// モコモコ位置の決定
	for( var i = 1; i <= this.arcNumX; i++ ) {
		for( var j = 1; j <= this.arcNumY; j++ ) {
			this.arcPos[this.arcPos.length] = new Array(
				i * this.boxWidth / this.arcNumX * (0.85 + 0.15 * Math.random()),
				j * this.boxHeight / this.arcNumY * (0.85 + 0.15 * Math.random())
			);
		}
	}


	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	this.draw = function(dynamicCtx)
	{
		// 実行判定
		if( this.endFlag ) { return; }

		// 四角とモコモコ
		dynamicCtx.beginPath();
		dynamicCtx.globalAlpha = this.alpha;
		dynamicCtx.fillStyle = this.backColor;
		dynamicCtx.rect(~~(x), ~~(y), this.boxWidth, this.boxHeight);
		for( var i = 0, len = this.arcNumX * this.arcNumY; i < len; i++ ) {
			dynamicCtx.arc(this.x + this.arcPos[i][0], this.y + this.arcPos[i][1], this.arcSize, 0, 2 * Math.PI, false);
		}
		dynamicCtx.fill();

		// 文字
		dynamicCtx.fillStyle = this.fontColor;
		dynamicCtx.font = this.fontSize + "px 'ＭＳ Ｐゴシック', 'Osaka'";
		dynamicCtx.textBaseline = "middle";
		dynamicCtx.textAlign = "center";
		dynamicCtx.fillText(this.text, this.x + this.boxWidth / 2, this.y + this.boxHeight / 2, this.boxWidth);
		dynamicCtx.globalAlpha = 1;

		// 透明度の増加
		this.alpha -= (1 + this.decrStep - this.alpha) * this.decrStep;

		// 終了判定
		if( this.alpha < 0 ) { this.endFlag = 1; }
	}
}

export default Balloon;
