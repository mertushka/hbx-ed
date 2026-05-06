import type { StadiumObject, Vec2 } from "../types/stadium.ts";

const SPAWN_SNAP_PX = 10;

type SpawnTeam = "red" | "blue";
type Point = { x: number; y: number };

export interface SpawnDragOrigin {
	kind: "spawn-red" | "spawn-blue";
	index: number;
	pos: Vec2;
}

function spawnPoints(
	stadium: StadiumObject,
	team: SpawnTeam,
): Vec2[] | undefined {
	return team === "red" ? stadium.redSpawnPoints : stadium.blueSpawnPoints;
}

export function findSpawnDragOrigin(
	stadium: StadiumObject,
	pos: Point,
	zoom: number,
): SpawnDragOrigin | null {
	const radius = SPAWN_SNAP_PX / zoom;

	for (const team of ["red", "blue"] as const) {
		const points = spawnPoints(stadium, team);
		if (!points) continue;

		const index = points.findIndex(
			([x, y]) => Math.hypot(x - pos.x, y - pos.y) < radius,
		);
		const spawn = points[index];
		if (spawn) {
			return {
				kind: team === "red" ? "spawn-red" : "spawn-blue",
				index,
				pos: [...spawn],
			};
		}
	}

	return null;
}

export function applySpawnDrag(
	stadium: StadiumObject,
	origin: SpawnDragOrigin,
	dx: number,
	dy: number,
): void {
	const points =
		origin.kind === "spawn-red"
			? stadium.redSpawnPoints
			: stadium.blueSpawnPoints;
	if (points?.[origin.index]) {
		points[origin.index] = [origin.pos[0] + dx, origin.pos[1] + dy];
	}
}
