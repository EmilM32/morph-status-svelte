import type { StatusColors } from '#lib';

// Each preset works on both surfaces. `colors` takes any CSS color, so the
// presets lean on that: no colors at all, the page's own tokens, and light-dark().
export const colorPresets: { id: string; label: string; colors: Partial<StatusColors> | undefined }[] = [
	{
		// The library's defaults, which follow color-scheme.
		id: 'default',
		label: 'Default',
		colors: undefined
	},
	{
		id: 'ink',
		label: 'Ink',
		colors: {
			idle: 'var(--muted)',
			loading: 'var(--ink)',
			success: 'var(--ink)',
			error: 'var(--ink)',
			warning: 'var(--ink)'
		}
	},
	{
		// Light values hold 4:1 or more on the light surface.
		id: 'signal',
		label: 'Signal',
		colors: {
			idle: 'light-dark(#0071a4, #64d2ff)',
			loading: 'light-dark(#8944ab, #bf5af2)',
			success: 'light-dark(#0c7d5f, #63e6be)',
			error: 'light-dark(#d30f45, #ff375f)',
			warning: 'light-dark(#c93400, #ff9f0a)'
		}
	}
];

export const sizePresets = [
	{ id: 's', label: 'S', size: 32, stroke: 12 },
	{ id: 'm', label: 'M', size: 84, stroke: 10 },
	{ id: 'l', label: 'L', size: 168, stroke: 10 }
] as const;

export const surfaces = [
	{ id: 'dark', label: 'Dark' },
	{ id: 'light', label: 'Light' }
] as const;

export type Surface = (typeof surfaces)[number]['id'];
