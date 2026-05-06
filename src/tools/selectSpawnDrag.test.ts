import { describe, expect, it } from "vitest";

import { createTestStadium } from "../test/toolContext.ts";
import { applySpawnDrag, findSpawnDragOrigin } from "./selectSpawnDrag.ts";

describe("select spawn drag helpers", () => {
	it("finds red and blue spawn drag origins within zoom-scaled radius", () => {
		const stadium = createTestStadium({
			redSpawnPoints: [[5, 5]],
			blueSpawnPoints: [[20, 20]],
		});

		expect(findSpawnDragOrigin(stadium, { x: 7, y: 5 }, 2)).toEqual({
			kind: "spawn-red",
			index: 0,
			pos: [5, 5],
		});
		expect(findSpawnDragOrigin(stadium, { x: 22, y: 20 }, 2)).toEqual({
			kind: "spawn-blue",
			index: 0,
			pos: [20, 20],
		});
		expect(findSpawnDragOrigin(stadium, { x: 40, y: 40 }, 2)).toBeNull();
	});

	it("applies spawn drag deltas while ignoring missing points", () => {
		const stadium = createTestStadium({
			redSpawnPoints: [[5, 5]],
			blueSpawnPoints: [[20, 20]],
		});

		applySpawnDrag(
			stadium,
			{ kind: "spawn-red", index: 0, pos: [5, 5] },
			3,
			-2,
		);
		applySpawnDrag(
			stadium,
			{ kind: "spawn-blue", index: 4, pos: [20, 20] },
			3,
			-2,
		);

		expect(stadium.redSpawnPoints).toEqual([[8, 3]]);
		expect(stadium.blueSpawnPoints).toEqual([[20, 20]]);
	});
});
