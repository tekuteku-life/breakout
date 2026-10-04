import { DEFAULT_CONFIG } from "./const.js";

//--------------------------------------------------
// 雲
//--------------------------------------------------
export default function Cloud(dynamicCtx, x, y)
{
	const bWidth = DEFAULT_CONFIG.blockWidth;
	const bHeight = DEFAULT_CONFIG.blockHeight;
	var NumX = 10;
	var NumY = 8;
	var Size = 6;

	for( var i = 0; i < NumX; i++ )
	{
		for( var j = 0; j < NumY; j++ )
		{
			var cloudX = x + (bWidth / NumX) * i + Math.random() * bWidth * 0.7;
			var cloudY = y + (bHeight / NumY) * j + Math.random() * bHeight * 0.7;
			dynamicCtx.beginPath();
			dynamicCtx.fillStyle = 'rgb(' + Number( ~~(Math.random() * 185) + 70 ) + ', 0, 0)';
			var rSize = Size * (Math.random() * 0.7 + 0.8);
			dynamicCtx.rect(cloudX - rSize, cloudY - rSize, rSize, rSize);
			dynamicCtx.fill();
		}
	}
}

