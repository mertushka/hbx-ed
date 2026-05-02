import { describe, expect, it } from "vitest";

import type { StadiumObject } from "../types/stadium.ts";
import { hitTest } from "./hitTest.ts";

function stadium(overrides: Partial<StadiumObject> = {}): StadiumObject {
	return {
		name: "Hit",
		width: 100,
		height: 50,
		traits: {},
		vertexes: [],
		segments: [],
		goals: [],
		discs: [],
		planes: [],
		joints: [],
		...overrides,
	};
}

describe("hitTest", () => {
	it("prioritizes vertexes over discs, goals, and segments", () => {
		const s = stadium({
			vertexes: [{ x: 0, y: 0 }],
			discs: [{ pos: [0, 0], radius: 20 }],
			goals: [{ p0: [0, -10], p1: [0, 10] }],
			segments: [{ v0: 0, v1: 0 }],
		});

		expect(hitTest(s, 0, 0, 1)).toEqual({ type: "vertex", index: 0 });
	});

	it("detects discs using trait-resolved radius", () => {
		const s = stadium({
			traits: { big: { radius: 20 } },
			discs: [{ pos: [0, 0], trait: "big" }],
		});

		expect(hitTest(s, 18, 0, 4)).toEqual({ type: "disc", index: 0 });
	});

	it("detects goals and straight segments", () => {
		const goalStadium = stadium({
			goals: [{ p0: [0, -20], p1: [0, 20], team: "red" }],
		});
		expect(hitTest(goalStadium, 1, 0, 4)).toEqual({
			type: "goal",
			index: 0,
		});

		const segmentStadium = stadium({
			vertexes: [
				{ x: 0, y: 0 },
				{ x: 20, y: 0 },
			],
			segments: [{ v0: 0, v1: 1 }],
		});
		expect(hitTest(segmentStadium, 10, 1, 4)).toEqual({
			type: "segment",
			index: 0,
		});
	});

	it("detects curved segments and ignores invalid segment refs", () => {
		const s = stadium({
			vertexes: [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
			],
			segments: [
				{ v0: 100, v1: 101 },
				{ v0: 0, v1: 1, curveF: 1 },
			],
		});

		expect(hitTest(s, 5, -2.05, 4)).toEqual({ type: "segment", index: 1 });
		expect(hitTest(s, 50, 50, 4)).toBeNull();
	});
});
