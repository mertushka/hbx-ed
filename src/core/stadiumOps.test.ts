import { describe, expect, it } from "vitest";

import type { StadiumObject } from "../types/stadium.ts";
import {
	cloneForClipboard,
	deleteSelections,
	duplicateSelection,
	normalizeStadium,
	objectTypeToKey,
	pasteClipboard,
} from "./stadiumOps.ts";

function stadium(): StadiumObject {
	return {
		name: "Ops",
		width: 100,
		height: 50,
		traits: {},
		vertexes: [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 20, y: 0 },
		],
		segments: [
			{ v0: 0, v1: 1 },
			{ v0: 1, v1: 2 },
		],
		goals: [{ p0: [0, 0], p1: [0, 10] }],
		discs: [{ pos: [0, 0] }, { pos: [10, 0] }, { pos: [20, 0] }],
		planes: [],
		joints: [
			{ d0: 0, d1: 1 },
			{ d0: 1, d1: 2 },
		],
	};
}

describe("stadiumOps", () => {
	it("normalizes loaded stadium defaults", () => {
		const data = normalizeStadium({
			name: "Partial",
			width: 1,
			height: 1,
		} as StadiumObject);

		expect(data.vertexes).toEqual([]);
		expect(data.bg?.type).toBe("grass");
		expect(data.traits).toEqual({});
	});

	it("maps object types to stadium array keys", () => {
		expect(objectTypeToKey("vertex")).toBe("vertexes");
		expect(objectTypeToKey("joint")).toBe("joints");
	});

	it("duplicates and pastes offset copies", () => {
		const s = stadium();
		const duplicate = duplicateSelection(s, { type: "vertex", index: 0 });
		expect(duplicate).toEqual({ type: "vertex", index: 3 });
		expect(s.vertexes[3]).toEqual({ x: 10, y: 10 });

		const clipboard = cloneForClipboard(s, { type: "goal", index: 0 });
		const pasted = pasteClipboard(s, clipboard);
		expect(pasted).toEqual({ type: "goal", index: 1 });
		expect(s.goals[1]).toEqual({ p0: [15, 15], p1: [15, 25] });
	});

	it("rejects clipboard entries with unknown object types", () => {
		expect(pasteClipboard(stadium(), { type: "unknown", data: {} })).toBeNull();
	});

	it("deletes vertex refs using an invalid sentinel and shifts later refs", () => {
		const s = stadium();
		deleteSelections(s, [{ type: "vertex", index: 1 }]);

		expect(s.vertexes).toHaveLength(2);
		expect(s.segments).toEqual([
			{ v0: 0, v1: -1 },
			{ v0: -1, v1: 1 },
		]);
	});

	it("deletes disc refs using an invalid sentinel and shifts later refs", () => {
		const s = stadium();
		deleteSelections(s, [{ type: "disc", index: 1 }]);

		expect(s.discs).toHaveLength(2);
		expect(s.joints).toEqual([
			{ d0: 0, d1: -1 },
			{ d0: -1, d1: 1 },
		]);
	});
});
