import { beforeEach, describe, expect, it, vi } from "vitest";

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

		expect(
			[
				...document.querySelectorAll<HTMLButtonElement>(".validation-filter"),
			].map((button) => button.textContent),
		).toEqual(["All 10", "Errors 3", "Warnings 7"]);
	});

	it("filters problems by severity and preserves the selected filter on refresh", () => {
		const panel = document.getElementById("validation-panel");
		renderValidationPanel(panel, invalidStadium());

		const errorsButton = document.querySelector<HTMLButtonElement>(
			'[data-validation-filter="error"]',
		);
		const warningsButton = document.querySelector<HTMLButtonElement>(
			'[data-validation-filter="warn"]',
		);
		if (!errorsButton || !warningsButton) {
			throw new Error("Expected validation filter buttons");
		}

		errorsButton.click();
		expect(errorsButton.classList.contains("active")).toBe(true);
		expect(errorsButton.getAttribute("aria-pressed")).toBe("true");
		expect(document.querySelectorAll(".validation-item")).toHaveLength(3);
		expect(
			[...document.querySelectorAll(".validation-item")].every((item) =>
				item.classList.contains("error"),
			),
		).toBe(true);

		warningsButton.click();
		expect(warningsButton.classList.contains("active")).toBe(true);
		expect(document.querySelectorAll(".validation-item")).toHaveLength(7);
		expect(
			[...document.querySelectorAll(".validation-item")].every((item) =>
				item.classList.contains("warn"),
			),
		).toBe(true);

		renderValidationPanel(panel, invalidStadium());

		expect(
			document
				.querySelector<HTMLButtonElement>('[data-validation-filter="warn"]')
				?.classList.contains("active"),
		).toBe(true);
		expect(document.querySelectorAll(".validation-item")).toHaveLength(7);
	});

	it("does not dismiss validation state by clicking an issue", () => {
		const panel = document.getElementById("validation-panel");
		const onSelectIssue = vi.fn();
		renderValidationPanel(panel, invalidStadium(), { onSelectIssue });

		document.querySelector<HTMLElement>(".validation-item")?.click();

		expect(document.querySelectorAll(".validation-item")).toHaveLength(10);
		expect(onSelectIssue).toHaveBeenCalledWith({ type: "segment", index: 0 });
		expect(document.querySelector<HTMLElement>(".validation-item")?.title).toBe(
			"Select segment #0",
		);
	});

	it("selects all related objects for multi-target issues", () => {
		const panel = document.getElementById("validation-panel");
		const onSelectIssue = vi.fn();
		const onSelectIssueTargets = vi.fn();
		renderValidationPanel(panel, invalidStadium(), {
			onSelectIssue,
			onSelectIssueTargets,
		});

		const duplicateIssue = [
			...document.querySelectorAll<HTMLElement>(".validation-item"),
		].find((item) => item.textContent?.includes("duplicates seg2"));
		if (!duplicateIssue) throw new Error("Expected duplicate segment issue");

		duplicateIssue.click();

		expect(onSelectIssue).not.toHaveBeenCalled();
		expect(onSelectIssueTargets).toHaveBeenCalledWith([
			{ type: "segment", index: 2 },
			{ type: "segment", index: 3 },
		]);
		expect(duplicateIssue.title).toBe("Select segment #2 and segment #3");
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
