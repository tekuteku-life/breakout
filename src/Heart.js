//--------------------------------------------------
// ハート
//--------------------------------------------------
function Heart(x, y, fill)
{
	this.x = x;
	this.y = y;
	this.imgData = imgData.getData("heart", fill);


	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	this.draw = function(dynamicCtx)
	{
		dynamicCtx.putImageData(this.imgData, this.x - heartWidth, this.y - heartHeight);
	}
}

export default Heart;
