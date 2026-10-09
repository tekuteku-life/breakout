// src/workers/autoPlayWorker.js
// Copyright (C) 2010-2012 kt9, All rights reserved.

import { runAutoPlaySimulation } from "../AutoPlaySimulation.js";

// Web Worker message handler
if (typeof self !== 'undefined') {
	self.onmessage = function (e) {
		if (!e || !e.data) return;
		const { id, snapshot } = e.data;
		try {
			const result = runAutoPlaySimulation(snapshot);
			self.postMessage({ id, result, error: null });
		} catch (err) {
			self.postMessage({ id, result: null, error: err ? err.message : 'Unknown error' });
		}
	};
}
