import { describe, expect, it } from "vitest";

import { colorToHex, hexToHbs, parseColor } from "./color.ts";

describe("color utilities", () => {
	it("parses HBS colors into CSS colors", () => {
		expect(parseColor("FF00AA")).toBe("rgba(255,0,170,1)");
		expect(parseColor([12, 34, 56], 0.5)).toBe("rgba(12,34,56,0.5)");
		expect(parseColor("transparent")).toBeNull();
		expect(parseColor("rebeccapurple")).toBe("rebeccapurple");
	});

	it("converts HBS colors to editor hex values", () => {
		expect(colorToHex("00ffAA")).toBe("#00ffAA");
		expect(colorToHex([12, 34, 56])).toBe("#0c2238");
		expect(colorToHex("transparent")).toBe("#ffffff");
		expect(hexToHbs("#aabbcc")).toBe("AABBCC");
	});
});
