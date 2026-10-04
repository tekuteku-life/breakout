// src/Heart.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import { DEFAULT_CONFIG } from "./const.js";

//--------------------------------------------------
// ハート
//--------------------------------------------------
export default class Heart
{
	constructor(x, y, fill, game = null)
	{
		this.game = game;
		this.x = x;
		this.y = y;
		const imgSource = (this.game && this.game.imgData) || null;
		this.imgData = (imgSource && typeof imgSource.getData === 'function') ? imgSource.getData("heart", fill) : null;
	}

	destructor()
	{
		this.imgData = null;
		this.game = null;
	}


	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	draw(ctx)
	{
		if (!this.imgData || !ctx) return;
		const heartWidth = (this.game && this.game.heartWidth !== undefined) ? this.game.heartWidth : DEFAULT_CONFIG.heartWidth;
		const heartHeight = (this.game && this.game.heartHeight !== undefined) ? this.game.heartHeight : DEFAULT_CONFIG.heartHeight;
		ctx.putImageData(this.imgData, this.x - heartWidth, this.y - heartHeight);
	}
}

