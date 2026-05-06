import { describe, expect, it } from "vitest";

import { createTestStadium } from "../test/toolContext.ts";
import { applyMultiDrag, createMultiDragOrigins } from "./selectDrag.ts";

describe("select drag helpers", () => {
	it("captures drag origins for movable multi-selected objects", () => {
		const stadium = createTestStadium({
			vertexes: [{ x: 1, y: 2 }],
			discs: [{}],
			goals: [{}],
			segments: [{ v0: 0, v1: 0 }],
		});

		const origins = createMultiDragOrigins(stadium, [
			{ type: "vertex", index: 0 },
			{ type: "disc", index: 0 },
			{ type: "goal", index: 0 },
			{ type: "segment", index: 0 },
			{ type: "vertex", index: 99 },
		]);

		expect(origins).toEqual([
			{ type: "vertex", index: 0, pos: [1, 2] },
			{ type: "disc", index: 0, pos: [0, 0] },
			{ type: "goal", index: 0, pos: [0, 0], pos2: [0, 0] },
		]);
	});

	it("applies a shared drag delta to captured origins", () => {
		const stadium = createTestStadium({
			vertexes: [{ x: 1, y: 2 }],
			discs: [{ pos: [10, 20] }],
			goals: [{ p0: [30, 40], p1: [30, 50] }, {}],
		});
		const origins = createMultiDragOrigins(stadium, [
			{ type: "vertex", index: 0 },
			{ type: "disc", index: 0 },
			{ type: "goal", index: 0 },
			{ type: "goal", index: 1 },
		]);

		applyMultiDrag(stadium, origins, 5, -10);

		expect(stadium.vertexes[0]).toEqual({ x: 6, y: -8 });
		expect(stadium.discs[0]?.pos).toEqual([15, 10]);
		expect(stadium.goals[0]).toEqual({ p0: [35, 30], p1: [35, 40] });
		expect(stadium.goals[1]).toEqual({ p0: [5, -10], p1: [5, -10] });
	});
});
