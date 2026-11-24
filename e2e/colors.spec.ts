import { DEFAULT_COLORS_DARK, DEFAULT_COLORS_LIGHT, STATUS_STATES } from '../src/lib/status/types.js';
import { expect, test, type Fixture } from './fixture.js';

function rgb(hex: string): string {
	const n = Number.parseInt(hex.slice(1), 16);
	return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

/** The demo layout sets `color-scheme: dark`; override it on the root. */
async function scheme(fixture: Fixture, value: 'light' | 'dark' | 'normal') {
	await fixture.page.evaluate((value) => {
		document.querySelector('meta[name="color-scheme"]')?.remove();
		document.documentElement.style.colorScheme = value;
	}, value);
}

test.describe('default colors follow color-scheme', () => {
	test.use({ reducedMotion: 'reduce' });

	for (const [name, value, palette] of [
		['light', 'light', DEFAULT_COLORS_LIGHT],
		['unset', 'normal', DEFAULT_COLORS_LIGHT],
		['dark', 'dark', DEFAULT_COLORS_DARK]
	] as const) {
		test(name, async ({ fixture }) => {
			await scheme(fixture, value);
			for (const state of STATUS_STATES) {
				await fixture.set({ state });
				await expect.poll(() => fixture.strokeColor(), { message: state }).toBe(rgb(palette[state]));
			}
		});
	}
});

test.describe('custom colors', () => {
	test.use({ reducedMotion: 'reduce' });

	test('colors takes modern CSS colors and wins over an inherited variable', async ({ fixture }) => {
		await fixture.page.locator('#icon').evaluate((el) => el.style.setProperty('--morph-status-error', 'rgb(1, 2, 3)'));
		await fixture.set({ state: 'error' });
		await expect.poll(() => fixture.strokeColor()).toBe('rgb(1, 2, 3)');
		await fixture.set({ colors: { error: 'hsl(120 100% 25%)' } });
		await expect.poll(() => fixture.strokeColor()).toBe('rgb(0, 128, 0)');
	});

	test('currentColor follows the surrounding text color', async ({ fixture }) => {
		await fixture.page.locator('#icon').evaluate((el) => (el.style.color = 'rgb(10, 20, 30)'));
		await fixture.set({ colors: { idle: 'currentColor' } });
		await expect.poll(() => fixture.strokeColor()).toBe('rgb(10, 20, 30)');
	});

	test('a value that is not a color keeps the default', async ({ fixture }) => {
		await scheme(fixture, 'light');
		await fixture.set({ colors: { idle: 'not-a-color' } });
		await expect.poll(() => fixture.strokeColor()).toBe(rgb(DEFAULT_COLORS_LIGHT.idle));
	});
});

test.describe('forced colors', () => {
	test.use({ forcedColors: 'active' });

	test('draws in the system text color', async ({ fixture, browserName }) => {
		test.skip(browserName !== 'chromium', 'Playwright emulates forced colors in Chromium only');
		await fixture.set({ state: 'warning', colors: { warning: '#ffd60a' } });
		const canvasText = await fixture.page.evaluate(() => {
			const probe = document.createElement('div');
			probe.style.color = 'CanvasText';
			document.body.append(probe);
			return getComputedStyle(probe).color;
		});
		await expect.poll(() => fixture.strokeColor()).toBe(canvasText);
	});
});
