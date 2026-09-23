//--------------------------------------------------
// 描画イメージ
//--------------------------------------------------
function ImageData(dynamicCtx)
{
	this.imgData = new Array();
	this.dynamicCtx = dynamicCtx;


	//--------------------------------------------------
	// コンストラクタ
	//--------------------------------------------------
	// 各種の描画イメージデータ用配列を用意
	this.imgData["ball"] = new Array(												// ボール
		"normal",																	// 通常状態
		"hard",																		// 強化状態
		"hard_tail0",																// 強化状態の残像１
		"hard_tail1",																// 強化状態の残像２
		"hard_tail2",																// 強化状態の残像３
		"hard_tail3",																// 強化状態の残像４
		"fire",																		// 無敵状態
		"fire_tail0",																// 無敵状態の残像１
		"fire_tail1",																// 無敵状態の残像２
		"fire_tail2",																// 無敵状態の残像３
		"fire_tail3"																// 無敵状態の残像４
	);
	this.imgData["block"] = new Array();											// ブロック
	this.imgData["item"] = new Array();												// アイテム
	this.imgData["heart"] = new Array();											// ハート
	this.imgData["bar"] = new Array(												// バー
		"normal"																	// 通常状態
	);
	this.imgData["weapon"] = new Array();											// 武器



	//--------------------------------------------------
	// 初期化
	//--------------------------------------------------
	this.init = function()
	{
		var dynamicCtx = this.dynamicCtx;

		//----------描画イメージを取得----------
		// ボール
		var imgDataBall = this.imgData["ball"];
		for( var stat = 0; stat < 3; stat++ )
		{
			for( var i = -1; i < 4; i++ )
			{
				// 名前の決定
				var dataName = "";
				if( stat == 0 ) { dataName = "normal"; }
				else if( stat == 1 ) { dataName = "hard"; }
				else if( stat == 2 ) { dataName = "fire"; }
				if( stat > 0 && i >= 0 ) { dataName += "_tail" + String(i); }

				// イメージの取得
				var radius = ballSize * (1 - 0.08 * i);
				this.drawBall(stat, i);
				imgDataBall[dataName] = dynamicCtx.getImageData(0, 0, radius*2, radius*2);
				dynamicCtx.clearRect(0, 0, canvasWidth, canvasHeight);

				// 通常の場合は残像を作らない
				if( stat == 0 ) { break; }
			}
		}

		// ブロック
		var imgDataBlock = this.imgData["block"];
		for( var i = 0, len = blockText.length; i < len; i++ )
		{
			this.drawBlock(i);
			imgDataBlock[i] = dynamicCtx.getImageData(0.5, 0.5, blockWidth + 0.5, blockHeight + 0.5);
			dynamicCtx.clearRect(0, 0, canvasWidth, canvasHeight);
		}

		// アイテム
		var imgDataItem = this.imgData["item"];
		for( var i = 0, len = itemText[ctrl.stageIndex].length; i < len; i++ )
		{
			this.drawItem(i);
			imgDataItem[i] = dynamicCtx.getImageData(0.5, 0.5, blockWidth + 0.5, blockHeight + 0.5);
			dynamicCtx.clearRect(0, 0, canvasWidth, canvasHeight);
		}

		// ハート
		var imgDataHeart = this.imgData["heart"];
		for( var i = 0; i < 2; i++ )
		{
			this.drawHeart(i);
			imgDataHeart[i] = dynamicCtx.getImageData(0, 0, heartWidth*3.5, heartHeight*2.3);
			dynamicCtx.clearRect(0, 0, canvasWidth, canvasHeight);
		}
	}


	//--------------------------------------------------
	// 描画イメージの取得
	//--------------------------------------------------
	this.getData = function(kind, stat)
	{
		return this.imgData[kind][stat];
	}


	//--------------------------------------------------
	// 描画イメージ配列の取得
	//--------------------------------------------------
	this.getDataArr = function(kind)
	{
		return this.imgData[kind];
	}


	//--------------------------------------------------
	// ボールの描画
	//--------------------------------------------------
	this.drawBall = function(stat, i)
	{
		var dynamicCtx = this.dynamicCtx;

		// iの補正
		if( i < 0 ) { i = 0; }

		// 強化・無敵球
		if( stat != 0 )
		{
			// 球の描画
			dynamicCtx.beginPath();

			// 色の選択
			if( stat == 1 ) { dynamicCtx.fillStyle = ballStrongColor; }
			else if( stat == 2 ) { dynamicCtx.fillStyle = ballUltimateColor; }

			// 透過率，半径の決定
			dynamicCtx.globalAlpha = 1 - i * 0.2;
			var radius = ballSize * (1 - 0.08 * i);

			dynamicCtx.arc(radius, radius, radius, 0, Math.PI * 2, false);
			dynamicCtx.fill();
			dynamicCtx.globalAlpha = 1;

		// 通常弾
		} else
		{
			dynamicCtx.beginPath();
			dynamicCtx.fillStyle = ballColor;
			dynamicCtx.arc(ballSize, ballSize, ballSize, 0, Math.PI * 2, false);
			dynamicCtx.fill();
		}
	}


	//--------------------------------------------------
	// ブロックの描画
	//--------------------------------------------------
	this.drawBlock = function(_type)
	{
		var dynamicCtx = this.dynamicCtx;

		// 矩形を描画
		dynamicCtx.beginPath();
		dynamicCtx.strokeStyle = blockLineColor[_type];
		dynamicCtx.fillStyle = blockColor[_type];
		dynamicCtx.rect(0.5, 0.5, blockWidth, blockHeight);
		dynamicCtx.fill();
		dynamicCtx.stroke();

		// ブロックの文字を描画
		var text = blockText[_type];
		if( text != null )
		{
			dynamicCtx.textBaseline = 'middle';
			dynamicCtx.textAlign = 'center';
			dynamicCtx.font = blockFontSize + "px 'ＭＳ Ｐゴシック'";
			dynamicCtx.fillStyle = blockTextColor[_type];
			dynamicCtx.fillText(text, 0.5 * blockWidth, 0.5 * blockHeight, blockWidth);
		}
	}


	//--------------------------------------------------
	// アイテムの描画
	//--------------------------------------------------
	this.drawItem = function(_type)
	{
		var dynamicCtx = this.dynamicCtx;

		// 矩形を描画
		dynamicCtx.beginPath();
		dynamicCtx.strokeStyle = itemLineColor[ctrl.stageIndex][_type];
		dynamicCtx.fillStyle = itemColor[ctrl.stageIndex][_type];
		dynamicCtx.rect(0.5, 0.5, blockWidth, blockHeight);
		dynamicCtx.fill();
		dynamicCtx.stroke();

		// アイテムの文字を描画
		dynamicCtx.beginPath();
		dynamicCtx.textBaseline = 'middle';
		dynamicCtx.textAlign = 'center';
		dynamicCtx.font = itemFontSize + "px 'ＭＳ Ｐゴシック'";
		dynamicCtx.fillStyle = itemTextColor[ctrl.stageIndex][_type];
		dynamicCtx.fillText(itemText[ctrl.stageIndex][_type], 0.5 * blockWidth, 0.5 * blockHeight, blockWidth * 0.95);
	}


	//--------------------------------------------------
	// ハートの描画
	//--------------------------------------------------
	this.drawHeart = function(stat)
	{
		var dynamicCtx = this.dynamicCtx;

		// Circle
		dynamicCtx.beginPath();
		dynamicCtx.strokeStyle = heartColor;
		dynamicCtx.scale(1, 3/2);
		if( stat == 1 ) { dynamicCtx.fillStyle = heartColor; }
		else { dynamicCtx.fillStyle = '#ffffff'; }

		dynamicCtx.arc(heartWidth*1.2 - heartWidth / 2 - 0.5, heartHeight / 1.5, heartWidth / 2 + 0.5, -Math.PI * 0.01, Math.PI, true);
		dynamicCtx.arc(heartWidth*1.2 + heartWidth / 2 + 0.5, heartHeight / 1.5, heartWidth / 2 + 0.5, Math.PI, Math.PI * 0.02, false);

		dynamicCtx.fill();
		dynamicCtx.scale(1, 2/3);

		// line
		dynamicCtx.moveTo(0.5, heartHeight + 0.5);
		dynamicCtx.lineTo(heartWidth + 1, heartHeight*2 + 0.5);

		dynamicCtx.moveTo(heartWidth*2.3, heartHeight + 0.5);
		dynamicCtx.lineTo(heartWidth*1.1, heartHeight*2 + 1.5);
		dynamicCtx.stroke();

		// fill
		dynamicCtx.beginPath();
		if( stat == 1 ) { dynamicCtx.strokeStyle = heartColor; }
		else { dynamicCtx.strokeStyle = '#ffffff'; }
		for( var i = heartHeight - 0.5; i < heartHeight*2; i += 1 )
		{
			dynamicCtx.moveTo(-heartWidth / heartHeight * ( i - heartHeight - heartWidth ) + heartWidth + 3, i);
			dynamicCtx.lineTo(heartWidth / heartHeight * ( i - heartHeight - heartWidth ) + heartWidth - 0.5, i);
			dynamicCtx.closePath();
		}
		dynamicCtx.stroke();
	}
}

export default ImageData;
