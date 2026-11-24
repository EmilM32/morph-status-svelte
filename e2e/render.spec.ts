import { STATUS_STATES } from '../src/lib/status/types.js';
import { expect, expectSameInk, test } from './fixture.js';

const INK = { idle: '#000', loading: '#000', success: '#000', error: '#000', warning: '#000' };

// The icon draws each stroke with pathLength="1" and a dash pattern, and fades
// strokes in and out. At rest that must paint exactly what a plain solid path
// of the same glyph paints, in every engine.

test.describe('resting glyphs match a plain SVG of the same shape', () => {
	test.use({ reducedMotion: 'reduce' });

	for (const state of STATUS_STATES) {
		for (const [size, strokeWidth] of [
			[16, 12],
			[48, 10],
			[120, 6]
		] as const) {
			test(`${state} at ${size}px, stroke ${strokeWidth}`, async ({ fixture }) => {
				await fixture.set({ state, size, strokeWidth, colors: INK });
				expectSameInk(await fixture.compareWithReference());
			});
		}
	}
});

test.describe('after a real morph, the settled glyph matches the reference', () => {
	test.use({ reducedMotion: 'no-preference' });

	const routes = [
		['idle', 'error'], // one stroke splits into two
		['error', 'success'], // the second stroke collapses and must leave no dot
		['warning', 'idle'],
		['success', 'warning']
	] as const;

	for (const [from, to] of routes) {
		test(`${from} → ${to}`, async ({ fixture }) => {
			await fixture.set({ state: from, size: 64, strokeWidth: 10, colors: INK });
			await fixture.waitForComplete(from).catch(() => {}); // the first state does not report
			await fixture.set({ state: to });
			await fixture.waitForComplete(to);
			expectSameInk(await fixture.compareWithReference());
		});
	}

	test('loading → success after spinning folds the angle in cleanly', async ({ fixture }) => {
		await fixture.set({ state: 'loading', size: 64, strokeWidth: 10, colors: INK });
		await fixture.page.waitForTimeout(700);
		await fixture.set({ state: 'success' });
		await fixture.waitForComplete('success');
		await expect(fixture.page.locator('#icon g')).not.toHaveAttribute('transform');
		expectSameInk(await fixture.compareWithReference());
	});
});

test.describe('spinner', () => {
	test('rotates while loading', async ({ fixture }) => {
		await fixture.set({ state: 'loading' });
		const rotor = fixture.page.locator('#icon g');
		await expect(rotor).toHaveAttribute('transform', /rotate\(/);
		const first = await rotor.getAttribute('transform');
		await expect.poll(() => rotor.getAttribute('transform')).not.toBe(first);
	});

	test.describe('under reduced motion', () => {
		test.use({ reducedMotion: 'reduce' });

		test('holds still', async ({ fixture }) => {
			await fixture.set({ state: 'loading' });
			await fixture.page.waitForTimeout(300);
			await expect(fixture.page.locator('#icon g')).not.toHaveAttribute('transform');
		});

		test('snaps and reports at once', async ({ fixture }) => {
			await fixture.set({ state: 'error' });
			await expect.poll(() => fixture.events()).toEqual(['change:error', 'complete:error']);
		});
	});
});
