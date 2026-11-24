<script lang="ts">
	import { untrack } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Spring, prefersReducedMotion } from 'svelte/motion';
	import { Completion } from './completion.js';
	import { alignGlyph, bakeRotation, glyphFor, toPath } from './geometry.js';
	import {
		DEFAULT_DAMPING,
		DEFAULT_SIZE,
		DEFAULT_STIFFNESS,
		DEFAULT_STROKE,
		LIVE_REGION_DELAY,
		MAX_STROKE,
		MIN_DAMPING,
		MIN_STIFFNESS,
		MIN_STROKE,
		STATUS_STATES,
		clampOr,
		cssColor,
		finiteOr,
		isLive,
		normalizeStatus,
		resolveA11y,
		statusLabel,
		type StatusA11y,
		type StatusColors,
		type StatusName
	} from './types.js';

	/** Attributes the icon sets itself from `a11y`, `label` and `labels`, plus its own `onchange`. */
	type OwnedAttributes = 'children' | 'role' | 'aria-live' | 'aria-atomic' | 'aria-hidden' | 'aria-label' | 'onchange';

	export type MorphStatusProps = Omit<HTMLAttributes<HTMLSpanElement>, OwnedAttributes> & {
		/** Mark the stroke is pouring toward. */
		state?: StatusName;
		/** CSS pixel size of the icon. A non-finite value falls back to the default. */
		size?: number;
		/** Stroke width in viewBox units, clamped to 0.5–28. The icon is drawn on a 100×100 grid. */
		strokeWidth?: number;
		/**
		 * Override any state's color with any CSS color: hex, `rgb()`, `hsl()`, `oklch()`,
		 * a named color, `currentColor` or `var(--token)`. A value the browser cannot parse
		 * is ignored. The defaults follow the page's `color-scheme`.
		 */
		colors?: Partial<StatusColors>;
		/** Svelte spring stiffness, clamped to 0.02–1. Higher is snappier. Read live, including mid-morph. */
		stiffness?: number;
		/** Svelte spring damping, clamped to 0.05–1. Lower overshoots. */
		damping?: number;
		/**
		 * What the icon is about. It goes in front of the state's name: `label="Upload"`
		 * reads "Upload: Loading".
		 */
		label?: string;
		/** Name per state, in place of Idle, Loading, Success, Error, Warning. */
		labels?: Partial<Record<StatusName, string>>;
		/**
		 * How the icon reaches assistive tech. `polite` (default) and `assertive` are live
		 * regions that announce each state change. `image` is a static image named after the
		 * state, for lists and tables. `hidden` leaves the name to a parent control.
		 */
		a11y?: StatusA11y;
		/** @deprecated Use `a11y`. `true` is `a11y="polite"`, `false` is `a11y="hidden"`. */
		announce?: boolean;
		/** Fires when a morph starts, after the first render. */
		onchange?: (state: StatusName) => void;
		/** Fires when the shape has settled on `state`. The color eases on its own CSS transition. */
		oncomplete?: (state: StatusName) => void;
	};

	let {
		state: status = 'idle',
		size = DEFAULT_SIZE,
		strokeWidth = DEFAULT_STROKE,
		colors,
		stiffness = DEFAULT_STIFFNESS,
		damping = DEFAULT_DAMPING,
		label,
		labels,
		a11y,
		announce,
		onchange,
		oncomplete,
		class: className,
		...rest
	}: MorphStatusProps = $props();

	const phase = $derived(normalizeStatus(status));
	const px = $derived(Math.max(1, finiteOr(size, DEFAULT_SIZE)));
	const weight = $derived(clampOr(strokeWidth, MIN_STROKE, MAX_STROKE, DEFAULT_STROKE));
	// Set as `--morph-status-<state>` on the root. The stylesheet picks the one for the current state.
	const custom = $derived(
		Object.fromEntries(STATUS_STATES.map((name) => [name, cssColor(colors?.[name])])) as Partial<StatusColors>
	);
	const caption = $derived(statusLabel(phase, labels, label));
	const mode = $derived(resolveA11y(a11y, announce));
	const speaks = $derived(isLive(mode));
	const springStiffness = $derived(clampOr(stiffness, MIN_STIFFNESS, 1, DEFAULT_STIFFNESS));
	const springDamping = $derived(clampOr(damping, MIN_DAMPING, 1, DEFAULT_DAMPING));

	const initialName = untrack(() => normalizeStatus(status));

	const shape = new Spring(glyphFor(initialName), {
		stiffness: untrack(() => springStiffness),
		damping: untrack(() => springDamping),
		precision: 0.15
	});

	// Spinner angle lives on the node so a frame does not re-render the path.
	// It is folded into the samples when the state leaves `loading`.
	let rotor = $state<SVGGElement | undefined>();
	let angle = 0;

	function trackRotor(node: SVGGElement) {
		rotor = node;
		return () => {
			rotor = undefined;
		};
	}
	let seenName = initialName;

	// Text inside the live region. Screen readers skip text that arrives together
	// with the region, so when the region appears (on mount, or when `a11y`
	// switches to a live mode) it starts empty and the text lands a moment later.
	// An idle icon on mount stays quiet: it has nothing to report.
	const mountedQuiet = untrack(() => !speaks || phase === 'idle');
	let spoken = $state(mountedQuiet ? untrack(() => caption) : '');
	let wasLive = mountedQuiet ? untrack(() => speaks) : false;

	$effect.pre(() => {
		const text = caption;
		const nowLive = speaks;
		const appeared = nowLive && !wasLive;
		wasLive = nowLive;
		if (!appeared) {
			spoken = text;
			return;
		}
		spoken = '';
		const timer = setTimeout(() => (spoken = text), LIVE_REGION_DELAY);
		return () => clearTimeout(timer);
	});
	const completion = new Completion((done) => oncomplete?.(done));

	function paintAngle(next: number) {
		angle = next;
		const node = rotor;
		if (!node) return;
		if (next === 0) node.removeAttribute('transform');
		else node.setAttribute('transform', `rotate(${(next * 180) / Math.PI} 50 50)`);
	}

	const live = $derived(shape.current);
	const markA = $derived(toPath(live.a));
	const markB = $derived(toPath(live.b));

	// A stroke shrinking to a point still paints a dot from its round caps.
	// Its drawn length falls roughly with reveal², so it is down to a cap by
	// about 0.4. Fade it out before then. Resting marks sit at 1.
	function fade(reveal: number): number {
		return Math.min(1, Math.max(0, (reveal - 0.35) / 0.4));
	}

	$effect(() => {
		shape.stiffness = springStiffness;
		shape.damping = springDamping;
	});

	$effect(() => {
		const next = phase;
		const reduced = prefersReducedMotion.current;
		const stateChanged = next !== seenName;
		if (!stateChanged && !reduced) return;
		seenName = next;
		untrack(() => morph(next, reduced, stateChanged));
	});

	$effect(() => {
		const node = rotor;
		if (!node || phase !== 'loading' || prefersReducedMotion.current) return;
		let prev = performance.now();
		let frame = 0;
		const loop = (now: number) => {
			const dt = Math.min(32, now - prev);
			prev = now;
			paintAngle((angle + (dt / 1000) * Math.PI * 2 * 0.85) % (Math.PI * 2));
			frame = requestAnimationFrame(loop);
		};
		frame = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(frame);
	});

	$effect(() => {
		return () => completion.cancel();
	});

	function morph(next: StatusName, reduced: boolean, stateChanged: boolean) {
		const motion = reduced ? { instant: true } : undefined;

		if (!stateChanged) {
			// Reduced motion turned on: snap the mark. That cancels the pending
			// morph's spring promise, so wait on the new one.
			paintAngle(0);
			completion.retarget(shape.set(glyphFor(next), motion));
			return;
		}

		onchange?.(next);

		const target = glyphFor(next);
		if (reduced) {
			paintAngle(0);
		} else {
			// The arc is drawn in local space and rotated. Fold that rotation in
			// before the spring runs, or the pour would jump back to 12 o'clock.
			const baked = bakeRotation(shape.current, angle);
			paintAngle(0);
			void shape.set(alignGlyph(baked, target), { instant: true });
		}
		completion.start(next, shape.set(target, motion));
	}
</script>

<span
	{...rest}
	class={['morph-status', className]}
	data-state={phase}
	style:width="{px}px"
	style:height="{px}px"
	style:--morph-status-idle={custom.idle}
	style:--morph-status-loading={custom.loading}
	style:--morph-status-success={custom.success}
	style:--morph-status-error={custom.error}
	style:--morph-status-warning={custom.warning}
	role={mode === 'polite' ? 'status' : mode === 'image' ? 'img' : undefined}
	aria-live={speaks ? (mode as 'polite' | 'assertive') : undefined}
	aria-atomic={speaks ? 'true' : undefined}
	aria-label={mode === 'image' ? caption : undefined}
	aria-hidden={mode === 'hidden' ? 'true' : undefined}
>
	<svg width={px} height={px} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
		<g {@attach trackRotor}>
			{#if live.revealA > 0.015}
				<path
					d={markA}
					fill="none"
					stroke="currentColor"
					stroke-width={weight}
					stroke-linecap="round"
					stroke-linejoin="round"
					pathLength="1"
					stroke-dasharray="1"
					stroke-dashoffset={1 - live.revealA}
					stroke-opacity={fade(live.revealA)}
				/>
			{/if}
			{#if live.revealB > 0.015}
				<path
					d={markB}
					fill="none"
					stroke="currentColor"
					stroke-width={weight}
					stroke-linecap="round"
					stroke-linejoin="round"
					pathLength="1"
					stroke-dasharray="1"
					stroke-dashoffset={1 - live.revealB}
					stroke-opacity={fade(live.revealB)}
				/>
			{/if}
		</g>
	</svg>
	{#if speaks}
		<span class="sr">{spoken}</span>
	{/if}
</span>

<style>
	.morph-status {
		position: relative;
		display: inline-block;
		flex: none;
		line-height: 0;
		vertical-align: middle;
		/* Defaults for a light color-scheme. Also the fallback without light-dark(). */
		--_ms-idle: #6c6c70;
		--_ms-loading: #0060df;
		--_ms-success: #1f8a3d;
		--_ms-error: #d70015;
		--_ms-warning: #b25000;
		transition: color var(--morph-status-color-duration, 400ms) ease-out;
	}

	/* Light and dark defaults follow the page's color-scheme. Keep in sync with types.ts. */
	@supports (color: light-dark(#000, #fff)) {
		.morph-status {
			--_ms-idle: light-dark(#6c6c70, #8e8e93);
			--_ms-loading: light-dark(#0060df, #0a84ff);
			--_ms-success: light-dark(#1f8a3d, #30d158);
			--_ms-error: light-dark(#d70015, #ff453a);
			--_ms-warning: light-dark(#b25000, #ffd60a);
		}
	}

	/* `--morph-status-<state>` comes from the `colors` prop, or from any ancestor's CSS. */
	.morph-status[data-state='idle'] {
		color: var(--morph-status-idle, var(--_ms-idle));
	}

	.morph-status[data-state='loading'] {
		color: var(--morph-status-loading, var(--_ms-loading));
	}

	.morph-status[data-state='success'] {
		color: var(--morph-status-success, var(--_ms-success));
	}

	.morph-status[data-state='error'] {
		color: var(--morph-status-error, var(--_ms-error));
	}

	.morph-status[data-state='warning'] {
		color: var(--morph-status-warning, var(--_ms-warning));
	}

	@media (prefers-reduced-motion: reduce) {
		.morph-status {
			transition: none;
		}
	}

	/* Windows High Contrast and similar: draw in the system text color. The shape carries the state. */
	@media (forced-colors: active) {
		.morph-status[data-state] {
			color: CanvasText;
		}
	}

	svg {
		display: block;
		overflow: visible;
	}

	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}
</style>
