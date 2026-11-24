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

/**
 * Default colors where the page's `color-scheme` is light (or unset).
 * Each holds at least 3:1 against white and #E5E5EA (WCAG 1.4.11).
 */
export const DEFAULT_COLORS_LIGHT: StatusColors = {
	idle: '#6C6C70',
	loading: '#0060DF',
	success: '#1F8A3D',
	error: '#D70015',
	warning: '#B25000'
};

/**
 * Default colors where the page's `color-scheme` is dark: Apple's dark system set.
 * Each holds at least 3:1 against black and #2C2C2E.
 */
export const DEFAULT_COLORS_DARK: StatusColors = {
	idle: '#8E8E93',
	loading: '#0A84FF',
	success: '#30D158',
	error: '#FF453A',
	warning: '#FFD60A'
};

/** @deprecated Use `DEFAULT_COLORS_DARK`. The icon now picks light or dark defaults from `color-scheme`. */
export const DEFAULT_COLORS: StatusColors = DEFAULT_COLORS_DARK;

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

/**
 * How the icon reaches assistive tech.
 * - `polite`: a live region (`role="status"`). State changes are announced when the reader is idle.
 * - `assertive`: a live region that interrupts. For outcomes the user must hear at once.
 * - `image`: a static image named after the state (`role="img"`). Nothing is announced. For lists and tables.
 * - `hidden`: hidden from assistive tech. For an icon inside a control that already names it.
 */
export const A11Y_MODES = ['polite', 'assertive', 'image', 'hidden'] as const;

export type StatusA11y = (typeof A11Y_MODES)[number];

/** `a11y` wins. Otherwise the deprecated `announce`: `false` hides the icon, anything else is polite. */
export function resolveA11y(a11y: unknown, announce: unknown): StatusA11y {
	if (typeof a11y === 'string' && (A11Y_MODES as readonly string[]).includes(a11y)) return a11y as StatusA11y;
	return announce === false ? 'hidden' : 'polite';
}

/** Whether the mode is a live region. */
export function isLive(mode: StatusA11y): boolean {
	return mode === 'polite' || mode === 'assertive';
}

/**
 * Wait before a live region that just appeared gets its text. Screen readers
 * miss text that arrives together with the region, so it lands a moment later.
 */
export const LIVE_REGION_DELAY = 150;

/**
 * Text for the state: `labels[state]`, else the default name. `label` names
 * what the icon is about and goes in front: "Upload: Loading".
 * Empty or blank strings count as unset.
 */
export function statusLabel(
	state: StatusName,
	labels?: Partial<Record<StatusName, string>>,
	label?: string
): string {
	const own = typeof labels?.[state] === 'string' ? labels[state].trim() : '';
	const text = own || DEFAULT_LABELS[state];
	const subject = typeof label === 'string' ? label.trim() : '';
	return subject ? `${subject}: ${text}` : text;
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

/**
 * A `colors` entry as a value for the icon's `--morph-status-<state>` property,
 * or `undefined` to keep the default. Text that could end the declaration is
 * refused, and so is anything the browser does not parse as a color: an
 * invalid value would otherwise make the stroke inherit the text color.
 */
export function cssColor(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const color = value.trim();
	if (!color || /[;{}<>]|\/\*/.test(color)) return undefined;
	if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && !CSS.supports('color', color)) {
		return undefined;
	}
	return color;
}
