import { describe, expect, it } from "vitest";

import { createTestStadium } from "../test/toolContext.ts";
import type { Segment } from "../types/stadium.ts";
import {
	applyCurveHandleDrag,
	findCurveHandleDragOrigin,
} from "./selectCurve.ts";
import { arcMidpoint } from "./selectGeometry.ts";

describe("select curve helpers", () => {
	it("finds straight and curved segment curve handles", () => {
		const stadium = createTestStadium({
			vertexes: [
				{ x: 0, y: 0 },
				{ x: 20, y: 0 },
			],
			segments: [
				{ v0: 0, v1: 1 },
				{ v0: 0, v1: 1, curve: 180 },
			],
		});

		expect(
			findCurveHandleDragOrigin(
				stadium,
				{ type: "segment", index: 0 },
				{ x: 10, y: 0 },
				1,
			),
		).toEqual({
			index: 0,
			v0: { x: 0, y: 0 },
			v1: { x: 20, y: 0 },
		});
		const curvedSegment = stadium.segments[1];
		if (!curvedSegment) throw new Error("Expected curved segment");
		const curvedMidpoint = arcMidpoint(curvedSegment, stadium.vertexes);
		if (!curvedMidpoint) throw new Error("Expected curved midpoint");

		expect(
			findCurveHandleDragOrigin(
				stadium,
				{ type: "segment", index: 1 },
				curvedMidpoint,
				1,
			),
		).toMatchObject({ index: 1 });
	});

	it("ignores misses and invalid curve handle selections", () => {
		const stadium = createTestStadium({
			vertexes: [{ x: 0, y: 0 }],
			segments: [{ v0: 0, v1: 1 }],
		});

		expect(
			findCurveHandleDragOrigin(
				stadium,
				{ type: "vertex", index: 0 },
				{ x: 0, y: 0 },
				1,
			),
		).toBeNull();
		expect(
			findCurveHandleDragOrigin(
				stadium,
				{ type: "segment", index: 0 },
				{ x: 100, y: 100 },
				1,
			),
		).toBeNull();
		expect(
			findCurveHandleDragOrigin(
				stadium,
				{ type: "segment", index: 99 },
				{ x: 0, y: 0 },
				1,
			),
		).toBeNull();
	});

	it("applies curve values and removes stale curveF", () => {
		const segment: Segment = { v0: 0, v1: 1, curveF: 1 };
		const origin = {
			index: 0,
			v0: { x: 0, y: 0 },
			v1: { x: 20, y: 0 },
		};

		expect(applyCurveHandleDrag(segment, origin, { x: 10, y: -10 })).toBe(true);
		expect(segment.curve).toBeCloseTo(180);
		expect(segment.curveF).toBeUndefined();

		segment.curveF = 1;
		expect(applyCurveHandleDrag(segment, origin, { x: 10, y: 0 })).toBe(true);
		expect(segment.curve).toBe(0);
		expect(segment.curveF).toBeUndefined();
	});

	it("skips degenerate curve drag origins", () => {
		const segment: Segment = { v0: 0, v1: 1, curveF: 1 };

		expect(
			applyCurveHandleDrag(
				segment,
				{
					index: 0,
					v0: { x: 0, y: 0 },
					v1: { x: 0, y: 0 },
				},
				{ x: 1, y: 1 },
			),
		).toBe(false);
		expect(segment).toEqual({ v0: 0, v1: 1, curveF: 1 });
	});
});
