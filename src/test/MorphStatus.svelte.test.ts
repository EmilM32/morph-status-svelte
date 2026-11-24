import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import MorphStatus, { type MorphStatusProps } from '../lib/status/MorphStatus.svelte';
import { DEFAULT_SIZE, DEFAULT_STROKE, LIVE_REGION_DELAY, type StatusName } from '../lib/status/types.js';
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
	const text = (root: HTMLElement) => root.querySelector('.sr')?.textContent ?? null;

	it('is a polite live region whose text follows the state', () => {
		const icon = render({ labels: { error: 'Upload failed' } });
		const root = icon.root();
		expect(root.getAttribute('role')).toBe('status');
		expect(root.getAttribute('aria-live')).toBe('polite');
		expect(root.getAttribute('aria-atomic')).toBe('true');
		expect(text(root)).toBe('Idle');
		icon.update({ state: 'error' });
		expect(text(root)).toBe('Upload failed');
	});

	it('puts `label` in front of the state name', () => {
		const icon = render({ label: 'Upload' });
		icon.update({ state: 'loading' });
		expect(text(icon.root())).toBe('Upload: Loading');
	});

	it('hides the drawing from assistive tech', () => {
		const svg = render().target.querySelector('svg')!;
		expect(svg.getAttribute('aria-hidden')).toBe('true');
		expect(svg.getAttribute('focusable')).toBe('false');
	});

	it('is an assertive live region with a11y="assertive"', () => {
		const icon = render({ a11y: 'assertive' });
		const root = icon.root();
		expect(root.hasAttribute('role')).toBe(false);
		expect(root.getAttribute('aria-live')).toBe('assertive');
		expect(root.getAttribute('aria-atomic')).toBe('true');
		icon.update({ state: 'error' });
		expect(text(root)).toBe('Error');
	});

	it('is a named image that never announces with a11y="image"', () => {
		const icon = render({ a11y: 'image', label: 'Build' });
		const root = icon.root();
		expect(root.getAttribute('role')).toBe('img');
		expect(root.getAttribute('aria-label')).toBe('Build: Idle');
		expect(root.hasAttribute('aria-live')).toBe(false);
		expect(text(root)).toBeNull();
		icon.update({ state: 'success' });
		expect(root.getAttribute('aria-label')).toBe('Build: Success');
	});

	it('is hidden with a11y="hidden"', () => {
		const root = render({ a11y: 'hidden', state: 'error' }).root();
		expect(root.getAttribute('aria-hidden')).toBe('true');
		expect(root.hasAttribute('role')).toBe(false);
		expect(root.hasAttribute('aria-live')).toBe(false);
		expect(root.hasAttribute('aria-label')).toBe(false);
		expect(root.textContent?.trim()).toBe('');
	});

	it('keeps the deprecated announce working, with a11y taking precedence', () => {
		expect(render({ announce: false }).root().getAttribute('aria-hidden')).toBe('true');
		expect(render({ announce: true }).root().getAttribute('role')).toBe('status');
		expect(render({ announce: false, a11y: 'image' }).root().getAttribute('role')).toBe('img');
	});

	it('fills a live region mounted in a non-idle state after a moment, so it is announced', async () => {
		const root = render({ state: 'error' }).root();
		expect(root.getAttribute('role')).toBe('status');
		expect(text(root)).toBe('');
		await sleep(LIVE_REGION_DELAY + 50);
		expect(text(root)).toBe('Error');
	});

	it('fills an idle live region at once on mount, with nothing to announce', () => {
		expect(text(render().root())).toBe('Idle');
	});

	it('fills a live region that appears together with a state change after a moment', async () => {
		const icon = render({ a11y: 'hidden' });
		icon.update({ a11y: 'polite', state: 'success' });
		expect(icon.root().getAttribute('role')).toBe('status');
		expect(text(icon.root())).toBe('');
		await sleep(LIVE_REGION_DELAY + 50);
		expect(text(icon.root())).toBe('Success');
	});

	it('updates at once when the region already existed', async () => {
		const icon = render({ state: 'error' });
		await sleep(LIVE_REGION_DELAY + 50);
		icon.update({ state: 'success' });
		expect(text(icon.root())).toBe('Success');
	});

	it('lands the latest text when the state changes during the delay', async () => {
		const icon = render({ state: 'loading' });
		icon.update({ state: 'error' });
		await sleep(LIVE_REGION_DELAY + 50);
		expect(text(icon.root())).toBe('Error');
	});
});

describe('MorphStatus attributes', () => {
	it('passes other attributes and handlers to the root', () => {
		let clicks = 0;
		const icon = render({
			id: 'upload-status',
			title: 'Upload status',
			'data-testid': 'status',
			'aria-describedby': 'upload-help',
			onclick: () => clicks++
		} as MorphStatusProps);
		const root = icon.root();
		expect(root.id).toBe('upload-status');
		expect(root.title).toBe('Upload status');
		expect(root.dataset.testid).toBe('status');
		expect(root.getAttribute('aria-describedby')).toBe('upload-help');
		root.click();
		expect(clicks).toBe(1);
	});

	it('merges a style attribute with its own size', () => {
		const root = render({ style: 'margin-left: 4px', size: 20 }).root();
		expect(root.style.marginLeft).toBe('4px');
		expect(root.style.width).toBe('20px');
	});

	it('takes class values the way Svelte does', () => {
		const root = render({ class: ['a', { b: true, c: false }] }).root();
		expect([...root.classList]).toEqual(expect.arrayContaining(['morph-status', 'a', 'b']));
		expect(root.classList.contains('c')).toBe(false);
	});

	it('keeps the attributes it owns', () => {
		const root = render({ role: 'button', 'aria-hidden': 'true', 'aria-label': 'x' } as unknown as MorphStatusProps).root();
		expect(root.getAttribute('role')).toBe('status');
		expect(root.hasAttribute('aria-hidden')).toBe(false);
		expect(root.hasAttribute('aria-label')).toBe(false);
	});
});

describe('MorphStatus colors', () => {
	it('strokes in currentColor so CSS owns the color', () => {
		const icon = render({ state: 'error' });
		for (const path of icon.paths()) expect(path.getAttribute('stroke')).toBe('currentColor');
	});

	it('sets each colors entry as a custom property on the root', () => {
		const icon = render({ colors: { success: 'oklch(70% 0.2 150)', error: 'var(--brand-danger)' } });
		const style = icon.root().style;
		expect(style.getPropertyValue('--morph-status-success')).toBe('oklch(70% 0.2 150)');
		expect(style.getPropertyValue('--morph-status-error')).toBe('var(--brand-danger)');
		expect(style.getPropertyValue('--morph-status-idle')).toBe('');
	});

	it('updates and removes the custom property as colors change', () => {
		const icon = render({ colors: { idle: '#111111' } });
		icon.update({ colors: { idle: '#222222' } });
		expect(icon.root().style.getPropertyValue('--morph-status-idle')).toBe('#222222');
		icon.update({ colors: {} });
		expect(icon.root().style.getPropertyValue('--morph-status-idle')).toBe('');
	});

	it('ignores a value that would end the declaration', () => {
		const icon = render({ colors: { idle: 'red; display: none' } });
		expect(icon.root().style.getPropertyValue('--morph-status-idle')).toBe('');
		expect(icon.root().style.display).toBe('');
	});

	it('ignores a value the browser does not parse as a color', () => {
		const previous = globalThis.CSS;
		globalThis.CSS = { supports: (_property: string, value: string) => value !== 'not-a-color' } as typeof CSS;
		try {
			const icon = render({ colors: { idle: 'not-a-color', error: 'tomato' } });
			expect(icon.root().style.getPropertyValue('--morph-status-idle')).toBe('');
			expect(icon.root().style.getPropertyValue('--morph-status-error')).toBe('tomato');
		} finally {
			globalThis.CSS = previous;
		}
	});

	it('does not restart or re-report a morph when colors change', async () => {
		const icon = render();
		icon.update({ state: 'success' });
		await sleep(40);
		icon.update({ colors: { success: 'teal' } });
		await waitFor(() => icon.completes().length > 0);
		await sleep(100);
		expect(icon.events).toEqual(['change:success', 'complete:success']);
	});
});
