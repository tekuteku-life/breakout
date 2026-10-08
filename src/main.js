// src/main.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import GameManage from "./GameManage.js";
import ScreenManage from "./ScreenManage.js";
import InputManage from "./InputManage.js";
import EventBus from "./EventBus.js";
import AutoPlay from "./AutoPlay.js";
import ObjectManage from "./ObjectManage.js";
import Block from "./Block.js";
import { APP_VER } from "./const.js";

//--------------------------------------------------
// 配列操作のプロトタイプ拡張
//--------------------------------------------------
Array.prototype.copyMap = function(gameInstance)
{
	const g = gameInstance || null;
	const blockFunction = (g && g.blockFunction) || [];
	const blockLife = (g && g.blockLife) || [];
	const blockInfinit = (g && g.blockInfinit) || [];
	const blockThrough = (g && g.blockThrough) || [];
	const itemProb = (g && g.itemProb) || [];
	const ctrl = (g && g.ctrl) || null;
	const stageIdx = ctrl ? ctrl.stageIndex : 0;

	// ブロックの配置
	var effBlockNum = 0;
	var obj = new Array();
	for(var i = 0, len1 = this.length; i < len1; i++)
	{
		obj[i] = new Array();
		for(var j = 0, len2 = this[i].length; j < len2; j++)
		{
			var block = this[i][j];
			if( block != 0 )
			{
				obj[i][j] = new Block(j, i, block, blockFunction[block], blockLife[block], blockInfinit[block], blockThrough[block], g);

				// 破壊可能ブロック数の計算
				effBlockNum++;
			}
		}
	}

	// 必要アイテム数の計算
	var itemStock = new Array();
	const stageItemProb = itemProb[stageIdx] || [];
	for( var i = 0, len1 = stageItemProb.length; i < len1; i++ )
	{
		var Prob = stageItemProb[i] * effBlockNum;

		// 確率が１以上ならその分を追加する
		while( Prob >= 1 )
		{
			itemStock[itemStock.length] = i;
			Prob -= 1;
		}

		// 端数分は確率に任せる
		if( Prob > Math.random() ) { itemStock[itemStock.length] = i; }
	}

	// アイテムの配置
	for( var i = 0, len1 = itemStock.length; i < len1; i++ )
	{
		// 場所の取得
		var pos = ~~(Math.random() * effBlockNum);

		// アイテム代入
		var ct = 0;
		for( var j = 0, len2 = obj.length; j < len2; j++ )
		{
			var hit = 0;
			for( var k = 0, len3 = obj[j].length; k < len3; k++ )
			{
				var blk = obj[j][k];
				if( blk && blk.infinit == 0 )
				{
					if( ct == pos )
					{
						// 代入
						if( blk.item == null )
						{
							blk.item = itemStock[i];
							hit = 1;
							break;

						// 衝突回避
						} else
						{
							pos += ~~(4 * Math.random()) + 1;
							pos %= effBlockNum;
						}
					}

					// ブロック数をカウント
					ct++;
				}
			}
			if( hit == 1 ) { break; }
		}
	}

	return obj;
};

Array.prototype.copy = function()
{
	var obj = new Array();

	for( var i = 0, len = this.length; i < len; i++ ) {
		if( this[i] && this[i].length > 0 && typeof this[i].copy === 'function' ) { obj[i] = this[i].copy(); }
		else { obj[i] = this[i]; }
	}

	return obj;
};

//--------------------------------------------------
// onloadの動作設定（ゲーム管理インスタンスの生成と初期化）
//--------------------------------------------------
window.onload = async function()
{
	if (typeof window !== 'undefined' && window.gameManage && typeof window.gameManage.destructor === 'function') {
		window.gameManage.destructor();
	}
	// ゲーム全体の管理インスタンスを生成
	const gameManage = new GameManage();
	window.gameManage = gameManage;
	window.objectManage = gameManage.objectManage;
	window.screenManage = gameManage.screenManage;
	window.inputManage = gameManage.inputManage;
	window.eventBus = EventBus;

	// 画面内容の保存
	gameManage.screenManage.saveScreenData('screen_stageClear');
	gameManage.screenManage.saveScreenData('screen_allClear');
	gameManage.screenManage.saveScreenData('screen_gameOver');
	gameManage.screenManage.saveScreenData('screen_record');
	gameManage.screenManage.saveScreenData('screen_about');

	// レコード画面の作成
	gameManage.screenManage.printRecordScreen(0, 0);

	// ボタンタッチ音の設定
	gameManage.screenManage.setupButtonSounds();

	// 「ゲームについて」画面でのバージョン表示
	var screenData = String(gameManage.screenManage.getScreenData('screen_about'));
	screenData = screenData.replace('<!--version-->', APP_VER);
	gameManage.screenManage.replaceScreenData('screen_about', screenData);

	const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
	if (isNode) {
		gameManage.init(0);
		gameManage.screenManage.openScreen('screen_start');
		return;
	}

	// ブラウザ環境：プレイ準備完了までのロード画面を表示しつつ非同期初期化
	return gameManage.initAsync(0).then(() => {
		gameManage.screenManage.openScreen('screen_start');
	});
};

// 右クリックメニューの無効化（一時停止処理の呼出）
window.oncontextmenu = function()
{
	EventBus.emitEvent('control:togglePause');
	return false;
};

export {
	GameManage,
	ObjectManage,
	ScreenManage,
	InputManage,
	EventBus,
	AutoPlay,
};

export default GameManage;
