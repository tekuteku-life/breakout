//--------------------------------------------------
// 反射バー (Worker Thread - Physics)
//--------------------------------------------------
export default class PhysicsBar {
	constructor(config) {
		this.x = config.pointX || config.canvasWidth / 2;
		this.y = config.canvasHeight - config.barDefaultHeight - 5.5;
		this.vx = 0;
		this.vxMax = config.barDefaultSpeed;
		this.width = config.barDefaultWidth;
		this.height = config.barDefaultHeight;
		this.alpha = 1;
		this.widthStatusTime = 0;
		this.speedStatusTime = 0;
		this.weapon = 0;
		this.weaponTime = 0;
		this.weaponInter = 0;
		this.vibrationTime = 0;
		this.absorptionStatusTime = 0;
		this.absorptionNum = 0;
		this.edge = config.barEdge;
		this.color = config.barColor;
		this.simuData = [];
		this.immortalStatusTime = 0;
		this.disturbStatusTime = 0;
		this.hitPoint = config.barDefaultHP;

        this.config = config; // Keep reference for canvasWidth, FPS, etc.
	}

	getLeftX() { return this.x - this.width * 0.5; }
	getCenterX() { return this.x; }
	getRightX() { return this.x + this.width * 0.5; }
	getTopY() { return this.y; }
	getCenterY() { return this.y + this.height * 0.5; }
	getBottomY() { return this.y + this.height; }

	//--------------------------------------------------
	// 吸着ボールの再発射 (Called in PhysicsEngine)
	//--------------------------------------------------
	relaunch(balls) {
		for( let i = 0, len = balls.length; i < len; i++ ) {
			let ball = balls[i];
			if( ball.isAbsorption === 1 ) {
				ball.isAbsorption = 0;
				if( Math.abs(this.vx) > this.config.ballDefaultSpeed*0.3 ) {
					ball.vx = this.vx * this.config.barSpin;
				} else {
					ball.vx *= Math.random()*0.7 + 0.3;
				}
				this.absorptionNum--;
				break;
			}
		}
	}

	//--------------------------------------------------
	// 移動・状態遷移
	//--------------------------------------------------
	move(inputState) {
        let pointX = inputState.pointX;

		// バー速度の計算
		this.vx = pointX - this.getCenterX();

		// バー速度の制限
		if( Math.abs(this.vx) > this.vxMax ) { this.vx = this.vxMax * (this.vx < 0 ? -1 : 1); }

		// 位置の移動
		this.x += this.vx;

		// バーの振動
		if( this.vibrationTime > 0 ) {
			this.vibrationTime--;
			let vibrationWidth = this.width;
			let half_barWidth = ~~(this.width / 2);
			let edgeBias = 0;
			if( pointX < half_barWidth ) {
				edgeBias = (half_barWidth - pointX)/half_barWidth;
			} else if( pointX > this.config.canvasWidth - half_barWidth ) {
				edgeBias = (this.config.canvasWidth - half_barWidth - pointX)/half_barWidth;
			}
			this.x += ~~((~~(Math.random() * 2) * 2 - 1 + edgeBias) * Math.random() * vibrationWidth);
		}

		// バー位置の制限
		let half_barWidth = ~~(this.width / 2);
		if( this.getLeftX() < 0 ) {
			this.vx -= this.getLeftX();
			this.x = half_barWidth;
		} else if( this.getRightX() > this.config.canvasWidth ) {
			this.vx -= this.getRightX() - this.config.canvasWidth;
			this.x = this.config.canvasWidth - half_barWidth;
		}

		// 武器発射間隔の制御
		if( this.weaponInter > 0 ) { this.weaponInter--; }

		// バー長状態の制御
		if( this.widthStatusTime > 0 ) {
			this.widthStatusTime--;
			if( this.widthStatusTime <= 0 ) { this.width = this.config.barDefaultWidth; }
		}

        // ... include other status time reductions here similarly

		// バー速度状態の制御
		if( this.speedStatusTime > 0 )
		{
			this.speedStatusTime--;

			// バーサイズの変更
			if( this.vxMax > this.config.barDefaultSpeed ) { this.height = this.config.barDefaultHeight * 0.6; }
			else { this.height = this.config.barDefaultHeight * 1.6; }

			// 状態解除
			if( this.speedStatusTime <= 0 ) {
				this.vxMax = this.config.barDefaultSpeed;
				this.height = this.config.barDefaultHeight;
			}
		}

		// 武器状態の制御
		if( this.weaponTime > 0 )
		{
			this.weaponTime--;

			// 状態解除
			if( this.weaponTime <= 0 ) { this.weapon = 0; }
		}

		// 吸着状態の制御
		if( this.absorptionStatusTime > 0 )
		{
			this.absorptionStatusTime--;
		}

		// 不死身状態の制御
		if( this.immortalStatusTime > 0 ) {
			this.immortalStatusTime--;
			if( this.immortalStatusTime <= 0 ) {
				this.immortalStatusTime = 0;
				this.color = this.config.barColor;
			}
		}

		// 画面の難視化状態の制御
		if( this.disturbStatusTime > 0 ) {
			this.disturbStatusTime--;
			if( this.disturbStatusTime <= 0 ) {
				this.disturbStatusTime = 0;
			}
		}
	}

	//--------------------------------------------------
	// HPの減少
	//--------------------------------------------------
	endamage(_damage) {
		this.hitPoint = Number(this.hitPoint) - Number(_damage);
		if( this.hitPoint <= 0 ) {
			this.hitPoint = this.config.barDefaultHP;
            // Notify engine to decrease life
            return true; // indicates life lost
		}
        return false;
	}
    serialize() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            alpha: this.alpha,
            weapon: this.weapon,
            absorptionStatusTime: this.absorptionStatusTime,
            widthStatusTime: this.widthStatusTime,
            magnetStatusTime: this.magnetStatusTime || 0,
            edge: this.edge,
            color: this.color
        };
    }

}