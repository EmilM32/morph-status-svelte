import { describe, expect, it } from 'vitest';
import {
	POINT_COUNT,
	alignGlyph,
	bakeRotation,
	glyphFor,
	line,
	parseColor,
	polylineLength,
	toPath,
	type Glyph,
	type Pt
} from './geometry.js';
import { STATUS_STATES } from './types.js';

const FALLBACK = { r: 1, g: 2, b: 3 };

function close(a: Pt[], b: Pt[], digits = 6) {
	expect(a).toHaveLength(b.length);
	a.forEach((p, i) => {
		expect(p.x).toBeCloseTo(b[i].x, digits);
		expect(p.y).toBeCloseTo(b[i].y, digits);
	});
}

/** Same ink: the points match in order or reversed. */
function sameStroke(a: Pt[], b: Pt[]): boolean {
	const eq = (x: Pt[], y: Pt[]) =>
		x.length === y.length && x.every((p, i) => Math.abs(p.x - y[i].x) < 1e-6 && Math.abs(p.y - y[i].y) < 1e-6);
	return eq(a, b) || eq(a, [...b].reverse());
}

describe('glyphFor', () => {
	it.each(STATUS_STATES)('%s has POINT_COUNT samples on both strokes', (state) => {
		const glyph = glyphFor(state);
		expect(glyph.a).toHaveLength(POINT_COUNT);
		expect(glyph.b).toHaveLength(POINT_COUNT);
	});

	it('returns a fresh copy each call', () => {
		const first = glyphFor('success');
		first.a[0].x = -999;
		expect(glyphFor('success').a[0].x).not.toBe(-999);
	});

	it('closes the idle ring on its first sample', () => {
		const { a } = glyphFor('idle');
		expect(a[a.length - 1]).toEqual(a[0]);
		for (const p of a) expect(Math.hypot(p.x - 50, p.y - 50)).toBeCloseTo(30, 6);
	});
});

describe('alignGlyph', () => {
	it('keeps a single stroke as the same ink, oriented toward the target', () => {
		const from = glyphFor('idle');
		const to = glyphFor('success');
		const out = alignGlyph(from, to);
		expect(sameStroke(out.a, from.a)).toBe(true);
		expect(out.revealA).toBe(from.revealA);
		expect(out.revealB).toBe(from.revealB);
	});

	it('splits one stroke into two halves of the same ink when the target needs two', () => {
		const from = glyphFor('idle');
		const out = alignGlyph(from, glyphFor('error'));
		expect(out.revealA).toBe(1);
		expect(out.revealB).toBe(1);
		for (const p of [...out.a, ...out.b]) expect(Math.hypot(p.x - 50, p.y - 50)).toBeCloseTo(30, 0);
		const total = polylineLength(from.a);
		expect(polylineLength(out.a) + polylineLength(out.b)).toBeCloseTo(total, 0);
	});

	it('pairs two strokes with the nearer target strokes without changing them', () => {
		const from = glyphFor('error');
		const out = alignGlyph(from, glyphFor('warning'));
		const pairs = [
			[out.a, out.b],
			[out.b, out.a]
		];
		expect(pairs.some(([x, y]) => sameStroke(x, from.a) && sameStroke(y, from.b))).toBe(true);
	});

	it('picks the stroke direction with less travel', () => {
		const to: Glyph = { a: line(0, 0, 10, 0), b: line(0, 0, 0, 0), revealA: 1, revealB: 0 };
		const from: Glyph = { a: line(10, 1, 0, 1), b: line(0, 0, 0, 0), revealA: 1, revealB: 0 };
		const out = alignGlyph(from, to);
		expect(out.a[0].x).toBeCloseTo(0, 6);
		expect(out.a[out.a.length - 1].x).toBeCloseTo(10, 6);
	});
});

describe('bakeRotation', () => {
	it('is a copy at zero angle', () => {
		const glyph = glyphFor('loading');
		const out = bakeRotation(glyph, 0);
		expect(out).toEqual(glyph);
		expect(out.a).not.toBe(glyph.a);
	});

	it('turns clockwise around the center in screen space', () => {
		const glyph: Glyph = { a: [{ x: 50, y: 20 }], b: [{ x: 50, y: 50 }], revealA: 1, revealB: 0 };
		const out = bakeRotation(glyph, Math.PI / 2);
		close(out.a, [{ x: 80, y: 50 }]);
		close(out.b, [{ x: 50, y: 50 }]);
	});

	it('comes back after a full turn', () => {
		const glyph = glyphFor('loading');
		close(bakeRotation(glyph, Math.PI * 2).a, glyph.a);
	});
});

describe('polylineLength / toPath', () => {
	it('measures a straight line', () => {
		expect(polylineLength(line(0, 0, 3, 4))).toBeCloseTo(5, 9);
	});

	it('writes move and line commands with two decimals', () => {
		expect(toPath([])).toBe('');
		expect(toPath([{ x: 1, y: 2 }, { x: 3.456, y: 4 }])).toBe('M1.00 2.00L3.46 4.00');
	});
});

describe('parseColor', () => {
	it.each([
		['#0A84FF', { r: 10, g: 132, b: 255 }],
		['0a84ff', { r: 10, g: 132, b: 255 }],
		['#abc', { r: 170, g: 187, b: 204 }],
		['rgb(10, 20, 30)', { r: 10, g: 20, b: 30 }],
		['rgb(10 20 30)', { r: 10, g: 20, b: 30 }],
		['rgba(300, 20, 30, 0.5)', { r: 255, g: 20, b: 30 }],
		['  #ffffff  ', { r: 255, g: 255, b: 255 }]
	])('reads %s', (input, expected) => {
		expect(parseColor(input, FALLBACK)).toEqual(expected);
	});

	it.each(['red', 'hsl(0 50% 50%)', 'var(--x)', '#abcd', '#12'])('falls back on %s', (input) => {
		expect(parseColor(input, FALLBACK)).toBe(FALLBACK);
	});
});
