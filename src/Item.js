// src/Item.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import {
	BALL_COPY_MODE,
	BALL_STATUS,
	DEFAULT_CONFIG,
} from "./const.js";

//--------------------------------------------------
// アイテム
//--------------------------------------------------
export default class Item
{
	constructor(type, x, y, lcolor, color, game = null)
	{
		this.game = game;
		const blkWidth = (this.game && this.game.blockWidth) || DEFAULT_CONFIG.blockWidth;
		const blkHeight = (this.game && this.game.blockHeight) || DEFAULT_CONFIG.blockHeight;
		const ctrl = this.getCtrl();
		const stageIdx = ctrl ? ctrl.stageIndex : 0;
		const itemTextList = (this.game && this.game.itemText) || [];
		const imgSource = (this.game && this.game.imgData) || null;

		this.width = blkWidth;										// アイテムの横幅
		this.height = blkHeight;									// アイテムの縦幅
		this.type = type;											// アイテムの種類
		this.x = x;													// アイテムの横方向位置
		this.y = y;													// アイテムの縦方向位置
		this.color = color;											// アイテムの色
		this.lineColor = lcolor;									// アイテムの線色
		this.text = (itemTextList[stageIdx] && itemTextList[stageIdx][this.type]) || '';	// アイテムの文字
		this.imgData = (imgSource && typeof imgSource.getData === 'function') ? imgSource.getData("item", this.type) : null;				// 描画イメージ
	}

	destructor()
	{
		const itemList = this.getItems();
		if (itemList) {
			const idx = itemList.indexOf(this);
			if (idx >= 0) itemList.splice(idx, 1);
		}
		this.imgData = null;
		this.game = null;
	}

	getGame() {
		return this.game || null;
	}

	getEventBus() {
		return (this.game && this.game.eventBus) || null;
	}

	getBar() {
		return (this.game && this.game.bar) || null;
	}

	getItems() {
		return (this.game && this.game.items) || [];
	}

	getCtrl() {
		return (this.game && this.game.ctrl) || null;
	}

	getCanvasHeight() {
		return (this.game && this.game.canvasHeight) || DEFAULT_CONFIG.canvasHeight;
	}


	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	draw(ctx)
	{
		if (this.imgData) {
			ctx.putImageData(this.imgData, ~~this.x - 0.5, ~~this.y - 0.5);
		}
	}


	//--------------------------------------------------
	// 上下・左右・中央座標取得
	//--------------------------------------------------
	getLeftX() {
		return this.x;
	}
	getCenterX() {
		return this.x + this.width *0.5;
	}
	getRightX() {
		return this.x + this.width;
	}

	getTopY() {
		return this.y;
	}
	getCenterY() {
		return this.y + this.height *0.5;
	}
	getBottomY() {
		return this.y + this.height;
	}


	//--------------------------------------------------
	// 移動
	//--------------------------------------------------
	move()
	{
		const ctrl = this.getCtrl();
		const stageIdx = ctrl ? ctrl.stageIndex : 0;
		const itemSpeedList = (this.game && this.game.itemSpeed) || [4, 4, 4];
		const speed = itemSpeedList[stageIdx] !== undefined ? itemSpeedList[stageIdx] : 4;
		const canvasHeight = this.getCanvasHeight();

		// 位置の決定
		this.y += speed;

		// 未取得のまま落下
		if( this.y > canvasHeight ) {
			// アイテムの消去
			this.destructor();

		// バー接触（アイテム取得）
		} else if( this.checkCollision() )
		{
			// アイテム効果の発動
			this.applyEffect();

			// アイテムの消去
			this.destructor();
		}
	}


	//--------------------------------------------------
	// 衝突判定
	//--------------------------------------------------
	checkCollision(target)
	{
		var b = target || this.getBar();
		if (!b) return false;
		return (this.getBottomY() > b.getTopY() && b.getLeftX() <= this.getRightX() && b.getRightX() >= this.getLeftX());
	}


	//--------------------------------------------------
	// アイテム効果の発動
	//--------------------------------------------------
	applyEffect()
	{
		const bus = this.getEventBus();
		if (!bus) return;

		// アイテム取得数の計算（EventBus経由で通知）
		bus.emitEvent('award:add', { key: 'getItemNum', count: 1 });

		// 取得音（EventBus経由で通知）
		const soundName = (this.type == 4 || this.type == 6 || this.type == 11 || this.type == 12) ? 'minusItem' : 'plusItem';
		bus.emitEvent('sound:play', soundName);

		// 各種効果のEventBus通知
		if (this.type === 0 || this.type === 1 || this.type === 2 || this.type === 7 || this.type === 8) {
			// ボールに関する効果（増殖、強化、無敵、速度変化）
			bus.emitEvent('ball:applyItem', this.type);
		} else if (this.type === 5) {
			// ライフ回復
			bus.emitEvent('status:addLife', 1);
		} else if (this.type === 6) {
			// ライフ減少
			bus.emitEvent('status:addLife', -1);
		} else {
			// バーに関する効果（幅変更、武器、加振、吸着、不死身、画面難視化など）
			bus.emitEvent('bar:applyItem', this.type);
		}
	}
}

