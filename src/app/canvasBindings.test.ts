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
