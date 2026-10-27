<script lang="ts">
	import { MorphStatus, type StatusName } from '#lib';

	let phase = $state<StatusName>('idle');
	let outcome = $state<'success' | 'error'>('success');
	let timer: ReturnType<typeof setTimeout> | undefined;

	const label = $derived(
		phase === 'loading' ? 'Saving' : phase === 'success' ? 'Saved' : phase === 'error' ? 'Retry' : 'Save'
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
		<button type="button" class="save" onclick={save} disabled={phase === 'loading'} aria-busy={phase === 'loading'}>
			<MorphStatus state={phase} size={22} strokeWidth={11} announce={false} />
			{label}
		</button>
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
		border: 1px solid rgba(245, 245, 247, 0.1);
		border-radius: 22px;
		background: rgba(255, 255, 255, 0.03);
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
		background: rgba(255, 255, 255, 0.05);
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
		background: rgba(255, 255, 255, 0.1);
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
		background: #f5f5f7;
		color: #111113;
		cursor: pointer;
		font-size: 14px;
		font-weight: 600;
	}

	.save:disabled {
		cursor: progress;
	}

	.save:focus-visible,
	.outcomes button:focus-visible {
		outline: 2px solid #f5f5f7;
		outline-offset: 3px;
	}
</style>
