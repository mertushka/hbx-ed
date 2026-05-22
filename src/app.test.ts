import { beforeEach, describe, expect, it, vi } from "vitest";

import indexHtml from "../index.html?raw";
import { App } from "./app.ts";
import type {
	MultiSelection,
	Selection,
	StadiumObject,
} from "./types/stadium.ts";

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

function propInputFor(label: string): HTMLInputElement {
	const row = [...document.querySelectorAll<HTMLElement>(".prop-row")].find(
		(el) => el.querySelector<HTMLElement>(".prop-label")?.textContent === label,
	);
	const input = row?.querySelector<HTMLInputElement>("input");
	if (!input) throw new Error(`Expected property input for ${label}`);
	return input;
}

function propSelectFor(label: string): HTMLSelectElement {
	const row = [...document.querySelectorAll<HTMLElement>(".prop-row")].find(
		(el) => el.querySelector<HTMLElement>(".prop-label")?.textContent === label,
	);
	const select = row?.querySelector<HTMLSelectElement>("select");
	if (!select) throw new Error(`Expected property select for ${label}`);
	return select;
}

interface AppInternals {
	camera: {
		x: number;
		y: number;
		zoom: number;
		worldToScreen(
			wx: number,
			wy: number,
			canvasW: number,
			canvasH: number,
		): { x: number; y: number };
	};
	multiSelection: MultiSelection | null;
	objectCount(type: Selection["type"]): number;
	objectTree: {
		render(
			stadium: StadiumObject | null,
			selection: Selection | null,
			multiSelection?: MultiSelection | null,
		): void;
	};
	renderer: {
		multiSelection: MultiSelection | null;
	};
	rememberToolDefaultFromSelection(selection: Selection | null): void;
	refresh(): void;
	select(selection: Selection | null): void;
	selection: Selection | null;
	stadium: StadiumObject | null;
}

function appInternals(app: App): AppInternals {
	return app as unknown as AppInternals;
}

// Test-only shortcut: this bypasses AppContext.setMultiSelection, so it does not
// update the status bar. Use real UI interactions, or update status explicitly,
// when a test depends on pre-delete status text.
function setMultiSelection(
	app: App,
	items: MultiSelection["items"],
): AppInternals {
	const internals = appInternals(app);
	const multiSelection = { items };
	internals.multiSelection = multiSelection;
	internals.renderer.multiSelection = multiSelection;
	internals.objectTree.render(internals.stadium, null, multiSelection);
	return internals;
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
		expect(document.getElementById("props-inner")?.textContent).toContain(
			"Stadium",
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

	it("loads files through the input, reports parse errors, and keeps validation dock state persistent", () => {
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
			expect(
				document.querySelector(".validation-summary-count")?.textContent,
			).toContain("errors");

			const dock =
				document.querySelector<HTMLDetailsElement>(".validation-dock");
			if (!dock) throw new Error("Expected validation dock");
			dock.open = true;
			document.querySelector<HTMLElement>(".validation-item")?.click();
			expect(document.querySelectorAll(".validation-item")).toHaveLength(
				issueCount,
			);
			expect(dock.open).toBe(true);
			expect(document.getElementById("status-sel")?.textContent).toBe(
				"segment #0 selected",
			);
			expect(document.querySelector(".prop-section-title")?.textContent).toBe(
				"Segment #0",
			);
		} finally {
			restoreFileReader();
		}
	});

	it("smoothly reveals offscreen objects selected from the object tree", async () => {
		const restoreFileReader = installFileReaderMock(
			() => `{
			name: 'Far Object',
			width: 100,
			height: 50,
			vertexes: [{ x: 5000, y: 5000 }],
			segments: [],
			goals: [],
			discs: [],
			planes: [],
			joints: [],
		}`,
		);
		try {
			const app = new App();
			const internals = appInternals(app);
			const fileInput = document.getElementById(
				"file-input",
			) as HTMLInputElement;
			Object.defineProperty(fileInput, "files", {
				value: [new File([""], "far-object.hbs")],
				configurable: true,
			});
			fileInput.dispatchEvent(new Event("change"));

			const zoomBefore = internals.camera.zoom;
			expect(internals.camera.x).toBe(0);
			expect(internals.camera.y).toBe(0);

			itemContaining("v0").click();

			await vi.waitFor(() => {
				expect(internals.camera.x).toBe(5000);
				expect(internals.camera.y).toBe(5000);
			});
			expect(internals.camera.zoom).toBe(zoomBefore);
			expect(document.getElementById("status-sel")?.textContent).toBe(
				"vertex #0 selected",
			);
		} finally {
			restoreFileReader();
		}
	});

	it("multi-selects related objects from duplicate validation issues", () => {
		const restoreFileReader = installFileReaderMock(
			() => `{
			name: 'Duplicate Segments',
			width: 100,
			height: 50,
			vertexes: [{ x: 0, y: 0 }, { x: 20, y: 0 }],
			segments: [{ v0: 0, v1: 1 }, { v0: 1, v1: 0 }],
			goals: [],
			discs: [],
			planes: [],
			joints: [],
		}`,
		);
		try {
			const app = new App();
			const internals = appInternals(app);
			const fileInput = document.getElementById(
				"file-input",
			) as HTMLInputElement;
			Object.defineProperty(fileInput, "files", {
				value: [new File([""], "duplicate-segments.hbs")],
				configurable: true,
			});
			fileInput.dispatchEvent(new Event("change"));

			const duplicateIssue = [
				...document.querySelectorAll<HTMLElement>(".validation-item"),
			].find((item) => item.textContent?.includes("duplicates seg0"));
			if (!duplicateIssue) throw new Error("Expected duplicate segment issue");

			duplicateIssue.click();

			expect(internals.multiSelection?.items).toEqual([
				{ type: "segment", index: 0 },
				{ type: "segment", index: 1 },
			]);
			expect(document.getElementById("status-sel")?.textContent).toBe(
				"2 objects selected",
			);
			expect(itemContaining("seg0").classList.contains("multi-selected")).toBe(
				true,
			);
			expect(itemContaining("seg1").classList.contains("multi-selected")).toBe(
				true,
			);
		} finally {
			restoreFileReader();
		}
	});

	it("applies preselected tool traits to newly drawn segment objects", () => {
		const restoreFileReader = installFileReaderMock(
			() => `{
			name: 'Tool Defaults',
			width: 100,
			height: 50,
			traits: {
				post: { bCoef: 0.4, cMask: ['ball'] },
				wall: { color: '00ff00', bCoef: 0.2, cMask: ['ball', 'kick'] },
			},
			vertexes: [],
			segments: [],
			goals: [],
			discs: [],
			planes: [],
			joints: [],
		}`,
		);
		try {
			const app = new App();
			const internals = appInternals(app);
			const fileInput = document.getElementById(
				"file-input",
			) as HTMLInputElement;
			Object.defineProperty(fileInput, "files", {
				value: [new File([""], "tool-defaults.hbs")],
				configurable: true,
			});
			fileInput.dispatchEvent(new Event("change"));

			const vertexTrait = propSelectFor("vertex trait");
			vertexTrait.value = "post";
			vertexTrait.dispatchEvent(new Event("change"));
			const segmentTrait = propSelectFor("segment trait");
			segmentTrait.value = "wall";
			segmentTrait.dispatchEvent(new Event("change"));

			click('[data-tool="segment"]');
			canvasMouse("mousedown", 390, 200);
			canvasMouse("mousedown", 410, 200);

			expect(internals.stadium?.vertexes[0]).toMatchObject({
				trait: "post",
				bCoef: 0.4,
				cMask: ["ball"],
			});
			expect(internals.stadium?.vertexes[1]).toMatchObject({
				trait: "post",
				bCoef: 0.4,
				cMask: ["ball"],
			});
			expect(internals.stadium?.segments[0]).toMatchObject({
				trait: "wall",
				color: "00ff00",
				bCoef: 0.2,
				cMask: ["ball", "kick"],
			});
		} finally {
			restoreFileReader();
		}
	});

	it("reuses selected object properties when drawing another object of that type", () => {
		const restoreFileReader = installFileReaderMock(
			() => `{
			name: 'Property Memory',
			width: 100,
			height: 50,
			traits: { ballArea: {} },
			vertexes: [],
			segments: [],
			goals: [],
			discs: [{
				pos: [10, 10],
				radius: 25,
				color: 'ffcc00',
				bCoef: 0.2,
				cMask: ['ball', 'kick', 'score'],
				trait: 'ballArea',
			}],
			planes: [],
			joints: [],
		}`,
		);
		try {
			const app = new App();
			const internals = appInternals(app);
			const fileInput = document.getElementById(
				"file-input",
			) as HTMLInputElement;
			Object.defineProperty(fileInput, "files", {
				value: [new File([""], "property-memory.hbs")],
				configurable: true,
			});
			fileInput.dispatchEvent(new Event("change"));

			internals.rememberToolDefaultFromSelection({ type: "disc", index: 9 });
			itemContaining("disc0").click();
			click('[data-tool="disc"]');
			canvasMouse("mousedown", 400, 200);

			expect(internals.stadium?.discs[1]).toMatchObject({
				pos: [0, 0],
				radius: 25,
				color: "ffcc00",
				bCoef: 0.2,
				cMask: ["ball", "kick", "score"],
				trait: "ballArea",
			});

			internals.select(null);
			const discTrait = propSelectFor("disc trait");
			discTrait.value = "(none)";
			discTrait.dispatchEvent(new Event("change"));
			const nextDiscPos = internals.camera.worldToScreen(10, 0, 800, 400);
			canvasMouse("mousedown", nextDiscPos.x, nextDiscPos.y);

			expect(internals.stadium?.discs[2]).toMatchObject({
				pos: [10, 0],
				radius: 25,
				color: "ffcc00",
				bCoef: 0.2,
				cMask: ["ball", "kick", "score"],
			});
			expect(internals.stadium?.discs[2]?.trait).toBeUndefined();
		} finally {
			restoreFileReader();
		}
	});

	it("applies selected disc tool trait values to the first added disc", () => {
		const restoreFileReader = installFileReaderMock(
			() => `{
			name: 'Disc Trait Defaults',
			width: 100,
			height: 50,
			traits: {
				goalPost: {
					radius: 8,
					color: 'ffcc00',
					bCoef: 0.5,
					cMask: ['ball', 'kick'],
					cGroup: ['score'],
				},
			},
			vertexes: [],
			segments: [],
			goals: [],
			discs: [],
			planes: [],
			joints: [],
		}`,
		);
		try {
			const app = new App();
			const internals = appInternals(app);
			const fileInput = document.getElementById(
				"file-input",
			) as HTMLInputElement;
			Object.defineProperty(fileInput, "files", {
				value: [new File([""], "disc-trait-defaults.hbs")],
				configurable: true,
			});
			fileInput.dispatchEvent(new Event("change"));

			const discTrait = propSelectFor("disc trait");
			discTrait.value = "goalPost";
			discTrait.dispatchEvent(new Event("change"));

			click('[data-tool="disc"]');
			canvasMouse("mousedown", 400, 200);

			expect(internals.stadium?.discs[0]).toMatchObject({
				pos: [0, 0],
				radius: 8,
				color: "ffcc00",
				bCoef: 0.5,
				cMask: ["ball", "kick"],
				cGroup: ["score"],
				trait: "goalPost",
			});
		} finally {
			restoreFileReader();
		}
	});

	it("supports object tree ctrl and shift multi-selection", () => {
		const app = new App();
		const internals = appInternals(app);

		itemContaining("v0 (").click();
		itemContaining("v1 (").dispatchEvent(
			new MouseEvent("click", { bubbles: true, ctrlKey: true }),
		);

		expect(internals.multiSelection?.items).toEqual([
			{ type: "vertex", index: 0 },
			{ type: "vertex", index: 1 },
		]);
		expect(document.getElementById("status-sel")?.textContent).toBe(
			"2 objects selected",
		);

		itemContaining("v3 (").dispatchEvent(
			new MouseEvent("click", { bubbles: true, shiftKey: true }),
		);

		expect(internals.multiSelection?.items).toEqual([
			{ type: "vertex", index: 1 },
			{ type: "vertex", index: 2 },
			{ type: "vertex", index: 3 },
		]);
		expect(document.querySelector(".prop-section-title")?.textContent).toBe(
			"Batch Edit (3 objects)",
		);
	});

	it("collapses object tree toggle selections back to single or none", () => {
		const app = new App();
		const internals = appInternals(app);

		itemContaining("v0 (").dispatchEvent(
			new MouseEvent("click", { bubbles: true, ctrlKey: true }),
		);
		expect(internals.selection).toEqual({ type: "vertex", index: 0 });
		expect(internals.multiSelection).toBeNull();

		itemContaining("v0 (").dispatchEvent(
			new MouseEvent("click", { bubbles: true, ctrlKey: true }),
		);
		expect(internals.selection).toBeNull();
		expect(internals.multiSelection).toBeNull();

		itemContaining("v3 (").dispatchEvent(
			new MouseEvent("click", { bubbles: true, shiftKey: true }),
		);
		expect(internals.selection).toEqual({ type: "vertex", index: 3 });
		expect(internals.multiSelection).toBeNull();
	});

	it("range-selects each object tree group type", () => {
		const restoreFileReader = installFileReaderMock(
			() => `{
			name: 'Range Groups',
			width: 100,
			height: 50,
			vertexes: [{ x: 0, y: 0 }, { x: 20, y: 0 }],
			segments: [{ v0: 0, v1: 1 }, { v0: 1, v1: 0 }],
			goals: [
				{ team: 'red', p0: [0, 0], p1: [0, 10] },
				{ team: 'blue', p0: [20, 0], p1: [20, 10] },
			],
			discs: [{ pos: [0, 0] }, { pos: [20, 0] }],
			planes: [{ normal: [0, 1], dist: 0 }, { normal: [1, 0], dist: 20 }],
			joints: [{ d0: 0, d1: 1 }, { d0: 1, d1: 0 }],
		}`,
		);
		try {
			const app = new App();
			const internals = appInternals(app);
			const fileInput = document.getElementById(
				"file-input",
			) as HTMLInputElement;
			Object.defineProperty(fileInput, "files", {
				value: [new File([""], "range-groups.hbs")],
				configurable: true,
			});
			fileInput.dispatchEvent(new Event("change"));

			const cases: Array<[Selection["type"], string]> = [
				["segment", "seg"],
				["disc", "disc"],
				["goal", "goal"],
				["plane", "plane"],
				["joint", "joint"],
			];

			for (const [type, label] of cases) {
				itemContaining(`${label}0`).click();
				itemContaining(`${label}1`).dispatchEvent(
					new MouseEvent("click", { bubbles: true, shiftKey: true }),
				);
				expect(internals.multiSelection?.items).toEqual([
					{ type, index: 0 },
					{ type, index: 1 },
				]);
			}
		} finally {
			restoreFileReader();
		}
	});

	it("refreshes global, batch, and empty property panel states", () => {
		const app = new App();
		const internals = appInternals(app);

		internals.selection = null;
		internals.multiSelection = {
			items: [
				{ type: "vertex", index: 0 },
				{ type: "vertex", index: 1 },
			],
		};
		internals.refresh();
		expect(document.querySelector(".prop-section-title")?.textContent).toBe(
			"Batch Edit (2 objects)",
		);

		internals.multiSelection = null;
		internals.stadium = null;
		expect(internals.objectCount("vertex")).toBe(0);
		internals.refresh();

		expect(
			document.getElementById("props-inner")?.classList.contains("hidden"),
		).toBe(true);
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

	it("preserves multi-selection when deleting from the object tree context menu", () => {
		const app = new App();
		const internals = setMultiSelection(app, [
			{ type: "vertex", index: 0 },
			{ type: "vertex", index: 1 },
		]);
		const startVertexCount = internals.stadium?.vertexes.length ?? 0;

		itemContaining("v0").dispatchEvent(
			new MouseEvent("contextmenu", {
				clientX: 30,
				clientY: 40,
				bubbles: true,
				cancelable: true,
			}),
		);

		expect(internals.multiSelection?.items).toHaveLength(2);
		menuItemContaining("Delete 2 selected objects").click();

		expect(internals.stadium?.vertexes).toHaveLength(startVertexCount - 2);
		expect(internals.multiSelection).toBeNull();
		expect(document.getElementById("status-sel")?.textContent).toBe(
			"nothing selected",
		);
	});

	it("preserves multi-selection when deleting from the canvas context menu", () => {
		const app = new App();
		const internals = setMultiSelection(app, [
			{ type: "vertex", index: 0 },
			{ type: "vertex", index: 1 },
		]);
		const stadium = internals.stadium;
		const firstVertex = stadium?.vertexes[0];
		if (!stadium || !firstVertex) throw new Error("Expected classic vertices");
		const startVertexCount = stadium.vertexes.length;
		const screen = internals.camera.worldToScreen(
			firstVertex.x,
			firstVertex.y,
			800,
			400,
		);

		canvasMouse("contextmenu", screen.x, screen.y);

		expect(internals.multiSelection?.items).toHaveLength(2);
		menuItemContaining("Delete 2 selected objects").click();

		expect(stadium.vertexes).toHaveLength(startVertexCount - 2);
		expect(internals.multiSelection).toBeNull();
	});

	it("refreshes validation after deleting an object", () => {
		const restoreFileReader = installFileReaderMock(
			() => `{
			name: 'Delete Validation',
			width: 100,
			height: 50,
			vertexes: [],
			segments: [],
			goals: [{ team: 'red', p0: [0, 0], p1: [0, 0] }],
			discs: [],
			planes: [],
			joints: [],
		}`,
		);
		try {
			new App();
			const fileInput = document.getElementById(
				"file-input",
			) as HTMLInputElement;
			Object.defineProperty(fileInput, "files", {
				value: [new File([""], "delete-validation.hbs")],
				configurable: true,
			});
			fileInput.dispatchEvent(new Event("change"));

			expect(
				document.getElementById("validation-panel")?.textContent,
			).toContain("goal0: p0 === p1");

			itemContaining("goal0").dispatchEvent(
				new MouseEvent("contextmenu", {
					clientX: 30,
					clientY: 40,
					bubbles: true,
					cancelable: true,
				}),
			);
			menuItemContaining("Delete goal").click();

			expect(
				document.getElementById("validation-panel")?.textContent,
			).not.toContain("goal0: p0 === p1");
		} finally {
			restoreFileReader();
		}
	});

	it("refreshes validation after property edits, undo, and redo", () => {
		const restoreFileReader = installFileReaderMock(
			() => `{
			name: 'Property Validation',
			width: 100,
			height: 50,
			vertexes: [{ x: 0, y: 0 }, { x: 20, y: 0 }],
			segments: [{ v0: 0, v1: 1 }],
			goals: [],
			discs: [],
			planes: [],
			joints: [],
		}`,
		);
		try {
			new App();
			const fileInput = document.getElementById(
				"file-input",
			) as HTMLInputElement;
			Object.defineProperty(fileInput, "files", {
				value: [new File([""], "property-validation.hbs")],
				configurable: true,
			});
			fileInput.dispatchEvent(new Event("change"));
			expect(document.getElementById("validation-panel")?.textContent).toBe("");

			itemContaining("seg0").click();
			const v1Input = propInputFor("v1");
			v1Input.value = "9";
			v1Input.dispatchEvent(new Event("change"));

			expect(
				document.getElementById("validation-panel")?.textContent,
			).toContain("seg0: v1=9 out of range");

			click("#btn-undo");
			expect(document.getElementById("validation-panel")?.textContent).toBe("");

			click("#btn-redo");
			expect(
				document.getElementById("validation-panel")?.textContent,
			).toContain("seg0: v1=9 out of range");
		} finally {
			restoreFileReader();
		}
	});

	it("preserves JSON5 numeric values through app undo and redo", () => {
		const restoreFileReader = installFileReaderMock(
			() => `{
			name: 'Infinity History',
			width: 100,
			height: 50,
			bg: { type: 'grass', width: Infinity },
			vertexes: [{ x: 0, y: 0 }],
			segments: [],
			goals: [],
			discs: [],
			planes: [],
			joints: [],
		}`,
		);
		try {
			const app = new App();
			const internals = appInternals(app);
			const fileInput = document.getElementById(
				"file-input",
			) as HTMLInputElement;
			Object.defineProperty(fileInput, "files", {
				value: [new File([""], "infinity-history.hbs")],
				configurable: true,
			});
			fileInput.dispatchEvent(new Event("change"));

			itemContaining("v0").click();
			const xInput = propInputFor("x");
			xInput.value = "10";
			xInput.dispatchEvent(new Event("change"));

			click("#btn-undo");
			expect(internals.stadium?.bg?.width).toBe(Infinity);

			click("#btn-redo");
			expect(internals.stadium?.bg?.width).toBe(Infinity);
		} finally {
			restoreFileReader();
		}
	});
});
