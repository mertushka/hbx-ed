import { beforeEach, describe, expect, it, vi } from "vitest";

import indexHtml from "../index.html?raw";
import { App } from "./app.ts";

function setElementSize(el: HTMLElement, width: number, height: number): void {
	Object.defineProperty(el, "clientWidth", {
		value: width,
		configurable: true,
	});
	Object.defineProperty(el, "clientHeight", {
		value: height,
		configurable: true,
	});
	el.getBoundingClientRect = () =>
		({
			x: 0,
			y: 0,
			left: 0,
			top: 0,
			right: width,
			bottom: height,
			width,
			height,
			toJSON: () => ({}),
		}) as DOMRect;
}

function setupDom(): void {
	vi.restoreAllMocks();
	document.open();
	document.write(indexHtml);
	document.close();
	const canvasArea = document.getElementById("canvas-area");
	const mainCanvas = document.getElementById("main-canvas");
	const previewCanvas = document.getElementById("preview-canvas");
	if (!canvasArea || !mainCanvas || !previewCanvas) {
		throw new Error("Expected app fixture elements");
	}
	setElementSize(canvasArea, 800, 400);
	setElementSize(mainCanvas, 800, 400);
	setElementSize(previewCanvas, 640, 360);
	vi.clearAllMocks();
}

function click(selector: string): void {
	const el = document.querySelector<HTMLElement>(selector);
	if (!el) throw new Error(`Expected ${selector}`);
	el.click();
}

function canvasMouse(
	type: string,
	clientX: number,
	clientY: number,
	init: MouseEventInit = {},
): void {
	const canvas = document.getElementById("main-canvas");
	if (!canvas) throw new Error("Expected main canvas");
	canvas.dispatchEvent(
		new MouseEvent(type, {
			clientX,
			clientY,
			button: 0,
			bubbles: true,
			cancelable: true,
			...init,
		}),
	);
}

function keydown(key: string, init: KeyboardEventInit = {}): void {
	document.dispatchEvent(
		new KeyboardEvent("keydown", {
			key,
			bubbles: true,
			cancelable: true,
			...init,
		}),
	);
}

function createStadiumFromTemplate(name: string, templateId: string): void {
	click("#btn-new");
	const nameInput = document.getElementById(
		"new-stadium-name",
	) as HTMLInputElement | null;
	if (!nameInput) throw new Error("Expected new stadium input");
	nameInput.value = name;
	click(`[data-id="${templateId}"]`);
	click("#btn-create-stadium");
}

function itemContaining(text: string): HTMLElement {
	const item = [...document.querySelectorAll<HTMLElement>(".obj-item")].find(
		(el) => el.textContent?.includes(text),
	);
	if (!item) throw new Error(`Expected object tree item containing ${text}`);
	return item;
}

function menuItemContaining(text: string): HTMLElement {
	const item = [...document.querySelectorAll<HTMLElement>(".ctx-item")].find(
		(el) => el.textContent?.includes(text),
	);
	if (!item) throw new Error(`Expected context menu item containing ${text}`);
	return item;
}

function installFileReaderMock(read: (file: File) => string): () => void {
	const originalWindow = window.FileReader;
	const originalGlobal = globalThis.FileReader;

	class MockFileReader extends EventTarget {
		result: string | ArrayBuffer | null = null;

		readAsText(file: File): void {
			this.result = read(file);
			this.dispatchEvent(new Event("load"));
		}
	}

	Object.defineProperty(window, "FileReader", {
		value: MockFileReader,
		configurable: true,
	});
	Object.defineProperty(globalThis, "FileReader", {
		value: MockFileReader,
		configurable: true,
	});

	return () => {
		Object.defineProperty(window, "FileReader", {
			value: originalWindow,
			configurable: true,
		});
		Object.defineProperty(globalThis, "FileReader", {
			value: originalGlobal,
			configurable: true,
		});
	};
}

describe("App", () => {
	beforeEach(() => {
		setupDom();
	});

	it("boots with the bundled stadium and switches toolbar tools", () => {
		new App();

		expect(document.getElementById("stadium-name-display")?.textContent).toBe(
			"Classic",
		);
		document.querySelector<HTMLButtonElement>('[data-tool="pan"]')?.click();
		expect(
			document
				.querySelector<HTMLButtonElement>('[data-tool="pan"]')
				?.classList.contains("active"),
		).toBe(true);
		expect(
			document
				.querySelector<HTMLButtonElement>('[data-tool="select"]')
				?.classList.contains("active"),
		).toBe(false);
	});

	it("creates a vertex through canvas interaction, supports undo, and saves", () => {
		const downloads: string[] = [];
		const clickSpy = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(function (this: HTMLAnchorElement) {
				if (this.download) downloads.push(this.download);
			});
		new App();

		click('[data-tool="vertex"]');
		canvasMouse("mousedown", 400, 200);
		canvasMouse("mouseup", 400, 200);

		expect(document.getElementById("status-sel")?.textContent).toBe(
			"vertex #20 selected",
		);
		expect(document.querySelector(".prop-section-title")?.textContent).toBe(
			"Vertex #20",
		);
		expect(
			document.getElementById("stadium-name-display")?.textContent,
		).not.toBe("Classic");

		click("#btn-save");
		expect(clickSpy).toHaveBeenCalledOnce();
		expect(downloads).toEqual(["Classic.hbs"]);

		click("#btn-undo");
		expect(document.getElementById("status-sel")?.textContent).toBe(
			"nothing selected",
		);
		expect(document.getElementById("obj-tree")?.textContent).not.toContain(
			"v20 (0, 0)",
		);
	});

	it("creates a new stadium from a template modal", () => {
		new App();

		click("#btn-new");
		expect(
			document.getElementById("new-modal")?.classList.contains("active"),
		).toBe(true);
		expect(document.querySelectorAll(".template-card")).toHaveLength(4);

		const emptyCard = document.querySelector<HTMLElement>('[data-id="empty"]');
		if (!emptyCard) throw new Error("Expected empty template card");
		emptyCard.click();
		expect(emptyCard.classList.contains("active")).toBe(true);

		const nameInput = document.getElementById(
			"new-stadium-name",
		) as HTMLInputElement | null;
		if (!nameInput) throw new Error("Expected new stadium input");
		nameInput.value = "Tiny Test";
		click("#btn-create-stadium");

		expect(
			document.getElementById("new-modal")?.classList.contains("active"),
		).toBe(false);
		expect(document.getElementById("stadium-name-display")?.textContent).toBe(
			"Tiny Test",
		);
		expect(document.getElementById("obj-tree")?.textContent).toContain(
			"Vertexes0",
		);
	});

	it("opens preview, pans/zooms it, exports PNG, and closes it", () => {
		const downloads: string[] = [];
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
			this: HTMLAnchorElement,
		) {
			if (this.download) downloads.push(this.download);
		});
		new App();

		click("#btn-preview");
		expect(
			document.getElementById("preview-overlay")?.classList.contains("active"),
		).toBe(true);
		expect(document.getElementById("preview-title")?.textContent).toContain(
			"Classic",
		);

		const previewCanvas = document.getElementById("preview-canvas");
		if (!previewCanvas) throw new Error("Expected preview canvas");
		previewCanvas.dispatchEvent(
			new MouseEvent("mousedown", { clientX: 10, clientY: 10, bubbles: true }),
		);
		previewCanvas.dispatchEvent(
			new MouseEvent("mousemove", { clientX: 30, clientY: 20, bubbles: true }),
		);
		previewCanvas.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
		expect((previewCanvas as HTMLElement).style.cursor).toBe("grab");

		click("#preview-zoom-in");
		click("#preview-zoom-out");
		click("#preview-zoom-fit");
		click("#preview-export");
		expect(downloads).toEqual(["Classic.png"]);

		click("#preview-close");
		expect(
			document.getElementById("preview-overlay")?.classList.contains("active"),
		).toBe(false);
	});

	it("toggles overlays and object context-menu actions", () => {
		new App();

		click("#btn-toggle-labels");
		expect(
			document
				.getElementById("btn-toggle-labels")
				?.classList.contains("active"),
		).toBe(true);
		click("#btn-toggle-spawns");
		expect(
			document
				.getElementById("btn-toggle-spawns")
				?.classList.contains("active"),
		).toBe(false);

		const seg0 = itemContaining("seg0");
		seg0.dispatchEvent(
			new MouseEvent("contextmenu", {
				clientX: 40,
				clientY: 50,
				bubbles: true,
				cancelable: true,
			}),
		);
		expect(document.getElementById("ctx-menu")?.style.display).toBe("block");
		expect(document.getElementById("ctx-menu")?.textContent).toContain(
			"Reverse direction",
		);
		menuItemContaining("Make invisible").click();

		expect(itemContaining("seg0").classList.contains("seg-invisible")).toBe(
			true,
		);
	});

	it("creates and deletes a spawn point through the canvas context menu", () => {
		new App();
		createStadiumFromTemplate("Spawn Test", "empty");

		click('[data-tool="spawn-red"]');
		canvasMouse("mousedown", 400, 200);
		canvasMouse("mouseup", 400, 200);
		canvasMouse("contextmenu", 400, 200);

		expect(document.getElementById("ctx-menu")?.textContent).toContain(
			"Delete red spawn #0",
		);
		menuItemContaining("Delete red spawn #0").click();
		canvasMouse("contextmenu", 400, 200);
		expect(document.getElementById("ctx-menu")?.style.display).toBe("none");
	});

	it("uses keyboard shortcuts for duplicate, copy, paste, and empty clipboard feedback", () => {
		new App();

		keydown("c", { ctrlKey: true });
		expect(document.getElementById("toast")?.textContent).toBe(
			"Select something first",
		);
		keydown("v", { ctrlKey: true });
		expect(document.getElementById("toast")?.textContent).toBe(
			"Nothing to paste",
		);

		itemContaining("v0").click();
		keydown("d", { ctrlKey: true });
		expect(document.getElementById("status-sel")?.textContent).toBe(
			"vertex #20 selected",
		);

		keydown("c", { ctrlKey: true });
		expect(document.getElementById("toast")?.textContent).toContain(
			"Copied vertex",
		);
		keydown("v", { ctrlKey: true });

		expect(document.getElementById("status-sel")?.textContent).toBe(
			"vertex #21 selected",
		);
		expect(document.getElementById("toast")?.textContent).toContain(
			"Pasted vertex",
		);
	});

	it("respects dirty confirmations before opening or creating another stadium", () => {
		new App();
		click('[data-tool="vertex"]');
		canvasMouse("mousedown", 400, 200);
		const fileInput = document.getElementById("file-input") as HTMLInputElement;
		const fileInputClick = vi
			.spyOn(fileInput, "click")
			.mockImplementation(() => undefined);

		window.confirm = vi.fn(() => false);
		click("#btn-open");
		expect(window.confirm).toHaveBeenCalledWith(
			"You have unsaved changes. Discard and open a file?",
		);
		expect(fileInputClick).not.toHaveBeenCalled();
		click("#btn-new");
		expect(window.confirm).toHaveBeenCalledWith(
			"You have unsaved changes. Discard and create a new stadium?",
		);
		expect(
			document.getElementById("new-modal")?.classList.contains("active"),
		).toBe(false);

		window.confirm = vi.fn(() => true);
		click("#btn-open");
		expect(fileInputClick).toHaveBeenCalledOnce();
		click("#btn-new");
		expect(
			document.getElementById("new-modal")?.classList.contains("active"),
		).toBe(true);
	});

	it("loads files through the input, reports parse errors, and dismisses validation items", () => {
		const restoreFileReader = installFileReaderMock((file) =>
			file.name === "bad.hbs"
				? "{ bad"
				: `{
					name: 'Loaded Bad Refs',
					width: 100,
					height: 50,
					vertexes: [{ x: 0, y: 0 }],
					segments: [{ v0: 0, v1: 9 }],
					goals: [],
					discs: [],
					planes: [],
					joints: [{ d0: 0, d1: 9 }],
				}`,
		);
		try {
			new App();
			const fileInput = document.getElementById(
				"file-input",
			) as HTMLInputElement;

			Object.defineProperty(fileInput, "files", {
				value: [new File([""], "bad.hbs")],
				configurable: true,
			});
			fileInput.dispatchEvent(new Event("change"));
			expect(document.getElementById("toast")?.textContent).toContain("Error:");

			Object.defineProperty(fileInput, "files", {
				value: [new File([""], "loaded.hbs")],
				configurable: true,
			});
			fileInput.dispatchEvent(new Event("change"));
			expect(document.getElementById("stadium-name-display")?.textContent).toBe(
				"Loaded Bad Refs",
			);
			const issueCount = document.querySelectorAll(".validation-item").length;
			expect(issueCount).toBeGreaterThan(0);

			document.querySelector<HTMLElement>(".validation-item")?.click();
			expect(document.querySelectorAll(".validation-item")).toHaveLength(
				issueCount - 1,
			);
		} finally {
			restoreFileReader();
		}
	});

	it("switches and deletes goals from the context menu", () => {
		new App();

		itemContaining("goal0").dispatchEvent(
			new MouseEvent("contextmenu", {
				clientX: 30,
				clientY: 40,
				bubbles: true,
				cancelable: true,
			}),
		);
		menuItemContaining("Switch team").click();
		expect(itemContaining("goal0").textContent).toContain("[blue]");

		itemContaining("goal0").dispatchEvent(
			new MouseEvent("contextmenu", {
				clientX: 30,
				clientY: 40,
				bubbles: true,
				cancelable: true,
			}),
		);
		menuItemContaining("Delete goal").click();
		expect(document.getElementById("obj-tree")?.textContent).toContain(
			"Goals1",
		);
		expect(document.getElementById("status-sel")?.textContent).toBe(
			"nothing selected",
		);
	});
});
