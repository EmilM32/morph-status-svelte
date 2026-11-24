import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import MorphStatus from './MorphStatus.svelte';
import { DEFAULT_SIZE, DEFAULT_STROKE, MAX_STROKE, MIN_STROKE } from './types.js';

/** Value of `name` on the first `<tag>` in the server-rendered markup. */
function attr(props: Record<string, unknown>, tag: string, name: string): string | null {
	const { body } = render(MorphStatus, { props });
	const open = body.match(new RegExp(`<${tag}\\b[^>]*>`))?.[0] ?? '';
	return open.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? null;
}

const width = (props: Record<string, unknown>) => attr(props, 'svg', 'width');
const stroke = (props: Record<string, unknown>) => attr(props, 'path', 'stroke-width');

describe('MorphStatus (SSR)', () => {
	it('renders the defaults', () => {
		expect(width({})).toBe(String(DEFAULT_SIZE));
		expect(attr({}, 'svg', 'height')).toBe(String(DEFAULT_SIZE));
		expect(stroke({})).toBe(String(DEFAULT_STROKE));
	});

	it.each([Number.NaN, Infinity, -Infinity, null, ''])('falls back to the default size for %s', (size) => {
		expect(width({ size })).toBe(String(DEFAULT_SIZE));
		expect(attr({ size }, 'span', 'style')).toContain(`width: ${DEFAULT_SIZE}px`);
	});

	it('accepts a numeric string size from plain-JS callers', () => {
		expect(width({ size: '24' })).toBe('24');
	});

	it('keeps a zero or negative size at 1px', () => {
		expect(width({ size: 0 })).toBe('1');
		expect(width({ size: -5 })).toBe('1');
	});

	it.each([Number.NaN, Infinity, null])('falls back to the default stroke for %s', (strokeWidth) => {
		expect(stroke({ strokeWidth })).toBe(String(DEFAULT_STROKE));
	});

	it('clamps the stroke to its range', () => {
		expect(stroke({ strokeWidth: 0 })).toBe(String(MIN_STROKE));
		expect(stroke({ strokeWidth: 999 })).toBe(String(MAX_STROKE));
	});

	it('writes colors as custom properties in the server markup', () => {
		const style = attr({ colors: { success: 'oklch(70% 0.2 150)', idle: 'red; display: none' } }, 'span', 'style');
		expect(style).toContain('--morph-status-success: oklch(70% 0.2 150)');
		expect(style).not.toContain('--morph-status-idle');
		expect(style).not.toContain('display');
	});

	it('strokes in currentColor', () => {
		expect(attr({}, 'path', 'stroke')).toBe('currentColor');
	});

	it('renders with springs at zero and NaN', () => {
		expect(() => render(MorphStatus, { props: { stiffness: 0, damping: 0 } })).not.toThrow();
		expect(() => render(MorphStatus, { props: { stiffness: Number.NaN, damping: Number.NaN } })).not.toThrow();
	});
});
