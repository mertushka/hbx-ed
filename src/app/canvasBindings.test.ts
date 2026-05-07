import { describe, expect, it, vi } from "vitest";

import type { WorldPoint } from "../core/camera.ts";
import type { Tool } from "../tools/types.ts";
import type { StadiumObject } from "../types/stadium.ts";
import type { MenuDef, MenuItemDef } from "../ui/ContextMenu.ts";
import { bindCanvasEvents } from "./canvasBindings.ts";

function stadium(): StadiumObject {
	return {
		name: "Canvas",
		width: 420,
		height: 200,
		traits: {},
		vertexes: [{ x: 30, y: 40 }],
		segments: [],
		goals: [],
		discs: [],
		planes: [],
		joints: [],
		redSpawnPoints: [[10, 20]],
		blueSpawnPoints: [],
	};
}

function tool(name: string): Tool & {
	down: ReturnType<typeof vi.fn>;
	move: ReturnType<typeof vi.fn>;
	up: ReturnType<typeof vi.fn>;
} {
	const down = vi.fn();
	const move = vi.fn();
	const up = vi.fn();
	return {
		name,
		cursor: "default",
		onMouseDown: down,
		onMouseMove: move,
		onMouseUp: up,
		down,
		move,
		up,
	};
}

function menuItem(items: MenuDef, label: string): MenuItemDef {
	const item = items.find(
		(candidate): candidate is MenuItemDef =>
			candidate !== "separator" && candidate.label === label,
	);
	if (!item) throw new Error(`Expected menu item: ${label}`);
	return item;
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

function setup(options: { world?: WorldPoint; activeName?: string } = {}) {
	document.body.innerHTML = `
		<canvas id="canvas"></canvas>
		<span id="status-snap"></span>
	`;

	const active = tool(options.activeName ?? "select");
	const pan = options.activeName === "pan" ? active : tool("pan");
	const map = stadium();
	const state = {
		world: options.world ?? { x: 0, y: 0 },
		stadium: map as StadiumObject | null,
		zoom: 1,
	};
	const actions = {
		zoomAt: vi.fn(),
		render: vi.fn(),
		setCoords: vi.fn(),
		showContextMenu: vi.fn(),
		showObjectContextMenu: vi.fn(),
		saveHistory: vi.fn(),
	};

	bindCanvasEvents({
		canvas: document.getElementById("canvas") as HTMLCanvasElement,
		getWorldPos: () => state.world,
		getActiveTool: () => active,
		getPanTool: () => pan,
		getStadium: () => state.stadium,
		getZoom: () => state.zoom,
		...actions,
	});

	return {
		active,
		actions,
		canvas: document.getElementById("canvas") as HTMLCanvasElement,
		map,
		pan,
		state,
	};
}

describe("bindCanvasEvents", () => {
	it("routes left clicks to the active tool and temporary pan clicks to pan", () => {
		const { active, canvas, pan, state } = setup({
			world: { x: 5, y: 6 },
		});

		canvas.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
		expect(active.down).toHaveBeenCalledWith(
			state.world,
			expect.any(MouseEvent),
		);
		expect(pan.down).not.toHaveBeenCalled();

		canvas.dispatchEvent(new MouseEvent("mousedown", { button: 1 }));
		expect(pan.down).toHaveBeenCalledWith(state.world, expect.any(MouseEvent));

		canvas.dispatchEvent(
			new MouseEvent("mousedown", { button: 0, altKey: true }),
		);
		expect(pan.down).toHaveBeenCalledTimes(2);
	});

	it("updates cursor coordinates, snap indicator, and move handlers", () => {
		const { active, actions, canvas, pan, state } = setup({
			world: { x: 12, y: 34 },
		});

		canvas.dispatchEvent(new MouseEvent("mousemove", { shiftKey: true }));

		expect(actions.setCoords).toHaveBeenCalledWith(12, 34);
		expect(document.getElementById("status-snap")?.style.display).toBe(
			"inline",
		);
		expect(active.move).toHaveBeenCalledWith(
			state.world,
			expect.any(MouseEvent),
		);
		expect(pan.move).toHaveBeenCalledWith(state.world, expect.any(MouseEvent));
	});

	it("routes single-touch canvas input through the active tool", () => {
		const { active, actions, canvas, pan, state } = setup({
			world: { x: 12, y: 34 },
		});

		const start = touchEvent("touchstart", 100, 120);
		const move = touchEvent("touchmove", 110, 140);
		const end = touchEvent("touchend", 110, 140);

		canvas.dispatchEvent(start);
		canvas.dispatchEvent(move);
		canvas.dispatchEvent(end);

		expect(start.defaultPrevented).toBe(true);
		expect(move.defaultPrevented).toBe(true);
		expect(end.defaultPrevented).toBe(true);
		expect(active.down).toHaveBeenCalledWith(
			state.world,
			expect.any(MouseEvent),
		);
		expect(actions.setCoords).toHaveBeenCalledWith(12, 34);
		expect(active.move).toHaveBeenCalledWith(
			state.world,
			expect.any(MouseEvent),
		);
		expect(pan.move).toHaveBeenCalledWith(state.world, expect.any(MouseEvent));
		expect(active.up).toHaveBeenCalledWith(state.world, expect.any(MouseEvent));
		expect(pan.up).toHaveBeenCalledWith(state.world, expect.any(MouseEvent));
	});

	it("pinch-zooms around the touch midpoint without starting the active tool", () => {
		const { active, actions, canvas } = setup({
			world: { x: 12, y: 34 },
		});

		const start = multiTouchEvent("touchstart", [
			[100, 100],
			[200, 100],
		]);
		const move = multiTouchEvent("touchmove", [
			[100, 100],
			[250, 100],
		]);

		canvas.dispatchEvent(start);
		canvas.dispatchEvent(move);

		expect(start.defaultPrevented).toBe(true);
		expect(move.defaultPrevented).toBe(true);
		expect(active.down).not.toHaveBeenCalled();
		expect(actions.zoomAt).toHaveBeenCalledWith(1.5, 12, 34);
		expect(actions.render).toHaveBeenCalledOnce();
	});

	it("finishes a synthetic single-touch drag before switching to pinch", () => {
		const { active, canvas, pan } = setup({
			world: { x: 12, y: 34 },
		});

		canvas.dispatchEvent(touchEvent("touchstart", 100, 120));
		canvas.dispatchEvent(
			multiTouchEvent("touchstart", [
				[100, 100],
				[200, 100],
			]),
		);
		canvas.dispatchEvent(touchEvent("touchend", 200, 100));

		expect(active.down).toHaveBeenCalledOnce();
		expect(active.up).toHaveBeenCalledOnce();
		expect(pan.up).toHaveBeenCalledOnce();
	});

	it("ignores touch starts without a usable touch point", () => {
		const { active, canvas } = setup();
		const event = emptyTouchEvent("touchstart");

		canvas.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(true);
		expect(active.down).not.toHaveBeenCalled();
	});

	it("ignores incomplete pinch gestures without zooming", () => {
		const { actions, canvas } = setup();
		const event = incompletePinchEvent("touchmove");

		canvas.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(true);
		expect(actions.zoomAt).not.toHaveBeenCalled();
		expect(actions.render).not.toHaveBeenCalled();
	});

	it("opens a context menu from long-press on the select tool", async () => {
		const { active, actions, canvas, pan } = setup({
			world: { x: 30, y: 40 },
		});

		canvas.dispatchEvent(touchEvent("touchstart", 100, 120));
		await new Promise((resolve) => setTimeout(resolve, 570));

		expect(actions.showObjectContextMenu).toHaveBeenCalledWith(
			expect.any(MouseEvent),
			{ type: "vertex", index: 0 },
		);
		expect(active.up).toHaveBeenCalledOnce();
		expect(pan.up).toHaveBeenCalledOnce();

		canvas.dispatchEvent(touchEvent("touchend", 100, 120));

		expect(active.up).toHaveBeenCalledOnce();
		expect(pan.up).toHaveBeenCalledOnce();
	});

	it("cancels long-press context menus after meaningful touch movement", async () => {
		const { actions, canvas } = setup({
			world: { x: 30, y: 40 },
		});

		canvas.dispatchEvent(touchEvent("touchstart", 100, 120));
		canvas.dispatchEvent(touchEvent("touchmove", 120, 140));
		await new Promise((resolve) => setTimeout(resolve, 570));

		expect(actions.showObjectContextMenu).not.toHaveBeenCalled();
		expect(actions.showContextMenu).not.toHaveBeenCalled();
	});

	it("does not schedule long-press menus outside the select tool", async () => {
		const { actions, canvas } = setup({
			activeName: "disc",
			world: { x: 30, y: 40 },
		});

		canvas.dispatchEvent(touchEvent("touchstart", 100, 120));
		await new Promise((resolve) => setTimeout(resolve, 570));

		expect(actions.showObjectContextMenu).not.toHaveBeenCalled();
		expect(actions.showContextMenu).not.toHaveBeenCalled();
	});

	it("does not double-route pan movement when pan is the active tool", () => {
		const { active, canvas } = setup({ activeName: "pan" });

		canvas.dispatchEvent(new MouseEvent("mousemove"));

		expect(active.move).toHaveBeenCalledOnce();
	});

	it("routes mouseup to both active and pan tools to preserve current behavior", () => {
		const { active, canvas, pan } = setup();

		canvas.dispatchEvent(new MouseEvent("mouseup"));

		expect(active.up).toHaveBeenCalledOnce();
		expect(pan.up).toHaveBeenCalledOnce();
	});

	it("zooms on wheel around the current world position", () => {
		const { actions, canvas } = setup({ world: { x: 11, y: 22 } });
		const event = new WheelEvent("wheel", {
			deltaY: 1,
			cancelable: true,
		});

		canvas.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(true);
		expect(actions.zoomAt).toHaveBeenCalledWith(0.85, 11, 22);
		expect(actions.render).toHaveBeenCalledOnce();
	});

	it("shows spawn context menus before regular hit testing", () => {
		const { actions, canvas, map, state } = setup({
			world: { x: 10, y: 20 },
		});
		state.zoom = 1;

		canvas.dispatchEvent(
			new MouseEvent("contextmenu", {
				button: 2,
				clientX: 100,
				clientY: 120,
				cancelable: true,
			}),
		);

		expect(actions.showContextMenu).toHaveBeenCalledWith(
			100,
			120,
			expect.any(Array),
		);

		const items = actions.showContextMenu.mock.calls[0]?.[2] as MenuDef;
		menuItem(items, "Delete red spawn #0").action();
		expect(map.redSpawnPoints).toEqual([]);
		expect(actions.saveHistory).toHaveBeenCalledWith(map);
		expect(actions.render).toHaveBeenCalledOnce();
	});

	it("delegates hit object context menus without changing selection first", () => {
		const { actions, canvas } = setup({ world: { x: 30, y: 40 } });

		canvas.dispatchEvent(new MouseEvent("contextmenu", { button: 2 }));

		expect(actions.showObjectContextMenu).toHaveBeenCalledWith(
			expect.any(MouseEvent),
			{ type: "vertex", index: 0 },
		);
	});

	it("ignores context menus when no stadium is loaded", () => {
		const { actions, canvas, state } = setup();
		state.stadium = null;

		canvas.dispatchEvent(new MouseEvent("contextmenu", { button: 2 }));

		expect(actions.showContextMenu).not.toHaveBeenCalled();
	});
});
