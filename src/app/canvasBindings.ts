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
	select: (selection: Selection) => void;
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
	select,
	showObjectContextMenu,
	saveHistory,
}: CanvasBindingsOptions): void {
	canvas.addEventListener("mousedown", (e) => {
		if (e.button === 1 || (e.button === 0 && e.altKey)) {
			getPanTool()?.onMouseDown?.(getWorldPos(e), e);
			return;
		}
		if (e.button === 0) {
			getActiveTool().onMouseDown?.(getWorldPos(e), e);
		}
	});

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

	canvas.addEventListener("mouseup", (e) => {
		getActiveTool().onMouseUp?.(getWorldPos(e), e);
		getPanTool()?.onMouseUp?.(getWorldPos(e), e);
	});

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
			select(hit);
			showObjectContextMenu(e, hit);
		}
	});
}
