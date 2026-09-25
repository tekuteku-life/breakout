
export default class PhysicsBall {
	constructor(config, launch, bar) {
		this.config = config;
		this.radius = config.ballSize;
		this.x = 0;
		this.y = 0;
		this.vx = 0;
		this.vy = 0;
		this.histX = [];
		this.histY = [];
		this.pointIncr = config.blockDefaultPoint;
		this.simulate = 0;
		this.breakNum = 0;
		this.collisionNum = 0;
		this.status = 0; // 0: NORMAL
		this.statusTime = 0;
		this.duaration = 0;
		this.isAbsorption = 0;
		this.absorptionPoint = [0, 0];

        if (launch === 1 /* BALL_CREATE_MODE.LAUNCH */ && bar) {
            let diffTime = 0;
            if( config.inputState && config.inputState.mouseDownTime != 0 ) {
                diffTime = ( Date.now() - config.inputState.mouseDownTime ) / 1000;
                if( diffTime > 1 ) { diffTime = 1; }
            }

            this.vx = ((Math.random() + 1) * config.ballDefaultSpeed * 0.5 / Math.abs(bar.vx || 1) + 1) + (bar.vx || 0);
            this.vy = -1 * (config.ballDefaultSpeed + ( config.ballMaxSpeed - config.ballDefaultSpeed ) * diffTime);
            if( Math.abs(this.vy) > config.ballMaxSpeed ) { this.vy = config.ballMaxSpeed * ( this.vy < 0 ? -1 : 1 ); }
            if( Math.abs(this.vx) > config.ballMaxSpeed ) { this.vx = config.ballMaxSpeed * ( this.vx < 0 ? -1 : 1 ); }

            this.x = bar.getCenterX();
            this.y = bar.getTopY() - this.radius;
        }
	}

    getLeftX() { return this.x - this.radius; }
	getCenterX() { return this.x; }
	getRightX() { return this.x + this.radius; }
	getTopY() { return this.y - this.radius; }
	getCenterY() { return this.y; }
	getBottomY() { return this.y + this.radius; }

    move() {
        // ボールの速度制限
		if( Math.abs( this.vx ) > this.config.ballMaxSpeed ) { this.vx = this.config.ballMaxSpeed * (this.vx < 0 ? -1 : 1); }
		if( Math.abs( this.vy ) > this.config.ballMaxSpeed ) { this.vy = this.config.ballMaxSpeed * (this.vy < 0 ? -1 : 1); }
		else if( Math.abs( this.vy ) < this.config.ballDefaultSpeed * 0.8 ) { this.vy = this.config.ballDefaultSpeed * 0.8 * (this.vy < 0 ? -1 : 1); }

		// 状態時間の減少
		if( this.statusTime > 0 ) {
			this.statusTime--;
			if( this.statusTime <= 0 ) {
				this.status = 0; // NORMAL
				this.pointIncr = this.config.blockDefaultPoint;
			}
		}

		// 吸着状態
		if( this.isAbsorption === 1 ) {
			// handled in bar relaunch
		} else {
            // 履歴更新
            this.histX.unshift(this.x);
            this.histY.unshift(this.y);
            if (this.histX.length > 4) {
                this.histX.pop();
                this.histY.pop();
            }

            // 移動
            this.x += this.vx;
            this.y += this.vy;
            this.duaration++;

            // 簡単な壁反射だけ追加
            if (this.x - this.radius < 0) { this.x = this.radius; this.vx *= -1; }
            if (this.x + this.radius > this.config.canvasWidth) { this.x = this.config.canvasWidth - this.radius; this.vx *= -1; }
            if (this.y - this.radius < this.config.statusBarHeight) { this.y = this.radius + this.config.statusBarHeight; this.vy *= -1; }

            // 落下処理
            if (this.y - this.radius > this.config.canvasHeight) {
                this.fall = true;
            }
        }
    }

    serialize() {
        return {
            x: this.x,
            y: this.y,
            radius: this.radius,
            status: this.status,
            statusTime: this.statusTime,
            histX: [...this.histX],
            histY: [...this.histY],
            color: this.config.ballColor,
            strongColor: this.config.ballStrongColor,
            ultimateColor: this.config.ballUltimateColor,
            ballStatusTime: this.config.ballStatusTime
        }
    }
}
