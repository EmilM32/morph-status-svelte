<script lang="ts">
	import { MorphStatus, type StatusName } from '#lib';

	let phase = $state<StatusName>('idle');
	let outcome = $state<'success' | 'error'>('success');
	let timer: ReturnType<typeof setTimeout> | undefined;

	const label = $derived(
		phase === 'loading' ? 'Saving' : phase === 'success' ? 'Saved' : phase === 'error' ? 'Retry' : 'Save'
	);

	// A change of the button's own text is not announced, so the outcome goes to a
	// live region next to it. The region is in the page from the start, empty.
	const message = $derived(
		phase === 'loading' ? 'Saving…' : phase === 'success' ? 'Saved' : phase === 'error' ? 'Save failed' : ''
	);

	function save() {
		if (phase === 'loading') return;
		phase = 'loading';
		clearTimeout(timer);
		timer = setTimeout(() => {
			phase = outcome;
			timer = setTimeout(() => {
				if (phase === 'success' || phase === 'error') phase = 'idle';
			}, 1500);
		}, 1100);
	}

	function pick(next: 'success' | 'error') {
		outcome = next;
	}

	$effect(() => () => clearTimeout(timer));
</script>

<section class="card" aria-labelledby="save-heading">
	<div class="copy">
		<h2 id="save-heading">Save</h2>
		<p>The button keeps the icon. Loading, then the outcome you picked.</p>
	</div>

	<div class="controls">
		<div class="outcomes" role="group" aria-label="Save outcome">
			<button type="button" aria-pressed={outcome === 'success'} onclick={() => pick('success')}>
				Succeed
			</button>
			<button type="button" aria-pressed={outcome === 'error'} onclick={() => pick('error')}>
				Fail
			</button>
		</div>
		<!-- aria-disabled, not disabled: the button keeps focus while it saves. -->
		<button type="button" class="save" onclick={save} aria-disabled={phase === 'loading'}>
			<MorphStatus state={phase} size={22} strokeWidth={11} a11y="hidden" />
			{label}
		</button>
		<span class="visually-hidden" role="status">{message}</span>
	</div>
</section>

<style>
	.card {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 18px 28px;
		width: min(640px, 100%);
		margin: 28px auto 0;
		padding: 18px 18px 18px 22px;
		border: 1px solid var(--line);
		border-radius: 22px;
		background: var(--surface);
		text-align: left;
	}

	h2 {
		margin: 0;
		font-size: 15px;
		font-weight: 500;
		letter-spacing: -0.01em;
	}

	p {
		margin: 4px 0 0;
		color: var(--muted);
		font-size: 13px;
		line-height: 1.4;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
	}

	.outcomes {
		display: flex;
		padding: 3px;
		border-radius: 999px;
		background: var(--surface);
	}

	.outcomes button {
		min-height: 32px;
		padding: 0 12px;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: var(--muted);
		cursor: pointer;
		font-size: 13px;
		font-weight: 500;
	}

	.outcomes button[aria-pressed='true'] {
		background: var(--surface-pressed);
		color: var(--ink);
	}

	.save {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		padding: 0 16px 0 12px;
		border: 0;
		border-radius: 999px;
		/* The inverse of the page. Its own color-scheme makes the icon pick the matching default colors. */
		color-scheme: var(--inverse-scheme);
		background: var(--inverse-bg);
		color: var(--inverse-ink);
		cursor: pointer;
		font-size: 14px;
		font-weight: 600;
	}

	.save[aria-disabled='true'] {
		cursor: progress;
	}

	.save:focus-visible,
	.outcomes button:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 3px;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}
</style>
