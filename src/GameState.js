
import BallView from "./entities/Ball.js";
import BarView from "./entities/Bar.js";
import BlockView from "./entities/Block.js";
import ItemView from "./entities/Item.js";
import WeaponView from "./entities/Weapon.js";

export default class GameState {
    constructor() {
        this.balls = [];
        this.items = [];
        this.balloons = [];
        this.weapons = [];
        this.blockMap = null;
        this.bar = null;
        this.statusMng = null;
        this.scoreMng = null;
        this.ctrl = null;

        // Timer references
        this.timer_All = null;

        // Input state
        this.inputState = {
            pointX: 0,
            pointY: 0,
            mouseDownTime: 0,
            keyPressIncr: 0,
            keyStr: '',
            keyCode: '',
            action: null,
            touch: false
        };

        // Screen sizes and constants
        this.canvasWidth = 0;
        this.canvasHeight = 0;

        // Physics worker reference
        this.physicsWorker = null;

        // State update callback
        this.onStateUpdate = null;
    }

    init(canvasWidth, canvasHeight, bar, statusMng, scoreMng, ctrl) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        this.bar = bar;
        this.statusMng = statusMng;
        this.scoreMng = scoreMng;
        this.ctrl = ctrl;

        this.balls = [];
        this.items = [];
        this.balloons = [];
        this.weapons = [];
        this.blockMap = null;
    }

    setBlockMap(blockMap) {
        this.blockMap = blockMap;
    }

    setPhysicsWorker(worker) {
        this.physicsWorker = worker;
        this.physicsWorker.onmessage = this.handleWorkerMessage.bind(this);
    }

    handleWorkerMessage(e) {
        const data = e.data;
        if (data.type === 'sync') {
            this.syncStateFromWorker(data.state);
            if (this.onStateUpdate) {
                this.onStateUpdate();
            }
        } else if (data.type === 'event') {
            this.handleWorkerEvent(data.event);
        }
    }

    syncStateFromWorker(workerState) {
        if (workerState.balls) {
            this.balls = workerState.balls.map((b, i) => {
                if (this.balls[i]) {
                    this.balls[i].updateState(b);
                    return this.balls[i];
                } else {
                    return new BallView(b, window.imgData ? window.imgData.getDataArr("ball") : null);
                }
            });
        }

        if (workerState.bar) {
            if (this.bar) {
                this.bar.updateState(workerState.bar);
            } else {
                this.bar = new BarView(workerState.bar);
            }
        }

        if (workerState.items) {
            this.items = workerState.items.map((it, i) => {
                if (this.items[i]) {
                    this.items[i].updateState(it);
                    return this.items[i];
                } else {
                    return new ItemView(it, window.imgData ? window.imgData.getDataArr("item") : null);
                }
            });
        }

        if (workerState.weapons) {
            this.weapons = workerState.weapons.map((w, i) => {
                if (this.weapons[i]) {
                    this.weapons[i].updateState(w);
                    return this.weapons[i];
                } else {
                    return new WeaponView(w, window.imgData ? window.imgData.getDataArr("weapon") : null);
                }
            });
        }

        if (workerState.blockMap) {
            let oldBlockMap = this.blockMap || [];
            this.blockMap = workerState.blockMap.map((line, i) => {
                if (!line) return null;
                return line.map((b, j) => {
                    if (!b) return null;
                    if (oldBlockMap[i] && oldBlockMap[i][j]) {
                        oldBlockMap[i][j].updateState(b);
                        return oldBlockMap[i][j];
                    } else {
                        return new BlockView(b, window.imgData ? window.imgData.getData("block", b.type) : null);
                    }
                });
            });
            window.blockMap = this.blockMap;
        }
    }

    handleWorkerEvent(eventData) {
        if (eventData.type === 'error') console.error('Worker Internal Error:', eventData.message);
    }

    sendInputToWorker() {
        if (!this.physicsWorker) return;

        // Send batched user input and control states to the worker
        this.physicsWorker.postMessage({
            type: 'input',
            input: this.inputState,
            ctrl: {
                pauseSwitch: this.ctrl.pauseSwitch,
                autoSwitch: this.ctrl.autoSwitch,
                ctrlSwitch: this.ctrl.ctrlSwitch
            }
        });

        // Reset some transient input states like action
        this.inputState.action = null;
        this.inputState.mouseDownTime = 0;
    }
}
