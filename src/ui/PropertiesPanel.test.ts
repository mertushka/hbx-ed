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
		segments: [],
		goals: [],
		discs: [],
		planes: [],
		joints: [],
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
