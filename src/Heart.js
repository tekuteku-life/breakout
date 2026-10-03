//--------------------------------------------------
// ハート
//--------------------------------------------------
class Heart
{
	constructor(x, y, fill)
	{
		this.x = x;
		this.y = y;
		this.imgData = imgData.getData("heart", fill);
	}

	destructor()
	{
	}


	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	draw(dynamicCtx)
	{
		dynamicCtx.putImageData(this.imgData, this.x - heartWidth, this.y - heartHeight);
	}
}

export default Heart;
