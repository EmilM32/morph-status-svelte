import { expect, test as base, type Page } from '@playwright/test';
import type { MorphStatusProps } from '../src/lib/status/MorphStatus.svelte';

// Props cross into the page as plain JSON. The full prop type is too deep for page.evaluate's typing.
type Props = Partial<Pick<MorphStatusProps, 'state' | 'size' | 'strokeWidth' | 'colors' | 'label' | 'labels' | 'a11y'>>;

type E2E = { set(next: Props): void; events: string[] };

/** Pixel counts from comparing two screenshots of the same size. */
export type PixelDiff = { width: number; height: number; inkA: number; inkB: number; diff: number };

export class Fixture {
	readonly errors: string[] = [];

	constructor(readonly page: Page) {
		page.on('pageerror', (error) => this.errors.push(error.message));
	}

	async open() {
		await this.page.goto('/e2e');
		await this.page.waitForFunction(() => '__e2e' in window);
	}

	async set(next: Props) {
		await this.page.evaluate((next) => (window as unknown as { __e2e: E2E }).__e2e.set(next), next);
	}

	async events(): Promise<string[]> {
		return this.page.evaluate(() => [...(window as unknown as { __e2e: E2E }).__e2e.events]);
	}

	async waitForComplete(state: string) {
		await expect.poll(() => this.events(), { timeout: 5000 }).toContain(`complete:${state}`);
	}

	icon() {
		return this.page.locator('#icon .morph-status');
	}

	async strokeColor(): Promise<string> {
		return this.page.locator('#icon path').first().evaluate((el) => getComputedStyle(el).stroke);
	}

	/** Screenshot the icon and the reference glyph, and compare them pixel by pixel in the page. */
	async compareWithReference(): Promise<PixelDiff> {
		const options = { animations: 'disabled' as const, caret: 'hide' as const };
		const [icon, ref] = await Promise.all([
			this.page.locator('#icon').screenshot(options),
			this.page.locator('#ref').screenshot(options)
		]);
		return this.page.evaluate(
			async ([a, b]) => {
				const decode = async (base64: string) => {
					const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
					const bitmap = await createImageBitmap(blob);
					const canvas = document.createElement('canvas');
					canvas.width = bitmap.width;
					canvas.height = bitmap.height;
					const context = canvas.getContext('2d')!;
					context.drawImage(bitmap, 0, 0);
					return context.getImageData(0, 0, bitmap.width, bitmap.height);
				};
				const [x, y] = await Promise.all([decode(a), decode(b)]);
				if (x.width !== y.width || x.height !== y.height) {
					throw new Error(`size differs: ${x.width}x${x.height} vs ${y.width}x${y.height}`);
				}
				const luma = (d: Uint8ClampedArray, i: number) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
				let inkA = 0;
				let inkB = 0;
				let diff = 0;
				for (let i = 0; i < x.data.length; i += 4) {
					const la = luma(x.data, i);
					const lb = luma(y.data, i);
					if (la < 160) inkA++;
					if (lb < 160) inkB++;
					if (Math.abs(la - lb) > 96) diff++;
				}
				return { width: x.width, height: x.height, inkA, inkB, diff };
			},
			[icon.toString('base64'), ref.toString('base64')]
		);
	}
}

export const test = base.extend<{ fixture: Fixture }>({
	fixture: async ({ page }, use) => {
		const fixture = new Fixture(page);
		await fixture.open();
		await use(fixture);
		expect(fixture.errors, 'page errors').toEqual([]);
	}
});

export { expect };

/** Same pixels within antialiasing: at most `share` of the inked pixels differ. */
export function expectSameInk(result: PixelDiff, share = 0.03) {
	expect(result.inkA, 'the icon paints something').toBeGreaterThan(20);
	expect(result.inkB, 'the reference paints something').toBeGreaterThan(20);
	expect(result.diff / Math.max(result.inkA, result.inkB), JSON.stringify(result)).toBeLessThanOrEqual(share);
}
