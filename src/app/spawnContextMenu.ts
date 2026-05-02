import type { StadiumObject, Vec2 } from "../types/stadium.ts";
import type { MenuDef } from "../ui/ContextMenu.ts";

export type SpawnTeam = "red" | "blue";

export interface SpawnPointHit {
	team: SpawnTeam;
	index: number;
	point: Vec2;
}

export interface SpawnContextMenuActions {
	saveHistory: (stadium: StadiumObject) => void;
	render: () => void;
}

export function getSpawnPoints(
	stadium: StadiumObject,
	team: SpawnTeam,
): Vec2[] | undefined {
	return team === "red" ? stadium.redSpawnPoints : stadium.blueSpawnPoints;
}

export function findSpawnPointAt(
	stadium: StadiumObject,
	x: number,
	y: number,
	zoom: number,
): SpawnPointHit | null {
	const snapRadius = 10 / zoom;

	for (const team of ["red", "blue"] as const) {
		const points = getSpawnPoints(stadium, team);
		if (!points) continue;

		const index = points.findIndex(
			([spawnX, spawnY]) => Math.hypot(spawnX - x, spawnY - y) < snapRadius,
		);
		const point = points[index];
		if (index >= 0 && point) return { team, index, point };
	}

	return null;
}

export function buildSpawnContextMenuItems(
	stadium: StadiumObject,
	hit: SpawnPointHit,
	actions: SpawnContextMenuActions,
): MenuDef | null {
	const points = getSpawnPoints(stadium, hit.team);
	const point = points?.[hit.index];
	if (!points || !point) return null;

	return [
		{
			label: `${hit.team} spawn #${hit.index}  (${point.join(", ")})`,
			action: () => {},
		},
		"separator",
		{
			label: `Delete ${hit.team} spawn #${hit.index}`,
			action: () => {
				points.splice(hit.index, 1);
				actions.saveHistory(stadium);
				actions.render();
			},
			variant: "danger",
		},
	];
}
