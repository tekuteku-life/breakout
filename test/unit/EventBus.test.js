// test/unit/EventBus.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import EventBus from '../../src/EventBus.js';




describe('EventBus class unit tests', () => {
	it('registers, emits, and removes event listeners', () => {
		const bus = new EventBus();
		let callCount = 0;
		let receivedArg = null;

		const unsubscribe = bus.addOnEvent('test:event', (arg) => {
			callCount++;
			receivedArg = arg;
			return 'result-' + arg;
		});

		// Emit
		const results = bus.emitEvent('test:event', 42);
		assert.equal(callCount, 1);
		assert.equal(receivedArg, 42);
		assert.deepEqual(results, ['result-42']);

		// Emit unknown event
		assert.deepEqual(bus.emitEvent('unknown'), []);

		// Unsubscribe via returned function
		unsubscribe();
		bus.emitEvent('test:event', 100);
		assert.equal(callCount, 1, 'Should not be called after unsubscribe');

		// Explicit removeOnEvent
		const h2 = () => {};
		bus.addOnEvent('e2', h2);
		bus.removeOnEvent('e2', h2);
		assert.equal(bus.listeners.has('e2'), false);

		// Invalid handler returns dummy unsubscriber
		const dummyUnsub = bus.addOnEvent('invalid', null);
		dummyUnsub();
	});

	it('handles errors inside event listeners gracefully', () => {
		const bus = new EventBus();
		bus.addOnEvent('error:event', () => {
			throw new Error('Boom');
		});

		// Should not throw, returns empty or caught result
		const res = bus.emitEvent('error:event');
		assert.equal(res.length, 0);
	});

	it('manages cycle events with interval and execution timing', () => {
		const bus = new EventBus();
		let cycleTicks = 0;

		// 0 ms interval (runs every tick)
		bus.addCycleEvent('tick-always', () => {
			cycleTicks++;
		}, 0);

		// 100 ms interval
		let periodicTicks = 0;
		bus.addCycleEvent('tick-periodic', () => {
			periodicTicks++;
		}, 100);

		// Invalid handler
		bus.addCycleEvent('invalid', null);

		// Tick at t = 50
		bus.tickCycleEvents(50, 50);
		assert.equal(cycleTicks, 1);
		assert.equal(periodicTicks, 1); // first run

		// Tick at t = 80 (< 100ms since last run)
		bus.tickCycleEvents(80, 30);
		assert.equal(cycleTicks, 2);
		assert.equal(periodicTicks, 1);

		// Tick at t = 160 (>= 100ms since last run)
		bus.tickCycleEvents(160, 80);
		assert.equal(cycleTicks, 3);
		assert.equal(periodicTicks, 2);

		// Exception in cycle handler
		bus.addCycleEvent('error-cycle', () => {
			throw new Error('Cycle Error');
		});
		bus.tickCycleEvents(200, 40);

		// Remove cycle event
		bus.removeCycleEvent('tick-always');
		bus.tickCycleEvents(250, 50);
		assert.equal(cycleTicks, 4);
	});

	it('registers, executes, and unregisters single orders', () => {
		const bus = new EventBus();

		bus.registerOrder('calculate', (a, b) => a + b);
		assert.equal(bus.callSingleOrder('calculate', 10, 20), 30);

		// Unregister order
		bus.unregisterOrder('calculate');
		assert.equal(bus.callSingleOrder('calculate', 10, 20), undefined);

		// Error in single order
		bus.registerOrder('throw', () => {
			throw new Error('Order fail');
		});
		assert.equal(bus.callSingleOrder('throw'), undefined);

		// Register non-function is ignored
		bus.registerOrder('noop', null);
		assert.equal(bus.callSingleOrder('noop'), undefined);
	});

	it('cleans up all listeners and orders on destructor()', () => {
		const bus = new EventBus();
		bus.addOnEvent('event', () => {});
		bus.addCycleEvent('cycle', () => {});
		bus.registerOrder('order', () => {});

		bus.destructor();
		assert.equal(bus.listeners.size, 0);
		assert.equal(bus.cycleEvents.size, 0);
		assert.equal(bus.orderHandlers.size, 0);
	});
});
