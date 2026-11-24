import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import MorphStatus, { type MorphStatusProps } from '../lib/status/MorphStatus.svelte';
import { DEFAULT_SIZE, DEFAULT_STROKE, type StatusName } from '../lib/status/types.js';
import { trackUnhandledRejections } from './rejections.js';
import { setReducedMotion } from './setup-dom.js';

const rejections = trackUnhandledRejections();
const mounted: (() => void)[] = [];

afterEach(() => {
	while (mounted.length) mounted.pop()?.();
	setReducedMotion(false);
});

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(check: () => boolean, timeout = 2500) {
	const start = performance.now();
	while (!check()) {
		if (performance.now() - start > timeout) throw new Error(`timed out after ${timeout} ms`);
		await sleep(10);
	}
}

function render(initial: Omit<MorphStatusProps, 'onchange' | 'oncomplete'> = {}) {
	const events: string[] = [];
	const props: MorphStatusProps = $state({
		...initial,
		onchange: (s: StatusName) => events.push(`change:${s}`),
		oncomplete: (s: StatusName) => events.push(`complete:${s}`)
	});
	const target = document.createElement('div');
	document.body.append(target);
	const component = mount(MorphStatus, { target, props });
	flushSync();

	let alive = true;
	const destroy = () => {
		if (!alive) return;
		alive = false;
		unmount(component);
		target.remove();
	};
	mounted.push(destroy);

	const update = (next: Partial<MorphStatusProps>) => {
		Object.assign(props, next);
		flushSync();
	};
	const root = () => target.querySelector<HTMLElement>('.morph-status')!;
	const paths = () => [...target.querySelectorAll('path')];
	const completes = () => events.filter((e) => e.startsWith('complete:'));
	return { events, update, destroy, root, paths, completes, target };
}

describe('MorphStatus callbacks', () => {
	it('stays quiet on mount', async () => {
		const icon = render({ state: 'error' });
		await sleep(100);
		expect(icon.events).toEqual([]);
		expect(icon.root().dataset.state).toBe('error');
	});

	it('reports a morph once: onchange first, then oncomplete when it settles', async () => {
		const icon = render();
		icon.update({ state: 'success' });
		expect(icon.events).toEqual(['change:success']);
		await waitFor(() => icon.completes().length > 0);
		await sleep(100);
		expect(icon.events).toEqual(['change:success', 'complete:success']);
	});

	it('completes only the last of several interrupting morphs, with no unhandled rejection', async () => {
		const icon = render();
		for (const state of ['loading', 'success', 'error', 'warning', 'idle', 'error'] as const) {
			icon.update({ state });
			await sleep(30);
		}
		await waitFor(() => icon.completes().length > 0);
		await sleep(100);
		expect(icon.completes()).toEqual(['complete:error']);
		expect(rejections).toEqual([]);
	});

	it('still completes when colors change mid-morph', async () => {
		const icon = render();
		icon.update({ state: 'success' });
		await sleep(40);
		icon.update({ colors: { success: '#00aa00' } });
		await waitFor(() => icon.completes().length > 0);
		await sleep(100);
		expect(icon.completes()).toEqual(['complete:success']);
		expect(rejections).toEqual([]);
	});

	it('still completes when reduced motion turns on mid-morph', async () => {
		const icon = render();
		icon.update({ state: 'warning' });
		await sleep(40);
		setReducedMotion(true);
		flushSync();
		await waitFor(() => icon.completes().length > 0, 300);
		expect(icon.completes()).toEqual(['complete:warning']);
	});

	it('never completes after unmount', async () => {
		const icon = render();
		icon.update({ state: 'error' });
		await sleep(40);
		icon.destroy();
		await sleep(800);
		expect(icon.completes()).toEqual([]);
		expect(rejections).toEqual([]);
	});

	it.each([
		['stiffness', 0],
		['damping', 0],
		['stiffness', Number.NaN],
		['damping', Number.NaN]
	] as const)('settles with %s = %s', async (key, value) => {
		const icon = render({ [key]: value });
		icon.update({ state: 'success' });
		await waitFor(() => icon.completes().length > 0, 5000);
		expect(icon.completes()).toEqual(['complete:success']);
	}, 8000);
});

describe('MorphStatus motion', () => {
	it('snaps to the target under reduced motion', async () => {
		setReducedMotion(true);
		const icon = render();
		icon.update({ state: 'error' });
		expect(icon.paths()).toHaveLength(2);
		await sleep(0);
		expect(icon.events).toEqual(['change:error', 'complete:error']);
	});

	it('spins while loading and folds the angle in when it leaves', async () => {
		const icon = render();
		const rotor = () => icon.target.querySelector('g')!;
		icon.update({ state: 'loading' });
		await waitFor(() => rotor().hasAttribute('transform'));
		icon.update({ state: 'success' });
		expect(rotor().hasAttribute('transform')).toBe(false);
	});

	it('holds the spinner still under reduced motion', async () => {
		setReducedMotion(true);
		const icon = render({ state: 'loading' });
		await sleep(100);
		expect(icon.target.querySelector('g')!.hasAttribute('transform')).toBe(false);
	});
});

describe('MorphStatus props', () => {
	it('falls back to defaults when a size or stroke turns non-finite', () => {
		const icon = render({ size: 48, strokeWidth: 6 });
		icon.update({ size: Number.NaN, strokeWidth: Infinity });
		const svg = icon.target.querySelector('svg')!;
		expect(svg.getAttribute('width')).toBe(String(DEFAULT_SIZE));
		expect(icon.root().style.width).toBe(`${DEFAULT_SIZE}px`);
		expect(icon.paths()[0].getAttribute('stroke-width')).toBe(String(DEFAULT_STROKE));
	});

	it('passes the class through', () => {
		const icon = render({ class: 'extra' });
		expect(icon.root().classList).toContain('extra');
		expect(icon.root().classList).toContain('morph-status');
	});
});

describe('MorphStatus accessibility', () => {
	it('is a polite live region whose text follows the state', () => {
		const icon = render({ labels: { error: 'Upload failed' } });
		const root = icon.root();
		expect(root.getAttribute('role')).toBe('status');
		expect(root.getAttribute('aria-live')).toBe('polite');
		expect(root.textContent?.trim()).toBe('Idle');
		icon.update({ state: 'error' });
		expect(root.textContent?.trim()).toBe('Upload failed');
	});

	it('hides the drawing from assistive tech', () => {
		const svg = render().target.querySelector('svg')!;
		expect(svg.getAttribute('aria-hidden')).toBe('true');
		expect(svg.getAttribute('focusable')).toBe('false');
	});

	it('is silent with announce={false}', () => {
		const root = render({ announce: false, state: 'error' }).root();
		expect(root.hasAttribute('role')).toBe(false);
		expect(root.hasAttribute('aria-live')).toBe(false);
		expect(root.textContent?.trim()).toBe('');
	});
});
