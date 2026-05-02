import { describe, expect, it, vi } from "vitest";

import type { Selection, StadiumObject } from "../types/stadium.ts";
import type { MenuDef, MenuItemDef } from "../ui/ContextMenu.ts";
import { buildObjectContextMenuItems } from "./objectContextMenu.ts";

function stadium(): StadiumObject {
	return {
		name: "Context Test",
		width: 420,
		height: 200,
		traits: {},
		vertexes: [
			{ x: -10, y: 0 },
			{ x: 10, y: 0 },
		],
		segments: [{ v0: 0, v1: 1, curve: 45, curveF: 2 }],
		goals: [{ team: "red" }],
		discs: [],
		planes: [],
		joints: [],
	};
}

function actions() {
	return {
		select: vi.fn(),
		deleteSelected: vi.fn(),
		saveHistory: vi.fn(),
		refresh: vi.fn(),
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

describe("buildObjectContextMenuItems", () => {
	it("builds generic select and delete actions", () => {
		const act = actions();
		const selection: Selection = { type: "vertex", index: 1 };
		const items = buildObjectContextMenuItems(stadium(), selection, act);
		if (!items) throw new Error("Expected menu items");

		menuItem(items, "Select vertex #1").action();
		menuItem(items, "Delete vertex").action();

		expect(act.select).toHaveBeenCalledWith(selection);
		expect(act.deleteSelected).toHaveBeenCalledOnce();
		expect(menuItem(items, "Delete vertex").variant).toBe("danger");
	});

	it("supports a custom delete label for multi-selection menus", () => {
		const act = actions();
		const items = buildObjectContextMenuItems(
			stadium(),
			{ type: "vertex", index: 1 },
			act,
			{ deleteLabel: "Delete 2 selected objects" },
		);
		if (!items) throw new Error("Expected menu items");

		menuItem(items, "Delete 2 selected objects").action();

		expect(act.deleteSelected).toHaveBeenCalledOnce();
		expect(menuItem(items, "Delete 2 selected objects").variant).toBe("danger");
	});

	it("adds segment actions that reverse geometry and toggle visibility", () => {
		const map = stadium();
		const act = actions();
		const items = buildObjectContextMenuItems(
			map,
			{ type: "segment", index: 0 },
			act,
		);
		if (!items) throw new Error("Expected menu items");

		menuItem(items, "Reverse direction").action();
		expect(map.segments[0]).toMatchObject({
			v0: 1,
			v1: 0,
			curve: -45,
			curveF: -2,
		});

		menuItem(items, "Make invisible").action();
		expect(map.segments[0]?.vis).toBe(false);
		expect(act.saveHistory).toHaveBeenCalledTimes(2);
		expect(act.refresh).toHaveBeenCalledTimes(2);
	});

	it("labels hidden segments as make visible", () => {
		const map = stadium();
		map.segments[0] = { v0: 0, v1: 1, vis: false };
		const items = buildObjectContextMenuItems(
			map,
			{ type: "segment", index: 0 },
			actions(),
		);
		if (!items) throw new Error("Expected menu items");

		menuItem(items, "Make visible").action();
		expect(map.segments[0]?.vis).toBe(true);
	});

	it("adds a goal action that switches team", () => {
		const map = stadium();
		const act = actions();
		const items = buildObjectContextMenuItems(
			map,
			{ type: "goal", index: 0 },
			act,
		);
		if (!items) throw new Error("Expected menu items");

		menuItem(items, "Switch team").action();
		expect(map.goals[0]?.team).toBe("blue");
		expect(act.saveHistory).toHaveBeenCalledWith(map);
		expect(act.refresh).toHaveBeenCalledOnce();
	});

	it("returns null for stale segment or goal selections", () => {
		expect(
			buildObjectContextMenuItems(
				stadium(),
				{ type: "segment", index: 99 },
				actions(),
			),
		).toBeNull();
		expect(
			buildObjectContextMenuItems(
				stadium(),
				{ type: "goal", index: 99 },
				actions(),
			),
		).toBeNull();
	});
});
