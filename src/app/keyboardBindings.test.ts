import { describe, expect, it, vi } from "vitest";

import { bindKeyboard } from "./keyboardBindings.ts";

function setup(overrides: Partial<Parameters<typeof bindKeyboard>[0]> = {}) {
	const doc = document.implementation.createHTMLDocument();
	doc.body.innerHTML = `
		<div id="shortcut-modal"></div>
		<button id="shortcut-close"></button>
		<div id="new-modal"></div>
		<input id="editor-input" />
		<select id="editor-select"></select>
		<textarea id="editor-textarea"></textarea>
	`;
	const actions = {
		setShiftHeld: vi.fn(),
		undo: vi.fn(),
		redo: vi.fn(),
		save: vi.fn(),
		duplicate: vi.fn(),
		copy: vi.fn(),
		paste: vi.fn(),
		deleteSelected: vi.fn(),
		setTool: vi.fn(),
		toggleVertexLabels: vi.fn(),
		toggleSpawnPoints: vi.fn(),
		closePreview: vi.fn(),
		clearMultiSelection: vi.fn(() => false),
		clearSelection: vi.fn(),
	};
	bindKeyboard({
		doc,
		win: window,
		shortcutModal: doc.getElementById("shortcut-modal") as HTMLElement,
		shortcutClose: doc.getElementById("shortcut-close") as HTMLElement,
		newModal: doc.getElementById("new-modal"),
		isPreviewOpen: () => false,
		...actions,
		...overrides,
	});
	return { actions, doc };
}

function keydown(
	doc: Document,
	key: string,
	init: KeyboardEventInit = {},
): void {
	doc.dispatchEvent(new KeyboardEvent("keydown", { key, ...init }));
}

describe("bindKeyboard", () => {
	it("dispatches command shortcuts outside edit targets", () => {
		const { actions, doc } = setup();
		keydown(doc, "s", { ctrlKey: true });
		keydown(doc, "z", { ctrlKey: true });
		keydown(doc, "z", { ctrlKey: true, shiftKey: true });
		keydown(doc, "y", { ctrlKey: true });
		keydown(doc, "d", { ctrlKey: true });
		keydown(doc, "c", { ctrlKey: true });
		keydown(doc, "v", { ctrlKey: true });

		expect(actions.save).toHaveBeenCalledOnce();
		expect(actions.undo).toHaveBeenCalledOnce();
		expect(actions.redo).toHaveBeenCalledTimes(2);
		expect(actions.duplicate).toHaveBeenCalledOnce();
		expect(actions.copy).toHaveBeenCalledOnce();
		expect(actions.paste).toHaveBeenCalledOnce();
	});

	it("preserves native editing shortcuts except app-level save", () => {
		const { actions, doc } = setup();
		const targets = [
			doc.getElementById("editor-input"),
			doc.getElementById("editor-select"),
			doc.getElementById("editor-textarea"),
		];

		for (const target of targets) {
			if (!target) throw new Error("Expected editing target");
			target.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "z",
					ctrlKey: true,
					bubbles: true,
					cancelable: true,
				}),
			);
			target.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "c",
					ctrlKey: true,
					bubbles: true,
					cancelable: true,
				}),
			);
			target.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "v",
					ctrlKey: true,
					bubbles: true,
					cancelable: true,
				}),
			);
		}

		targets[0]?.dispatchEvent(
			new KeyboardEvent("keydown", {
				key: "s",
				ctrlKey: true,
				bubbles: true,
				cancelable: true,
			}),
		);

		expect(actions.undo).not.toHaveBeenCalled();
		expect(actions.copy).not.toHaveBeenCalled();
		expect(actions.paste).not.toHaveBeenCalled();
		expect(actions.save).toHaveBeenCalledOnce();
	});

	it("maps tool keys and overlay toggles outside text inputs", () => {
		const { actions, doc } = setup();
		keydown(doc, "h");
		keydown(doc, "i");
		keydown(doc, "o");

		expect(actions.setTool).toHaveBeenCalledWith("pan");
		expect(actions.toggleVertexLabels).toHaveBeenCalledOnce();
		expect(actions.toggleSpawnPoints).toHaveBeenCalledOnce();
	});

	it("deletes the current selection from the Delete key outside text inputs", () => {
		const { actions, doc } = setup();

		keydown(doc, "Delete");
		keydown(doc, "Del");

		expect(actions.deleteSelected).toHaveBeenCalledTimes(2);
	});

	it("ignores tool keys and Delete from editing targets", () => {
		const { actions, doc } = setup();
		const input = doc.getElementById("editor-input") as HTMLInputElement;
		input.dispatchEvent(
			new KeyboardEvent("keydown", { key: "h", bubbles: true }),
		);
		input.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Delete", bubbles: true }),
		);

		expect(actions.setTool).not.toHaveBeenCalled();
		expect(actions.deleteSelected).not.toHaveBeenCalled();
	});

	it("tracks shift state and closes modal layers on escape", () => {
		const { actions, doc } = setup();
		keydown(doc, "Shift");
		doc.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift" }));
		window.dispatchEvent(new Event("blur"));

		expect(actions.setShiftHeld).toHaveBeenNthCalledWith(1, true);
		expect(actions.setShiftHeld).toHaveBeenNthCalledWith(2, false);
		expect(actions.setShiftHeld).toHaveBeenNthCalledWith(3, false);

		const shortcutModal = doc.getElementById("shortcut-modal");
		shortcutModal?.classList.add("active");
		keydown(doc, "Escape");
		expect(shortcutModal?.classList.contains("active")).toBe(false);
		expect(actions.clearSelection).not.toHaveBeenCalled();
	});

	it("opens and closes the shortcut modal from keyboard and pointer controls", () => {
		const { doc } = setup();
		const shortcutModal = doc.getElementById("shortcut-modal");
		const shortcutClose = doc.getElementById("shortcut-close");

		keydown(doc, "?");
		expect(shortcutModal?.classList.contains("active")).toBe(true);
		shortcutClose?.click();
		expect(shortcutModal?.classList.contains("active")).toBe(false);

		keydown(doc, "/", { shiftKey: true });
		expect(shortcutModal?.classList.contains("active")).toBe(true);
		shortcutModal?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		expect(shortcutModal?.classList.contains("active")).toBe(false);
	});

	it("handles escape precedence for preview, new modal, multi-selection, and selection", () => {
		const preview = setup({ isPreviewOpen: () => true });
		keydown(preview.doc, "Escape");
		expect(preview.actions.closePreview).toHaveBeenCalledOnce();
		expect(preview.actions.clearSelection).not.toHaveBeenCalled();

		const modal = setup();
		const newModal = modal.doc.getElementById("new-modal");
		newModal?.classList.add("active");
		keydown(modal.doc, "Escape");
		expect(newModal?.classList.contains("active")).toBe(false);
		expect(modal.actions.clearSelection).not.toHaveBeenCalled();

		const multi = setup();
		multi.actions.clearMultiSelection.mockReturnValueOnce(true);
		keydown(multi.doc, "Escape");
		expect(multi.actions.clearMultiSelection).toHaveBeenCalledOnce();
		expect(multi.actions.clearSelection).not.toHaveBeenCalled();

		const selection = setup();
		keydown(selection.doc, "Escape");
		expect(selection.actions.clearSelection).toHaveBeenCalledOnce();
	});
});
