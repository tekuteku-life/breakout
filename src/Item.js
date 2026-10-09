// src/Item.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import {
	DEFAULT_CONFIG,
	ITEM_TYPE,
	ITEM_PARAM,
} from "./const.js";
import EventBus from "./EventBus.js";

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
		const ctrl = (this.game && this.game.ctrl) || null;
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
		const itemList = (this.game && this.game.objectManage && this.game.objectManage.items) || null;
		if (itemList) {
			const idx = itemList.indexOf(this);
			if (idx >= 0) itemList.splice(idx, 1);
		}
		this.imgData = null;
		this.game = null;
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
	// 位置移動（物理演算）
	//--------------------------------------------------
	movePosition()
	{
		const ctrl = (this.game && this.game.ctrl) || null;
		const stageIdx = ctrl ? ctrl.stageIndex : 0;
		const itemSpeedList = (this.game && this.game.itemSpeed) || ITEM_PARAM.DEFAULT_SPEED;
		const speed = itemSpeedList[stageIdx] !== undefined ? itemSpeedList[stageIdx] : ITEM_PARAM.DEFAULT_SPEED[0];

		// 位置の決定
		this.y += speed;
	}

	//--------------------------------------------------
	// 状態更新（画面外落下判定・消去）
	//--------------------------------------------------
	updateState()
	{
		const canvasHeight = this.getCanvasHeight();

		// 未取得のまま画面外へ落下
		if( this.y > canvasHeight ) {
			// アイテムの消去
			this.destructor();
		}
	}


	//--------------------------------------------------
	// 衝突判定（バーとの交差判定）
	//--------------------------------------------------
	checkCollision(bar)
	{
		if (!bar) { return false; }
		return (this.getBottomY() > bar.getTopY() && bar.getLeftX() <= this.getRightX() && bar.getRightX() >= this.getLeftX());
	}


	getEventBus()
	{
		return (this.game && this.game.eventBus) || EventBus;
	}

	clone(newGame = this.game)
	{
		const obj = new Item(this.type, this.x, this.y, this.lineColor, this.color, newGame);
		obj.width = this.width;
		obj.height = this.height;
		obj.speed = this.speed;
		return obj;
	}

	//--------------------------------------------------
	// アイテム効果の発動
	//--------------------------------------------------
	applyEffect()
	{
		// アイテム取得数の計算（EventBus経由で通知）
		this.getEventBus().emitEvent('award:add', { key: 'getItemNum', count: 1 });

		// 取得音（EventBus経由で通知）
		const isMinus = (
			this.type === ITEM_TYPE.SHORT ||
			this.type === ITEM_TYPE.POISON ||
			this.type === ITEM_TYPE.SLOW ||
			this.type === ITEM_TYPE.VIBRATE
		);
		const soundName = isMinus ? 'minusItem' : 'plusItem';
		this.getEventBus().emitEvent('sound:play', soundName);

		// 各種効果のEventBus通知
		if (
			this.type === ITEM_TYPE.DOUBLE ||
			this.type === ITEM_TYPE.HARD ||
			this.type === ITEM_TYPE.FIRE ||
			this.type === ITEM_TYPE.SPEED_UP ||
			this.type === ITEM_TYPE.SPEED_DOWN
		) {
			// ボールに関する効果（増殖、強化、無敵、速度変化）
			this.getEventBus().emitEvent('ball:applyItem', this.type);
		} else if (this.type === ITEM_TYPE.LIFE) {
			// ライフ回復
			this.getEventBus().emitEvent('status:addLife', 1);
		} else if (this.type === ITEM_TYPE.POISON) {
			// ライフ減少
			this.getEventBus().emitEvent('status:addLife', -1);
		} else {
			// バーに関する効果（幅変更、武器、加振、吸着、不死身、画面難視化など）
			this.getEventBus().emitEvent('bar:applyItem', this.type);
		}
	}
}

