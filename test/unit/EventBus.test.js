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

	it('registers, updates, and executes timers with callbacks and events', () => {
		const bus = new EventBus();
		let callbackCalled = 0;
		let callbackArgs = null;
		let eventFired = 0;
		let eventPayload = null;

		bus.addOnEvent('timer:event', (arg) => {
			eventFired++;
			eventPayload = arg;
		});

		// Timer with callback and event
		const timer = bus.addTimer('t1', 100, (arg) => {
			callbackCalled++;
			callbackArgs = arg;
		}, {
			event: 'timer:event',
			args: ['hello-timer'],
		});

		assert.ok(bus.hasTimer('t1'));
		assert.equal(timer.remaining, 100);
		assert.equal(timer.progress, 0);

		// Advance time by 50ms
		bus.tickTimers(50);
		assert.equal(callbackCalled, 0);
		assert.equal(eventFired, 0);
		assert.equal(timer.remaining, 50);
		assert.equal(timer.elapsed, 50);
		assert.equal(timer.progress, 0.5);

		// Advance time by another 50ms (total 100ms: expires)
		bus.tickTimers(50);
		assert.equal(callbackCalled, 1);
		assert.equal(callbackArgs, 'hello-timer');
		assert.equal(eventFired, 1);
		assert.equal(eventPayload, 'hello-timer');
		assert.equal(bus.hasTimer('t1'), false);
	});

	it('supports string event name as callbackOrEvent parameter', () => {
		const bus = new EventBus();
		let received = null;
		bus.addOnEvent('auto:fire', (data) => {
			received = data;
		});

		bus.addTimer('t-event', 60, 'auto:fire', { args: [{ value: 99 }] });
		bus.tickTimers(60);
		assert.deepEqual(received, { value: 99 });
	});

	it('handles timer pause, resume, cancel, and global pause', () => {
		const bus = new EventBus();
		let count = 0;

		const t = bus.addTimer('t-pause', 100, () => { count++; });

		// Global pause (isPaused = true)
		bus.tickTimers(50, true);
		assert.equal(t.remaining, 100, 'Pauseable timer does not advance when globally paused');

		// Advance 50ms when unpaused
		bus.tickTimers(50, false);
		assert.equal(t.remaining, 50);

		// Individual pause
		t.pause();
		assert.equal(t.isPaused, true);
		bus.tickTimers(50, false);
		assert.equal(t.remaining, 50, 'Paused timer does not advance');

		// Individual resume
		t.resume();
		assert.equal(t.isPaused, false);
		bus.tickTimers(30, false);
		assert.equal(t.remaining, 20);

		// Cancel
		t.cancel();
		assert.equal(bus.hasTimer('t-pause'), false);
		bus.tickTimers(100);
		assert.equal(count, 0, 'Cancelled timer does not fire');

		// Pause / resume non-existent timer
		assert.equal(bus.pauseTimer('non-existent'), false);
		assert.equal(bus.resumeTimer('non-existent'), false);
		assert.equal(bus.removeTimer('non-existent'), false);
		assert.equal(bus.hasTimer(null), false);
		assert.equal(bus.getTimer(null), null);
		assert.equal(bus.addTimer(null, 100), null);
	});

	it('supports repeat timers and onTick handlers', () => {
		const bus = new EventBus();
		let runs = 0;
		let ticks = 0;

		bus.addTimer('t-repeat', 50, () => {
			runs++;
		}, {
			repeat: true,
			onTick: (timer, dt) => {
				ticks++;
				assert.ok(dt > 0);
			}
		});

		bus.tickTimers(25);
		assert.equal(ticks, 1);
		assert.equal(runs, 0);

		bus.tickTimers(25);
		assert.equal(ticks, 2);
		assert.equal(runs, 1, 'First repeat trigger');
		assert.ok(bus.hasTimer('t-repeat'), 'Timer still exists due to repeat');

		bus.tickTimers(50);
		assert.equal(runs, 2, 'Second repeat trigger');

		bus.clearAllTimers();
		assert.equal(bus.timers.size, 0);
	});

	it('safely catches errors inside timer callbacks and onTick', () => {
		const bus = new EventBus();
		bus.addTimer('t-error', 10, () => {
			throw new Error('Timer callback error');
		}, {
			onTick: () => {
				throw new Error('Timer onTick error');
			}
		});

		// Should not throw
		bus.tickTimers(5);
		bus.tickTimers(5);
		assert.equal(bus.hasTimer('t-error'), false);
	});

	it('integrates with tickCycleEvents', () => {
		const bus = new EventBus();
		let triggered = false;

		bus.addTimer('t-cycle', 50, () => {
			triggered = true;
		});

		bus.tickCycleEvents(Date.now(), 25);
		assert.equal(triggered, false);

		bus.tickCycleEvents(Date.now(), 25);
		assert.equal(triggered, true);
	});

	it('cleans up all listeners, orders, and timers on destructor()', () => {
		const bus = new EventBus();
		bus.addOnEvent('event', () => {});
		bus.addCycleEvent('cycle', () => {});
		bus.registerOrder('order', () => {});
		bus.addTimer('timer', 100, () => {});

		bus.destructor();
		assert.equal(bus.listeners.size, 0);
		assert.equal(bus.cycleEvents.size, 0);
		assert.equal(bus.orderHandlers.size, 0);
		assert.equal(bus.timers.size, 0);
	});
});
