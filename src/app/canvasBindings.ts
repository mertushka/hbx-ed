import type { WorldPoint } from "../core/camera.ts";
import { hitTest } from "../core/hitTest.ts";
import type { Tool } from "../tools/types.ts";
import type { Selection, StadiumObject } from "../types/stadium.ts";
import type { MenuDef } from "../ui/ContextMenu.ts";
import {
	buildSpawnContextMenuItems,
	findSpawnPointAt,
} from "./spawnContextMenu.ts";

export interface CanvasBindingsOptions {
	doc?: Document;
	canvas: HTMLCanvasElement;
	getWorldPos: (event: MouseEvent) => WorldPoint;
	getActiveTool: () => Tool;
	getPanTool: () => Tool | undefined;
	getStadium: () => StadiumObject | null;
	getZoom: () => number;
	zoomAt: (factor: number, anchorX: number, anchorY: number) => void;
	render: () => void;
	setCoords: (x: number, y: number) => void;
	showContextMenu: (x: number, y: number, items: MenuDef) => void;
	showObjectContextMenu: (event: MouseEvent, selection: Selection) => void;
	saveHistory: (stadium: StadiumObject) => void;
}

export function bindCanvasEvents({
	doc = document,
	canvas,
	getWorldPos,
	getActiveTool,
	getPanTool,
	getStadium,
	getZoom,
	zoomAt,
	render,
	setCoords,
	showContextMenu,
	showObjectContextMenu,
	saveHistory,
}: CanvasBindingsOptions): void {
	let lastTouchEvent: MouseEvent | null = null;

	canvas.addEventListener("mousedown", (e) => {
		if (e.button === 1 || (e.button === 0 && e.altKey)) {
			getPanTool()?.onMouseDown?.(getWorldPos(e), e);
			return;
		}
		if (e.button === 0) {
			getActiveTool().onMouseDown?.(getWorldPos(e), e);
		}
	});

	canvas.addEventListener(
		"touchstart",
		(e) => {
			e.preventDefault();
			const mouseEvent = mouseEventFromTouch(e);
			if (!mouseEvent || e.touches.length > 1) return;
			lastTouchEvent = mouseEvent;
			getActiveTool().onMouseDown?.(getWorldPos(mouseEvent), mouseEvent);
		},
		{ passive: false },
	);

	canvas.addEventListener("mousemove", (e) => {
		const world = getWorldPos(e);
		setCoords(world.x, world.y);

		const snapEl = doc.getElementById("status-snap");
		if (snapEl) snapEl.style.display = e.shiftKey ? "inline" : "none";

		const activeTool = getActiveTool();
		activeTool.onMouseMove?.(world, e);
		if (activeTool.name !== "pan") {
			getPanTool()?.onMouseMove?.(world, e);
		}
	});

	canvas.addEventListener(
		"touchmove",
		(e) => {
			e.preventDefault();
			const mouseEvent = mouseEventFromTouch(e);
			if (!mouseEvent || e.touches.length > 1) return;
			lastTouchEvent = mouseEvent;

			const world = getWorldPos(mouseEvent);
			setCoords(world.x, world.y);

			const snapEl = doc.getElementById("status-snap");
			if (snapEl) snapEl.style.display = "none";

			const activeTool = getActiveTool();
			activeTool.onMouseMove?.(world, mouseEvent);
			if (activeTool.name !== "pan") {
				getPanTool()?.onMouseMove?.(world, mouseEvent);
			}
		},
		{ passive: false },
	);

	canvas.addEventListener("mouseup", (e) => {
		getActiveTool().onMouseUp?.(getWorldPos(e), e);
		getPanTool()?.onMouseUp?.(getWorldPos(e), e);
	});

	const finishTouch = (e: TouchEvent): void => {
		e.preventDefault();
		const mouseEvent = mouseEventFromTouch(e) ?? lastTouchEvent;
		if (!mouseEvent) return;
		getActiveTool().onMouseUp?.(getWorldPos(mouseEvent), mouseEvent);
		getPanTool()?.onMouseUp?.(getWorldPos(mouseEvent), mouseEvent);
		lastTouchEvent = null;
	};
	canvas.addEventListener("touchend", finishTouch, { passive: false });
	canvas.addEventListener("touchcancel", finishTouch, { passive: false });

	canvas.addEventListener(
		"wheel",
		(e) => {
			e.preventDefault();
			const factor = e.deltaY > 0 ? 0.85 : 1 / 0.85;
			const world = getWorldPos(e);
			zoomAt(factor, world.x, world.y);
			render();
		},
		{ passive: false },
	);

	canvas.addEventListener("contextmenu", (e) => {
		e.preventDefault();
		const stadium = getStadium();
		if (!stadium) return;

		const world = getWorldPos(e);
		const zoom = getZoom();
		const spawnHit = findSpawnPointAt(stadium, world.x, world.y, zoom);
		if (spawnHit) {
			const items = buildSpawnContextMenuItems(stadium, spawnHit, {
				saveHistory,
				render,
			});
			if (items) {
				showContextMenu(e.clientX, e.clientY, items);
				return;
			}
		}

		const hit = hitTest(stadium, world.x, world.y, zoom);
		if (hit) {
			showObjectContextMenu(e, hit);
		}
	});
}

function mouseEventFromTouch(event: TouchEvent): MouseEvent | null {
	const touch = firstTouch(event.changedTouches) ?? firstTouch(event.touches);
	if (!touch) return null;
	return new MouseEvent("mousemove", {
		bubbles: true,
		cancelable: true,
		button: 0,
		clientX: touch.clientX,
		clientY: touch.clientY,
	});
}

function firstTouch(list: TouchList): Touch | null {
	return list[0] ?? list.item(0);
}
