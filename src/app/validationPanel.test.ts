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

	it("renders issues inside a collapsed statusbar problems dock", () => {
		const panel = document.getElementById("validation-panel");

		renderValidationPanel(panel, invalidStadium());

		const dock = document.querySelector<HTMLDetailsElement>(".validation-dock");
		expect(dock).not.toBeNull();
		expect(dock?.open).toBe(false);
		expect(
			document.querySelector(".validation-summary-title")?.textContent,
		).toBe("Problems");
		expect(
			document.querySelector(".validation-summary-count")?.textContent,
		).toBe("3 errors | 7 warnings");

		const items = [...document.querySelectorAll(".validation-item")];
		expect(items).toHaveLength(10);
		expect(items[0]?.classList.contains("error")).toBe(true);
		expect(items.some((item) => item.classList.contains("warn"))).toBe(true);
		expect(items[0]?.textContent).toContain("seg0");
		expect(items.at(-1)?.textContent).toContain("goal0");
	});

	it("does not dismiss validation state by clicking an issue", () => {
		const panel = document.getElementById("validation-panel");
		renderValidationPanel(panel, invalidStadium());

		document.querySelector<HTMLElement>(".validation-item")?.click();

		expect(document.querySelectorAll(".validation-item")).toHaveLength(10);
	});

	it("preserves expanded state while validation refreshes", () => {
		const panel = document.getElementById("validation-panel");
		renderValidationPanel(panel, invalidStadium());

		const dock = document.querySelector<HTMLDetailsElement>(".validation-dock");
		if (!dock) throw new Error("Expected validation dock");
		dock.open = true;

		renderValidationPanel(panel, invalidStadium());

		expect(
			document.querySelector<HTMLDetailsElement>(".validation-dock")?.open,
		).toBe(true);
	});

	it("safely ignores missing panel elements", () => {
		expect(() => renderValidationPanel(null, invalidStadium())).not.toThrow();
	});
});
