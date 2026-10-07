// test/unit/EventBus.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import EventBus from '../../src/EventBus.js';




describe('EventBus static class unit tests', () => {
	it('registers, emits, and removes event listeners', () => {
		EventBus.destructor();
		let callCount = 0;
		let receivedArg = null;

		const unsubscribe = EventBus.addOnEvent('test:event', (arg) => {
			callCount++;
			receivedArg = arg;
			return 'result-' + arg;
		});

		// Emit
		const results = EventBus.emitEvent('test:event', 42);
		assert.equal(callCount, 1);
		assert.equal(receivedArg, 42);
		assert.deepEqual(results, ['result-42']);

		// Emit unknown event
		assert.deepEqual(EventBus.emitEvent('unknown'), []);

		// Unsubscribe via returned function
		unsubscribe();
		EventBus.emitEvent('test:event', 100);
		assert.equal(callCount, 1, 'Should not be called after unsubscribe');

		// Explicit removeOnEvent
		const h2 = () => {};
		EventBus.addOnEvent('e2', h2);
		EventBus.removeOnEvent('e2', h2);
		assert.equal(EventBus.listeners.has('e2'), false);

		// Invalid handler returns dummy unsubscriber
		const dummyUnsub = EventBus.addOnEvent('invalid', null);
		dummyUnsub();
	});

	it('handles errors inside event listeners gracefully', () => {
		EventBus.destructor();
		EventBus.addOnEvent('error:event', () => {
			throw new Error('Boom');
		});

		// Should not throw, returns empty or caught result
		const res = EventBus.emitEvent('error:event');
		assert.equal(res.length, 0);
	});

	it('manages cycle events with interval and execution timing', () => {
		EventBus.destructor();
		let cycleTicks = 0;

		// 0 ms interval (runs every tick)
		EventBus.addCycleEvent('tick-always', () => {
			cycleTicks++;
		}, 0);

		// 100 ms interval
		let periodicTicks = 0;
		EventBus.addCycleEvent('tick-periodic', () => {
			periodicTicks++;
		}, 100);

		// Invalid handler
		EventBus.addCycleEvent('invalid', null);

		// Tick at t = 50
		EventBus.tickCycleEvents(50, 50);
		assert.equal(cycleTicks, 1);
		assert.equal(periodicTicks, 1); // first run

		// Tick at t = 80 (< 100ms since last run)
		EventBus.tickCycleEvents(80, 30);
		assert.equal(cycleTicks, 2);
		assert.equal(periodicTicks, 1);

		// Tick at t = 160 (>= 100ms since last run)
		EventBus.tickCycleEvents(160, 80);
		assert.equal(cycleTicks, 3);
		assert.equal(periodicTicks, 2);

		// Exception in cycle handler
		EventBus.addCycleEvent('error-cycle', () => {
			throw new Error('Cycle Error');
		});
		EventBus.tickCycleEvents(200, 40);

		// Remove cycle event
		EventBus.removeCycleEvent('tick-always');
		EventBus.tickCycleEvents(250, 50);
		assert.equal(cycleTicks, 4);
	});

	it('registers, executes, and unregisters single orders', () => {
		EventBus.destructor();

		EventBus.registerOrder('calculate', (a, b) => a + b);
		assert.equal(EventBus.callSingleOrder('calculate', 10, 20), 30);

		// Unregister order
		EventBus.unregisterOrder('calculate');
		assert.equal(EventBus.callSingleOrder('calculate', 10, 20), undefined);

		// Error in single order
		EventBus.registerOrder('throw', () => {
			throw new Error('Order fail');
		});
		assert.equal(EventBus.callSingleOrder('throw'), undefined);

		// Register non-function is ignored
		EventBus.registerOrder('noop', null);
		assert.equal(EventBus.callSingleOrder('noop'), undefined);
	});

	it('registers, updates, and executes timers with callbacks and events', () => {
		EventBus.destructor();
		let callbackCalled = 0;
		let callbackArgs = null;
		let eventFired = 0;
		let eventPayload = null;

		EventBus.addOnEvent('timer:event', (arg) => {
			eventFired++;
			eventPayload = arg;
		});

		// Timer with callback and event
		const timer = EventBus.addTimer('t1', 100, (arg) => {
			callbackCalled++;
			callbackArgs = arg;
		}, {
			event: 'timer:event',
			args: ['hello-timer'],
		});

		assert.ok(EventBus.hasTimer('t1'));
		assert.equal(timer.remaining, 100);
		assert.equal(timer.progress, 0);

		// Advance time by 50ms
		EventBus.tickTimers(50);
		assert.equal(callbackCalled, 0);
		assert.equal(eventFired, 0);
		assert.equal(timer.remaining, 50);
		assert.equal(timer.elapsed, 50);
		assert.equal(timer.progress, 0.5);

		// Advance time by another 50ms (total 100ms: expires)
		EventBus.tickTimers(50);
		assert.equal(callbackCalled, 1);
		assert.equal(callbackArgs, 'hello-timer');
		assert.equal(eventFired, 1);
		assert.equal(eventPayload, 'hello-timer');
		assert.equal(EventBus.hasTimer('t1'), false);
	});

	it('supports string event name as callbackOrEvent parameter', () => {
		EventBus.destructor();
		let received = null;
		EventBus.addOnEvent('auto:fire', (data) => {
			received = data;
		});

		EventBus.addTimer('t-event', 60, 'auto:fire', { args: [{ value: 99 }] });
		EventBus.tickTimers(60);
		assert.deepEqual(received, { value: 99 });
	});

	it('handles timer pause, resume, cancel, and global pause', () => {
		EventBus.destructor();
		let count = 0;

		const t = EventBus.addTimer('t-pause', 100, () => { count++; });

		// Global pause (isPaused = true)
		EventBus.tickTimers(50, true);
		assert.equal(t.remaining, 100, 'Pauseable timer does not advance when globally paused');

		// Advance 50ms when unpaused
		EventBus.tickTimers(50, false);
		assert.equal(t.remaining, 50);

		// Individual pause
		t.pause();
		assert.equal(t.isPaused, true);
		EventBus.tickTimers(50, false);
		assert.equal(t.remaining, 50, 'Paused timer does not advance');

		// Individual resume
		t.resume();
		assert.equal(t.isPaused, false);
		EventBus.tickTimers(30, false);
		assert.equal(t.remaining, 20);

		// Cancel
		t.cancel();
		assert.equal(EventBus.hasTimer('t-pause'), false);
		EventBus.tickTimers(100);
		assert.equal(count, 0, 'Cancelled timer does not fire');

		// Pause / resume non-existent timer
		assert.equal(EventBus.pauseTimer('non-existent'), false);
		assert.equal(EventBus.resumeTimer('non-existent'), false);
		assert.equal(EventBus.removeTimer('non-existent'), false);
		assert.equal(EventBus.hasTimer(null), false);
		assert.equal(EventBus.getTimer(null), null);
		assert.equal(EventBus.addTimer(null, 100), null);
	});

	it('supports repeat timers and onTick handlers', () => {
		EventBus.destructor();
		let runs = 0;
		let ticks = 0;

		EventBus.addTimer('t-repeat', 50, () => {
			runs++;
		}, {
			repeat: true,
			onTick: (timer, dt) => {
				ticks++;
				assert.ok(dt > 0);
			}
		});

		EventBus.tickTimers(25);
		assert.equal(ticks, 1);
		assert.equal(runs, 0);

		EventBus.tickTimers(25);
		assert.equal(ticks, 2);
		assert.equal(runs, 1, 'First repeat trigger');
		assert.ok(EventBus.hasTimer('t-repeat'), 'Timer still exists due to repeat');

		EventBus.tickTimers(50);
		assert.equal(runs, 2, 'Second repeat trigger');

		EventBus.clearAllTimers();
		assert.equal(EventBus.timers.size, 0);
	});

	it('safely catches errors inside timer callbacks and onTick', () => {
		EventBus.destructor();
		EventBus.addTimer('t-error', 10, () => {
			throw new Error('Timer callback error');
		}, {
			onTick: () => {
				throw new Error('Timer onTick error');
			}
		});

		// Should not throw
		EventBus.tickTimers(5);
		EventBus.tickTimers(5);
		assert.equal(EventBus.hasTimer('t-error'), false);
	});

	it('integrates with tickCycleEvents', () => {
		EventBus.destructor();
		let triggered = false;

		EventBus.addTimer('t-cycle', 50, () => {
			triggered = true;
		});

		EventBus.tickCycleEvents(Date.now(), 25);
		assert.equal(triggered, false);

		EventBus.tickCycleEvents(Date.now(), 25);
		assert.equal(triggered, true);
	});

	it('cleans up all listeners, orders, and timers on destructor()', () => {
		EventBus.destructor();
		EventBus.addOnEvent('event', () => {});
		EventBus.addCycleEvent('cycle', () => {});
		EventBus.registerOrder('order', () => {});
		EventBus.addTimer('timer', 100, () => {});

		EventBus.destructor();
		assert.equal(EventBus.listeners.size, 0);
		assert.equal(EventBus.cycleEvents.size, 0);
		assert.equal(EventBus.orderHandlers.size, 0);
		assert.equal(EventBus.timers.size, 0);
	});
});
