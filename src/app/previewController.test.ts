import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StadiumObject } from "../types/stadium.ts";
import { PreviewController } from "./previewController.ts";

function stadium(): StadiumObject {
	return {
		name: "Preview Test",
		width: 100,
		height: 50,
		traits: {},
		vertexes: [],
		segments: [],
		goals: [],
		discs: [],
		planes: [],
		joints: [],
	};
}

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

function touchEvent(type: string, x: number, y: number): Event {
	const event = new Event(type, { bubbles: true, cancelable: true });
	const touch = { clientX: x, clientY: y };
	Object.defineProperties(event, {
		touches: {
			value: type === "touchend" || type === "touchcancel" ? [] : [touch],
		},
		changedTouches: { value: [touch] },
	});
	return event;
}

function multiTouchEvent(type: string, points: [number, number][]): Event {
	const event = new Event(type, { bubbles: true, cancelable: true });
	const touches = points.map(([clientX, clientY]) => ({ clientX, clientY }));
	Object.defineProperties(event, {
		touches: { value: touches },
		changedTouches: { value: touches },
	});
	return event;
}

function emptyTouchEvent(type: string): Event {
	const event = new Event(type, { bubbles: true, cancelable: true });
	Object.defineProperties(event, {
		touches: { value: [] },
		changedTouches: { value: [] },
	});
	return event;
}

function incompletePinchEvent(type: string): Event {
	const event = new Event(type, { bubbles: true, cancelable: true });
	const touches = {
		0: { clientX: 100, clientY: 100 },
		length: 2,
		item: () => null,
	};
	Object.defineProperties(event, {
		touches: { value: touches },
		changedTouches: { value: touches },
	});
	return event;
}

function setup(current: StadiumObject | null = stadium()) {
	document.body.innerHTML = `
		<button id="open"></button>
		<button id="close"></button>
		<button id="export"></button>
		<button id="zoom-in"></button>
		<button id="zoom-out"></button>
		<button id="zoom-fit"></button>
		<div id="overlay"></div>
		<div id="title"></div>
		<canvas id="preview"></canvas>
	`;
	const canvas = document.getElementById("preview") as HTMLCanvasElement;
	setElementSize(canvas, 640, 360);
	const toast = vi.fn();
	const controller = new PreviewController({
		canvas,
		overlay: document.getElementById("overlay") as HTMLElement,
		title: document.getElementById("title") as HTMLElement,
		openButton: document.getElementById("open") as HTMLElement,
		closeButton: document.getElementById("close") as HTMLElement,
		exportButton: document.getElementById("export") as HTMLElement,
		zoomInButton: document.getElementById("zoom-in") as HTMLElement,
		zoomOutButton: document.getElementById("zoom-out") as HTMLElement,
		zoomFitButton: document.getElementById("zoom-fit") as HTMLElement,
		getStadium: () => current,
		toast,
	});
	return { canvas, controller, toast };
}

describe("PreviewController", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	it("opens, sizes, titles, and closes the preview overlay", () => {
		const { canvas, controller } = setup();

		document.getElementById("open")?.click();

		expect(controller.isOpen).toBe(true);
		expect(
			document.getElementById("overlay")?.classList.contains("active"),
		).toBe(true);
		expect(document.getElementById("title")?.textContent).toBe(
			"Preview — Preview Test",
		);
		expect(canvas.width).toBe(640);
		expect(canvas.height).toBe(360);

		document.getElementById("close")?.click();

		expect(controller.isOpen).toBe(false);
		expect(
			document.getElementById("overlay")?.classList.contains("active"),
		).toBe(false);
	});

	it("shows feedback instead of opening when no stadium is loaded", () => {
		const { controller, toast } = setup(null);

		document.getElementById("open")?.click();

		expect(controller.isOpen).toBe(false);
		expect(toast).toHaveBeenCalledWith("Load a stadium first");
	});

	it("handles preview pan, zoom, resize, and PNG export", () => {
		const downloads: string[] = [];
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
			this: HTMLAnchorElement,
		) {
			if (this.download) downloads.push(this.download);
		});
		const { canvas, controller, toast } = setup();

		document.getElementById("open")?.click();
		canvas.dispatchEvent(
			new MouseEvent("mousedown", { clientX: 10, clientY: 10, bubbles: true }),
		);
		canvas.dispatchEvent(
			new MouseEvent("mousemove", { clientX: 30, clientY: 20, bubbles: true }),
		);
		canvas.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

		expect(canvas.style.cursor).toBe("grab");

		const touchStart = touchEvent("touchstart", 10, 10);
		const touchMove = touchEvent("touchmove", 30, 20);
		canvas.dispatchEvent(touchStart);
		canvas.dispatchEvent(touchMove);
		canvas.dispatchEvent(touchEvent("touchend", 30, 20));

		expect(touchStart.defaultPrevented).toBe(true);
		expect(touchMove.defaultPrevented).toBe(true);
		expect(canvas.style.cursor).toBe("grab");

		const internals = controller as unknown as { camera: { zoom: number } };
		const zoomBeforePinch = internals.camera.zoom;
		canvas.dispatchEvent(
			multiTouchEvent("touchstart", [
				[100, 100],
				[200, 100],
			]),
		);
		canvas.dispatchEvent(
			multiTouchEvent("touchmove", [
				[100, 100],
				[250, 100],
			]),
		);
		expect(internals.camera.zoom).toBeGreaterThan(zoomBeforePinch);

		canvas.dispatchEvent(
			new WheelEvent("wheel", {
				clientX: 100,
				clientY: 100,
				deltaY: -1,
				bubbles: true,
				cancelable: true,
			}),
		);
		document.getElementById("zoom-in")?.click();
		document.getElementById("zoom-out")?.click();
		document.getElementById("zoom-fit")?.click();

		setElementSize(canvas, 320, 180);
		controller.resizeIfOpen();
		expect(canvas.width).toBe(320);
		expect(canvas.height).toBe(180);

		document.getElementById("export")?.click();

		expect(downloads).toEqual(["Preview_Test.png"]);
		expect(toast).toHaveBeenCalledWith("Exported Preview_Test.png");
	});

	it("guards touch panning and pinch edge cases", () => {
		const { canvas, controller } = setup();
		document.getElementById("open")?.click();
		const internals = controller as unknown as { camera: { zoom: number } };
		const zoomBefore = internals.camera.zoom;

		const emptyStart = emptyTouchEvent("touchstart");
		canvas.dispatchEvent(emptyStart);
		expect(emptyStart.defaultPrevented).toBe(true);
		expect(canvas.style.cursor).toBe("grab");

		const singleMoveWithoutPan = touchEvent("touchmove", 30, 20);
		canvas.dispatchEvent(singleMoveWithoutPan);
		expect(singleMoveWithoutPan.defaultPrevented).toBe(true);

		const badPinch = incompletePinchEvent("touchmove");
		canvas.dispatchEvent(badPinch);
		expect(badPinch.defaultPrevented).toBe(true);
		expect(internals.camera.zoom).toBe(zoomBefore);

		canvas.dispatchEvent(touchEvent("touchstart", 10, 10));
		expect(canvas.style.cursor).toBe("grabbing");
		canvas.dispatchEvent(touchEvent("touchcancel", 10, 10));
		expect(canvas.style.cursor).toBe("grab");
	});

	it("ignores render, resize, fit, and export when closed or unloaded", () => {
		const { controller } = setup(null);

		expect(() => controller.render()).not.toThrow();
		expect(() => controller.resizeIfOpen()).not.toThrow();
		document.getElementById("zoom-fit")?.click();
		document.getElementById("export")?.click();

		expect(controller.isOpen).toBe(false);
	});
});
