import { describe, expect, it } from "vitest";

import type { StadiumObject } from "../types/stadium.ts";
import {
	extractToolObjectDefault,
	getValidToolDefaultTrait,
	getValidToolObjectDefault,
	setToolDefaultTrait,
	setToolObjectDefault,
	type ToolDefaultTraits,
	type ToolObjectDefaults,
} from "./toolDefaults.ts";

function stadium(): StadiumObject {
	return {
		name: "Defaults",
		width: 100,
		height: 50,
		traits: {
			wall: {},
			ballArea: {
				radius: 25,
				color: "ffcc00",
				bCoef: 0.2,
				cMask: ["ball", "kick", "score"],
				cGroup: ["score"],
				pos: [99, 99],
			},
		},
		vertexes: [{ x: 10, y: 20, bCoef: 0.7, trait: "wall" }],
		segments: [{ v0: 0, v1: 0, color: "ff0000", cMask: ["ball"] }],
		goals: [{ p0: [0, 0], p1: [0, 10], team: "blue" }],
		discs: [{ pos: [5, 6], radius: 12, cMask: ["ball", "kick"] }],
		planes: [{ normal: [1, 0], dist: 30, bCoef: 0.4 }],
		joints: [{ d0: 0, d1: 1, strength: 2, color: "00ff00" }],
	};
}

describe("toolDefaults", () => {
	it("stores, validates, and clears per-tool default traits", () => {
		const defaults: ToolDefaultTraits = {};
		const s = stadium();

		setToolDefaultTrait(defaults, "vertex", "wall");
		expect(defaults.vertex).toBe("wall");
		expect(getValidToolDefaultTrait(s, defaults, "vertex")).toBe("wall");

		setToolDefaultTrait(defaults, "vertex", undefined);
		expect(defaults.vertex).toBeUndefined();
		expect(getValidToolDefaultTrait(s, defaults, "vertex")).toBeUndefined();
	});

	it("ignores stale defaults when no matching stadium trait exists", () => {
		const defaults: ToolDefaultTraits = { segment: "missing" };

		expect(
			getValidToolDefaultTrait(stadium(), defaults, "segment"),
		).toBeUndefined();
		expect(getValidToolDefaultTrait(null, defaults, "segment")).toBeUndefined();
	});

	it("stores object defaults and overlays valid trait defaults", () => {
		const s = stadium();
		const objects: ToolObjectDefaults = {};
		const traits: ToolDefaultTraits = {};

		setToolObjectDefault(objects, "disc", { radius: 12, cMask: ["ball"] });
		setToolDefaultTrait(traits, "disc", "wall");

		const defaults = getValidToolObjectDefault(s, objects, traits, "disc");
		expect(defaults).toEqual({
			radius: 12,
			cMask: ["ball"],
			trait: "wall",
		});

		if (defaults?.cMask) defaults.cMask.push("kick");
		expect(objects.disc?.cMask).toEqual(["ball"]);
	});

	it("removes stale preset traits and clears empty object defaults", () => {
		const s = stadium();
		const objects: ToolObjectDefaults = {};
		const traits: ToolDefaultTraits = {};

		setToolObjectDefault(objects, "disc", { radius: 12, trait: "old" });
		expect(getValidToolObjectDefault(s, objects, traits, "disc")).toEqual({
			radius: 12,
		});

		setToolObjectDefault(objects, "disc", undefined);
		expect(
			getValidToolObjectDefault(s, objects, traits, "disc"),
		).toBeUndefined();
	});

	it("returns a trait-only object default when only a valid trait is selected", () => {
		expect(
			getValidToolObjectDefault(stadium(), {}, { disc: "ballArea" }, "disc"),
		).toEqual({
			radius: 25,
			color: "ffcc00",
			bCoef: 0.2,
			cMask: ["ball", "kick", "score"],
			cGroup: ["score"],
			trait: "ballArea",
		});
	});

	it("lets newly selected traits override stale object defaults", () => {
		const objects: ToolObjectDefaults = {
			disc: {
				color: "ffffff",
				cMask: ["all"],
				cGroup: ["wall"],
			},
		};
		const traits: ToolDefaultTraits = { disc: "ballArea" };

		expect(
			getValidToolObjectDefault(stadium(), objects, traits, "disc"),
		).toEqual({
			radius: 25,
			color: "ffcc00",
			bCoef: 0.2,
			cMask: ["ball", "kick", "score"],
			cGroup: ["score"],
			trait: "ballArea",
		});
	});

	it("extracts reusable object fields without copying geometry", () => {
		const s = stadium();

		expect(extractToolObjectDefault(s, { type: "vertex", index: 0 })).toEqual({
			bCoef: 0.7,
			trait: "wall",
		});
		expect(extractToolObjectDefault(s, { type: "segment", index: 0 })).toEqual({
			color: "ff0000",
			cMask: ["ball"],
		});
		expect(extractToolObjectDefault(s, { type: "disc", index: 0 })).toEqual({
			radius: 12,
			cMask: ["ball", "kick"],
		});
		expect(extractToolObjectDefault(s, { type: "goal", index: 0 })).toEqual({
			team: "blue",
		});
		expect(extractToolObjectDefault(s, { type: "plane", index: 0 })).toEqual({
			normal: [1, 0],
			bCoef: 0.4,
		});
		expect(extractToolObjectDefault(s, { type: "joint", index: 0 })).toEqual({
			strength: 2,
			color: "00ff00",
		});
		for (const type of [
			"vertex",
			"segment",
			"disc",
			"goal",
			"plane",
			"joint",
		] as const) {
			expect(extractToolObjectDefault(s, { type, index: 9 })).toBeNull();
		}
	});
});
