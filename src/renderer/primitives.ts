import type { Camera } from "../core/camera.ts";
import { resolveTraits } from "../core/traits.ts";
import type {
	Disc,
	Goal,
	Joint,
	Plane,
	Segment,
	StadiumObject,
	Vertex,
} from "../types/stadium.ts";
import { parseColor } from "../utils/color.ts";
import { computeArcCenter, getCurveF } from "../utils/math.ts";
import type { CanvasSize } from "./background.ts";

const COL_SELECTED = "#f5a623";
const COL_VERTEX_FILL = "rgba(255,255,255,0.6)";
const COL_PLANE = "rgba(255,200,100,0.55)";
const COL_INVISIBLE_SEG = "rgba(255,255,255,0.14)";
const COL_GOAL_RED = "#ff4d6d";
const COL_GOAL_BLUE = "#4d9eff";

export function drawEditorVertex(
	ctx: CanvasRenderingContext2D,
	v: Vertex,
	selected: boolean,
	zoom: number,
): void {
	const r = (selected ? 5 : 3) / zoom;
	ctx.beginPath();
	ctx.arc(v.x, v.y, r, 0, Math.PI * 2);
	ctx.fillStyle = selected ? COL_SELECTED : COL_VERTEX_FILL;
	ctx.fill();
	ctx.strokeStyle = "#000";
	ctx.lineWidth = 1 / zoom;
	ctx.stroke();
}

export function drawEditorSegment(
	ctx: CanvasRenderingContext2D,
	seg: Segment,
	verts: Vertex[],
	traits: StadiumObject["traits"],
	selected: boolean,
	zoom: number,
): void {
	const s = resolveTraits(seg, traits);
	const invisible = s.vis === false;

	if (invisible && !selected) {
		const v0 = verts[s.v0];
		const v1 = verts[s.v1];
		if (!v0 || !v1) return;
		ctx.beginPath();
		ctx.strokeStyle = COL_INVISIBLE_SEG;
		ctx.lineWidth = 1 / zoom;
		ctx.setLineDash([4 / zoom, 4 / zoom]);
		ctx.moveTo(v0.x, v0.y);
		ctx.lineTo(v1.x, v1.y);
		ctx.stroke();
		ctx.setLineDash([]);
		return;
	}

	const v0 = verts[s.v0];
	const v1 = verts[s.v1];
	if (!v0 || !v1) return;

	ctx.lineWidth = selected ? 4 / zoom : 3 / zoom;
	ctx.strokeStyle = selected
		? COL_SELECTED
		: (parseColor(s.color) ?? "#000000");

	ctx.beginPath();
	const curveF = getCurveF(s.curve, s.curveF);

	if (!Number.isFinite(curveF)) {
		ctx.moveTo(v0.x, v0.y);
		ctx.lineTo(v1.x, v1.y);
	} else {
		const c = computeArcCenter(
			{ x: v0.x, y: v0.y },
			{ x: v1.x, y: v1.y },
			curveF,
		);
		const r = Math.hypot(v0.x - c.x, v0.y - c.y);
		const startAngle = Math.atan2(v0.y - c.y, v0.x - c.x);
		const endAngle = Math.atan2(v1.y - c.y, v1.x - c.x);
		ctx.arc(c.x, c.y, r, startAngle, endAngle, curveF < 0);
	}

	ctx.stroke();
}

export function drawEditorDisc(
	ctx: CanvasRenderingContext2D,
	disc: Disc,
	traits: StadiumObject["traits"],
	selected: boolean,
	zoom: number,
): void {
	const d = resolveTraits(disc, traits);
	const [px, py] = d.pos ?? [0, 0];
	const r = d.radius ?? 10;
	const fill = parseColor(d.color);

	ctx.beginPath();
	ctx.arc(px, py, r, 0, Math.PI * 2);
	ctx.lineWidth = selected ? 3 / zoom : 2 / zoom;

	if (fill) {
		ctx.fillStyle = selected ? "rgba(245,166,35,0.35)" : fill;
		ctx.fill();
	}

	ctx.strokeStyle = selected ? COL_SELECTED : "#000000";
	ctx.stroke();
}

export function drawEditorGoal(
	ctx: CanvasRenderingContext2D,
	goal: Goal,
	selected: boolean,
	zoom: number,
): void {
	const [p0x, p0y] = goal.p0 ?? [0, 0];
	const [p1x, p1y] = goal.p1 ?? [0, 0];

	ctx.beginPath();
	ctx.moveTo(p0x, p0y);
	ctx.lineTo(p1x, p1y);
	ctx.lineWidth = selected ? 4 / zoom : 2.5 / zoom;
	ctx.strokeStyle = selected
		? COL_SELECTED
		: goal.team === "red"
			? COL_GOAL_RED
			: COL_GOAL_BLUE;
	ctx.stroke();
}

export function drawEditorPlane(
	ctx: CanvasRenderingContext2D,
	plane: Plane,
	selected: boolean,
	camera: Camera,
	canvasSize: CanvasSize,
): void {
	const [nx, ny] = plane.normal ?? [0, 1];
	const dist = plane.dist ?? 0;
	const len = Math.hypot(nx, ny) || 1;
	const ux = nx / len;
	const uy = ny / len;
	const bx = ux * dist;
	const by = uy * dist;
	const tx = -uy;
	const ty = ux;
	const ext = Math.max(canvasSize.width, canvasSize.height) / camera.zoom;

	ctx.beginPath();
	ctx.moveTo(bx + tx * ext, by + ty * ext);
	ctx.lineTo(bx - tx * ext, by - ty * ext);
	ctx.lineWidth = selected ? 2 / camera.zoom : 1 / camera.zoom;
	ctx.strokeStyle = selected ? COL_SELECTED : COL_PLANE;
	ctx.setLineDash([8 / camera.zoom, 6 / camera.zoom]);
	ctx.stroke();
	ctx.setLineDash([]);

	ctx.beginPath();
	ctx.moveTo(bx, by);
	ctx.lineTo(bx + ux * 20, by + uy * 20);
	ctx.lineWidth = 1 / camera.zoom;
	ctx.strokeStyle = "rgba(255,200,100,0.7)";
	ctx.stroke();
}

export function drawEditorJoint(
	ctx: CanvasRenderingContext2D,
	joint: Joint,
	discs: Disc[],
	selected: boolean,
	zoom: number,
): void {
	const d0 = discs[joint.d0];
	const d1 = discs[joint.d1];
	if (!d0 || !d1) return;
	const [x0, y0] = d0.pos ?? [0, 0];
	const [x1, y1] = d1.pos ?? [0, 0];

	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.lineTo(x1, y1);
	ctx.strokeStyle = selected
		? COL_SELECTED
		: (parseColor(joint.color) ?? "rgba(80,80,80,1)");
	ctx.lineWidth = selected ? 2 / zoom : 1 / zoom;
	ctx.stroke();
}

export function drawEditorCurveHandle(
	ctx: CanvasRenderingContext2D,
	seg: Segment,
	verts: Vertex[],
	zoom: number,
): void {
	const v0 = verts[seg.v0];
	const v1 = verts[seg.v1];
	if (!v0 || !v1) return;

	const chordMX = (v0.x + v1.x) / 2;
	const chordMY = (v0.y + v1.y) / 2;

	const curveF = getCurveF(seg.curve, seg.curveF);

	if (!Number.isFinite(curveF)) {
		const r = 4 / zoom;
		ctx.beginPath();
		ctx.arc(chordMX, chordMY, r, 0, Math.PI * 2);
		ctx.fillStyle = "rgba(245,166,35,0.55)";
		ctx.fill();
		ctx.strokeStyle = "rgba(245,166,35,0.85)";
		ctx.lineWidth = 1 / zoom;
		ctx.stroke();
		return;
	}

	const c = computeArcCenter(
		{ x: v0.x, y: v0.y },
		{ x: v1.x, y: v1.y },
		curveF,
	);
	const r = Math.hypot(v0.x - c.x, v0.y - c.y);
	const sa = Math.atan2(v0.y - c.y, v0.x - c.x);
	const ea = Math.atan2(v1.y - c.y, v1.x - c.x);

	let mid: number;
	if (curveF < 0) {
		let span = (((sa - ea) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
		if (span === 0) span = 2 * Math.PI;
		mid = ea + span / 2;
	} else {
		let span = (((ea - sa) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
		if (span === 0) span = 2 * Math.PI;
		mid = sa + span / 2;
	}

	const mx = c.x + r * Math.cos(mid);
	const my = c.y + r * Math.sin(mid);
	const hs = 5 / zoom;

	ctx.beginPath();
	ctx.setLineDash([3 / zoom, 3 / zoom]);
	ctx.strokeStyle = "rgba(245,166,35,0.45)";
	ctx.lineWidth = 1 / zoom;
	ctx.moveTo(chordMX, chordMY);
	ctx.lineTo(mx, my);
	ctx.stroke();
	ctx.setLineDash([]);

	ctx.beginPath();
	ctx.moveTo(mx, my - hs);
	ctx.lineTo(mx + hs, my);
	ctx.lineTo(mx, my + hs);
	ctx.lineTo(mx - hs, my);
	ctx.closePath();
	ctx.fillStyle = "rgba(245,166,35,0.9)";
	ctx.fill();
	ctx.strokeStyle = "#000";
	ctx.lineWidth = 1 / zoom;
	ctx.stroke();
}
