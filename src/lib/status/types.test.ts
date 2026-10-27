import { describe, expect, it } from 'vitest';
import { DEFAULT_LABELS, clampUnit, normalizeStatus, statusLabel } from './types.js';

describe('normalizeStatus', () => {
	it('keeps known states and falls back to idle', () => {
		expect(normalizeStatus('error')).toBe('error');
		expect(normalizeStatus('nope')).toBe('idle');
		expect(normalizeStatus(undefined)).toBe('idle');
	});
});

describe('statusLabel', () => {
	it('prefers the override, then per-state labels, then defaults', () => {
		expect(statusLabel('error', { error: 'Failed' }, 'Upload')).toBe('Upload');
		expect(statusLabel('error', { error: 'Failed' })).toBe('Failed');
		expect(statusLabel('error', { success: 'Done' })).toBe(DEFAULT_LABELS.error);
	});
});

describe('clampUnit', () => {
	it('clamps to 0–1 and maps NaN to 0', () => {
		expect(clampUnit(-1)).toBe(0);
		expect(clampUnit(0.4)).toBe(0.4);
		expect(clampUnit(2)).toBe(1);
		expect(clampUnit(Number.NaN)).toBe(0);
	});
});
