import { describe, expect, it, vi } from "vitest";

import type { MultiSelection, StadiumObject } from "../types/stadium.ts";
import { EditorState } from "./editorState.ts";
import { SelectionController } from "./selectionController.ts";

function stadium(): StadiumObject {
	return {
		name: "Selection",
		width: 100,
		height: 50,
		vertexes: [{ x: 1, y: 2 }],
		segments: [],
		goals: [],
		discs: [],
		planes: [],
		joints: [],
	};
}

function setup() {
	const s = stadium();
	const editorState = new EditorState();
	editorState.load(s);
	const renderer = { multiSelection: null as MultiSelection | null };
	const objectTree = { render: vi.fn() };
	const propertiesPanel = {
		clear: vi.fn(),
		render: vi.fn(),
		renderGlobal: vi.fn(),
		renderMultiSelection: vi.fn(),
	};
	const statusBar = { setSelection: vi.fn() };
	const render = vi.fn();
	const controller = new SelectionController({
		editorState,
		renderer,
		objectTree,
		propertiesPanel,
		statusBar,
		getStadium: () => editorState.stadium,
		render,
	});
	return {
		controller,
		editorState,
		objectTree,
		propertiesPanel,
		render,
		renderer,
		s,
		statusBar,
	};
}

describe("SelectionController", () => {
	it("selects a single object and renders its properties", () => {
		const { controller, objectTree, propertiesPanel, renderer, s, statusBar } =
			setup();
		renderer.multiSelection = { items: [{ type: "vertex", index: 0 }] };

		controller.select({ type: "vertex", index: 0 });

		expect(renderer.multiSelection).toBeNull();
		expect(objectTree.render).toHaveBeenCalledWith(
			s,
			{ type: "vertex", index: 0 },
			null,
		);
		expect(propertiesPanel.render).toHaveBeenCalledWith(s, {
			type: "vertex",
			index: 0,
		});
		expect(statusBar.setSelection).toHaveBeenCalledWith("vertex #0 selected");
	});

	it("renders batch properties and reports multi-selection count when selection is null", () => {
		const {
			controller,
			editorState,
			objectTree,
			propertiesPanel,
			s,
			statusBar,
		} = setup();
		const multiSelection: MultiSelection = {
			items: [
				{ type: "vertex", index: 0 },
				{ type: "disc", index: 1 },
			],
		};
		editorState.setMultiSelection(multiSelection);

		controller.select(null);

		expect(objectTree.render).toHaveBeenCalledWith(s, null, multiSelection);
		expect(propertiesPanel.renderMultiSelection).toHaveBeenCalledWith(
			s,
			multiSelection,
		);
		expect(propertiesPanel.clear).not.toHaveBeenCalled();
		expect(statusBar.setSelection).toHaveBeenCalledWith("2 objects selected");
	});

	it("syncs multi-selection to the renderer and status bar", () => {
		const {
			controller,
			editorState,
			objectTree,
			propertiesPanel,
			render,
			renderer,
			s,
			statusBar,
		} = setup();
		const multiSelection: MultiSelection = {
			items: [
				{ type: "vertex", index: 0 },
				{ type: "segment", index: 0 },
			],
		};

		controller.setMultiSelection(multiSelection);

		expect(editorState.multiSelection).toBe(multiSelection);
		expect(renderer.multiSelection).toBe(multiSelection);
		expect(objectTree.render).toHaveBeenCalledWith(s, null, multiSelection);
		expect(propertiesPanel.renderMultiSelection).toHaveBeenCalledWith(
			s,
			multiSelection,
		);
		expect(statusBar.setSelection).toHaveBeenCalledWith("2 objects selected");
		expect(render).toHaveBeenCalledOnce();
		expect(controller.contains({ type: "segment", index: 0 })).toBe(true);
		expect(controller.contains({ type: "goal", index: 0 })).toBe(false);
	});

	it("syncs empty multi-selection without touching status text", () => {
		const {
			controller,
			editorState,
			propertiesPanel,
			render,
			renderer,
			s,
			statusBar,
		} = setup();

		controller.setMultiSelection(null);

		expect(editorState.multiSelection).toBeNull();
		expect(renderer.multiSelection).toBeNull();
		expect(propertiesPanel.renderGlobal).toHaveBeenCalledWith(s);
		expect(statusBar.setSelection).not.toHaveBeenCalled();
		expect(render).toHaveBeenCalledOnce();
		expect(controller.contains({ type: "vertex", index: 0 })).toBe(false);
	});

	it("syncs single-item multi-selection without touching status text", () => {
		const {
			controller,
			editorState,
			propertiesPanel,
			render,
			renderer,
			s,
			statusBar,
		} = setup();
		const multiSelection: MultiSelection = {
			items: [{ type: "vertex", index: 0 }],
		};

		controller.setMultiSelection(multiSelection);

		expect(editorState.multiSelection).toBe(multiSelection);
		expect(renderer.multiSelection).toBe(multiSelection);
		expect(propertiesPanel.renderGlobal).toHaveBeenCalledWith(s);
		expect(statusBar.setSelection).not.toHaveBeenCalled();
		expect(render).toHaveBeenCalledOnce();
		expect(controller.contains({ type: "vertex", index: 0 })).toBe(true);
		expect(controller.contains({ type: "segment", index: 0 })).toBe(false);
	});

	it("clears multi-selection only when one exists", () => {
		const {
			controller,
			editorState,
			objectTree,
			propertiesPanel,
			render,
			renderer,
			statusBar,
		} = setup();

		expect(controller.clearMultiSelection()).toBe(false);

		const multiSelection: MultiSelection = {
			items: [{ type: "vertex", index: 0 }],
		};
		editorState.setMultiSelection(multiSelection);
		renderer.multiSelection = multiSelection;

		expect(controller.clearMultiSelection()).toBe(true);
		expect(editorState.multiSelection).toBeNull();
		expect(renderer.multiSelection).toBeNull();
		expect(statusBar.setSelection).toHaveBeenCalledWith("nothing selected");
		expect(objectTree.render).toHaveBeenCalledWith(
			editorState.stadium,
			editorState.selection,
			null,
		);
		expect(propertiesPanel.renderGlobal).toHaveBeenCalledWith(
			editorState.stadium,
		);
		expect(render).toHaveBeenCalledOnce();
	});
});
