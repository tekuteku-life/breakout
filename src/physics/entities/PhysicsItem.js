//--------------------------------------------------
// アイテム (Worker Thread - Physics)
//--------------------------------------------------
export default class PhysicsItem {
	constructor(type, x, y, config) {
		this.type = type;
		this.x = x;
		this.y = y;
        this.config = config;
		this.width = config.itemWidth;
		this.height = config.itemHeight;
		this.vy = config.itemSpeed;
		this.score = 0;

		if( this.type >= 100 ) {
			this.score = this.type - 100;
			this.vy = config.itemSpeed * 0.7;
		}
	}

	getLeftX() { return this.x - this.width / 2; }
	getCenterX() { return this.x; }
	getRightX() { return this.x + this.width / 2; }
	getTopY() { return this.y - this.height / 2; }
	getCenterY() { return this.y; }
	getBottomY() { return this.y + this.height / 2; }

	move() {
		this.y += this.vy;
	}

    serialize() {
        return {
            x: this.x,
            y: this.y,
            type: this.type,
            width: this.width,
            height: this.height
        }
    }
}
