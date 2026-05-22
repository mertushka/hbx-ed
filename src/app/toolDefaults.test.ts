import { describe, expect, it } from "vitest";

import type { StadiumObject } from "../types/stadium.ts";
import {
	getValidToolDefaultTrait,
	setToolDefaultTrait,
	type ToolDefaultTraits,
} from "./toolDefaults.ts";

function stadium(): StadiumObject {
	return {
		name: "Defaults",
		width: 100,
		height: 50,
		traits: { wall: {} },
		vertexes: [],
		segments: [],
		goals: [],
		discs: [],
		planes: [],
		joints: [],
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
});
