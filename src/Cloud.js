//--------------------------------------------------
// 雲
//--------------------------------------------------
function Cloud(dynamicCtx, x, y)
{
	var NumX = 10;
	var NumY = 8;
	var Size = 6;

	for( var i = 0; i < NumX; i++ )
	{
		for( var j = 0; j < NumY; j++ )
		{
			var cloudX = x + (blockWidth / NumX) * i + Math.random() * blockWidth * 0.7;
			var cloudY = y + (blockHeight / NumY) * j + Math.random() * blockHeight * 0.7;
			dynamicCtx.beginPath();
			dynamicCtx.fillStyle = 'rgb(' + Number( ~~(Math.random() * 185) + 70 ) + ', 0, 0)';
			var rSize = Size * (Math.random() * 0.7 + 0.8);
			dynamicCtx.rect(cloudX - rSize, cloudY - rSize, rSize, rSize);
			dynamicCtx.fill();
		}
	}
}

export default Cloud;
