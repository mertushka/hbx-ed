import { describe, expect, it } from "vitest";

import type { StadiumObject } from "../types/stadium.ts";
import {
	arcMidpoint,
	findSnapVertex,
	objectsInRect,
} from "./selectGeometry.ts";

function stadium(): StadiumObject {
	return {
		name: "Select",
		width: 100,
		height: 50,
		traits: {},
		vertexes: [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 30, y: 30 },
		],
		segments: [{ v0: 0, v1: 1, curve: 180 }],
		discs: [{ pos: [5, 5] }],
		goals: [{ p0: [1, 1], p1: [1, 9] }],
		planes: [],
		joints: [],
	};
}

describe("selectGeometry", () => {
	it("finds the nearest snap vertex while excluding the dragged vertex", () => {
		expect(findSnapVertex(stadium(), 10.5, 0.5, 2, 0)).toEqual({ x: 10, y: 0 });
		expect(findSnapVertex(stadium(), 10.5, 0.5, 2, 1)).toBeNull();
	});

	it("returns arc midpoint only for curved segments", () => {
		const s = stadium();
		const segment = s.segments[0];
		if (!segment) throw new Error("Expected test segment");
		const midpoint = arcMidpoint(segment, s.vertexes);
		expect(midpoint?.x).toBeCloseTo(5);
		expect(arcMidpoint({ v0: 0, v1: 1 }, s.vertexes)).toBeNull();
	});

	it("collects selectable object anchors inside a rectangle", () => {
		expect(objectsInRect(stadium(), 0, 0, 12, 12)).toEqual([
			{ type: "vertex", index: 0 },
			{ type: "vertex", index: 1 },
			{ type: "disc", index: 0 },
			{ type: "goal", index: 0 },
		]);
	});
});
