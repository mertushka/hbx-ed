import type { Camera, WorldPoint } from "../core/camera.ts";
import type { Selection, StadiumObject, Vec2 } from "../types/stadium.ts";

function pointFromVec2(point: Vec2 | undefined): WorldPoint {
	const [x, y] = point ?? [0, 0];
	return { x, y };
}

function midpoint(a: WorldPoint, b: WorldPoint): WorldPoint {
	return {
		x: (a.x + b.x) / 2,
		y: (a.y + b.y) / 2,
	};
}

export function selectionFocusPoint(
	stadium: StadiumObject,
	selection: Selection,
): WorldPoint | null {
	switch (selection.type) {
		case "vertex": {
			const vertex = stadium.vertexes[selection.index];
			return vertex ? { x: vertex.x, y: vertex.y } : null;
		}
		case "segment": {
			const segment = stadium.segments[selection.index];
			if (!segment) return null;
			const v0 = stadium.vertexes[segment.v0];
			const v1 = stadium.vertexes[segment.v1];
			if (!v0 || !v1) return null;
			return midpoint({ x: v0.x, y: v0.y }, { x: v1.x, y: v1.y });
		}
		case "disc": {
			const disc = stadium.discs[selection.index];
			return disc ? pointFromVec2(disc.pos) : null;
		}
		case "goal": {
			const goal = stadium.goals[selection.index];
			return goal
				? midpoint(pointFromVec2(goal.p0), pointFromVec2(goal.p1))
				: null;
		}
		case "plane": {
			const plane = stadium.planes[selection.index];
			if (!plane) return null;
			const [nx, ny] = plane.normal ?? [0, 0];
			const lengthSq = nx * nx + ny * ny;
			if (lengthSq === 0) return { x: 0, y: 0 };
			const distance = plane.dist ?? 0;
			return { x: (nx * distance) / lengthSq, y: (ny * distance) / lengthSq };
		}
		case "joint": {
			const joint = stadium.joints[selection.index];
			if (!joint) return null;
			const d0 = stadium.discs[joint.d0];
			const d1 = stadium.discs[joint.d1];
			if (!d0 || !d1) return null;
			return midpoint(pointFromVec2(d0.pos), pointFromVec2(d1.pos));
		}
	}
}

export function revealSelection(
	camera: Camera,
	stadium: StadiumObject | null,
	selection: Selection | null,
	viewWidth: number,
	viewHeight: number,
	marginPx = 0,
): boolean {
	const target = selectionRevealTarget(
		camera,
		stadium,
		selection,
		viewWidth,
		viewHeight,
		marginPx,
	);
	if (!target) return false;

	camera.x = target.x;
	camera.y = target.y;
	return true;
}

export function selectionRevealTarget(
	camera: Camera,
	stadium: StadiumObject | null,
	selection: Selection | null,
	viewWidth: number,
	viewHeight: number,
	marginPx = 0,
): WorldPoint | null {
	if (!stadium || !selection || viewWidth <= 0 || viewHeight <= 0) return null;

	const focus = selectionFocusPoint(stadium, selection);
	if (!focus) return null;

	const margin = Math.max(0, Math.min(marginPx, viewWidth / 3, viewHeight / 3));
	const screen = camera.worldToScreen(focus.x, focus.y, viewWidth, viewHeight);
	const isVisible =
		screen.x >= margin &&
		screen.x <= viewWidth - margin &&
		screen.y >= margin &&
		screen.y <= viewHeight - margin;

	return isVisible ? null : focus;
}
