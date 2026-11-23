import { describe, expect, it } from 'vitest';
import { Spring } from 'svelte/motion';
import { trackUnhandledRejections } from '../../test/rejections.js';
import { Completion } from './completion.js';
import type { StatusName } from './types.js';

/**
 * Stand-in for one `Spring`: `set` rejects the promise it replaces with
 * `Error('Aborted')`, `instant` resolves at once, and `settle()` lands the
 * current target. The first test pins that behavior to the real `Spring`.
 */
class FakeSpring {
	#current: { resolve: () => void; reject: (e: Error) => void } | null = null;

	set(options?: { instant?: boolean }): Promise<void> {
		this.#current?.reject(new Error('Aborted'));
		this.#current = null;
		if (options?.instant) return Promise.resolve();
		return new Promise<void>((resolve, reject) => {
			this.#current = { resolve, reject };
		});
	}

	settle() {
		this.#current?.resolve();
		this.#current = null;
	}
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const rejections = trackUnhandledRejections();

function setup() {
	const done: StatusName[] = [];
	const completion = new Completion((state) => done.push(state));
	const shape = new FakeSpring();
	const ink = new FakeSpring();
	const morph = (state: StatusName) => completion.start(state, shape.set(), ink.set());
	return { done, completion, shape, ink, morph };
}

describe('Spring (the behavior Completion relies on)', () => {
	it('rejects the promise of a target that a newer set replaces', async () => {
		const spring = new Spring(0);
		const first = spring.set(1);
		void spring.set(2, { instant: true });
		await expect(first).rejects.toThrow('Aborted');
	});
});

describe('Completion', () => {
	it('reports a morph once both springs settle', async () => {
		const { done, shape, ink, morph } = setup();
		morph('success');
		shape.settle();
		await flush();
		expect(done).toEqual([]);
		ink.settle();
		await flush();
		expect(done).toEqual(['success']);
	});

	it('leaves no unhandled rejection when morphs interrupt each other', async () => {
		const { done, shape, ink, morph } = setup();
		for (const state of ['loading', 'success', 'error', 'warning', 'idle'] as const) morph(state);
		shape.settle();
		ink.settle();
		await flush();
		expect(rejections).toEqual([]);
		expect(done).toEqual(['idle']);
	});

	it('still reports a morph whose color changed midway', async () => {
		const { done, completion, shape, ink, morph } = setup();
		morph('success');
		completion.retarget(ink.set());
		shape.settle();
		ink.settle();
		await flush();
		expect(rejections).toEqual([]);
		expect(done).toEqual(['success']);
	});

	it('reports once when the ink had already settled before the color change', async () => {
		const { done, completion, shape, ink, morph } = setup();
		morph('error');
		ink.settle();
		await flush();
		completion.retarget(ink.set());
		ink.settle();
		shape.settle();
		await flush();
		expect(done).toEqual(['error']);
	});

	it('reports a morph whose shape was snapped mid-flight, as reduced motion does', async () => {
		const { done, completion, shape, ink, morph } = setup();
		morph('warning');
		completion.retarget(ink.set({ instant: true }), shape.set({ instant: true }));
		await flush();
		expect(rejections).toEqual([]);
		expect(done).toEqual(['warning']);
	});

	it('ignores a retarget when nothing is pending', async () => {
		const { done, completion, ink } = setup();
		completion.retarget(ink.set({ instant: true }));
		await flush();
		expect(done).toEqual([]);
	});

	it('never reports after cancel', async () => {
		const { done, completion, shape, ink, morph } = setup();
		morph('success');
		completion.cancel();
		shape.settle();
		ink.settle();
		await flush();
		expect(done).toEqual([]);
	});
});
