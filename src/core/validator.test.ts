import { describe, expect, it } from "vitest";

import type { StadiumObject } from "../types/stadium.ts";
import { validateStadium } from "./validator.ts";

function baseStadium(overrides: Partial<StadiumObject> = {}): StadiumObject {
	return {
		name: "Test",
		width: 100,
		height: 50,
		traits: {},
		vertexes: [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
		],
		segments: [],
		goals: [],
		discs: [],
		planes: [],
		joints: [],
		...overrides,
	};
}

describe("validateStadium", () => {
	it("reports invalid segment refs and duplicate straight segments", () => {
		const issues = validateStadium(
			baseStadium({
				segments: [
					{ v0: 0, v1: 1 },
					{ v0: 1, v1: 0 },
					{ v0: -1, v1: 99 },
				],
			}),
		);

		const duplicateIssue = issues.find((i) =>
			i.message.includes("duplicates seg0"),
		);
		expect(duplicateIssue?.message).toBe(
			"seg1: duplicates seg0 (same vertices v0-v1)",
		);
		expect(duplicateIssue?.target).toEqual({ type: "segment", index: 1 });
		expect(duplicateIssue?.targets).toEqual([
			{ type: "segment", index: 0 },
			{ type: "segment", index: 1 },
		]);
		expect(issues.some((i) => i.message.includes("v0=-1 out of range"))).toBe(
			true,
		);
		expect(issues.some((i) => i.message.includes("v1=99 out of range"))).toBe(
			true,
		);
		expect(
			issues.find((i) => i.message.includes("v0=-1 out of range"))?.target,
		).toEqual({ type: "segment", index: 2 });
	});

	it("does not warn for duplicate curved segments", () => {
		const issues = validateStadium(
			baseStadium({
				segments: [
					{ v0: 0, v1: 1, curve: 90 },
					{ v0: 1, v1: 0 },
				],
			}),
		);

		expect(issues.some((i) => i.message.includes("duplicates"))).toBe(false);
	});

	it("does not warn for duplicate curveF segments but still reports other issues", () => {
		const issues = validateStadium(
			baseStadium({
				segments: [
					{ v0: 0, v1: 1, curveF: 1, trait: "missing" },
					{ v0: 1, v1: 0 },
				],
			}),
		);

		expect(issues.some((i) => i.message.includes("duplicates"))).toBe(false);
		expect(issues.some((i) => i.message.includes('trait "missing"'))).toBe(
			true,
		);
	});

	it("reports undefined traits and degenerate objects", () => {
		const issues = validateStadium(
			baseStadium({
				vertexes: [{ x: 0, y: 0, trait: "missing" }],
				goals: [{ p0: [1, 1], p1: [1, 1] }],
				planes: [{ normal: [0, 0] }],
			}),
		);

		expect(issues.some((i) => i.message.includes('trait "missing"'))).toBe(
			true,
		);
		expect(issues.some((i) => i.message.includes("degenerate plane"))).toBe(
			true,
		);
		expect(issues.some((i) => i.message.includes("zero-length goal"))).toBe(
			true,
		);
		expect(
			issues.find((i) => i.message.includes("degenerate plane"))?.target,
		).toEqual({ type: "plane", index: 0 });
		expect(
			issues.find((i) => i.message.includes("zero-length goal"))?.target,
		).toEqual({ type: "goal", index: 0 });
	});

	it("reports invalid joint refs and self-joints", () => {
		const issues = validateStadium(
			baseStadium({
				discs: [{ pos: [0, 0] }],
				joints: [
					{ d0: 0, d1: 0 },
					{ d0: 0, d1: 9 },
				],
			}),
		);

		expect(issues.some((i) => i.message.includes("self-joint"))).toBe(true);
		expect(issues.some((i) => i.message.includes("d1=9 out of range"))).toBe(
			true,
		);
		expect(
			issues.find((i) => i.message.includes("self-joint"))?.target,
		).toEqual({ type: "joint", index: 0 });
	});
});
