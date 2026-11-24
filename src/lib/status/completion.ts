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
	#pending: { token: number; state: StatusName } | null = null;
	readonly #notify: (state: StatusName) => void;

	constructor(notify: (state: StatusName) => void) {
		this.#notify = notify;
	}

	/** A new morph toward `state`, done when `shapeDone` resolves. Supersedes the pending one. */
	start(state: StatusName, shapeDone: Promise<void>): void {
		const token = ++this.#generation;
		this.#pending = { token, state };
		this.#wait(token, shapeDone);
	}

	/**
	 * The shape spring was set again for the state already pending, for example
	 * snapped when reduced motion turned on mid-morph. Its earlier promise was
	 * rejected, so wait on the new one.
	 */
	retarget(shapeDone: Promise<void>): void {
		const pending = this.#pending;
		if (pending) this.#wait(pending.token, shapeDone);
	}

	/** Drop the pending morph without reporting it, for example on unmount. */
	cancel(): void {
		this.#generation += 1;
		this.#pending = null;
	}

	#wait(token: number, shapeDone: Promise<void>): void {
		shapeDone.then(() => this.#finish(token), noop);
	}

	#finish(token: number): void {
		const pending = this.#pending;
		if (!pending || pending.token !== token || token !== this.#generation) return;
		this.#pending = null;
		this.#notify(pending.state);
	}
}
