import type {
	MultiSelection,
	ObjectType,
	StadiumObject,
	Vec2,
} from "../types/stadium.ts";

type MultiDragObjectType = Extract<ObjectType, "vertex" | "disc" | "goal">;

export interface MultiDragOrigin {
	type: MultiDragObjectType;
	index: number;
	pos: Vec2;
	pos2?: Vec2;
}

export function createMultiDragOrigins(
	stadium: StadiumObject,
	items: MultiSelection["items"],
): MultiDragOrigin[] {
	const origins: MultiDragOrigin[] = [];

	for (const { type, index } of items) {
		if (type === "vertex") {
			const v = stadium.vertexes[index];
			if (v) origins.push({ type, index, pos: [v.x, v.y] });
		} else if (type === "disc") {
			const d = stadium.discs[index];
			if (d) origins.push({ type, index, pos: [...(d.pos ?? [0, 0])] });
		} else if (type === "goal") {
			const g = stadium.goals[index];
			if (g) {
				origins.push({
					type,
					index,
					pos: [...(g.p0 ?? [0, 0])],
					pos2: [...(g.p1 ?? [0, 0])],
				});
			}
		}
	}

	return origins;
}

export function applyMultiDrag(
	stadium: StadiumObject,
	origins: MultiDragOrigin[],
	dx: number,
	dy: number,
): void {
	for (const origin of origins) {
		if (origin.type === "vertex") {
			const v = stadium.vertexes[origin.index];
			if (v) {
				v.x = origin.pos[0] + dx;
				v.y = origin.pos[1] + dy;
			}
		} else if (origin.type === "disc") {
			const d = stadium.discs[origin.index];
			if (d) d.pos = [origin.pos[0] + dx, origin.pos[1] + dy];
		} else if (origin.type === "goal") {
			const g = stadium.goals[origin.index];
			if (g) {
				g.p0 = [origin.pos[0] + dx, origin.pos[1] + dy];
				g.p1 = origin.pos2
					? [origin.pos2[0] + dx, origin.pos2[1] + dy]
					: [origin.pos[0] + dx, origin.pos[1] + dy];
			}
		}
	}
}
