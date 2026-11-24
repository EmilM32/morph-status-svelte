export const STATUS_STATES = ['idle', 'loading', 'success', 'error', 'warning'] as const;

export type StatusName = (typeof STATUS_STATES)[number];

export type StatusColors = Record<StatusName, string>;

/**
 * Svelte's `Spring` clamps both of these to 0–1.
 * 0.2 / 0.72 settles a shape change in about half a second, with a little give.
 */
export const DEFAULT_STIFFNESS = 0.2;
export const DEFAULT_DAMPING = 0.72;

/**
 * Floors for the spring. At 0 stiffness the stroke never moves, and at 0 damping
 * it never stops ringing; either way `oncomplete` would never fire. At these
 * floors a morph still settles within a few seconds.
 */
export const MIN_STIFFNESS = 0.02;
export const MIN_DAMPING = 0.05;

/** Icon box, in CSS pixels. The drawing itself is a 100×100 grid. */
export const DEFAULT_SIZE = 32;

/** Stroke width in viewBox units on that 100×100 grid. */
export const DEFAULT_STROKE = 10;
export const MIN_STROKE = 0.5;
export const MAX_STROKE = 28;

export const DEFAULT_COLORS: StatusColors = {
	idle: '#8E8E93',
	loading: '#0A84FF',
	success: '#30D158',
	error: '#FF453A',
	warning: '#FFD60A'
};

export const DEFAULT_LABELS: Record<StatusName, string> = {
	idle: 'Idle',
	loading: 'Loading',
	success: 'Success',
	error: 'Error',
	warning: 'Warning'
};

export function normalizeStatus(value: string | undefined): StatusName {
	if (value && (STATUS_STATES as readonly string[]).includes(value)) return value as StatusName;
	return 'idle';
}

export function statusLabel(
	state: StatusName,
	labels?: Partial<Record<StatusName, string>>,
	override?: string
): string {
	if (override) return override;
	return labels?.[state] ?? DEFAULT_LABELS[state];
}

/**
 * Read a numeric prop. Numeric strings are accepted for plain-JS callers.
 * Anything that is not a finite number (NaN, Infinity, null, '') gives `fallback`.
 */
export function finiteOr(value: unknown, fallback: number): number {
	const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
	return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

/** `finiteOr`, then clamped to `min`–`max`. */
export function clampOr(value: unknown, min: number, max: number, fallback: number): number {
	return Math.min(max, Math.max(min, finiteOr(value, fallback)));
}
