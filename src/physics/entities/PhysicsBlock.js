//--------------------------------------------------
// ブロック (Worker Thread - Physics)
//--------------------------------------------------
export default class PhysicsBlock {
	constructor(x, y, type, func, life, infinit, through, config) {
        this.config = config;
		this.width = config.blockWidth;
		this.height = config.blockHeight;
		this.x = x * this.width;
		this.y = y * this.height + config.statusBarHeight;
		this.type = type;
		this.func = func;
		this.text = null;
		this.infinit = infinit;
		this.life = life;
		this.item = null;
		this.explode = 0;
		this.simulate = 0;
		this.breakLimit = 0;
		this.moveInter = 0;
		this.moveVect = 0;
		this.blinkInter = 0;
		this.blinkSwitch = 0;
		this.blinkType = 0;
		this.throughVect = through;
		this.attackInter = 0;
        this.exploded = 0;

		// 移動ブロックの設定
		if( this.func === 7 /* BLOCK_FUNCTION.VERTICAL_MOVE */ ) {
			this.moveInter = Math.random() * config.blockMoveInter * config.FPS;
			this.moveVect = (~~(Math.random() * 2) * 2 - 1);
		}
		// 点滅ブロックの設定
		else if( this.func === 12 /* BLOCK_FUNCTION.BLINK */ ) {
			this.blinkInter = Math.random() * config.blockBlinkInter * config.FPS;
			this.blinkSwitch = (~~(Math.random() * 2) * 2 - 1);
			this.blinkType = this.type;
		}
		// 攻撃ブロックの設定
		else if( this.func === 13 /* BLOCK_FUNCTION.ATTACK */ ) {
			this.attackInter = Math.random() * config.blockAttackInter * config.FPS;
		}
	}

    copy() {
        var obj = new PhysicsBlock(
            this.x / this.width,
            (this.y - this.config.statusBarHeight) / this.height,
            this.type, this.func, this.life, this.infinit, this.throughVect, this.config
        );
		obj.item = this.item;
		obj.explode = this.explode;
		obj.simulate = this.simulate;
		obj.breakLimit = this.breakLimit;
		obj.moveInter = this.moveInter;
		obj.moveVect = this.moveVect;

		return obj;
    }

	getLeftX() { return this.x; }
	getCenterX() { return this.x + this.width * 0.5; }
	getRightX() { return this.x + this.width; }
	getTopY() { return this.y; }
	getCenterY() { return this.y + this.height * 0.5; }
	getBottomY() { return this.y + this.height; }

	move(balls, blockMap, addWeaponFn, isBallsEmpty) {
		// 爆発モーションのカウントダウン
		if( this.exploded > 0 ) { this.exploded--; }

		// カウントダウン文字の表示
		if( this.breakLimit > 0 ) {
			if( isBallsEmpty ) { this.breakLimit = 1; }

			var countDownTime = ~~(this.breakLimit / this.config.FPS * 10) / 10;
			if( countDownTime * 10 % 10 === 0 ) { this.text = String(~~countDownTime + ".0"); }
			else { this.text = countDownTime; }
			this.text += ' s';

			this.breakLimit--;
			if( this.breakLimit <= 0 ) {
				this.life = this.config.blockLife[this.type];
				this.text = null;
			}
            this.needsRedraw = true; // Main thread will handle redraw on sync
		}

		if( this.type !== 0 ) {
			// 移動処理
			if( this.func === 7 /* BLOCK_FUNCTION.VERTICAL_MOVE */ ) {
				this.moveInter--;

				if( this.moveInter <= 0 ) {
					var i = (this.getTopY() - this.config.statusBarHeight) / this.height;
					var j = this.getLeftX() / this.width;
					var forBlock = blockMap[i] ? blockMap[i][j + this.moveVect] : null;

					if( (!forBlock || forBlock.type === 0) && (j + this.moveVect) < this.config.canvasWidth / this.width && j + this.moveVect >= 0 ) {
						// 描画を消去 handled in main thread when type changes

						blockMap[i][j + this.moveVect] = this.copy();
						forBlock = blockMap[i][j + this.moveVect];
						forBlock.x += this.width * this.moveVect;
						forBlock.moveInter = this.config.blockMoveInter * this.config.FPS + (this.moveVect === 1 ? 1 : 0);

						this.type = 0;
					} else {
						this.moveVect *= -1;
						this.moveInter = 10;
					}
				}
			}
			// 点滅処理
			else if( this.func === 12 /* BLOCK_FUNCTION.BLINK */ ) {
				this.blinkInter--;
				if( this.blinkInter <= 0 ) {
					this.blinkInter = this.config.blockBlinkInter * this.config.FPS;
					this.blinkSwitch *= -1;

					if( this.blinkSwitch < 0 ) {
						this.type = 0;
						this.text = null;
					} else if( this.blinkSwitch > 0 ) {
						this.type = this.blinkType;
					}
				}
			}
			// 攻撃処理
			else if( this.func === 13 /* BLOCK_FUNCTION.ATTACK */ ) {
				this.attackInter--;
				if( this.attackInter <= 0 ) {
					this.attackInter = this.config.blockAttackInter * this.config.FPS;
                    if (addWeaponFn) {
                        addWeaponFn(-1, this.getCenterX(), this.getBottomY()); // -1 indicates enemy weapon
                    }
				}
			}
		}
	}

    serialize() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            type: this.type,
            func: this.func,
            text: this.text,
            life: this.life,
            exploded: this.exploded,
            maxLife: this.config.blockLife[this.type] || 0,
            fontSize: this.config.blockFontSize,
            textColor: this.config.blockTextColor[this.type]
        }
    }
}
