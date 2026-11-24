<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { DEFAULT_LABELS, MorphStatus, STATUS_STATES, type StatusName } from '#lib';
	import { colorPresets, sizePresets, surfaces, type Surface } from '../demo/presets.ts';
	import SaveBar from '../demo/SaveBar.svelte';

	const states: { id: StatusName; label: string; key: string }[] = [
		{ id: 'idle', label: 'Idle', key: '1' },
		{ id: 'loading', label: 'Loading', key: '2' },
		{ id: 'success', label: 'Success', key: '3' },
		{ id: 'error', label: 'Error', key: '4' },
		{ id: 'warning', label: 'Warning', key: '5' }
	];

	let phase = $state<StatusName>('idle');
	// The visitor's Play/Pause choice. Until they make one, autoplay runs unless
	// they prefer reduced motion. Play still works then: it is an explicit choice.
	let choice = $state<boolean | null>(null);
	let presetId = $state('default');
	let sizeId = $state<'s' | 'm' | 'l'>('l');
	let surface = $state<Surface>('dark');
	let switcher = $state<HTMLElement>();

	const preset = $derived(colorPresets.find((item) => item.id === presetId) ?? colorPresets[0]);
	const sizing = $derived(sizePresets.find((item) => item.id === sizeId) ?? sizePresets[2]);
	const playing = $derived(choice ?? !prefersReducedMotion.current);

	$effect(() => {
		document.documentElement.dataset.theme = surface;
	});

	$effect(() => {
		if (!playing) return;
		const current = phase;
		const wait = current === 'loading' ? 1680 : 1280;
		const id = setTimeout(() => {
			const index = STATUS_STATES.indexOf(current);
			phase = STATUS_STATES[(index + 1) % STATUS_STATES.length];
		}, wait);
		return () => clearTimeout(id);
	});

	function pick(next: StatusName) {
		choice = false;
		phase = next;
	}

	// Keys 1–5 pick a state only while focus is in the status group, so a
	// single-key shortcut never fires from elsewhere on the page (WCAG 2.1.4).
	function onKey(event: KeyboardEvent) {
		if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing || event.repeat) return;
		if (!(event.target instanceof Node) || !switcher?.contains(event.target)) return;
		const index = ['1', '2', '3', '4', '5'].indexOf(event.key);
		if (index === -1) return;
		event.preventDefault();
		pick(STATUS_STATES[index]);
	}
</script>

<svelte:window onkeydown={onKey} />

<main>
	<p class="eyebrow">morph-status-svelte</p>
	<h1>One <em>stroke</em></h1>
	<p class="lede">
		Idle, loading, success, error, warning. The same ink pours into the next shape — a spring on
		the path, and a quiet shift of color.
	</p>

	<div class="sources">
		<a
			class="repo"
			href="https://github.com/EmilM32/morph-status-svelte"
			target="_blank"
			rel="noopener noreferrer"
		>
			<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
				<path
					fill="currentColor"
					d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.7 7.7 0 0 1 8 4.77c.68.003 1.36.092 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
				/>
			</svg>
			GitHub
		</a>
		<code class="install">npm i morph-status-svelte</code>
	</div>

	<div class="well">
		<MorphStatus
			state={phase}
			size={sizing.size}
			strokeWidth={sizing.stroke}
			colors={preset.colors}
			a11y={playing ? 'hidden' : 'polite'}
		/>
	</div>
	<p class="now">{DEFAULT_LABELS[phase]}</p>

	<div class="switcher" role="group" aria-label="Status" bind:this={switcher}>
		{#each states as item (item.id)}
			<button
				type="button"
				aria-pressed={phase === item.id}
				aria-keyshortcuts={item.key}
				onclick={() => pick(item.id)}
			>
				<MorphStatus state={item.id} size={18} strokeWidth={12} colors={preset.colors} a11y="hidden" />
				{item.label}
				<kbd>{item.key}</kbd>
			</button>
		{/each}
		<button type="button" class="play" onclick={() => (choice = !playing)}>
			{playing ? 'Pause' : 'Play'}
		</button>
	</div>

	<div class="presets">
		<div class="group" role="group" aria-label="Color preset">
			{#each colorPresets as item (item.id)}
				<button type="button" aria-pressed={presetId === item.id} onclick={() => (presetId = item.id)}>
					{item.label}
				</button>
			{/each}
		</div>
		<div class="group" role="group" aria-label="Size preset">
			{#each sizePresets as item (item.id)}
				<button type="button" aria-pressed={sizeId === item.id} onclick={() => (sizeId = item.id)}>
					{item.label}
				</button>
			{/each}
		</div>
		<div class="group" role="group" aria-label="Surface">
			{#each surfaces as item (item.id)}
				<button type="button" aria-pressed={surface === item.id} onclick={() => (surface = item.id)}>
					{item.label}
				</button>
			{/each}
		</div>
	</div>

	<SaveBar />

	<p class="path">src/lib/status</p>
</main>

<style>
	main {
		width: min(760px, calc(100% - 40px));
		margin: 0 auto;
		padding: clamp(48px, 8vh, 84px) 0 72px;
		text-align: center;
	}

	.eyebrow,
	.now,
	.path {
		margin: 0;
		color: var(--muted);
		font-size: 12px;
		font-weight: 500;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}

	h1 {
		margin: 12px 0 0;
		font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif;
		font-size: clamp(72px, 12vw, 112px);
		font-weight: 400;
		letter-spacing: -0.04em;
		line-height: 0.86;
	}

	h1 em {
		font-style: italic;
	}

	.lede {
		max-width: 38ch;
		margin: 18px auto 0;
		color: var(--muted);
		font-size: 18px;
		line-height: 1.45;
	}

	.sources {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 10px 14px;
		margin-top: 22px;
	}

	.repo {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 32px;
		color: var(--ink);
		font-size: 13px;
		font-weight: 500;
		text-decoration: none;
	}

	.repo:hover {
		color: var(--muted);
	}

	.repo:focus-visible,
	.switcher button:focus-visible,
	.group button:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 3px;
	}

	.install {
		padding: 7px 12px;
		border: 1px solid var(--line);
		border-radius: 999px;
		color: var(--muted);
		font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
		font-size: 12px;
		line-height: 1;
	}

	.well {
		display: grid;
		width: min(300px, 86vw);
		height: min(300px, 86vw);
		margin: 28px auto 0;
		place-items: center;
		border-radius: 50%;
		background: radial-gradient(circle at 50% 42%, var(--glow), transparent 62%);
	}

	.now {
		margin-top: 8px;
		letter-spacing: 0.22em;
	}

	.switcher {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 4px;
		width: fit-content;
		max-width: 100%;
		margin: 22px auto 0;
		padding: 4px;
		border-radius: 18px;
		background: var(--surface);
	}

	.switcher button,
	.group button {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 40px;
		padding: 0 12px;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: inherit;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
	}

	.switcher button:hover,
	.group button:hover {
		background: var(--surface-hover);
	}

	/* Same scheme as the page, so every preset's icon keeps its contrast on the selected state. */
	.switcher button[aria-pressed='true'] {
		background: var(--surface-pressed);
		box-shadow: inset 0 0 0 1px var(--line);
	}

	.group button[aria-pressed='true'] {
		background: var(--ink);
		color: var(--bg);
	}

	.play {
		position: relative;
		margin-left: 9px;
		color: var(--muted);
	}

	.play::before {
		content: '';
		position: absolute;
		top: 10px;
		bottom: 10px;
		left: -7px;
		width: 1px;
		background: var(--line);
	}

	kbd {
		color: currentColor;
		opacity: 0.7;
		font-family: inherit;
		font-size: 11px;
	}

	.presets {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 10px;
		margin-top: 16px;
	}

	.group {
		display: flex;
		padding: 3px;
		border-radius: 999px;
		background: var(--surface);
	}

	.path {
		margin-top: 28px;
		letter-spacing: 0.08em;
		text-transform: none;
		font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
		font-size: 12px;
		font-weight: 400;
	}

	@media (max-width: 560px) {
		kbd {
			display: none;
		}

		h1 {
			font-size: 68px;
		}
	}
</style>
