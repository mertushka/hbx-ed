import { resolveTraits } from "../core/traits.ts";
import type {
	Disc,
	Joint,
	Segment,
	StadiumObject,
	Vec2,
	Vertex,
} from "../types/stadium.ts";
import { computeArcCenter, getCurveF } from "../utils/math.ts";

/** Convert any HBS-style color value to CSS rgba string. Returns null for transparent / -1. */
export function toPreviewCssColor(color: unknown): string | null {
	if (color == null || color === "transparent" || color === -1) return null;
	if (Array.isArray(color))
		return `rgba(${color[0]},${color[1]},${color[2]},255)`;
	if (typeof color === "number") {
		if (color === -1) return null;
		const r = (color >> 16) & 0xff;
		const g = (color >> 8) & 0xff;
		const b = color & 0xff;
		return `rgba(${r},${g},${b},255)`;
	}
	if (typeof color === "string") {
		if (/^[0-9A-Fa-f]{6}$/.test(color)) {
			const r = parseInt(color.slice(0, 2), 16);
			const g = parseInt(color.slice(2, 4), 16);
			const b = parseInt(color.slice(4, 6), 16);
			return `rgba(${r},${g},${b},255)`;
		}
	}
	return null;
}

export function drawPreviewSegment(
	ctx: CanvasRenderingContext2D,
	seg: Segment,
	verts: Vertex[],
	traits: StadiumObject["traits"],
): void {
	const s = resolveTraits(seg, traits);

	if (s.vis === false) return;

	const v0 = verts[s.v0];
	const v1 = verts[s.v1];
	if (!v0 || !v1) return;

	const color = toPreviewCssColor(s.color) ?? "rgba(0,0,0,255)";
	ctx.beginPath();
	ctx.strokeStyle = color;

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

export function drawPreviewJoint(
	ctx: CanvasRenderingContext2D,
	joint: Joint,
	discs: Disc[],
): void {
	const cssColor = toPreviewCssColor(joint.color);
	if (joint.color !== undefined && cssColor === null) return;

	const d0 = discs[joint.d0];
	const d1 = discs[joint.d1];
	if (!d0 || !d1) return;

	const [x0, y0] = d0.pos ?? [0, 0];
	const [x1, y1] = d1.pos ?? [0, 0];

	ctx.beginPath();
	ctx.strokeStyle = cssColor ?? "rgba(0,0,0,255)";
	ctx.moveTo(x0, y0);
	ctx.lineTo(x1, y1);
	ctx.stroke();
}

export function drawPreviewDisc(
	ctx: CanvasRenderingContext2D,
	disc: Disc,
	traits: StadiumObject["traits"],
): void {
	const d = resolveTraits(disc, traits);
	const pos = d.pos ?? [0, 0];
	const radius = d.radius ?? 10;

	if (radius < 0) return;

	const cssColor = toPreviewCssColor(d.color);

	ctx.beginPath();
	ctx.fillStyle = cssColor ?? "rgba(255,255,255,255)";
	ctx.strokeStyle = "black";
	ctx.arc(pos[0], pos[1], radius, 0, Math.PI * 2, false);

	if (cssColor !== null) {
		ctx.fill();
	}
	ctx.stroke();
}

export function drawPreviewSpawnPoints(
	ctx: CanvasRenderingContext2D,
	points: Vec2[],
	color: string,
	zoom: number,
): void {
	const r = 8 / zoom;
	ctx.save();
	ctx.font = `bold ${9 / zoom}px sans-serif`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	points.forEach(([x, y], i) => {
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.strokeStyle = color;
		ctx.lineWidth = 1.5 / zoom;
		ctx.stroke();
		ctx.fillStyle = `${color}33`;
		ctx.fill();
		ctx.fillStyle = color;
		ctx.fillText(String(i), x, y);
	});
	ctx.restore();
}
