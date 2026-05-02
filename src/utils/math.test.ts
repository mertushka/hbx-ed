import { describe, expect, it } from "vitest";

import {
	clamp,
	computeArcCenter,
	distToArc,
	distToSegment,
	getCurveF,
	snapToGrid,
} from "./math.ts";

describe("math utilities", () => {
	it("computes curveF only for game-supported curve angles", () => {
		expect(getCurveF(undefined, undefined)).toBe(Infinity);
		expect(getCurveF(5, undefined)).toBe(Infinity);
		expect(getCurveF(350, undefined)).toBe(Infinity);
		expect(getCurveF(90, undefined)).toBeCloseTo(1);
		expect(getCurveF(-90, undefined)).toBeCloseTo(-1);
		expect(getCurveF(90, 2)).toBe(2);
	});

	it("computes arc centers from endpoints and curveF", () => {
		expect(computeArcCenter({ x: 0, y: 0 }, { x: 10, y: 0 }, 1)).toEqual({
			x: 5,
			y: 5,
		});
	});

	it("measures distance to segments and arcs", () => {
		expect(distToSegment(5, 3, 0, 0, 10, 0)).toBeCloseTo(3);
		expect(distToSegment(3, 4, 0, 0, 0, 0)).toBeCloseTo(5);
		expect(distToArc(0, 10, 0, 0, 10, 0, Math.PI, false)).toBeCloseTo(0);
	});

	it("clamps values and snaps to visible grid steps", () => {
		expect(clamp(12, 0, 10)).toBe(10);
		expect(clamp(-1, 0, 10)).toBe(0);
		expect(snapToGrid(27, 33, 3, true)).toEqual({ x: 20, y: 40 });
		expect(snapToGrid(27, 33, 3, false)).toEqual({ x: 27, y: 33 });
	});
});
