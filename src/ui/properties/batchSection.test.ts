import { describe, expect, it, vi } from "vitest";

import type { StadiumObject } from "../../types/stadium.ts";
import { renderBatchSection } from "./batchSection.ts";

function stadium(): StadiumObject {
	return {
		name: "Batch",
		width: 100,
		height: 50,
		traits: { wall: {} },
		vertexes: [{ x: 0, y: 0 }],
		segments: [{ v0: 0, v1: 0 }],
		goals: [],
		discs: [],
		planes: [],
		joints: [],
	};
}

function selectIn(parent: HTMLElement): HTMLSelectElement {
	const select = parent.querySelector<HTMLSelectElement>("select");
	if (!select) throw new Error("Expected batch trait select");
	return select;
}

describe("renderBatchSection", () => {
	it("skips rendering when no selected objects exist", () => {
		const parent = document.createElement("div");

		renderBatchSection(
			parent,
			stadium(),
			{ items: [{ type: "disc", index: 9 }] },
			vi.fn(),
		);

		expect(parent.textContent).toBe("");
	});

	it("shows none for matching empty traits and ignores the mixed sentinel", () => {
		const parent = document.createElement("div");
		const notify = vi.fn();

		renderBatchSection(
			parent,
			stadium(),
			{
				items: [
					{ type: "vertex", index: 0 },
					{ type: "segment", index: 0 },
				],
			},
			notify,
		);

		const select = selectIn(parent);
		expect(select.value).toBe("(none)");

		select.value = "(mixed)";
		select.dispatchEvent(new Event("change"));

		expect(notify).not.toHaveBeenCalled();
	});

	it("renders without stadium traits", () => {
		const parent = document.createElement("div");
		const s = stadium();
		delete s.traits;

		renderBatchSection(
			parent,
			s,
			{ items: [{ type: "vertex", index: 0 }] },
			vi.fn(),
		);

		const select = selectIn(parent);
		expect([...select.options].map((option) => option.value)).toEqual([
			"(mixed)",
			"(none)",
		]);
	});

	it("ignores missing objects while applying trait changes", () => {
		const parent = document.createElement("div");
		const s = stadium();
		const notify = vi.fn();

		renderBatchSection(
			parent,
			s,
			{
				items: [
					{ type: "vertex", index: 0 },
					{ type: "disc", index: 9 },
				],
			},
			notify,
		);

		const select = selectIn(parent);
		select.value = "wall";
		select.dispatchEvent(new Event("change"));

		expect(s.vertexes[0]?.trait).toBe("wall");
		expect(notify).toHaveBeenCalledOnce();
	});

	it("does not notify if selected objects disappear before a change", () => {
		const parent = document.createElement("div");
		const s = stadium();
		const notify = vi.fn();

		renderBatchSection(
			parent,
			s,
			{ items: [{ type: "vertex", index: 0 }] },
			notify,
		);

		s.vertexes.pop();
		const select = selectIn(parent);
		select.value = "wall";
		select.dispatchEvent(new Event("change"));

		expect(notify).not.toHaveBeenCalled();
	});
});
