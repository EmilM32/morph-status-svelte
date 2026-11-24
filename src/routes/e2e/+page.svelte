<script lang="ts">
	// Playwright fixture (see e2e/). The icon renders next to a reference: a plain
	// SVG of the same resting glyph, with no pathLength, dashes or component CSS.
	// At rest the two must paint the same pixels in every browser.
	import { MorphStatus, type MorphStatusProps, type StatusName } from '#lib';
	import { glyphFor, toPath } from '#lib/status/geometry.js';

	const INK = '#000000';

	let props = $state<MorphStatusProps>({ state: 'idle', size: 64, strokeWidth: 10 });
	const events: string[] = [];

	const size = $derived(props.size ?? 32);
	const glyph = $derived(glyphFor((props.state ?? 'idle') as StatusName));

	$effect(() => {
		Object.assign(window, {
			__e2e: {
				set: (next: Partial<MorphStatusProps>) => Object.assign(props, next),
				events
			}
		});
	});
</script>

<div class="row">
	<div class="cell" id="icon" style:--morph-status-color-duration="0s">
		<MorphStatus
			{...props}
			onchange={(s) => events.push(`change:${s}`)}
			oncomplete={(s) => events.push(`complete:${s}`)}
		/>
	</div>
	<div class="cell" id="ref">
		<svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
			{#each glyph.revealB > 0 ? [glyph.a, glyph.b] : [glyph.a] as points, i (i)}
				<path
					d={toPath(points)}
					fill="none"
					stroke={INK}
					stroke-width={props.strokeWidth}
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			{/each}
		</svg>
	</div>
</div>

<style>
	:global(html),
	:global(body) {
		background: #ffffff;
	}

	.row {
		display: flex;
		gap: 16px;
		padding: 16px;
	}

	.cell {
		padding: 12px;
		background: #ffffff;
		line-height: 0;
	}

	svg {
		display: block;
		overflow: visible;
	}
</style>
