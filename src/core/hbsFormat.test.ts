import { describe, expect, it } from "vitest";

import { parseHbs, serializeHbs } from "./hbsFormat.ts";

describe("hbsFormat", () => {
	it("parses realistic JSON5-style HBS input", () => {
		const stadium = parseHbs(`{
			// line comment
			name: 'Parser Test',
			width: 420,
			height: 200,
			bg: { type: 'grass', width: Infinity, },
			traits: {},
			vertexes: [{ x: 1, y: 2 }],
			segments: [],
			goals: [],
			discs: [{ color: 'http://example.test/not-a-comment' }],
			planes: [],
			joints: [],
		}`);

		expect(stadium.name).toBe("Parser Test");
		expect(stadium.bg?.width).toBe(Infinity);
		expect(stadium.discs[0]?.color).toBe("http://example.test/not-a-comment");
	});

	it("wraps parse failures with an HBS-specific error", () => {
		expect(() => parseHbs("{")).toThrow("HBS parse error:");
	});

	it("serializes JSON5 stadiums while preserving Infinity and stripping curveF", () => {
		const json = serializeHbs({
			name: "Save Test",
			width: 100,
			height: 50,
			traits: {},
			bg: { type: "grass", width: Infinity },
			vertexes: [
				{ x: 0, y: 0 },
				{ x: 1, y: 1 },
			],
			segments: [{ v0: 0, v1: 1, curve: 90, curveF: 1 }],
			goals: [],
			discs: [],
			planes: [],
			joints: [],
		});

		expect(json).toMatchInlineSnapshot(`
			"{
			  name: "Save Test",
			  width: 100,
			  height: 50,
			  traits: {},
			  bg: {
			    type: "grass",
			    width: Infinity,
			  },
			  vertexes: [
			    {
			      x: 0,
			      y: 0,
			    },
			    {
			      x: 1,
			      y: 1,
			    },
			  ],
			  segments: [
			    {
			      v0: 0,
			      v1: 1,
			      curve: 90,
			    },
			  ],
			  goals: [],
			  discs: [],
			  planes: [],
			  joints: [],
			}"
		`);
		expect(parseHbs(json).bg?.width).toBe(Infinity);
		expect(json).not.toContain("curveF");
	});
});
