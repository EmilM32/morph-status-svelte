import type { StatusName } from './types.js';

function noop() {}

/**
 * Tracks which morph still owes an `oncomplete`, and reports it once.
 *
 * `Spring.set` rejects the promise of the target it replaces. That only means a
 * newer target took over, so those rejections are dropped here instead of being
 * left unhandled.
 */
export class Completion {
	#generation = 0;
	#pending: { token: number; state: StatusName; shape: Promise<void> } | null = null;
	readonly #notify: (state: StatusName) => void;

	constructor(notify: (state: StatusName) => void) {
		this.#notify = notify;
	}

	/** A new morph toward `state`. Supersedes the pending one. */
	start(state: StatusName, shapeDone: Promise<void>, inkDone: Promise<void>): void {
		const token = ++this.#generation;
		this.#pending = { token, state, shape: shapeDone };
		this.#wait(token, shapeDone, inkDone);
	}

	/**
	 * New spring targets for the state already pending, such as a color change
	 * mid-morph. Pass `shapeDone` only when the shape spring was set again too.
	 */
	retarget(inkDone: Promise<void>, shapeDone?: Promise<void>): void {
		const pending = this.#pending;
		if (!pending) return;
		if (shapeDone) pending.shape = shapeDone;
		this.#wait(pending.token, pending.shape, inkDone);
	}

	/** Drop the pending morph without reporting it, for example on unmount. */
	cancel(): void {
		this.#generation += 1;
		this.#pending = null;
	}

	#wait(token: number, shapeDone: Promise<void>, inkDone: Promise<void>): void {
		Promise.all([shapeDone, inkDone]).then(() => this.#finish(token), noop);
	}

	#finish(token: number): void {
		const pending = this.#pending;
		if (!pending || pending.token !== token || token !== this.#generation) return;
		this.#pending = null;
		this.#notify(pending.state);
	}
}
