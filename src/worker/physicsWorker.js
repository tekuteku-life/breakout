
self.onerror = function(e) {
    self.postMessage({ type: 'event', event: { type: 'error', message: e.message }});
};
import PhysicsEngine from "../physics/PhysicsEngine.js";

try {
    const engine = new PhysicsEngine();

    self.onmessage = function(e) {
        const data = e.data;

        if (data.type === 'init') {
            engine.init(data.config);
        } else if (data.type === 'input') {
            engine.updateInput(data.input, data.ctrl);
        } else if (data.type === 'start') {
            engine.startLoop();
        } else if (data.type === 'stop') {
            engine.stopLoop();
        } else if (data.type === 'load_stage') {
            engine.loadStage(data.stageData);
        }
    };

    engine.setPostMessage((msg) => {
        self.postMessage(msg);
    });
} catch(err) {
    self.postMessage({ type: 'event', event: { type: 'error', message: err.toString() }});
}
