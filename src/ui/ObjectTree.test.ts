import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StadiumObject } from "../types/stadium.ts";
import { ObjectTree } from "./ObjectTree.ts";

function stadium(): StadiumObject {
	return {
		name: "Tree",
		width: 100,
		height: 50,
		traits: {},
		vertexes: [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
		],
		segments: [{ v0: 0, v1: 1, vis: false }],
		discs: [],
		goals: [],
		planes: [],
		joints: [],
	};
}

describe("ObjectTree", () => {
	beforeEach(() => {
		document.body.innerHTML = '<div id="obj-tree"></div>';
	});

	it("renders groups, selections, and emits selection callbacks", () => {
		const onSelect = vi.fn();
		const tree = new ObjectTree(onSelect, vi.fn(), vi.fn());

		tree.render(
			stadium(),
			{ type: "vertex", index: 1 },
			{ items: [{ type: "segment", index: 0 }] },
		);

		expect(document.body.textContent).toContain("Vertexes");
		expect(document.querySelectorAll(".obj-item")).toHaveLength(3);
		expect(document.querySelectorAll(".selected")).toHaveLength(1);
		expect(document.querySelectorAll(".multi-selected")).toHaveLength(1);

		document.querySelector<HTMLElement>(".obj-item")?.click();
		expect(onSelect).toHaveBeenCalledWith({ type: "vertex", index: 0 });
	});

	it("toggles segment visibility", () => {
		const s = stadium();
		const onVisToggle = vi.fn();
		const onSelect = vi.fn();
		const tree = new ObjectTree(onSelect, vi.fn(), onVisToggle);

		tree.render(s, null, null);
		document.querySelector<HTMLButtonElement>(".vis-btn")?.click();

		expect(s.segments[0]?.vis).toBe(true);
		expect(onVisToggle).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenCalledWith({ type: "segment", index: 0 });
	});
});
