import WeaponView from "./Weapon.js";

//--------------------------------------------------
// 反射バー (Main Thread - View)
//--------------------------------------------------
export default class BarView {
	constructor(initialState) {
		this.updateState(initialState);
	}

	updateState(state) {
		this.x = state.x;
		this.y = state.y;
		this.width = state.width;
		this.height = state.height;
		this.alpha = state.alpha;
		this.weapon = state.weapon;
		this.absorptionStatusTime = state.absorptionStatusTime;
		this.widthStatusTime = state.widthStatusTime;
		this.magnetStatusTime = state.magnetStatusTime;
		this.edge = state.edge;
		this.color = state.color;
	}

	getLeftX() { return this.x - this.width * 0.5; }
	getCenterX() { return this.x; }
	getRightX() { return this.x + this.width * 0.5; }
	getTopY() { return this.y; }
	getCenterY() { return this.y + this.height * 0.5; }
	getBottomY() { return this.y + this.height; }

	//--------------------------------------------------
	// 描画
	//--------------------------------------------------
	draw(ctx) {
		// 武器の描画 (武器は別途描画されるのでここでは仮実装またはWeaponViewに任せる)
		// バー状態解除前の点滅制御
		if( (this.widthStatusTime != 0 && this.widthStatusTime <= /* barStatusDefaultTime */ 10 * /* FPS */ 60 * 0.25) ||
			(this.magnetStatusTime != 0 && this.magnetStatusTime <= /* barStatusDefaultTime */ 10 * /* FPS */ 60 * 0.25)
		) {
			this.alpha -= 0.05;
			if( this.alpha < 0.1 ) { this.alpha = 1; }
		} else {
			this.alpha = 1;
		}

		// 描画開始
		ctx.beginPath();
		ctx.globalAlpha = this.alpha;
		ctx.fillStyle = this.color;

		// 吸着状態の描画
		if( this.absorptionStatusTime > 0 )
		{
			var barEdgeX = this.getLeftX();
			var absArcInterDistance = this.width/10;
			var absArcSize = this.width/6;
			for( var i = 0; i < 10; i++ )
			{
				var absArcRadius = absArcSize * (0.2 * Math.random() + 0.2);
				ctx.arc(barEdgeX + (i + 0.5)*absArcInterDistance, this.getTopY() + absArcSize*0.4, absArcRadius, 0, Math.PI * 2, false);
			}
			ctx.fill();
		}

		// 本体の描画
		var shortHalfWidth = this.width * (0.5 - this.edge * this.height/2);
		var longHalfWidth = this.width / 2;
		ctx.beginPath();
		ctx.moveTo( ~~(this.getCenterX() + shortHalfWidth) - 0.5	, ~~this.getTopY() - 0.5 );
		ctx.lineTo( ~~(this.getCenterX() - shortHalfWidth) - 0.5	, ~~this.getTopY() - 0.5 );
		ctx.lineTo( ~~(this.getCenterX() - longHalfWidth) - 0.5	, ~~(this.getBottomY()) - 0.5 );
		ctx.lineTo( ~~(this.getCenterX() + longHalfWidth) - 0.5	, ~~(this.getBottomY()) - 0.5 );
		ctx.closePath();
		ctx.fill();

		ctx.globalAlpha = 1;
	}
}
