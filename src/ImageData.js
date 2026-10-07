// src/ImageData.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import { DEFAULT_CONFIG } from "./const.js";

//--------------------------------------------------
// 描画イメージ
//--------------------------------------------------
export default class ImageData
{
	constructor(dynamicCtx, game = null)
	{
		this.game = game;
		this.imgData = new Array();
		this.dynamicCtx = dynamicCtx;

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
	}

	destructor()
	{
		this.imgData = new Array();
		this.dynamicCtx = null;
		this.game = null;
	}

	getCtrl() {
		return (this.game && this.game.ctrl) || null;
	}


	//--------------------------------------------------
	// 初期化
	//--------------------------------------------------
	init()
	{
		var baseCtx = this.dynamicCtx || (this.game && this.game.dynamicCtx) || null;
		if (!baseCtx && typeof document === 'undefined') { return; }

		const g = this.game || {};
		const ballSize = g.ballSize !== undefined ? g.ballSize : DEFAULT_CONFIG.ballSize;
		const canvasWidth = g.canvasWidth !== undefined ? g.canvasWidth : DEFAULT_CONFIG.canvasWidth;
		const canvasHeight = g.canvasHeight !== undefined ? g.canvasHeight : DEFAULT_CONFIG.canvasHeight;
		const blockColor = (g.blockColor !== undefined ? g.blockColor : (typeof window !== 'undefined' ? window.blockColor : [])) || [];
		const blockWidth = g.blockWidth !== undefined ? g.blockWidth : (typeof window !== 'undefined' && window.blockWidth !== undefined ? window.blockWidth : DEFAULT_CONFIG.blockWidth);
		const blockHeight = g.blockHeight !== undefined ? g.blockHeight : (typeof window !== 'undefined' && window.blockHeight !== undefined ? window.blockHeight : DEFAULT_CONFIG.blockHeight);
		const ctrl = this.getCtrl();
		const stageIdx = ctrl ? ctrl.stageIndex : 0;
		const itemColor = (g.itemColor !== undefined ? g.itemColor : (typeof window !== 'undefined' ? window.itemColor : [])) || [];
		const heartWidth = g.heartWidth !== undefined ? g.heartWidth : DEFAULT_CONFIG.heartWidth;
		const heartHeight = g.heartHeight !== undefined ? g.heartHeight : DEFAULT_CONFIG.heartHeight;

		// オフスクリーンキャンバス（willReadFrequently: true）を用意して描画・読み出し
		let renderCtx = baseCtx;
		if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
			try {
				const offscreen = document.createElement('canvas');
				offscreen.width = canvasWidth;
				offscreen.height = canvasHeight;
				const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
				if (offCtx) {
					renderCtx = offCtx;
				}
			} catch (_) {}
		}
		if (!renderCtx) { return; }

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

				// ボールを描画
				this.drawBall(stat, i, renderCtx);

				// イメージデータの取得
				imgDataBall[dataName] = renderCtx.getImageData(0, 0, ballSize * 2, ballSize * 2);

				// 描画の削除
				renderCtx.clearRect(0, 0, canvasWidth, canvasHeight);

				if( stat == 0 ) { break; }
			}
		}

		// ブロック
		var imgDataBlock = this.imgData["block"];
		for( var i = 0; i < blockColor.length; i++ )
		{
			// ブロックを描画
			this.drawBlock(i, renderCtx);

			// イメージデータの取得
			imgDataBlock[i] = renderCtx.getImageData(0, 0, blockWidth, blockHeight);

			// 描画の削除
			renderCtx.clearRect(0, 0, canvasWidth, canvasHeight);
		}

		// アイテム
		var imgDataItem = this.imgData["item"];
		const curItemColor = itemColor[stageIdx] || (itemColor[0] || []);
		for( var i = 0; i < curItemColor.length; i++ )
		{
			// アイテムを描画
			this.drawItem(i, renderCtx);

			// イメージデータの取得
			imgDataItem[i] = renderCtx.getImageData(0, 0, blockWidth, blockHeight);

			// 描画の削除
			renderCtx.clearRect(0, 0, canvasWidth, canvasHeight);
		}

		// ハート
		var imgDataHeart = this.imgData["heart"];
		for( var i = 0; i < 2; i++ )
		{
			// ハートを描画
			this.drawHeart(i, renderCtx);

			// イメージデータの取得
			imgDataHeart[i] = renderCtx.getImageData(0, 0, heartWidth * 2.3, heartHeight * 2.5);

			// 描画の削除
			renderCtx.clearRect(0, 0, canvasWidth, canvasHeight);
		}
	}


	//--------------------------------------------------
	// 描画イメージの取得
	//--------------------------------------------------
	getData(category, name)
	{
		var data = this.imgData[category];
		return data != null ? (data[name] ?? null) : null;
	}


	//--------------------------------------------------
	// 描画イメージ配列の取得
	//--------------------------------------------------
	getDataArr(category)
	{
		return this.imgData[category];
	}


	//--------------------------------------------------
	// ボールの描画
	//--------------------------------------------------
	drawBall(stat, tailNum, targetCtx = null)
	{
		var dynamicCtx = targetCtx || this.dynamicCtx || (this.game && this.game.dynamicCtx) || null;
		if (!dynamicCtx) { return; }

		const g = this.game || {};
		const ballSize = g.ballSize !== undefined ? g.ballSize : DEFAULT_CONFIG.ballSize;
		const ballColor = g.ballColor !== undefined ? g.ballColor : DEFAULT_CONFIG.ballColor;
		const ballStrongColor = g.ballStrongColor !== undefined ? g.ballStrongColor : DEFAULT_CONFIG.ballStrongColor;
		const ballUltimateColor = g.ballUltimateColor !== undefined ? g.ballUltimateColor : DEFAULT_CONFIG.ballUltimateColor;

		// 色の選択
		if( stat == 0 ) { dynamicCtx.fillStyle = ballColor; }
		else if( stat == 1 ) { dynamicCtx.fillStyle = ballStrongColor; }
		else if( stat == 2 ) { dynamicCtx.fillStyle = ballUltimateColor; }

		// 半径の選択
		var radius = ballSize * ( 1 - 0.08 * tailNum );

		// アルファ値の選択
		dynamicCtx.globalAlpha = 1 - tailNum * 0.2;

		// 球の描画
		dynamicCtx.beginPath();
		dynamicCtx.arc(ballSize, ballSize, radius, 0, Math.PI * 2, false);
		dynamicCtx.fill();
		dynamicCtx.globalAlpha = 1;
	}


	//--------------------------------------------------
	// ブロックの描画
	//--------------------------------------------------
	drawBlock(_type, targetCtx = null)
	{
		var dynamicCtx = targetCtx || this.dynamicCtx || (this.game && this.game.dynamicCtx) || null;
		if (!dynamicCtx) { return; }

		const g = this.game || {};
		const blockWidth = g.blockWidth !== undefined ? g.blockWidth : (typeof window !== 'undefined' && window.blockWidth !== undefined ? window.blockWidth : DEFAULT_CONFIG.blockWidth);
		const blockHeight = g.blockHeight !== undefined ? g.blockHeight : (typeof window !== 'undefined' && window.blockHeight !== undefined ? window.blockHeight : DEFAULT_CONFIG.blockHeight);
		const blockColor = (g.blockColor !== undefined ? g.blockColor : (typeof window !== 'undefined' ? window.blockColor : [])) || [];
		const blockLineColor = (g.blockLineColor !== undefined ? g.blockLineColor : (typeof window !== 'undefined' ? window.blockLineColor : [])) || [];
		const blockFontSize = g.blockFontSize !== undefined ? g.blockFontSize : (typeof window !== 'undefined' && window.blockFontSize !== undefined ? window.blockFontSize : 15);
		const blockText = (g.blockText !== undefined ? g.blockText : (typeof window !== 'undefined' ? window.blockText : [])) || [];
		const blockTextColor = (g.blockTextColor !== undefined ? g.blockTextColor : (typeof window !== 'undefined' ? window.blockTextColor : [])) || [];

		const bcolor = blockColor[_type] || '';
		const lcolor = blockLineColor[_type] || '';

		dynamicCtx.beginPath();
		dynamicCtx.strokeStyle = lcolor;
		dynamicCtx.fillStyle = bcolor;
		dynamicCtx.rect(0.5, 0.5, blockWidth - 1, blockHeight - 1);
		dynamicCtx.fill();
		dynamicCtx.stroke();

		// ブロックの文字を描画
		const text = blockText[_type];
		if (text) {
			const textColor = blockTextColor[_type] || '#000000';
			dynamicCtx.beginPath();
			dynamicCtx.textBaseline = 'middle';
			dynamicCtx.textAlign = 'center';
			dynamicCtx.font = blockFontSize + "px 'ＭＳ Ｐゴシック', sans-serif";
			dynamicCtx.fillStyle = textColor;
			dynamicCtx.fillText(text, 0.5 * blockWidth, 0.5 * blockHeight, blockWidth);
		}
	}


	//--------------------------------------------------
	// アイテムの描画
	//--------------------------------------------------
	drawItem(_type, targetCtx = null)
	{
		var dynamicCtx = targetCtx || this.dynamicCtx || (this.game && this.game.dynamicCtx) || null;
		if (!dynamicCtx) { return; }

		const g = this.game || {};
		const blockWidth = g.blockWidth !== undefined ? g.blockWidth : (typeof window !== 'undefined' && window.blockWidth !== undefined ? window.blockWidth : DEFAULT_CONFIG.blockWidth);
		const blockHeight = g.blockHeight !== undefined ? g.blockHeight : (typeof window !== 'undefined' && window.blockHeight !== undefined ? window.blockHeight : DEFAULT_CONFIG.blockHeight);
		const itemFontSize = g.itemFontSize !== undefined ? g.itemFontSize : (typeof window !== 'undefined' && window.itemFontSize !== undefined ? window.itemFontSize : DEFAULT_CONFIG.itemFontSize);
		const ctrl = this.getCtrl();
		const stageIdx = ctrl ? ctrl.stageIndex : 0;
		const itemColor = (g.itemColor !== undefined ? g.itemColor : (typeof window !== 'undefined' ? window.itemColor : [])) || [];
		const itemLineColor = (g.itemLineColor !== undefined ? g.itemLineColor : (typeof window !== 'undefined' ? window.itemLineColor : [])) || [];
		const itemTextColor = (g.itemTextColor !== undefined ? g.itemTextColor : (typeof window !== 'undefined' ? window.itemTextColor : [])) || [];
		const itemText = (g.itemText !== undefined ? g.itemText : (typeof window !== 'undefined' ? window.itemText : [])) || [];

		const curItemColor = itemColor[stageIdx] || (itemColor[0] || []);
		const curItemLineColor = itemLineColor[stageIdx] || (itemLineColor[0] || []);
		const curItemTextColor = itemTextColor[stageIdx] || (itemTextColor[0] || []);
		const curItemText = itemText[stageIdx] || (itemText[0] || []);

		const bcolor = curItemColor[_type] || '';
		const lcolor = curItemLineColor[_type] || '';
		const txtColor = curItemTextColor[_type] || '#000000';
		const txt = curItemText[_type] || '';

		// アイテムの枠を描画
		dynamicCtx.beginPath();
		dynamicCtx.strokeStyle = lcolor;
		dynamicCtx.fillStyle = bcolor;
		dynamicCtx.rect(0.5, 0.5, blockWidth - 1, blockHeight - 1);
		dynamicCtx.fill();
		dynamicCtx.stroke();

		// アイテムの文字を描画
		if (txt) {
			dynamicCtx.beginPath();
			dynamicCtx.textBaseline = 'middle';
			dynamicCtx.textAlign = 'center';
			dynamicCtx.font = itemFontSize + "px 'ＭＳ Ｐゴシック', sans-serif";
			dynamicCtx.fillStyle = txtColor;
			dynamicCtx.fillText(txt, 0.5 * blockWidth, 0.5 * blockHeight, blockWidth * 0.95);
		}
	}


	//--------------------------------------------------
	// ハートの描画
	//--------------------------------------------------
	drawHeart(stat, targetCtx = null)
	{
		var dynamicCtx = targetCtx || this.dynamicCtx || (this.game && this.game.dynamicCtx) || null;
		if (!dynamicCtx) { return; }

		const g = this.game || {};
		const heartColor = g.heartColor !== undefined ? g.heartColor : DEFAULT_CONFIG.heartColor;
		const heartWidth = g.heartWidth !== undefined ? g.heartWidth : DEFAULT_CONFIG.heartWidth;
		const heartHeight = g.heartHeight !== undefined ? g.heartHeight : DEFAULT_CONFIG.heartHeight;

		// 円の描画
		dynamicCtx.beginPath();
		dynamicCtx.strokeStyle = heartColor;
		dynamicCtx.scale(1, 3/2);
		if( stat == 1 ) { dynamicCtx.fillStyle = heartColor; }
		else { dynamicCtx.fillStyle = '#ffffff'; }

		dynamicCtx.arc(heartWidth*1.2 - heartWidth / 2 - 0.5, heartHeight / 1.5, heartWidth / 2 + 0.5, -Math.PI * 0.01, Math.PI, true);
		dynamicCtx.arc(heartWidth*1.2 + heartWidth / 2 + 0.5, heartHeight / 1.5, heartWidth / 2 + 0.5, Math.PI, Math.PI * 0.02, false);

		dynamicCtx.fill();
		dynamicCtx.scale(1, 2/3);

		// 線の描画
		dynamicCtx.moveTo(0.5, heartHeight + 0.5);
		dynamicCtx.lineTo(heartWidth + 1, heartHeight*2 + 0.5);

		dynamicCtx.moveTo(heartWidth*2.3, heartHeight + 0.5);
		dynamicCtx.lineTo(heartWidth*1.1, heartHeight*2 + 1.5);
		dynamicCtx.stroke();

		// 塗りつぶしの描画
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

