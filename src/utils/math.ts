// Game constants from I.Pn / I.On in game-min.js.
// Vc() only computes curveF when |curve_radians| is inside this range.
// Outside it, the segment is treated as straight (curveF = Infinity).
const CURVE_MIN_RAD = 0.17435839227423353; // ~10°
const CURVE_MAX_RAD = 5.934119456780721; // ~340°

/**
 * Compute the cotangent-based curveF from a Segment, matching game's Vc() exactly.
 *
 * Vc(degrees):
 *   1. Convert to radians.
 *   2. For negative curves: negate radians AND swap v0/v1 (handled at draw time).
 *   3. Only compute curveF when |radians| is in (CURVE_MIN_RAD, CURVE_MAX_RAD).
 *      Outside that range the segment is treated as straight.
 *
 * Returns Infinity for straight segments (|curve| < 10° or |curve| > 340°).
 */
export function getCurveF(
	curve: number | undefined,
	curveF: number | undefined,
): number {
	if (curveF !== undefined) return curveF;
	if (!curve) return Infinity;

	const rad = (curve * Math.PI) / 180;
	const absRad = Math.abs(rad);

	// Game guard: only process if |radians| is strictly inside [Pn, On]
	if (absRad <= CURVE_MIN_RAD || absRad >= CURVE_MAX_RAD) return Infinity;

	return (1 / Math.tan(absRad / 2)) * Math.sign(rad);
}

export interface Point {
	x: number;
	y: number;
}

/**
 * Compute the arc center for a curved segment.
 * Extracted from the game's Segment.re() method:
 *   center = p0 + ½(p1−p0) + (−½·perp(p1−p0)) * curveF
 */
export function computeArcCenter(p0: Point, p1: Point, curveF: number): Point {
	const hx = 0.5 * (p1.x - p0.x);
	const hy = 0.5 * (p1.y - p0.y);
	return {
		x: p0.x + hx + -hy * curveF,
		y: p0.y + hy + hx * curveF,
	};
}

/** Minimum distance from point (px,py) to line segment (x0,y0)-(x1,y1). */
export function distToSegment(
	px: number,
	py: number,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
): number {
	const dx = x1 - x0;
	const dy = y1 - y0;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) return Math.hypot(px - x0, py - y0);
	const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / lenSq));
	return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

/** Clamp a value between min and max. */
export function clamp(v: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, v));
}

/**
 * Snap (x, y) to the nearest grid line when snapping is active.
 * Uses the same step candidates as the renderer grid, so snapped points
 * always land on a visible grid intersection.
 */
export function snapToGrid(
	x: number,
	y: number,
	zoom: number,
	active: boolean,
): { x: number; y: number } {
	if (!active) return { x, y };
	const step = calcSnapStep(zoom);
	return {
		x: Math.round(x / step) * step,
		y: Math.round(y / step) * step,
	};
}

function calcSnapStep(zoom: number): number {
	const candidates = [5, 10, 20, 25, 50, 100, 200, 500, 1000];
	const targetPx = 60; // same as renderer grid
	for (const c of candidates) {
		if (c * zoom >= targetPx) return c;
	}
	return 1000;
}

/**
 * Minimum distance from point (px,py) to a circular arc.
 *
 * The arc goes from startAngle to endAngle (anticlockwise when acw=true),
 * centred at (cx,cy) with radius r.
 *
 * Algorithm:
 *  1. Project the point onto the full circle → nearest angle.
 *  2. If that angle is inside the arc span, the answer is |dist_to_circle - r|.
 *  3. Otherwise the nearest point is one of the two endpoints.
 */
export function distToArc(
	px: number,
	py: number,
	cx: number,
	cy: number,
	r: number,
	startAngle: number,
	endAngle: number,
	anticlockwise: boolean,
): number {
	// Angle of the query point from the arc centre
	const angle = Math.atan2(py - cy, px - cx);

	// Normalise so we always test a CW arc from start→end in the [0, 2π) domain
	let sa = startAngle,
		ea = endAngle;
	if (anticlockwise) {
		[sa, ea] = [ea, sa];
	}

	// Bring ea into [sa, sa+2π)
	const twoPi = 2 * Math.PI;
	let span = (((ea - sa) % twoPi) + twoPi) % twoPi;
	if (span === 0) span = twoPi; // full circle

	// Bring angle into [sa, sa+2π)
	const relAngle = (((angle - sa) % twoPi) + twoPi) % twoPi;

	if (relAngle <= span) {
		// Nearest point is on the arc itself → distance is |r - dist(p, centre)|
		return Math.abs(Math.hypot(px - cx, py - cy) - r);
	}

	// Nearest point is whichever endpoint is closer
	const ex0 = cx + r * Math.cos(sa);
	const ey0 = cy + r * Math.sin(sa);
	const ex1 = cx + r * Math.cos(sa + span);
	const ey1 = cy + r * Math.sin(sa + span);
	return Math.min(
		Math.hypot(px - ex0, py - ey0),
		Math.hypot(px - ex1, py - ey1),
	);
}
