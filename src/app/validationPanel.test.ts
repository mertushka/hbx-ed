import { beforeEach, describe, expect, it } from "vitest";

import type { StadiumObject } from "../types/stadium.ts";
import { renderValidationPanel } from "./validationPanel.ts";

function validStadium(): StadiumObject {
	return {
		name: "Valid",
		width: 100,
		height: 50,
		traits: {},
		vertexes: [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
		],
		segments: [{ v0: 0, v1: 1 }],
		goals: [],
		discs: [{ pos: [0, 0] }],
		planes: [],
		joints: [],
	};
}

function invalidStadium(): StadiumObject {
	const stadium = validStadium();
	stadium.segments = [
		{ v0: 0, v1: 99 },
		{ v0: 0, v1: 0 },
		{ v0: 0, v1: 1 },
		{ v0: 1, v1: 0 },
		{ v0: 0, v1: 1, trait: "missing" },
	];
	stadium.joints = [
		{ d0: 0, d1: 99 },
		{ d0: 0, d1: 0 },
	];
	stadium.planes = [{ normal: [0, 0] }];
	stadium.goals = [{ p0: [1, 1], p1: [1, 1] }];
	return stadium;
}

describe("renderValidationPanel", () => {
	beforeEach(() => {
		document.body.innerHTML = '<div id="validation-panel"></div>';
	});

	it("renders no issues for null or valid stadiums", () => {
		const panel = document.getElementById("validation-panel");

		renderValidationPanel(panel, null);
		expect(panel?.children).toHaveLength(0);

		renderValidationPanel(panel, validStadium());
		expect(panel?.children).toHaveLength(0);
	});

	it("renders at most five issues plus an overflow item", () => {
		const panel = document.getElementById("validation-panel");

		renderValidationPanel(panel, invalidStadium());

		const items = [...document.querySelectorAll(".validation-item")];
		expect(items).toHaveLength(6);
		expect(items[0]?.classList.contains("warn")).toBe(false);
		expect(items.some((item) => item.classList.contains("warn"))).toBe(true);
		expect(items[0]?.textContent).toContain("seg0");
		expect(items[5]?.textContent).toContain("more issues");
		expect(items[0]?.getAttribute("title")).toBe("Click to dismiss");
	});

	it("lets validation items dismiss themselves", () => {
		const panel = document.getElementById("validation-panel");
		renderValidationPanel(panel, invalidStadium());

		document.querySelector<HTMLElement>(".validation-item")?.click();

		expect(document.querySelectorAll(".validation-item")).toHaveLength(5);
	});

	it("safely ignores missing panel elements", () => {
		expect(() => renderValidationPanel(null, invalidStadium())).not.toThrow();
	});
});
