import { describe, expect, it } from "vitest";

import type { ObjectType, Selection, StadiumObject } from "../types/stadium.ts";
import {
	getSelectionObject,
	getSelectionTrait,
	getTraitValuesForType,
	setSelectionTrait,
	syncTraitUsages,
} from "./selectionTraits.ts";

function stadium(): StadiumObject {
	return {
		name: "Traits",
		width: 100,
		height: 50,
		traits: {
			ballArea: {
				radius: 25,
				color: "ffcc00",
				bCoef: 0.2,
				cMask: ["ball", "kick", "score"],
				pos: [99, 99],
			},
			wallSegment: {
				color: "00ff00",
				bCoef: 0.3,
				cMask: ["ball"],
				v0: 9,
				v1: 9,
			},
		},
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

	it("applies trait values while preserving object geometry", () => {
		const s = stadium();

		expect(setSelectionTrait(s, { type: "disc", index: 0 }, "ballArea")).toBe(
			true,
		);
		expect(s.discs[0]).toMatchObject({
			pos: [0, 0],
			radius: 25,
			color: "ffcc00",
			bCoef: 0.2,
			cMask: ["ball", "kick", "score"],
			trait: "ballArea",
		});

		expect(
			setSelectionTrait(s, { type: "segment", index: 0 }, "wallSegment"),
		).toBe(true);
		expect(s.segments[0]).toMatchObject({
			v0: 0,
			v1: 0,
			color: "00ff00",
			bCoef: 0.3,
			cMask: ["ball"],
			trait: "wallSegment",
		});

		expect(getTraitValuesForType(null, "disc", "ballArea")).toBeUndefined();
		expect(getTraitValuesForType(s, "disc", undefined)).toBeUndefined();
	});

	it("syncs edited trait values to objects that still track the previous value", () => {
		const s = stadium();
		const previousTrait = {
			radius: 10,
			color: "111111",
			cMask: ["all"],
			cGroup: ["wall"],
		};
		s.traits = {
			ballArea: {
				radius: 25,
				color: "ffcc00",
				cMask: ["ball", "kick"],
			},
		};
		s.discs = [
			{
				pos: [0, 0],
				trait: "ballArea",
				radius: 10,
				color: "111111",
				cMask: ["all"],
				cGroup: ["wall"],
			},
			{
				pos: [1, 1],
				trait: "ballArea",
				radius: 99,
				color: "222222",
				cMask: ["all"],
				cGroup: ["wall"],
			},
			{ pos: [2, 2], trait: "other", radius: 10 },
		];

		expect(syncTraitUsages(s, "ballArea", previousTrait)).toBe(2);
		expect(s.discs[0]).toEqual({
			pos: [0, 0],
			trait: "ballArea",
			radius: 25,
			color: "ffcc00",
			cMask: ["ball", "kick"],
		});
		expect(s.discs[1]).toEqual({
			pos: [1, 1],
			trait: "ballArea",
			radius: 99,
			color: "222222",
			cMask: ["ball", "kick"],
		});
		expect(s.discs[2]).toEqual({ pos: [2, 2], trait: "other", radius: 10 });
		expect(syncTraitUsages(s, "missing", previousTrait)).toBe(0);
	});
});
