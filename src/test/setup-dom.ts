// jsdom has no matchMedia. This stand-in answers `prefers-reduced-motion`
// and lets a test flip it, firing a real `change` event the way a browser does.

const REDUCED = '(prefers-reduced-motion: reduce)';
let reduced = false;

class FakeMediaQueryList extends EventTarget {
	readonly media: string;
	onchange: ((event: Event) => void) | null = null;

	constructor(media: string) {
		super();
		this.media = media;
	}

	get matches(): boolean {
		return this.media.replace(/\s+/g, ' ').trim() === REDUCED ? reduced : false;
	}

	addListener(listener: (event: Event) => void) {
		this.addEventListener('change', listener);
	}

	removeListener(listener: (event: Event) => void) {
		this.removeEventListener('change', listener);
	}
}

const lists = new Set<FakeMediaQueryList>();

window.matchMedia = (media: string) => {
	const list = new FakeMediaQueryList(media);
	lists.add(list);
	return list as unknown as MediaQueryList;
};

/** Turn `prefers-reduced-motion: reduce` on or off for the current test. */
export function setReducedMotion(next: boolean): void {
	if (next === reduced) return;
	reduced = next;
	for (const list of lists) list.dispatchEvent(new Event('change'));
}
