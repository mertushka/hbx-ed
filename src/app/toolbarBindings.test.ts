import { describe, expect, it, vi } from "vitest";

import {
	bindToolbarButtons,
	syncOverlayToggleButtons,
} from "./toolbarBindings.ts";

function setup() {
	document.body.innerHTML = `
		<button id="tool-select" data-tool="select"></button>
		<button id="tool-empty" data-tool=""></button>
		<button id="open"></button>
		<button id="save"></button>
		<button id="undo"></button>
		<button id="redo"></button>
		<button id="labels"></button>
		<button id="spawns"></button>
		<input id="file" type="file" />
	`;

	const actions = {
		confirmDiscard: vi.fn(() => true),
		setTool: vi.fn(),
		save: vi.fn(),
		undo: vi.fn(),
		redo: vi.fn(),
		toggleVertexLabels: vi.fn(),
		toggleSpawnPoints: vi.fn(),
	};
	const fileInput = document.getElementById("file") as HTMLInputElement;
	vi.spyOn(fileInput, "click").mockImplementation(() => {});

	return { actions, fileInput };
}

describe("toolbarBindings", () => {
	it("binds tool buttons and command buttons", () => {
		const { actions, fileInput } = setup();
		bindToolbarButtons({
			fileInput,
			openButton: document.getElementById("open") as HTMLElement,
			saveButton: document.getElementById("save") as HTMLElement,
			undoButton: document.getElementById("undo") as HTMLElement,
			redoButton: document.getElementById("redo") as HTMLElement,
			toggleLabelsButton: document.getElementById("labels") as HTMLElement,
			toggleSpawnsButton: document.getElementById("spawns") as HTMLElement,
			isDirty: () => false,
			...actions,
		});

		document.getElementById("tool-select")?.click();
		document.getElementById("tool-empty")?.click();
		document.getElementById("open")?.click();
		document.getElementById("save")?.click();
		document.getElementById("undo")?.click();
		document.getElementById("redo")?.click();
		document.getElementById("labels")?.click();
		document.getElementById("spawns")?.click();

		expect(actions.setTool).toHaveBeenCalledOnce();
		expect(actions.setTool).toHaveBeenCalledWith("select");
		expect(fileInput.click).toHaveBeenCalledOnce();
		expect(actions.save).toHaveBeenCalledOnce();
		expect(actions.undo).toHaveBeenCalledOnce();
		expect(actions.redo).toHaveBeenCalledOnce();
		expect(actions.toggleVertexLabels).toHaveBeenCalledOnce();
		expect(actions.toggleSpawnPoints).toHaveBeenCalledOnce();
	});

	it("confirms before opening files when dirty", () => {
		const { actions, fileInput } = setup();
		actions.confirmDiscard.mockReturnValue(false);
		bindToolbarButtons({
			fileInput,
			openButton: document.getElementById("open") as HTMLElement,
			saveButton: document.getElementById("save") as HTMLElement,
			undoButton: document.getElementById("undo") as HTMLElement,
			redoButton: document.getElementById("redo") as HTMLElement,
			toggleLabelsButton: document.getElementById("labels") as HTMLElement,
			toggleSpawnsButton: document.getElementById("spawns") as HTMLElement,
			isDirty: () => true,
			...actions,
		});

		document.getElementById("open")?.click();
		expect(actions.confirmDiscard).toHaveBeenCalledWith(
			"You have unsaved changes. Discard and open a file?",
		);
		expect(fileInput.click).not.toHaveBeenCalled();

		actions.confirmDiscard.mockReturnValue(true);
		document.getElementById("open")?.click();
		expect(fileInput.click).toHaveBeenCalledOnce();
	});

	it("syncs overlay toggle active classes", () => {
		document.body.innerHTML = `
			<button id="labels"></button>
			<button id="spawns" class="active"></button>
		`;
		const labelsButton = document.getElementById("labels") as HTMLElement;
		const spawnsButton = document.getElementById("spawns") as HTMLElement;

		syncOverlayToggleButtons({
			labelsButton,
			spawnsButton,
			showVertexLabels: true,
			showSpawnPoints: false,
		});

		expect(labelsButton.classList.contains("active")).toBe(true);
		expect(spawnsButton.classList.contains("active")).toBe(false);
	});
});
