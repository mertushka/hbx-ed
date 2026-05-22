import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ObjectType, StadiumObject } from "../types/stadium.ts";
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

		selections.forEach(([type, title], index) => {
			panel.render(s, { type, index: 0 });
			expect(document.querySelector(".prop-section-title")?.textContent).toBe(
				title,
			);
			required(
				document.querySelector<HTMLButtonElement>(".prop-btn.danger"),
			).click();
			expect(onDelete).toHaveBeenNthCalledWith(index + 1, { type, index: 0 });
		});

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

	it("applies selected trait values to object properties and rebuilds the panel", () => {
		const s = stadium();
		s.traits = {
			ballArea: {
				radius: 25,
				color: "ffcc00",
				bCoef: 0.2,
				cMask: ["ball", "kick", "score"],
			},
		};
		s.discs[0] = { pos: [3, 4], radius: 8, color: "FFFFFF" };
		const onChange = vi.fn();
		const panel = new PropertiesPanel(onChange, vi.fn());
		panel.setRebuildCallback(() => panel.render(s, { type: "disc", index: 0 }));

		panel.render(s, { type: "disc", index: 0 });
		const traitSelect = required(
			[...document.querySelectorAll<HTMLSelectElement>("select")].find(
				(select) => select.value === "(none)",
			) ?? null,
		);
		traitSelect.value = "ballArea";
		traitSelect.dispatchEvent(new Event("change"));

		expect(s.discs[0]).toMatchObject({
			pos: [3, 4],
			radius: 25,
			color: "ffcc00",
			bCoef: 0.2,
			cMask: ["ball", "kick", "score"],
			trait: "ballArea",
		});
		expect(onChange).toHaveBeenCalledOnce();
		const radiusRow = [
			...document.querySelectorAll<HTMLElement>(".prop-row"),
		].find((row) => row.querySelector(".prop-label")?.textContent === "radius");
		expect(radiusRow?.querySelector<HTMLInputElement>("input")?.value).toBe(
			"25",
		);
	});

	it("renders global settings without an object selection", () => {
		const s = stadium();
		const onChange = vi.fn();
		const panel = new PropertiesPanel(onChange, vi.fn());

		panel.renderGlobal(s);

		expect(document.querySelector(".prop-section-title")?.textContent).toBe(
			"Stadium",
		);
		const nameInput = required(
			document.querySelector<HTMLInputElement>(".prop-input"),
		);
		nameInput.value = "Renamed";
		nameInput.dispatchEvent(new Event("change"));

		expect(s.name).toBe("Renamed");
		expect(onChange).toHaveBeenCalledOnce();
	});

	it("renders tool default trait controls without dirtying the stadium", () => {
		const s = stadium();
		const originalStadium = structuredClone(s);
		const defaults: Partial<Record<ObjectType, string>> = {};
		const panel = new PropertiesPanel(vi.fn(), vi.fn(), {
			getToolDefaultTrait: (type) => defaults[type],
			setToolDefaultTrait: (type, trait) => {
				if (trait) defaults[type] = trait;
				else delete defaults[type];
			},
		});

		panel.renderGlobal(s);
		const vertexTrait = [...document.querySelectorAll(".prop-row")].find(
			(row) => row.querySelector(".prop-label")?.textContent === "vertex trait",
		);
		const select = required(vertexTrait?.querySelector("select") ?? null);
		select.value = "wall";
		select.dispatchEvent(new Event("change"));

		expect(defaults.vertex).toBe("wall");
		expect(s).toEqual(originalStadium);
	});

	it("batch-edits traits for multi-selection", () => {
		const s = stadium();
		s.vertexes[0] = { x: 1, y: 2, trait: "wall" };
		s.segments[0] = { v0: 0, v1: 0, color: "FFFFFF" };
		const onChange = vi.fn();
		const panel = new PropertiesPanel(onChange, vi.fn());

		panel.renderMultiSelection(s, {
			items: [
				{ type: "vertex", index: 0 },
				{ type: "segment", index: 0 },
			],
		});

		expect(document.querySelector(".prop-section-title")?.textContent).toBe(
			"Batch Edit (2 objects)",
		);
		const traitSelect = required(
			document.querySelector<HTMLSelectElement>(".prop-section select"),
		);
		expect(traitSelect.value).toBe("(mixed)");

		traitSelect.value = "wall";
		traitSelect.dispatchEvent(new Event("change"));

		expect(s.vertexes[0]?.trait).toBe("wall");
		expect(s.segments[0]?.trait).toBe("wall");
		expect(onChange).toHaveBeenCalledOnce();

		traitSelect.value = "(none)";
		traitSelect.dispatchEvent(new Event("change"));

		expect(s.vertexes[0]?.trait).toBeUndefined();
		expect(s.segments[0]?.trait).toBeUndefined();
		expect(onChange).toHaveBeenCalledTimes(2);
	});
});
