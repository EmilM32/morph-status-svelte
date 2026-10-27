<script lang="ts">
	import { untrack } from 'svelte';
	import { Spring, prefersReducedMotion } from 'svelte/motion';
	import {
		alignGlyph,
		bakeRotation,
		fallbackRgb,
		glyphFor,
		parseColor,
		rgbCss,
		toPath,
		type RGB
	} from './geometry.js';
	import {
		DEFAULT_COLORS,
		DEFAULT_DAMPING,
		DEFAULT_SIZE,
		DEFAULT_STIFFNESS,
		DEFAULT_STROKE,
		clampUnit,
		normalizeStatus,
		statusLabel,
		type StatusColors,
		type StatusName
	} from './types.js';

	export type MorphStatusProps = {
		/** Mark the stroke is pouring toward. */
		state?: StatusName;
		/** CSS pixel size of the icon. */
		size?: number;
		/** Stroke width in viewBox units. The icon is drawn on a 100×100 grid. */
		strokeWidth?: number;
		/** Override any of the built-in state colors. Hex or `rgb()`. */
		colors?: Partial<StatusColors>;
		/** Svelte spring stiffness, 0–1. Higher is snappier. Read live, including mid-morph. */
		stiffness?: number;
		/** Svelte spring damping, 0–1. Lower overshoots. */
		damping?: number;
		/** One label for every state. Prefer `labels` when each state should announce itself. */
		label?: string;
		/** Accessible name per state. */
		labels?: Partial<Record<StatusName, string>>;
		/** When false, the icon is silent so a parent control can name it. */
		announce?: boolean;
		/** Fires when a morph starts, after the first render. */
		onchange?: (state: StatusName) => void;
		/** Fires when the springs have settled on `state`. */
		oncomplete?: (state: StatusName) => void;
		class?: string;
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
		announce = true,
		onchange,
		oncomplete,
		class: className = ''
	}: MorphStatusProps = $props();

	const phase = $derived(normalizeStatus(status));
	const px = $derived(Math.max(1, size));
	const weight = $derived(Math.min(28, Math.max(0.5, strokeWidth)));
	const palette = $derived({ ...DEFAULT_COLORS, ...colors });
	const caption = $derived(statusLabel(phase, labels, label));
	const springStiffness = $derived(clampUnit(stiffness));
	const springDamping = $derived(clampUnit(damping));

	const initialName = untrack(() => normalizeStatus(status));
	const initialHex = untrack(() => ({ ...DEFAULT_COLORS, ...colors })[initialName]);

	const shape = new Spring(glyphFor(initialName), {
		stiffness: untrack(() => springStiffness),
		damping: untrack(() => springDamping),
		precision: 0.15
	});

	const ink = new Spring<RGB>(parseColor(initialHex, fallbackRgb(initialName)), {
		stiffness: untrack(() => springStiffness),
		damping: untrack(() => springDamping),
		precision: 0.4
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
	let seenHex = initialHex;
	let generation = 0;

	function paintAngle(next: number) {
		angle = next;
		const node = rotor;
		if (!node) return;
		if (next === 0) node.removeAttribute('transform');
		else node.setAttribute('transform', `rotate(${(next * 180) / Math.PI} 50 50)`);
	}

	const live = $derived(shape.current);
	const color = $derived(rgbCss(ink.current));
	const markA = $derived(toPath(live.a));
	const markB = $derived(toPath(live.b));

	$effect(() => {
		shape.stiffness = springStiffness;
		shape.damping = springDamping;
		ink.stiffness = springStiffness;
		ink.damping = springDamping;
	});

	$effect(() => {
		const next = phase;
		const reduced = prefersReducedMotion.current;
		const hex = palette[next];
		const stateChanged = next !== seenName;
		const colorChanged = hex !== seenHex;
		if (!stateChanged && !colorChanged && !reduced) return;
		if (stateChanged) seenName = next;
		if (colorChanged) seenHex = hex;
		untrack(() => morph(next, hex, reduced, stateChanged));
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
		return () => {
			generation += 1;
		};
	});

	function morph(next: StatusName, hex: string, reduced: boolean, stateChanged: boolean) {
		const token = ++generation;
		const rgb = parseColor(hex, fallbackRgb(next));
		const settled = () => {
			if (token !== generation) return;
			oncomplete?.(next);
		};

		if (!stateChanged) {
			if (reduced) {
				paintAngle(0);
				void shape.set(glyphFor(next), { instant: true });
			}
			void ink.set(rgb, reduced ? { instant: true } : undefined);
			return;
		}

		onchange?.(next);

		const target = glyphFor(next);
		if (reduced) {
			paintAngle(0);
			void Promise.all([
				shape.set(target, { instant: true }),
				ink.set(rgb, { instant: true })
			]).then(settled);
			return;
		}

		// The arc is drawn in local space and rotated. Fold that rotation in
		// before the spring runs, or the pour would jump back to 12 o'clock.
		const baked = bakeRotation(shape.current, angle);
		paintAngle(0);
		shape.set(alignGlyph(baked, target), { instant: true });
		void Promise.all([shape.set(target), ink.set(rgb)]).then(settled);
	}
</script>

<span
	class={['morph-status', className]}
	data-state={phase}
	style:width="{px}px"
	style:height="{px}px"
	role={announce ? 'status' : undefined}
	aria-live={announce ? 'polite' : undefined}
	aria-atomic={announce ? 'true' : undefined}
>
	<svg width={px} height={px} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
		<g {@attach trackRotor}>
			{#if live.revealA > 0.015}
				<path
					d={markA}
					fill="none"
					stroke={color}
					stroke-width={weight}
					stroke-linecap="round"
					stroke-linejoin="round"
					pathLength="1"
					stroke-dasharray="1"
					stroke-dashoffset={1 - live.revealA}
				/>
			{/if}
			{#if live.revealB > 0.015}
				<path
					d={markB}
					fill="none"
					stroke={color}
					stroke-width={weight}
					stroke-linecap="round"
					stroke-linejoin="round"
					pathLength="1"
					stroke-dasharray="1"
					stroke-dashoffset={1 - live.revealB}
				/>
			{/if}
		</g>
	</svg>
	{#if announce}
		<span class="sr">{caption}</span>
	{/if}
</span>

<style>
	.morph-status {
		position: relative;
		display: inline-block;
		flex: none;
		line-height: 0;
		vertical-align: middle;
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
		white-space: nowrap;
		border: 0;
	}
</style>
