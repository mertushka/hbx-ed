import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StadiumObject } from "../types/stadium.ts";
import { PropertiesPanel } from "./PropertiesPanel.ts";

function required<T extends Element>(value: T | null): T {
	if (!value) throw new Error("Expected element to exist");
	return value;
}

function stadium(): StadiumObject {
	return {
		name: "Props",
		width: 100,
		height: 50,
		traits: { wall: { bCoef: 0.5 } },
		vertexes: [{ x: 1, y: 2 }],
		segments: [{ v0: 0, v1: 0, color: "FFFFFF" }],
		goals: [{ p0: [0, -10], p1: [0, 10], team: "red" }],
		discs: [{ pos: [3, 4], radius: 8, color: "FFFFFF" }],
		planes: [{ normal: [0, 1], dist: 5 }],
		joints: [{ d0: 0, d1: 0, color: "FFFFFF" }],
	};
}

describe("PropertiesPanel", () => {
	beforeEach(() => {
		document.body.innerHTML = `
			<div id="stadium-name-display"></div>
			<div id="props-placeholder"></div>
			<div><div id="props-inner" class="hidden"></div></div>
		`;
	});

	it("renders selected object fields and mutates on change", () => {
		const s = stadium();
		const onChange = vi.fn();
		const panel = new PropertiesPanel(onChange, vi.fn());

		panel.render(s, { type: "vertex", index: 0 });
		expect(document.querySelector(".prop-section-title")?.textContent).toBe(
			"Vertex #0",
		);

		const xInput = required(
			document.querySelector<HTMLInputElement>(".prop-input"),
		);
		xInput.value = "42";
		xInput.dispatchEvent(new Event("change"));

		expect(s.vertexes[0]?.x).toBe(42);
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("renders every object section and wires delete actions", () => {
		const s = stadium();
		const onDelete = vi.fn();
		const panel = new PropertiesPanel(vi.fn(), onDelete);
		const selections = [
			["segment", "Segment #0"],
			["disc", "Disc #0"],
			["goal", "Goal #0"],
			["plane", "Plane #0"],
			["joint", "Joint #0"],
		] as const;

		for (const [type, title] of selections) {
			panel.render(s, { type, index: 0 });
			expect(document.querySelector(".prop-section-title")?.textContent).toBe(
				title,
			);
			required(
				document.querySelector<HTMLButtonElement>(".prop-btn.danger"),
			).click();
		}

		expect(onDelete).toHaveBeenCalledTimes(selections.length);
	});

	it("throws when required DOM roots are missing", () => {
		document.body.innerHTML = "";

		expect(() => new PropertiesPanel(vi.fn(), vi.fn())).toThrow(
			"Properties panel elements not found",
		);
	});

	it("handles trait controls and clear state", () => {
		const s = stadium();
		const panel = new PropertiesPanel(vi.fn(), vi.fn());

		panel.render(s, { type: "vertex", index: 0 });
		const traitSelect = required(
			document.querySelector<HTMLSelectElement>("select"),
		);
		traitSelect.value = "wall";
		traitSelect.dispatchEvent(new Event("change"));
		expect(s.vertexes[0]?.trait).toBe("wall");

		panel.clear();
		expect(
			document.getElementById("props-inner")?.classList.contains("hidden"),
		).toBe(true);
		expect(
			document
				.getElementById("props-placeholder")
				?.classList.contains("hidden"),
		).toBe(false);
	});
});
