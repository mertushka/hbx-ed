import type {
	Segment,
	Selection,
	StadiumObject,
	Vertex,
} from "../types/stadium.ts";
import { computeArcCenter, getCurveF } from "../utils/math.ts";

export const VERTEX_SNAP_PX = 12;

export function findSnapVertex(
	stadium: StadiumObject,
	wx: number,
	wy: number,
	zoom: number,
	excludeIdx: number,
): { x: number; y: number } | null {
	const r = VERTEX_SNAP_PX / zoom;
	let best: { x: number; y: number } | null = null;
	let bestDist = Infinity;
	stadium.vertexes.forEach((v, i) => {
		if (i === excludeIdx) return;
		const d = Math.hypot(v.x - wx, v.y - wy);
		if (d < r && d < bestDist) {
			bestDist = d;
			best = { x: v.x, y: v.y };
		}
	});
	return best;
}

export function arcMidpoint(
	seg: Segment,
	verts: Vertex[],
): { x: number; y: number } | null {
	const v0 = verts[seg.v0];
	const v1 = verts[seg.v1];
	if (!v0 || !v1) return null;
	const cf = getCurveF(seg.curve, seg.curveF);
	if (!Number.isFinite(cf)) return null;

	const c = computeArcCenter({ x: v0.x, y: v0.y }, { x: v1.x, y: v1.y }, cf);
	const r = Math.hypot(v0.x - c.x, v0.y - c.y);
	const sa = Math.atan2(v0.y - c.y, v0.x - c.x);
	const ea = Math.atan2(v1.y - c.y, v1.x - c.x);
	const twoPi = 2 * Math.PI;
	let mid: number;
	if (cf < 0) {
		let span = (((sa - ea) % twoPi) + twoPi) % twoPi;
		if (span === 0) span = twoPi;
		mid = ea + span / 2;
	} else {
		let span = (((ea - sa) % twoPi) + twoPi) % twoPi;
		if (span === 0) span = twoPi;
		mid = sa + span / 2;
	}
	return { x: c.x + r * Math.cos(mid), y: c.y + r * Math.sin(mid) };
}

export function objectsInRect(
	stadium: StadiumObject,
	rx: number,
	ry: number,
	rw: number,
	rh: number,
): Selection[] {
	const x0 = Math.min(rx, rx + rw);
	const x1 = Math.max(rx, rx + rw);
	const y0 = Math.min(ry, ry + rh);
	const y1 = Math.max(ry, ry + rh);
	const hits: Selection[] = [];

	stadium.vertexes.forEach((v, i) => {
		if (v.x >= x0 && v.x <= x1 && v.y >= y0 && v.y <= y1) {
			hits.push({ type: "vertex", index: i });
		}
	});
	stadium.discs.forEach((d, i) => {
		const [px, py] = d.pos ?? [0, 0];
		if (px >= x0 && px <= x1 && py >= y0 && py <= y1) {
			hits.push({ type: "disc", index: i });
		}
	});
	stadium.goals.forEach((g, i) => {
		const [p0x, p0y] = g.p0 ?? [0, 0];
		const [p1x, p1y] = g.p1 ?? [0, 0];
		if (
			(p0x >= x0 && p0x <= x1 && p0y >= y0 && p0y <= y1) ||
			(p1x >= x0 && p1x <= x1 && p1y >= y0 && p1y <= y1)
		) {
			hits.push({ type: "goal", index: i });
		}
	});
	return hits;
}
