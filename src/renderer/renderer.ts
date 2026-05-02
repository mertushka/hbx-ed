import type { Camera } from "../core/camera.ts";
import { resolveTraits } from "../core/traits.ts";
import type {
	Background,
	Disc,
	Goal,
	Joint,
	MultiSelection,
	Plane,
	Segment,
	Selection,
	StadiumObject,
	Vertex,
} from "../types/stadium.ts";
import { parseColor } from "../utils/color.ts";
import { computeArcCenter, getCurveF } from "../utils/math.ts";
import { TexturePatternCache, type TexturePatterns } from "./textures.ts";

// ─── Colours used in the editor ──────────────────────────────────────────────
const COL_SELECTED = "#f5a623";
const COL_VERTEX_FILL = "rgba(255,255,255,0.6)";
const COL_PLANE = "rgba(255,200,100,0.55)";
const COL_INVISIBLE_SEG = "rgba(255,255,255,0.14)";
const COL_GOAL_RED = "#ff4d6d";
const COL_GOAL_BLUE = "#4d9eff";
const COL_GRID = "rgba(255,255,255,0.04)";
const COL_AXIS = "rgba(255,255,255,0.12)";
const COL_CANVAS_BG = "#0e0f12";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isSelected(
	sel: Selection | null,
	type: Selection["type"],
	idx: number,
): boolean {
	return sel !== null && sel.type === type && sel.index === idx;
}

function drawRoundedRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
): void {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + w - r, y);
	ctx.arcTo(x + w, y, x + w, y + r, r);
	ctx.lineTo(x + w, y + h - r);
	ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
	ctx.lineTo(x + r, y + h);
	ctx.arcTo(x, y + h, x, y + h - r, r);
	ctx.lineTo(x, y + r);
	ctx.arcTo(x, y, x + r, y, r);
	ctx.closePath();
}

// ─── Renderer class ───────────────────────────────────────────────────────────

export class Renderer {
	private readonly canvas: HTMLCanvasElement;
	readonly ctx: CanvasRenderingContext2D;
	private readonly textures: TexturePatternCache;

	/** Optional preview line drawn by the segment / joint tool. */
	segPreview: { x0: number; y0: number; x1: number; y1: number } | null = null;

	/** When true, vertex indices (v0, v1…) are drawn on the canvas. */
	showVertexLabels = false;

	/** When true, red/blue spawn points are drawn on the canvas. */
	showSpawnPoints = true;

	/** Multi-selection set — highlighted in teal. */
	multiSelection: MultiSelection | null = null;

	/** Box-select drag rect in world coords. */
	boxSelect: { x: number; y: number; w: number; h: number } | null = null;

	/** World position of the active vertex-snap target, drawn as a ring indicator. */
	vertexSnapTarget: { x: number; y: number } | null = null;

	constructor(canvas: HTMLCanvasElement, onTextureLoad?: () => void) {
		this.canvas = canvas;
		const ctx = canvas.getContext("2d", { alpha: false });
		if (!ctx) throw new Error("Could not get 2D canvas context");
		this.ctx = ctx;
		this.textures = new TexturePatternCache(ctx, onTextureLoad);
	}

	resize(width: number, height: number): void {
		this.canvas.width = width;
		this.canvas.height = height;
	}

	get width(): number {
		return this.canvas.width;
	}
	get height(): number {
		return this.canvas.height;
	}

	render(
		stadium: StadiumObject | null,
		camera: Camera,
		selection: Selection | null,
	): void {
		const { ctx } = this;
		const W = this.canvas.width;
		const H = this.canvas.height;

		// Clear
		ctx.fillStyle = COL_CANVAS_BG;
		ctx.fillRect(0, 0, W, H);

		this.drawGrid(camera, W, H);

		if (!stadium) return;
		const patterns = this.textures.getPatterns();

		ctx.save();
		ctx.translate(W / 2, H / 2);
		ctx.scale(camera.zoom, camera.zoom);
		ctx.translate(-camera.x, -camera.y);

		if (stadium.bg) this.drawBackground(stadium.bg, camera, patterns);

		stadium.planes.forEach((plane, i) => {
			this.drawPlane(plane, isSelected(selection, "plane", i), camera);
		});

		stadium.goals.forEach((goal, i) => {
			this.drawGoal(goal, isSelected(selection, "goal", i), camera.zoom);
		});

		stadium.joints.forEach((joint, i) => {
			this.drawJoint(
				joint,
				stadium.discs,
				isSelected(selection, "joint", i),
				camera.zoom,
			);
		});

		stadium.segments.forEach((seg, i) => {
			this.drawSegment(
				seg,
				stadium.vertexes,
				stadium.traits,
				isSelected(selection, "segment", i),
				camera.zoom,
			);
		});

		stadium.discs.forEach((disc, i) => {
			this.drawDisc(
				disc,
				stadium.traits,
				isSelected(selection, "disc", i),
				camera.zoom,
			);
		});

		stadium.vertexes.forEach((vertex, i) => {
			this.drawVertex(vertex, isSelected(selection, "vertex", i), camera.zoom);
		});

		// Curve handle — drawn on the selected segment's arc midpoint
		if (selection?.type === "segment") {
			const seg = stadium.segments[selection.index];
			if (seg) this.drawCurveHandle(seg, stadium.vertexes, camera.zoom);
		}

		// Vertex index labels
		if (this.showVertexLabels) {
			this.drawVertexLabels(stadium.vertexes, camera.zoom);
		}

		// Spawn points
		if (this.showSpawnPoints) {
			this.drawSpawnPoints(
				stadium.redSpawnPoints ?? [],
				"#ff4d6d",
				camera.zoom,
			);
			this.drawSpawnPoints(
				stadium.blueSpawnPoints ?? [],
				"#4d9eff",
				camera.zoom,
			);
		}

		if (this.segPreview) {
			const p = this.segPreview;
			ctx.beginPath();
			ctx.setLineDash([6 / camera.zoom, 4 / camera.zoom]);
			ctx.strokeStyle = "rgba(245,166,35,0.7)";
			ctx.lineWidth = 1.5 / camera.zoom;
			ctx.moveTo(p.x0, p.y0);
			ctx.lineTo(p.x1, p.y1);
			ctx.stroke();
			ctx.setLineDash([]);
		}

		// Multi-selection highlight rings
		if (this.multiSelection) {
			const ms = this.multiSelection;
			ms.items.forEach(({ type, index }) => {
				if (type === "vertex") {
					const v = stadium.vertexes[index];
					if (!v) return;
					ctx.beginPath();
					ctx.arc(v.x, v.y, 7 / camera.zoom, 0, Math.PI * 2);
					ctx.strokeStyle = "#39c77c";
					ctx.lineWidth = 2 / camera.zoom;
					ctx.stroke();
				} else if (type === "disc") {
					const d = stadium.discs[index];
					if (!d) return;
					const [px, py] = d.pos ?? [0, 0];
					const r = (d.radius ?? 10) + 4 / camera.zoom;
					ctx.beginPath();
					ctx.arc(px, py, r, 0, Math.PI * 2);
					ctx.strokeStyle = "#39c77c";
					ctx.lineWidth = 2 / camera.zoom;
					ctx.stroke();
				} else if (type === "goal") {
					const g = stadium.goals[index];
					if (!g) return;
					const [p0x, p0y] = g.p0 ?? [0, 0];
					const [p1x, p1y] = g.p1 ?? [0, 0];
					ctx.beginPath();
					ctx.moveTo(p0x, p0y);
					ctx.lineTo(p1x, p1y);
					ctx.strokeStyle = "#39c77c";
					ctx.lineWidth = 4 / camera.zoom;
					ctx.stroke();
				}
			});
		}

		// Box-select rubber-band
		if (this.boxSelect) {
			const b = this.boxSelect;
			ctx.beginPath();
			ctx.rect(b.x, b.y, b.w, b.h);
			ctx.strokeStyle = "#39c77c";
			ctx.lineWidth = 1 / camera.zoom;
			ctx.setLineDash([4 / camera.zoom, 3 / camera.zoom]);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = "rgba(57,199,124,0.07)";
			ctx.fill();
		}

		// Vertex snap indicator — orange ring around the snap target
		if (this.vertexSnapTarget) {
			const { x, y } = this.vertexSnapTarget;
			ctx.beginPath();
			ctx.arc(x, y, 9 / camera.zoom, 0, Math.PI * 2);
			ctx.strokeStyle = COL_SELECTED;
			ctx.lineWidth = 2 / camera.zoom;
			ctx.stroke();
		}

		ctx.restore();
	}

	// ── Private draw methods ────────────────────────────────────────────────────

	private drawBackground(
		bg: Background,
		camera: Camera,
		patterns: TexturePatterns | null,
	): void {
		const { ctx } = this;
		const { zoom } = camera;
		const type = bg.type ?? "none";
		if (type === "none") return;

		// bg.width and bg.height in .hbs are HALF-EXTENTS.
		// The game draws vm(ctx, -W, -H, 2W, 2H) — rect from (-W,-H) to (+W,+H).
		const W = bg.width ?? 0; // half-width
		const H = bg.height ?? 0; // half-height
		const cr = bg.cornerRadius ?? 0;
		const ko = bg.kickOffRadius ?? 0;
		const bgFill = parseColor(bg.color) ?? "#718C5A";

		if (type === "grass") {
			drawRoundedRect(ctx, -W, -H, 2 * W, 2 * H, cr);
			if (patterns) {
				ctx.save();
				ctx.scale(2, 2);
				ctx.fillStyle = patterns.grass;
				ctx.fill();
				ctx.restore();
			} else {
				ctx.fillStyle = bgFill;
				ctx.fill();
			}
		} else if (type === "hockey") {
			const ext =
				Math.max(this.canvas.width, this.canvas.height) / zoom + 20000;
			ctx.beginPath();
			ctx.rect(camera.x - ext, camera.y - ext, ext * 2, ext * 2);
			if (patterns) {
				ctx.save();
				ctx.scale(2, 2);
				ctx.fillStyle = patterns.concrete2;
				ctx.fill();
				ctx.restore();
			} else {
				ctx.fillStyle = "#8a8f96";
				ctx.fill();
			}

			drawRoundedRect(ctx, -W, -H, 2 * W, 2 * H, cr);
			if (patterns) {
				ctx.save();
				ctx.scale(2, 2);
				ctx.fillStyle = patterns.concrete;
				ctx.fill();
				ctx.restore();
			} else {
				ctx.fillStyle = bgFill;
				ctx.fill();
			}
		} else {
			ctx.fillStyle = bgFill;
			drawRoundedRect(ctx, -W, -H, 2 * W, 2 * H, cr);
			ctx.fill();
		}

		ctx.strokeStyle = type === "grass" ? "rgba(199,230,189,0.8)" : "#E9CC6E";
		ctx.lineWidth = 2 / zoom;

		drawRoundedRect(ctx, -W, -H, 2 * W, 2 * H, cr);
		ctx.stroke();

		// Centre line
		ctx.beginPath();
		ctx.moveTo(0, -H);
		ctx.lineTo(0, H);
		ctx.stroke();

		// Kickoff circle
		if (ko > 0) {
			ctx.beginPath();
			ctx.arc(0, 0, ko, 0, Math.PI * 2);
			ctx.stroke();
		}

		// Hockey: goal lines and arcs
		if (type === "hockey") {
			const gl = bg.goalLine ?? 0;
			let glX = W - gl;
			if (gl < cr) glX = 0;

			ctx.strokeStyle = "rgba(133,172,243,0.7)"; // blue side
			ctx.beginPath();
			ctx.arc(0, 0, ko, -Math.PI / 2, Math.PI / 2, false);
			if (glX !== 0) {
				ctx.moveTo(glX, -H);
				ctx.lineTo(glX, H);
			}
			ctx.stroke();

			ctx.strokeStyle = "rgba(225,137,119,0.7)"; // red side
			ctx.beginPath();
			ctx.arc(0, 0, ko, -Math.PI / 2, Math.PI / 2, true);
			if (glX !== 0) {
				ctx.moveTo(-glX, -H);
				ctx.lineTo(-glX, H);
			}
			ctx.stroke();
		}
	}

	private drawVertex(v: Vertex, selected: boolean, zoom: number): void {
		const { ctx } = this;
		const r = (selected ? 5 : 3) / zoom;
		ctx.beginPath();
		ctx.arc(v.x, v.y, r, 0, Math.PI * 2);
		ctx.fillStyle = selected ? COL_SELECTED : COL_VERTEX_FILL;
		ctx.fill();
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 1 / zoom;
		ctx.stroke();
	}

	private drawSegment(
		seg: Segment,
		verts: Vertex[],
		traits: StadiumObject["traits"],
		selected: boolean,
		zoom: number,
	): void {
		const { ctx } = this;
		const s = resolveTraits(seg, traits);
		const invisible = s.vis === false;

		// Always draw if selected; skip invisible segs otherwise
		if (invisible && !selected) {
			// Draw ghost line for editor awareness
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

		// Game uses lineWidth=3 (set before Br loop); selection highlight uses thicker line
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
			// When curveF < 0 (negative curve degrees), the game negates the curve and
			// swaps v0/v1 before drawing clockwise — equivalent to drawing CCW with our
			// original vertex order. Pass anticlockwise = (curveF < 0).
			ctx.arc(c.x, c.y, r, startAngle, endAngle, curveF < 0);
		}

		ctx.stroke();
	}

	private drawDisc(
		disc: Disc,
		traits: StadiumObject["traits"],
		selected: boolean,
		zoom: number,
	): void {
		const { ctx } = this;
		const d = resolveTraits(disc, traits);
		const [px, py] = d.pos ?? [0, 0];
		const r = d.radius ?? 10;
		const fill = parseColor(d.color);

		ctx.beginPath();
		ctx.arc(px, py, r, 0, Math.PI * 2);

		// Game uses lineWidth=2 for disc pass
		ctx.lineWidth = selected ? 3 / zoom : 2 / zoom;

		if (fill) {
			ctx.fillStyle = selected ? "rgba(245,166,35,0.35)" : fill;
			ctx.fill();
		}

		ctx.strokeStyle = selected ? COL_SELECTED : "#000000";
		ctx.stroke();
	}

	private drawGoal(goal: Goal, selected: boolean, zoom: number): void {
		const { ctx } = this;
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

	private drawPlane(plane: Plane, selected: boolean, camera: Camera): void {
		const { ctx } = this;
		const [nx, ny] = plane.normal ?? [0, 1];
		const dist = plane.dist ?? 0;
		const len = Math.hypot(nx, ny) || 1;
		const ux = nx / len;
		const uy = ny / len;
		const bx = ux * dist;
		const by = uy * dist;
		const tx = -uy;
		const ty = ux;
		const ext = Math.max(this.canvas.width, this.canvas.height) / camera.zoom;

		ctx.beginPath();
		ctx.moveTo(bx + tx * ext, by + ty * ext);
		ctx.lineTo(bx - tx * ext, by - ty * ext);
		ctx.lineWidth = selected ? 2 / camera.zoom : 1 / camera.zoom;
		ctx.strokeStyle = selected ? COL_SELECTED : COL_PLANE;
		ctx.setLineDash([8 / camera.zoom, 6 / camera.zoom]);
		ctx.stroke();
		ctx.setLineDash([]);

		// Normal arrow
		ctx.beginPath();
		ctx.moveTo(bx, by);
		ctx.lineTo(bx + ux * 20, by + uy * 20);
		ctx.lineWidth = 1 / camera.zoom;
		ctx.strokeStyle = "rgba(255,200,100,0.7)";
		ctx.stroke();
	}

	private drawJoint(
		joint: Joint,
		discs: Disc[],
		selected: boolean,
		zoom: number,
	): void {
		const { ctx } = this;
		const d0 = discs[joint.d0];
		const d1 = discs[joint.d1];
		if (!d0 || !d1) return;
		const [x0, y0] = d0.pos ?? [0, 0];
		const [x1, y1] = d1.pos ?? [0, 0];

		ctx.beginPath();
		ctx.moveTo(x0, y0);
		ctx.lineTo(x1, y1);
		// Game draws joints solid with the joint's color (default black).
		// Editor highlights selection in accent color. Non-selected joints use a
		// slightly lightened version so they're visible on dark backgrounds.
		ctx.strokeStyle = selected
			? COL_SELECTED
			: (parseColor(joint.color) ?? "rgba(80,80,80,1)");
		ctx.lineWidth = selected ? 2 / zoom : 1 / zoom;
		ctx.stroke();
	}

	private drawGrid(camera: Camera, W: number, H: number): void {
		const { ctx } = this;
		const step = this.calcGridStep(camera.zoom);
		const p0 = camera.screenToWorld(0, 0, W, H);
		const p1 = camera.screenToWorld(W, H, W, H);

		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.strokeStyle = COL_GRID;
		ctx.lineWidth = 1;

		const startX = Math.floor(p0.x / step) * step;
		for (let wx = startX; wx <= p1.x; wx += step) {
			const sx = (wx - camera.x) * camera.zoom + W / 2;
			ctx.beginPath();
			ctx.moveTo(sx, 0);
			ctx.lineTo(sx, H);
			ctx.stroke();
		}

		const startY = Math.floor(p0.y / step) * step;
		for (let wy = startY; wy <= p1.y; wy += step) {
			const sy = (wy - camera.y) * camera.zoom + H / 2;
			ctx.beginPath();
			ctx.moveTo(0, sy);
			ctx.lineTo(W, sy);
			ctx.stroke();
		}

		ctx.strokeStyle = COL_AXIS;
		const ox = -camera.x * camera.zoom + W / 2;
		const oy = -camera.y * camera.zoom + H / 2;
		ctx.beginPath();
		ctx.moveTo(ox, 0);
		ctx.lineTo(ox, H);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(0, oy);
		ctx.lineTo(W, oy);
		ctx.stroke();

		ctx.restore();
	}

	private drawCurveHandle(seg: Segment, verts: Vertex[], zoom: number): void {
		const { ctx } = this;
		const v0 = verts[seg.v0];
		const v1 = verts[seg.v1];
		if (!v0 || !v1) return;

		const chordMX = (v0.x + v1.x) / 2;
		const chordMY = (v0.y + v1.y) / 2;

		const curveF = getCurveF(seg.curve, seg.curveF);

		if (!Number.isFinite(curveF)) {
			// Straight segment — draw a subtle midpoint dot as a drag affordance.
			// The user can drag this dot to start curving the segment.
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

		// Dashed line from chord midpoint to handle
		ctx.beginPath();
		ctx.setLineDash([3 / zoom, 3 / zoom]);
		ctx.strokeStyle = "rgba(245,166,35,0.45)";
		ctx.lineWidth = 1 / zoom;
		ctx.moveTo(chordMX, chordMY);
		ctx.lineTo(mx, my);
		ctx.stroke();
		ctx.setLineDash([]);

		// Diamond handle at arc midpoint
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

	private calcGridStep(zoom: number): number {
		const candidates = [5, 10, 20, 25, 50, 100, 200, 500, 1000];
		const targetPx = 60;
		for (const c of candidates) {
			if (c * zoom >= targetPx) return c;
		}
		return 1000;
	}

	private drawVertexLabels(verts: Vertex[], zoom: number): void {
		const { ctx } = this;
		const fontSize = Math.max(8, Math.min(14, 11 / zoom));
		ctx.save();
		ctx.font = `${fontSize / zoom}px "IBM Plex Mono", monospace`;
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";
		verts.forEach((v, i) => {
			const label = `v${i}`;
			const offsetX = 5 / zoom;
			const offsetY = -5 / zoom;
			// Shadow for legibility
			ctx.fillStyle = "rgba(0,0,0,0.7)";
			ctx.fillText(
				label,
				v.x + offsetX + 0.5 / zoom,
				v.y + offsetY + 0.5 / zoom,
			);
			ctx.fillStyle = "rgba(200,210,230,0.9)";
			ctx.fillText(label, v.x + offsetX, v.y + offsetY);
		});
		ctx.restore();
	}

	private drawSpawnPoints(
		points: [number, number][],
		color: string,
		zoom: number,
	): void {
		const { ctx } = this;
		const r = 8 / zoom;
		const fontSize = Math.max(7, 9 / zoom);
		ctx.save();
		ctx.font = `bold ${fontSize}px "IBM Plex Mono", monospace`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		points.forEach(([x, y], i) => {
			// Outer ring
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.strokeStyle = color;
			ctx.lineWidth = 1.5 / zoom;
			ctx.stroke();
			// Inner fill
			ctx.fillStyle = `${color}44`;
			ctx.fill();
			// Index label
			ctx.fillStyle = color;
			ctx.fillText(String(i), x, y);
		});
		ctx.restore();
	}
}
