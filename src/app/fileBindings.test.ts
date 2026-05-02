import { beforeEach, describe, expect, it, vi } from "vitest";

import { bindFileIO } from "./fileBindings.ts";

describe("bindFileIO", () => {
	let fileInput: HTMLInputElement;
	let canvasArea: HTMLElement;
	let dropOverlay: HTMLElement;

	beforeEach(() => {
		document.body.innerHTML = `
			<input id="file-input" type="file" />
			<div id="canvas-area"></div>
			<div id="drop-overlay"></div>
		`;
		fileInput = document.querySelector("#file-input") as HTMLInputElement;
		canvasArea = document.querySelector("#canvas-area") as HTMLElement;
		dropOverlay = document.querySelector("#drop-overlay") as HTMLElement;
	});

	it("opens files from the input and resets the control", () => {
		const readFile = vi.fn();
		const file = new File(["{}"], "test.hbs");
		Object.defineProperty(fileInput, "files", {
			value: [file],
			configurable: true,
		});

		bindFileIO({
			fileInput,
			canvasArea,
			dropOverlay,
			isDirty: () => false,
			confirmDiscard: vi.fn(),
			readFile,
		});
		fileInput.dispatchEvent(new Event("change"));

		expect(readFile).toHaveBeenCalledWith(file);
		expect(fileInput.value).toBe("");
	});

	it("shows drop state and respects dirty confirmations", () => {
		const readFile = vi.fn();
		const confirmDiscard = vi.fn(() => false);
		const file = new File(["{}"], "drop.hbs");

		bindFileIO({
			fileInput,
			canvasArea,
			dropOverlay,
			isDirty: () => true,
			confirmDiscard,
			readFile,
		});

		canvasArea.dispatchEvent(new Event("dragover", { bubbles: true }));
		expect(dropOverlay.classList.contains("active")).toBe(true);

		const drop = new Event("drop", { bubbles: true });
		Object.defineProperty(drop, "dataTransfer", {
			value: { files: [file] },
		});
		canvasArea.dispatchEvent(drop);

		expect(dropOverlay.classList.contains("active")).toBe(false);
		expect(confirmDiscard).toHaveBeenCalledOnce();
		expect(readFile).not.toHaveBeenCalled();
	});

	it("opens dropped files when clean or when dirty changes are confirmed", () => {
		const readFile = vi.fn();
		const confirmDiscard = vi.fn(() => true);
		const cleanFile = new File(["{}"], "clean.hbs");
		const dirtyFile = new File(["{}"], "dirty.hbs");

		bindFileIO({
			fileInput,
			canvasArea,
			dropOverlay,
			isDirty: () => false,
			confirmDiscard,
			readFile,
		});

		const cleanDrop = new Event("drop", { bubbles: true });
		Object.defineProperty(cleanDrop, "dataTransfer", {
			value: { files: [cleanFile] },
		});
		canvasArea.dispatchEvent(cleanDrop);

		expect(readFile).toHaveBeenCalledWith(cleanFile);
		expect(confirmDiscard).not.toHaveBeenCalled();

		const dirtyArea = document.createElement("div");
		const dirtyOverlay = document.createElement("div");
		bindFileIO({
			fileInput,
			canvasArea: dirtyArea,
			dropOverlay: dirtyOverlay,
			isDirty: () => true,
			confirmDiscard,
			readFile,
		});
		const dirtyDrop = new Event("drop", { bubbles: true });
		Object.defineProperty(dirtyDrop, "dataTransfer", {
			value: { files: [dirtyFile] },
		});
		dirtyArea.dispatchEvent(dirtyDrop);

		expect(confirmDiscard).toHaveBeenCalledOnce();
		expect(readFile).toHaveBeenCalledWith(dirtyFile);
	});

	it("ignores empty file selections and drops, and hides drag state on leave", () => {
		const readFile = vi.fn();

		bindFileIO({
			fileInput,
			canvasArea,
			dropOverlay,
			isDirty: () => false,
			confirmDiscard: vi.fn(),
			readFile,
		});

		Object.defineProperty(fileInput, "files", {
			value: [],
			configurable: true,
		});
		fileInput.dispatchEvent(new Event("change"));

		canvasArea.dispatchEvent(new Event("dragover", { bubbles: true }));
		expect(dropOverlay.classList.contains("active")).toBe(true);
		canvasArea.dispatchEvent(new Event("dragleave", { bubbles: true }));
		expect(dropOverlay.classList.contains("active")).toBe(false);

		const emptyDrop = new Event("drop", { bubbles: true });
		Object.defineProperty(emptyDrop, "dataTransfer", {
			value: { files: [] },
		});
		canvasArea.dispatchEvent(emptyDrop);

		expect(readFile).not.toHaveBeenCalled();
	});
});
