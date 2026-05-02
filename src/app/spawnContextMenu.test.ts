import { describe, expect, it, vi } from "vitest";

import type { StadiumObject } from "../types/stadium.ts";
import type { MenuDef, MenuItemDef } from "../ui/ContextMenu.ts";
import {
	buildSpawnContextMenuItems,
	findSpawnPointAt,
	getSpawnPoints,
} from "./spawnContextMenu.ts";

function stadium(): StadiumObject {
	return {
		name: "Spawns",
		width: 420,
		height: 200,
		traits: {},
		vertexes: [],
		segments: [],
		goals: [],
		discs: [],
		planes: [],
		joints: [],
		redSpawnPoints: [
			[10, 20],
			[40, 20],
		],
		blueSpawnPoints: [[-10, -20]],
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

describe("spawnContextMenu", () => {
	it("returns spawn points for a team", () => {
		const map = stadium();

		expect(getSpawnPoints(map, "red")).toBe(map.redSpawnPoints);
		expect(getSpawnPoints(map, "blue")).toBe(map.blueSpawnPoints);
	});

	it("finds red and blue spawn points within the zoom-scaled snap radius", () => {
		const map = stadium();

		expect(findSpawnPointAt(map, 14, 20, 1)).toEqual({
			team: "red",
			index: 0,
			point: [10, 20],
		});
		expect(findSpawnPointAt(map, -8, -20, 2)).toEqual({
			team: "blue",
			index: 0,
			point: [-10, -20],
		});
		expect(findSpawnPointAt(map, 30, 20, 2)).toBeNull();
	});

	it("returns null when spawn arrays are absent", () => {
		const map = stadium();
		delete map.redSpawnPoints;
		delete map.blueSpawnPoints;

		expect(findSpawnPointAt(map, 10, 20, 1)).toBeNull();
	});

	it("builds a delete menu item that removes the spawn and refreshes", () => {
		const map = stadium();
		const saveHistory = vi.fn();
		const render = vi.fn();
		const items = buildSpawnContextMenuItems(
			map,
			{ team: "red", index: 1, point: [40, 20] },
			{ saveHistory, render },
		);
		if (!items) throw new Error("Expected spawn menu items");

		expect(menuItem(items, "red spawn #1  (40, 20)").variant).toBeUndefined();
		const deleteItem = menuItem(items, "Delete red spawn #1");
		expect(deleteItem.variant).toBe("danger");

		deleteItem.action();

		expect(map.redSpawnPoints).toEqual([[10, 20]]);
		expect(saveHistory).toHaveBeenCalledWith(map);
		expect(render).toHaveBeenCalledOnce();
	});

	it("returns null for stale spawn hits", () => {
		expect(
			buildSpawnContextMenuItems(
				stadium(),
				{ team: "blue", index: 9, point: [0, 0] },
				{ saveHistory: vi.fn(), render: vi.fn() },
			),
		).toBeNull();
	});
});
