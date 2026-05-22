import { describe, expect, it } from "vitest";

import type { ObjectType, Selection, StadiumObject } from "../types/stadium.ts";
import {
	getSelectionObject,
	getSelectionTrait,
	setSelectionTrait,
} from "./selectionTraits.ts";

function stadium(): StadiumObject {
	return {
		name: "Traits",
		width: 100,
		height: 50,
		vertexes: [{ x: 1, y: 2, trait: "wall" }],
		segments: [{ v0: 0, v1: 0, trait: "wall" }],
		discs: [{ pos: [0, 0], radius: 10, trait: "ball" }],
		goals: [{ p0: [0, 0], p1: [0, 10], team: "red", trait: "net" }],
		planes: [{ normal: [0, 1], dist: 10, trait: "floor" }],
		joints: [{ d0: 0, d1: 1, trait: "rope" }],
	};
}

describe("selectionTraits", () => {
	it("resolves trait-bearing objects for every selectable type", () => {
		const s = stadium();
		const selections: Array<[ObjectType, string]> = [
			["vertex", "wall"],
			["segment", "wall"],
			["disc", "ball"],
			["goal", "net"],
			["plane", "floor"],
			["joint", "rope"],
		];

		for (const [type, trait] of selections) {
			const selection: Selection = { type, index: 0 };
			expect(getSelectionObject(s, selection)).not.toBeNull();
			expect(getSelectionTrait(s, selection)).toBe(trait);
		}
	});

	it("sets, removes, and rejects traits for missing selections", () => {
		const s = stadium();

		expect(setSelectionTrait(s, { type: "disc", index: 0 }, "heavy")).toBe(
			true,
		);
		expect(s.discs[0]?.trait).toBe("heavy");

		expect(setSelectionTrait(s, { type: "disc", index: 0 }, undefined)).toBe(
			true,
		);
		expect(s.discs[0]?.trait).toBeUndefined();

		expect(setSelectionTrait(s, { type: "joint", index: 9 }, "rope")).toBe(
			false,
		);
		expect(getSelectionObject(s, { type: "joint", index: 9 })).toBeNull();

		const missingTypes: ObjectType[] = [
			"vertex",
			"segment",
			"disc",
			"goal",
			"plane",
		];
		for (const type of missingTypes) {
			expect(getSelectionObject(s, { type, index: 9 })).toBeNull();
		}
	});
});
