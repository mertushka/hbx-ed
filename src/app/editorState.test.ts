import { describe, expect, it } from "vitest";

import type { StadiumObject } from "../types/stadium.ts";
import { EditorState } from "./editorState.ts";

function stadium(name = "State Test"): StadiumObject {
	return {
		name,
		width: 100,
		height: 50,
		traits: {},
		bg: { type: "grass", width: Infinity },
		vertexes: [{ x: 0, y: 0 }],
		segments: [],
		goals: [],
		discs: [],
		planes: [],
		joints: [],
	};
}

describe("EditorState", () => {
	it("loads stadium state and resets selections with initial history", () => {
		const state = new EditorState();
		state.load(stadium());

		expect(state.stadium?.name).toBe("State Test");
		expect(state.selection).toBeNull();
		expect(state.multiSelection).toBeNull();
		expect(state.history.canUndo).toBe(false);
	});

	it("coordinates selection and multi-selection state", () => {
		const state = new EditorState();
		state.load(stadium());

		state.setMultiSelection({
			items: [
				{ type: "vertex", index: 0 },
				{ type: "disc", index: 0 },
			],
		});
		expect(state.selection).toBeNull();
		expect(state.multiSelection?.items).toHaveLength(2);

		state.select({ type: "vertex", index: 0 });
		expect(state.selection).toEqual({ type: "vertex", index: 0 });
		expect(state.multiSelection).toBeNull();
	});

	it("supports explicit state setters and empty mutation/history guards", () => {
		const state = new EditorState();

		expect(state.saveMutation()).toBe(false);
		expect(state.undo()).toBeNull();
		expect(state.redo()).toBeNull();
		expect(state.clearMultiSelection()).toBe(false);

		const map = stadium("Assigned");
		state.stadium = map;
		state.selection = { type: "vertex", index: 0 };
		state.multiSelection = { items: [{ type: "vertex", index: 0 }] };

		expect(state.stadium).toBe(map);
		expect(state.selection).toEqual({ type: "vertex", index: 0 });
		expect(state.multiSelection).toEqual({
			items: [{ type: "vertex", index: 0 }],
		});
		expect(state.clearMultiSelection()).toBe(true);
		expect(state.multiSelection).toBeNull();
		expect(state.selection).toEqual({ type: "vertex", index: 0 });
	});

	it("saves mutations and restores cloned undo/redo snapshots", () => {
		const state = new EditorState();
		state.load(stadium());
		if (!state.stadium) throw new Error("Expected stadium");

		state.stadium.name = "Changed";
		state.saveMutation();

		const previous = state.undo();
		expect(previous?.name).toBe("State Test");
		expect(previous?.bg?.width).toBe(Infinity);

		if (previous) previous.name = "Mutated Undo Return";
		expect(state.redo()?.name).toBe("Changed");
	});
});
