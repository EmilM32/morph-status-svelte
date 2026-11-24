import { describe, expect, it } from 'vitest';
import source from './MorphStatus.svelte?raw';
import { DEFAULT_COLORS_DARK, DEFAULT_COLORS_LIGHT, STATUS_STATES } from './types.js';

// The defaults live in the component's stylesheet, where light-dark() can follow
// the page's color-scheme. These checks keep them in step with the exported constants.

const css = source.slice(source.indexOf('<style>'));

function declarations(block: string, name: string): string[] {
	return [...block.matchAll(new RegExp(`--_ms-${name}:\\s*([^;]+);`, 'g'))].map((m) => m[1].trim().toLowerCase());
}

describe('default palette in MorphStatus.svelte', () => {
	it.each(STATUS_STATES)('%s matches DEFAULT_COLORS_LIGHT / DEFAULT_COLORS_DARK', (name) => {
		const light = DEFAULT_COLORS_LIGHT[name].toLowerCase();
		const dark = DEFAULT_COLORS_DARK[name].toLowerCase();
		expect(declarations(css, name)).toEqual([light, `light-dark(${light}, ${dark})`]);
	});

	it('picks one custom property per state', () => {
		for (const name of STATUS_STATES) {
			expect(css).toContain(`[data-state='${name}']`);
			expect(css).toContain(`var(--morph-status-${name}, var(--_ms-${name}))`);
		}
	});
});
