//--------------------------------------------------
// 武器 (Worker Thread - Physics)
//--------------------------------------------------
export default class PhysicsWeapon {
	constructor(type, x, y, config) {
		this.type = type;
		this.x = x;
		this.y = y;
        this.config = config;

		if( this.type > 0 ) {
			this.vy = -1 * config.weaponSpeed[this.type - 1];
			this.width = config.weaponWidth[this.type - 1];
			this.height = config.weaponHeight[this.type - 1];
			this.power = config.weaponPower[this.type - 1];
		} else {
			this.vy = config.weaponSpeed[2];
			this.width = config.weaponWidth[2];
			this.height = config.weaponHeight[2];
			this.power = config.weaponPower[2];
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
