import type { Selection, StadiumObject } from "../types/stadium.ts";
import {
	computeArcCenter,
	distToArc,
	distToSegment,
	getCurveF,
} from "../utils/math.ts";
import { resolveTraits } from "./traits.ts";

/** Pixel radius (in world units) within which a click registers. */
const HIT_RADIUS_PX = 8;

/**
 * Find the topmost object at world position (wx, wy).
 * Priority: vertex → disc → goal → segment
 */
export function hitTest(
	stadium: StadiumObject,
	wx: number,
	wy: number,
	zoom: number,
): Selection | null {
	const r = HIT_RADIUS_PX / zoom;

	// Vertexes
	const verts = stadium.vertexes;
	for (let i = verts.length - 1; i >= 0; i--) {
		const v = verts[i];
		if (!v) continue;
		if ((v.x - wx) ** 2 + (v.y - wy) ** 2 < r * r) {
			return { type: "vertex", index: i };
		}
	}

	// Discs
	const discs = stadium.discs;
	for (let i = discs.length - 1; i >= 0; i--) {
		const disc = discs[i];
		if (!disc) continue;
		const d = resolveTraits(disc, stadium.traits);
		const [dx, dy] = d.pos ?? [0, 0];
		const rad = (d.radius ?? 10) + r;
		if ((dx - wx) ** 2 + (dy - wy) ** 2 < rad * rad) {
			return { type: "disc", index: i };
		}
	}

	// Goals
	const goals = stadium.goals;
	for (let i = goals.length - 1; i >= 0; i--) {
		const g = goals[i];
		if (!g) continue;
		const [p0x, p0y] = g.p0 ?? [0, 0];
		const [p1x, p1y] = g.p1 ?? [0, 0];
		if (distToSegment(wx, wy, p0x, p0y, p1x, p1y) < r) {
			return { type: "goal", index: i };
		}
	}

	// Segments — use arc distance for curved segments, straight-line for straight
	const segs = stadium.segments;
	for (let i = segs.length - 1; i >= 0; i--) {
		const seg = segs[i];
		if (!seg) continue;
		const s = resolveTraits(seg, stadium.traits);
		const v0 = verts[s.v0];
		const v1 = verts[s.v1];
		if (!v0 || !v1) continue;

		const curveF = getCurveF(s.curve, s.curveF);

		let dist: number;
		if (!Number.isFinite(curveF)) {
			dist = distToSegment(wx, wy, v0.x, v0.y, v1.x, v1.y);
		} else {
			const c = computeArcCenter(
				{ x: v0.x, y: v0.y },
				{ x: v1.x, y: v1.y },
				curveF,
			);
			const arcR = Math.hypot(v0.x - c.x, v0.y - c.y);
			const sa = Math.atan2(v0.y - c.y, v0.x - c.x);
			const ea = Math.atan2(v1.y - c.y, v1.x - c.x);
			dist = distToArc(wx, wy, c.x, c.y, arcR, sa, ea, curveF < 0);
		}

		if (dist < r) return { type: "segment", index: i };
	}

	return null;
}
