import { afterEach, beforeEach } from 'vitest';

// Node's `process`, typed here because the repo does not depend on @types/node.
type RejectionListener = (reason: unknown) => void;
const { process } = globalThis as unknown as {
	process: {
		on(event: 'unhandledRejection', listener: RejectionListener): void;
		off(event: 'unhandledRejection', listener: RejectionListener): void;
	};
};

/**
 * Collects unhandled promise rejections during each test of the calling file.
 * Read the returned array after letting pending promises run.
 */
export function trackUnhandledRejections(): unknown[] {
	const seen: unknown[] = [];
	const listener: RejectionListener = (reason) => seen.push(reason);
	beforeEach(() => {
		seen.length = 0;
		process.on('unhandledRejection', listener);
	});
	afterEach(() => {
		process.off('unhandledRejection', listener);
	});
	return seen;
}
