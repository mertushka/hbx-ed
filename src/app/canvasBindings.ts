import type { WorldPoint } from "../core/camera.ts";
import { hitTest } from "../core/hitTest.ts";
import type { Tool } from "../tools/types.ts";
import type { Selection, StadiumObject } from "../types/stadium.ts";
import type { MenuDef } from "../ui/ContextMenu.ts";
import {
	buildSpawnContextMenuItems,
	findSpawnPointAt,
} from "./spawnContextMenu.ts";
import {
	distanceBetweenTouches,
	firstTouch,
	midpointBetweenTouches,
} from "./touchGestures.ts";

const LONG_PRESS_MS = 550;
const LONG_PRESS_MOVE_TOLERANCE = 10;

export interface CanvasBindingsOptions {
	doc?: Document;
	canvas: HTMLCanvasElement;
	getWorldPos: (event: MouseEvent) => WorldPoint;
	getActiveTool: () => Tool;
	getPanTool: () => Tool | undefined;
	getStadium: () => StadiumObject | null;
	getZoom: () => number;
	zoomAt: (factor: number, anchorX: number, anchorY: number) => void;
	cancelCameraAnimation?: () => void;
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
	cancelCameraAnimation = () => undefined,
	render,
	setCoords,
	showContextMenu,
	showObjectContextMenu,
	saveHistory,
}: CanvasBindingsOptions): void {
	let lastTouchEvent: MouseEvent | null = null;
	let pinchDistance: number | null = null;
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let longPressStart: { clientX: number; clientY: number } | null = null;

	const clearLongPress = (): void => {
		if (longPressTimer !== null) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		longPressStart = null;
	};

	const finishSyntheticTouch = (mouseEvent: MouseEvent): void => {
		getActiveTool().onMouseUp?.(getWorldPos(mouseEvent), mouseEvent);
		getPanTool()?.onMouseUp?.(getWorldPos(mouseEvent), mouseEvent);
		lastTouchEvent = null;
	};

	const openContextMenuAt = (mouseEvent: MouseEvent): void => {
		const stadium = getStadium();
		if (!stadium) return;

		const world = getWorldPos(mouseEvent);
		const zoom = getZoom();
		const spawnHit = findSpawnPointAt(stadium, world.x, world.y, zoom);
		if (spawnHit) {
			const items = buildSpawnContextMenuItems(stadium, spawnHit, {
				saveHistory,
				render,
			});
			if (items) {
				showContextMenu(mouseEvent.clientX, mouseEvent.clientY, items);
				return;
			}
		}

		const hit = hitTest(stadium, world.x, world.y, zoom);
		if (hit) showObjectContextMenu(mouseEvent, hit);
	};

	canvas.addEventListener("mousedown", (e) => {
		cancelCameraAnimation();
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
			cancelCameraAnimation();
			clearLongPress();
			if (e.touches.length > 1) {
				if (lastTouchEvent) finishSyntheticTouch(lastTouchEvent);
				pinchDistance = distanceBetweenTouches(e.touches);
				return;
			}

			const mouseEvent = mouseEventFromTouch(e, "mousedown");
			if (!mouseEvent) return;
			lastTouchEvent = mouseEvent;
			getActiveTool().onMouseDown?.(getWorldPos(mouseEvent), mouseEvent);

			if (getActiveTool().name === "select") {
				longPressStart = {
					clientX: mouseEvent.clientX,
					clientY: mouseEvent.clientY,
				};
				longPressTimer = setTimeout(() => {
					const point = longPressStart ?? mouseEvent;
					const contextEvent = mouseEventFromPoint(point, "contextmenu");
					if (lastTouchEvent) {
						finishSyntheticTouch(
							mouseEventFromPoint(lastTouchEvent, "mouseup"),
						);
					}
					longPressStart = null;
					longPressTimer = null;
					openContextMenuAt(contextEvent);
				}, LONG_PRESS_MS);
			}
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
			if (e.touches.length > 1) {
				clearLongPress();
				const distance = distanceBetweenTouches(e.touches);
				if (distance === null) return;
				if (pinchDistance !== null && pinchDistance > 0) {
					const anchorEvent = mouseEventFromPoint(
						midpointBetweenTouches(e.touches),
						"mousemove",
					);
					const anchor = getWorldPos(anchorEvent);
					zoomAt(distance / pinchDistance, anchor.x, anchor.y);
					setCoords(anchor.x, anchor.y);
					render();
				}
				pinchDistance = distance;
				return;
			}

			pinchDistance = null;
			const mouseEvent = mouseEventFromTouch(e, "mousemove");
			if (!mouseEvent) return;
			if (movedBeyondLongPressTolerance(mouseEvent, longPressStart)) {
				clearLongPress();
			}
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
		clearLongPress();
		const wasPinching = pinchDistance !== null;
		pinchDistance =
			e.touches.length > 1 ? distanceBetweenTouches(e.touches) : null;
		if (wasPinching && !lastTouchEvent) return;
		const mouseEvent = lastTouchEvent
			? (mouseEventFromTouch(e, "mouseup") ?? lastTouchEvent)
			: null;
		if (!mouseEvent) return;
		finishSyntheticTouch(mouseEvent);
	};
	canvas.addEventListener("touchend", finishTouch, { passive: false });
	canvas.addEventListener("touchcancel", finishTouch, { passive: false });

	canvas.addEventListener(
		"wheel",
		(e) => {
			e.preventDefault();
			cancelCameraAnimation();
			const factor = e.deltaY > 0 ? 0.85 : 1 / 0.85;
			const world = getWorldPos(e);
			zoomAt(factor, world.x, world.y);
			render();
		},
		{ passive: false },
	);

	canvas.addEventListener("contextmenu", (e) => {
		e.preventDefault();
		openContextMenuAt(e);
	});
}

function mouseEventFromTouch(
	event: TouchEvent,
	type: string,
): MouseEvent | null {
	const touch = firstTouch(event.changedTouches) ?? firstTouch(event.touches);
	if (!touch) return null;
	return mouseEventFromPoint(touch, type);
}

function mouseEventFromPoint(
	point: { clientX: number; clientY: number },
	type: string,
): MouseEvent {
	return new MouseEvent(type, {
		bubbles: true,
		cancelable: true,
		button: 0,
		clientX: point.clientX,
		clientY: point.clientY,
	});
}

function movedBeyondLongPressTolerance(
	mouseEvent: MouseEvent,
	start: { clientX: number; clientY: number } | null,
): boolean {
	if (!start) return false;
	return (
		Math.hypot(
			mouseEvent.clientX - start.clientX,
			mouseEvent.clientY - start.clientY,
		) > LONG_PRESS_MOVE_TOLERANCE
	);
}
