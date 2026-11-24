import { describe, expect, it } from 'vitest';
import {
	DEFAULT_LABELS,
	clampOr,
	cssColor,
	finiteOr,
	isLive,
	normalizeStatus,
	resolveA11y,
	statusLabel
} from './types.js';

describe('normalizeStatus', () => {
	it('keeps known states and falls back to idle', () => {
		expect(normalizeStatus('error')).toBe('error');
		expect(normalizeStatus('nope')).toBe('idle');
		expect(normalizeStatus(undefined)).toBe('idle');
	});
});

describe('statusLabel', () => {
	it('uses the per-state label, then the default name', () => {
		expect(statusLabel('error', { error: 'Failed' })).toBe('Failed');
		expect(statusLabel('error', { success: 'Done' })).toBe(DEFAULT_LABELS.error);
	});

	it('puts `label` in front as the subject', () => {
		expect(statusLabel('loading', undefined, 'Upload')).toBe('Upload: Loading');
		expect(statusLabel('error', { error: 'Failed' }, 'Upload')).toBe('Upload: Failed');
	});

	it('treats empty or blank strings as unset', () => {
		expect(statusLabel('error', { error: '' }, '')).toBe(DEFAULT_LABELS.error);
		expect(statusLabel('error', { error: '   ' }, '  ')).toBe(DEFAULT_LABELS.error);
		expect(statusLabel('error', { error: ' Failed ' }, ' Upload ')).toBe('Upload: Failed');
	});
});

describe('resolveA11y', () => {
	it.each(['polite', 'assertive', 'image', 'hidden'] as const)('keeps a11y="%s"', (mode) => {
		expect(resolveA11y(mode, undefined)).toBe(mode);
		expect(resolveA11y(mode, false)).toBe(mode);
	});

	it('maps the deprecated announce when a11y is unset or unknown', () => {
		expect(resolveA11y(undefined, undefined)).toBe('polite');
		expect(resolveA11y(undefined, true)).toBe('polite');
		expect(resolveA11y(undefined, false)).toBe('hidden');
		expect(resolveA11y('loud', false)).toBe('hidden');
		expect(resolveA11y('loud', undefined)).toBe('polite');
	});
});

describe('isLive', () => {
	it('is true only for the live-region modes', () => {
		expect(isLive('polite')).toBe(true);
		expect(isLive('assertive')).toBe(true);
		expect(isLive('image')).toBe(false);
		expect(isLive('hidden')).toBe(false);
	});
});

describe('finiteOr', () => {
	it('keeps finite numbers and numeric strings', () => {
		expect(finiteOr(0, 7)).toBe(0);
		expect(finiteOr(-3.5, 7)).toBe(-3.5);
		expect(finiteOr('24', 7)).toBe(24);
	});

	it.each([Number.NaN, Infinity, -Infinity, undefined, null, '', '  ', 'abc', {}])(
		'falls back on %s',
		(value) => {
			expect(finiteOr(value, 7)).toBe(7);
		}
	);
});

describe('clampOr', () => {
	it('clamps finite values to the range', () => {
		expect(clampOr(-1, 0.02, 1, 0.2)).toBe(0.02);
		expect(clampOr(0, 0.02, 1, 0.2)).toBe(0.02);
		expect(clampOr(0.4, 0.02, 1, 0.2)).toBe(0.4);
		expect(clampOr(2, 0.02, 1, 0.2)).toBe(1);
	});

	it('uses the fallback for non-finite values instead of an end of the range', () => {
		expect(clampOr(Number.NaN, 0.02, 1, 0.2)).toBe(0.2);
		expect(clampOr(Infinity, 0.02, 1, 0.2)).toBe(0.2);
	});
});

describe('cssColor', () => {
	it.each(['#0a84ff', 'rgb(10 20 30 / 50%)', 'hsl(210 100% 50%)', 'oklch(70% 0.2 250)', 'rebeccapurple', 'currentColor', 'var(--brand)'])(
		'keeps %s',
		(value) => {
			expect(cssColor(value)).toBe(value);
		}
	);

	it('trims the value', () => {
		expect(cssColor('  #fff  ')).toBe('#fff');
	});

	it.each([undefined, null, 42, '', '   ', 'red; background: url(x)', 'red}', '{red', '<red>', 'red /* x */'])(
		'drops %s',
		(value) => {
			expect(cssColor(value)).toBeUndefined();
		}
	);
});
