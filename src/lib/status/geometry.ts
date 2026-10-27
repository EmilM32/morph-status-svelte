import { DEFAULT_COLORS, type StatusName } from './types.js';

/** Shared sample count so every mark can pour into the next. */
export const POINT_COUNT = 28;

export type Pt = { x: number; y: number };

export type Glyph = {
	a: Pt[];
	b: Pt[];
	revealA: number;
	revealB: number;
};

export type RGB = { r: number; g: number; b: number };

const CENTER = 50;
const RADIUS = 30;

export function arc(cx: number, cy: number, r: number, start: number, sweep: number, count = POINT_COUNT): Pt[] {
	const pts: Pt[] = [];
	for (let i = 0; i < count; i++) {
		const t = count === 1 ? 0 : i / (count - 1);
		const angle = start + sweep * t;
		pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
	}
	return pts;
}

export function line(x1: number, y1: number, x2: number, y2: number, count = POINT_COUNT): Pt[] {
	const pts: Pt[] = [];
	for (let i = 0; i < count; i++) {
		const t = count === 1 ? 0 : i / (count - 1);
		pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
	}
	return pts;
}

export function collapsed(x: number, y: number, count = POINT_COUNT): Pt[] {
	return Array.from({ length: count }, () => ({ x, y }));
}

/** Full ring. The last sample sits on the first so round caps close without a bump. */
function ring(cx: number, cy: number, r: number): Pt[] {
	const pts = arc(cx, cy, r, -Math.PI / 2, Math.PI * 2);
	pts[pts.length - 1] = { ...pts[0] };
	return pts;
}

function through(anchors: Pt[]): Pt[] {
	return slicePolyline(anchors, 0, polylineLength(anchors), POINT_COUNT);
}

export function polylineLength(points: Pt[]): number {
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
	}
	return total;
}

function pointAt(points: Pt[], distance: number): Pt {
	if (points.length === 0) return { x: CENTER, y: CENTER };
	if (distance <= 0) return { ...points[0] };
	let walked = 0;
	for (let i = 1; i < points.length; i++) {
		const dx = points[i].x - points[i - 1].x;
		const dy = points[i].y - points[i - 1].y;
		const span = Math.hypot(dx, dy);
		if (walked + span >= distance || i === points.length - 1) {
			const t = span === 0 ? 0 : Math.min(1, Math.max(0, (distance - walked) / span));
			return { x: points[i - 1].x + dx * t, y: points[i - 1].y + dy * t };
		}
		walked += span;
	}
	return { ...points[points.length - 1] };
}

function slicePolyline(points: Pt[], start: number, end: number, count: number): Pt[] {
	const span = Math.max(0, end - start);
	const out: Pt[] = [];
	for (let i = 0; i < count; i++) {
		const t = count === 1 ? 0 : i / (count - 1);
		out.push(pointAt(points, start + span * t));
	}
	return out;
}

function split(points: Pt[]): [Pt[], Pt[]] {
	const total = polylineLength(points);
	const mid = total / 2;
	return [
		slicePolyline(points, 0, mid, points.length),
		slicePolyline(points, mid, total, points.length)
	];
}

const CHECK = through([
	{ x: 28, y: 53 },
	{ x: 46, y: 71 },
	{ x: 76, y: 35 }
]);

const CROSS_A = line(28, 28, 72, 72);
const CROSS_B = line(72, 28, 28, 72);
const STEM = line(CENTER, 24, CENTER, 56);
const DOT = arc(CENTER, 76, 3.1, -Math.PI / 2, Math.PI * 2 * 0.999);

const SHAPES: Record<StatusName, Glyph> = {
	idle: { a: ring(CENTER, CENTER, RADIUS), b: collapsed(CENTER, CENTER), revealA: 1, revealB: 0 },
	// Open at the top. Rotation is applied by the component, not baked in.
	loading: {
		a: arc(CENTER, CENTER, RADIUS, -Math.PI / 2, Math.PI * 1.62),
		b: collapsed(CENTER, CENTER),
		revealA: 1,
		revealB: 0
	},
	success: { a: CHECK, b: collapsed(CHECK[CHECK.length - 1].x, CHECK[CHECK.length - 1].y), revealA: 1, revealB: 0 },
	error: { a: CROSS_A, b: CROSS_B, revealA: 1, revealB: 1 },
	warning: { a: STEM, b: DOT, revealA: 1, revealB: 1 }
};

function copyGlyph(source: Glyph): Glyph {
	return {
		a: source.a.map((p) => ({ ...p })),
		b: source.b.map((p) => ({ ...p })),
		revealA: source.revealA,
		revealB: source.revealB
	};
}

export function glyphFor(state: StatusName): Glyph {
	return copyGlyph(SHAPES[state]);
}

export function toPath(points: Pt[]): string {
	if (points.length === 0) return '';
	let d = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
	for (let i = 1; i < points.length; i++) {
		d += `L${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`;
	}
	return d;
}

function travel(a: Pt[], b: Pt[]): number {
	let sum = 0;
	const n = Math.min(a.length, b.length);
	for (let i = 0; i < n; i++) {
		const dx = a[i].x - b[i].x;
		const dy = a[i].y - b[i].y;
		sum += dx * dx + dy * dy;
	}
	return sum;
}

/** Reverse is the same ink when the stroke is fully drawn, so the pour can take the shorter route. */
function bestSource(from: Pt[], to: Pt[]): Pt[] {
	const rev = [...from].reverse();
	const pick = travel(rev, to) < travel(from, to) ? rev : from;
	return pick.map((p) => ({ ...p }));
}

function pairCost(a: Pt[], b: Pt[]): number {
	const rev = [...a].reverse();
	return Math.min(travel(a, b), travel(rev, b));
}

function visibleStrokes(glyph: Glyph): 1 | 2 {
	return glyph.revealB > 0.6 ? 2 : 1;
}

/**
 * Re-sample `from` so it still looks the same but lines up with `to`.
 * A single ribbon splits along its length when the next mark needs two strokes.
 */
export function alignGlyph(from: Glyph, to: Glyph): Glyph {
	const fromN = visibleStrokes(from);
	const toN = visibleStrokes(to);

	if (fromN === 1 && toN === 2) {
		const [left, right] = split(from.a);
		const swapped = pairCost(right, to.a) + pairCost(left, to.b) < pairCost(left, to.a) + pairCost(right, to.b);
		const srcA = swapped ? right : left;
		const srcB = swapped ? left : right;
		return {
			a: bestSource(srcA, to.a),
			b: bestSource(srcB, to.b),
			revealA: 1,
			revealB: 1
		};
	}

	if (fromN === 2 && toN === 2) {
		const swapped = pairCost(from.b, to.a) + pairCost(from.a, to.b) < pairCost(from.a, to.a) + pairCost(from.b, to.b);
		return {
			a: bestSource(swapped ? from.b : from.a, to.a),
			b: bestSource(swapped ? from.a : from.b, to.b),
			revealA: swapped ? from.revealB : from.revealA,
			revealB: swapped ? from.revealA : from.revealB
		};
	}

	return {
		a: bestSource(from.a, to.a),
		b: from.b.map((p) => ({ ...p })),
		revealA: from.revealA,
		revealB: from.revealB
	};
}

/** Fold a spinner angle into the samples so the next pour starts from the frame on screen. */
export function bakeRotation(glyph: Glyph, angle: number): Glyph {
	if (Math.abs(angle) < 0.0001) return copyGlyph(glyph);
	const s = Math.sin(angle);
	const c = Math.cos(angle);
	const turn = (p: Pt): Pt => {
		const x = p.x - CENTER;
		const y = p.y - CENTER;
		return { x: CENTER + x * c - y * s, y: CENTER + x * s + y * c };
	};
	return {
		a: glyph.a.map(turn),
		b: glyph.b.map(turn),
		revealA: glyph.revealA,
		revealB: glyph.revealB
	};
}

export function parseColor(input: string, fallback: RGB): RGB {
	const raw = input.trim();
	const rgb = raw.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
	if (rgb) {
		return {
			r: clampChannel(Number(rgb[1])),
			g: clampChannel(Number(rgb[2])),
			b: clampChannel(Number(rgb[3]))
		};
	}
	const hex = raw.replace(/^#/, '');
	const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
	if (!/^[0-9a-fA-F]{6}/.test(full)) return fallback;
	return {
		r: Number.parseInt(full.slice(0, 2), 16),
		g: Number.parseInt(full.slice(2, 4), 16),
		b: Number.parseInt(full.slice(4, 6), 16)
	};
}

function clampChannel(value: number): number {
	if (Number.isNaN(value)) return 0;
	return Math.min(255, Math.max(0, value));
}

export function fallbackRgb(state: StatusName): RGB {
	return parseColor(DEFAULT_COLORS[state], { r: 142, g: 142, b: 147 });
}

export function rgbCss(color: RGB): string {
	return `rgb(${Math.round(color.r)} ${Math.round(color.g)} ${Math.round(color.b)})`;
}
