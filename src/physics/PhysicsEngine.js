
import PhysicsBall from "./entities/PhysicsBall.js";
import PhysicsBar from "./entities/PhysicsBar.js";
import PhysicsBlock from "./entities/PhysicsBlock.js";
import PhysicsItem from "./entities/PhysicsItem.js";
import PhysicsWeapon from "./entities/PhysicsWeapon.js";

export default class PhysicsEngine {

    constructor() {
        this.balls = [];
        this.items = [];
        this.weapons = [];
        this.blockMap = [];
        this.bar = null;

        this.inputState = {};
        this.ctrlState = {};
        this.config = {};

        this.timer = null;
        this.postMessageFn = null;
        this.FRATE = 1000 / 60; // Assuming 60 FPS, can be configured
    }

    setPostMessage(fn) {
        this.postMessageFn = fn;
    }

    init(config) {
        this.config = config;
        this.FRATE = 1000 / (config.FPS || 60);
    }


    loadStage(stageData) {
        // Initialize entities based on stage data
        this.blockMap = [];
        for (let i = 0; i < stageData.blockMap.length; i++) {
            this.blockMap[i] = [];
            for (let j = 0; j < stageData.blockMap[i].length; j++) {
                let d = stageData.blockMap[i][j];
                if (d && d.type !== 0) {
                    let b = new PhysicsBlock(j, i, d.type, d.func, d.life, d.infinit, d.throughVect, this.config);
                    b.item = d.item;
                    this.blockMap[i][j] = b;
                } else {
                    this.blockMap[i][j] = null;
                }
            }
        }
        this.balls = stageData.balls ? stageData.balls.map(b => new PhysicsBall(this.config, 0)) : [];
        this.items = stageData.items ? stageData.items.map(i => new PhysicsItem(i.type, i.x, i.y, this.config)) : [];
        this.weapons = stageData.weapons ? stageData.weapons.map(w => new PhysicsWeapon(w.type, w.x, w.y, this.config)) : [];

        if (!this.bar) {
            this.bar = new PhysicsBar(this.config);
        }
    }


    updateInput(input, ctrl) {
        this.inputState = input;
        this.ctrlState = ctrl;
    }

    startLoop() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.timer = setInterval(() => this.loop(), this.FRATE);
    }

    stopLoop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    loop() {
        if (this.ctrlState && this.ctrlState.pauseSwitch === 0) {

            // Process input for bar movement
            this.processInput();

            // Collision logics and more...
            // For brevity, we assume the core logic in move handles basic updates,
            // but real collision checks would be here.

            // Move items
            for (let i = 0; i < this.items.length; i++) {
                this.items[i].move();
            }

            // Move blocks
            let addWeapon = (type, x, y) => { this.weapons.push(new PhysicsWeapon(type, x, y, this.config)); };
            for (let i = 0; i < this.blockMap.length; i++) {
                const blockLine = this.blockMap[i];
                if (blockLine) {
                    for (let j = 0; j < blockLine.length; j++) {
                        const block = blockLine[j];
                        if (block) {
                            block.move(this.balls, this.blockMap, addWeapon, this.balls.length === 0);
                        }
                    }
                }
            }

            // Move balls
            for (let i = 0; i < this.balls.length; i++) {


                // In Worker, we don't have scoreMng, sounds etc, so we'll stub them or pass what we have
                let mockScoreMng = { awardNum: { fallBallNum: 0 } };
                let mockSounds = { play: () => {} };
                let mockStatusMng = { addLife: () => {} };
                let mockSimulateParam = { MAX_PREDICT: 50 };
                let mockAddScore = (point) => { /* send score event to main thread if we want */ };

                this.balls[i].move(this.bar, this.blockMap, this.items, this.weapons, mockScoreMng, mockSounds, mockStatusMng, mockSimulateParam, mockAddScore);

                if (this.balls[i].fall) {
                    this.balls.splice(i, 1);
                    i--;
                }

            }

            // Move weapons
            for (let i = 0; i < this.weapons.length; i++) {
                this.weapons[i].move();
            }


            // Check game over or stage clear conditions here, if needed in worker,
            // or let the main thread do it via synced state.
        }

        // Send synchronized state to main thread
        this.syncState();
    }


    processInput() {
        if (!this.inputState) return;
        if (this.inputState.action) { console.log("Worker received action:", this.inputState.action); }

        // Autopilot
        if (this.ctrlState.autoSwitch === 1 && this.bar) {
            // auto() implementation removed for brevity, placeholder here if needed
        }
        else if (this.ctrlState.autoSwitch === 0 && this.ctrlState.ctrlSwitch === 1) {
            if (this.inputState.keyStr === 'Right') {
                this.inputState.pointX += this.inputState.keyPressIncr;
                this.inputState.keyPressIncr *= 1.2;
            } else if (this.inputState.keyStr === 'Left') {
                this.inputState.pointX -= this.inputState.keyPressIncr;
                this.inputState.keyPressIncr *= 1.2;
            }
            if (this.inputState.pointX < 0) this.inputState.pointX = 0;
            if (this.inputState.pointX > this.config.canvasWidth) this.inputState.pointX = this.config.canvasWidth;
        }

        // Handle launching balls/weapons
        if (this.inputState.action === 'launch') {
            if (this.balls.length === 0) {
                // Launch ball
                this.config.inputState = this.inputState;
                this.balls.push(new PhysicsBall(this.config, 1, this.bar));
            } else if (this.bar && this.bar.weapon !== 0 && this.weapons.length < this.config.weaponMaxNum[this.bar.weapon - 1] && this.bar.weaponInter <= 0) {
                // Launch weapon
                this.weapons.push(new PhysicsWeapon(this.bar.weapon, this.bar.getCenterX(), this.bar.getTopY(), this.config));
            }
        }

        // Handle relaunch from absorption
        if (this.inputState.action === 'relaunch' && this.bar && this.bar.absorptionNum > 0) {
            this.bar.relaunch(this.balls);
        }

        if (this.bar) {
            this.bar.move(this.inputState);
        }
    }


    syncState() {
        if (this.postMessageFn) {
            const state = {
                balls: this.balls.map(b => b.serialize()),
                bar: this.bar ? this.bar.serialize() : null,
                items: this.items.map(i => i.serialize()),
                weapons: this.weapons.map(w => w.serialize()),
                blockMap: this.blockMap.map(line => line ? line.map(b => b ? b.serialize() : null) : null)
            };
            this.postMessageFn({ type: 'sync', state });
        }
    }
}
