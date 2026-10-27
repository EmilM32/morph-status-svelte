export const STATUS_STATES = ['idle', 'loading', 'success', 'error', 'warning'] as const;

export type StatusName = (typeof STATUS_STATES)[number];

export type StatusColors = Record<StatusName, string>;

/**
 * Svelte's `Spring` clamps both of these to 0–1.
 * 0.2 / 0.72 settles a shape change in about half a second, with a little give.
 */
export const DEFAULT_STIFFNESS = 0.2;
export const DEFAULT_DAMPING = 0.72;

/** Icon box, in CSS pixels. The drawing itself is a 100×100 grid. */
export const DEFAULT_SIZE = 32;

/** Stroke width in viewBox units on that 100×100 grid. */
export const DEFAULT_STROKE = 10;

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

export function clampUnit(value: number): number {
	if (Number.isNaN(value)) return 0;
	return Math.min(1, Math.max(0, value));
}
