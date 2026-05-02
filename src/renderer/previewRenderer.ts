/**
 * PreviewRenderer — faithfully replicates the HaxBall game renderer.
 *
 * Rendering pipeline extracted from game-min.js (Rc → Cr → Br → wr → lm):
 *
 *   1. Cr()  — background (fills canvas, then field pattern, lines, kickoff arc)
 *   2. Br()  — segments  (lineWidth = 3, always clockwise arcs)
 *   3. wr()  — joints    (lineWidth = 3, line between two disc positions)
 *   4. lm()  — discs     (lineWidth = 2)
 *
 * NOTE: Goal trigger lines (goals[]) are NOT rendered by the game — they are
 * invisible physics boundaries. Only the goal-post/net segments are visible.
 *
 * Key rendering details from game-min.js:
 *  • lineWidth = 3 (segments + joints) / 2 (discs), divided by zoom in world-space.
 *  • Arc direction: always clockwise (no anticlockwise flag passed to ctx.arc).
 *  • Grass: full canvas fill → grass pattern at scale(2,2) → border+centreline in one stroke.
 *  • Hockey: concrete2 fill (huge rect) → concrete fill (field) → border → dashed centre
 *            → blue/red semicircle arcs with vertical goal lines.
 *  • Disc colour -1 / transparent → skip fill, stroke-only.
 *  • Joint colour is the joint's own .color field (default black "000000").
 *    Skip joint if colour < 0 (transparent), matching game's wr() `if(!(0>a.S))` guard.
 */

import type { Camera } from "../core/camera.ts";
import { resolveTraits } from "../core/traits.ts";
import type {
	Disc,
	Joint,
	Segment,
	StadiumObject,
	Vertex,
} from "../types/stadium.ts";
import { parseColor } from "../utils/color.ts";
import { computeArcCenter, getCurveF } from "../utils/math.ts";
import { TexturePatternCache, type TexturePatterns } from "./textures.ts";

// ─── Color helpers (matches game's nc() and color parsing) ────────────────────

/** Convert any HBS-style color value to CSS rgba string. Returns null for transparent / -1. */
function toCSS(color: unknown): string | null {
	if (color == null || color === "transparent" || color === -1) return null;
	if (Array.isArray(color))
		return `rgba(${color[0]},${color[1]},${color[2]},255)`;
	if (typeof color === "number") {
		if (color === -1) return null;
		const r = (color >> 16) & 0xff,
			g = (color >> 8) & 0xff,
			b = color & 0xff;
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

// ─── Rounded rect (game's vm()) ───────────────────────────────────────────────

function roundedRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
): void {
	const x2 = x + w,
		y2 = y + h;
	ctx.beginPath();
	ctx.moveTo(x2 - r, y);
	ctx.arcTo(x2, y, x2, y + r, r);
	ctx.lineTo(x2, y2 - r);
	ctx.arcTo(x2, y2, x2 - r, y2, r);
	ctx.lineTo(x + r, y2);
	ctx.arcTo(x, y2, x, y2 - r, r);
	ctx.lineTo(x, y + r);
	ctx.arcTo(x, y, x + r, y, r);
	ctx.closePath();
}

// ─── PreviewRenderer ──────────────────────────────────────────────────────────

export class PreviewRenderer {
	private readonly canvas: HTMLCanvasElement;
	readonly ctx: CanvasRenderingContext2D;

	private readonly textures: TexturePatternCache;

	constructor(canvas: HTMLCanvasElement, onTextureLoad?: () => void) {
		this.canvas = canvas;
		const ctx = canvas.getContext("2d", { alpha: false });
		if (!ctx)
			throw new Error("Could not acquire 2D context for preview canvas");
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

	// ── Main entry ──────────────────────────────────────────────────────────────

	render(stadium: StadiumObject, camera: Camera): void {
		const { ctx } = this;
		const W = this.canvas.width,
			H = this.canvas.height;

		// Ensure patterns are ready
		const patterns = this.textures.getPatterns();

		// Clear to opaque black (game uses mozOpaque + alpha:false)
		ctx.fillStyle = "#000000";
		ctx.fillRect(0, 0, W, H);

		// Apply camera transform
		ctx.save();
		ctx.translate(W / 2, H / 2);
		ctx.scale(camera.zoom, camera.zoom);
		ctx.translate(-camera.x, -camera.y);

		// 1. Background (Cr)
		ctx.lineWidth = 3 / camera.zoom;
		this.drawBackground(stadium, camera, patterns);

		// 2. Segments (Br → Ar) — lineWidth = 3
		ctx.lineWidth = 3 / camera.zoom;
		ctx.imageSmoothingEnabled = false;
		for (const seg of stadium.segments) {
			this.drawSegment(seg, stadium.vertexes, stadium.traits);
		}

		// 3. Joints (wr) — lineWidth = 3, same pass as segments
		//    Goal trigger lines (goals[]) are NOT drawn — they are invisible in the game.
		for (const joint of stadium.joints) {
			this.drawJoint(joint, stadium.discs);
		}

		// 4. Discs (lm) — lineWidth = 2
		ctx.lineWidth = 2 / camera.zoom;
		ctx.imageSmoothingEnabled = true;
		for (const disc of stadium.discs) {
			this.drawDisc(disc, stadium.traits);
		}

		// 5. Spawn points — editor overlay (not rendered in the actual game,
		//    but shown in preview so the user can verify placement).
		this.drawSpawnPoints(stadium.redSpawnPoints ?? [], "#ff4d6d", camera.zoom);
		this.drawSpawnPoints(stadium.blueSpawnPoints ?? [], "#4d9eff", camera.zoom);

		ctx.restore();
	}

	// ── 1. Background — Cr() ────────────────────────────────────────────────────

	private drawBackground(
		stadium: StadiumObject,
		camera: Camera,
		patterns: TexturePatterns | null,
	): void {
		const { ctx } = this;
		const bg = stadium.bg;
		if (!bg) return;

		const type = bg.type ?? "none";
		// bg.width and bg.height in .hbs are HALF-EXTENTS.
		// The game calls vm(ctx, -ce, -be, 2*ce, 2*be) — drawing from -W to +W.
		const W = bg.width ?? 0; // half-width
		const H = bg.height ?? 0; // half-height
		const cr = bg.cornerRadius ?? 0;
		const ko = bg.kickOffRadius ?? 0;
		const gl = bg.goalLine ?? 0;
		const bgColor = parseColor(bg.color) ?? "rgba(113,140,90,255)";

		if (type === "grass") {
			// ── Step 1: fill entire canvas with bg color (resetTransform fill) ──
			ctx.save();
			ctx.resetTransform();
			ctx.fillStyle = bgColor;
			ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
			ctx.restore();

			// ── Step 2: grass pattern at scale(2,2) inside the rounded rect ──
			// vm(ctx, -W, -H, 2W, 2H, cr) → rect from (-W,-H) to (+W,+H)
			ctx.strokeStyle = "#C7E6BD";
			roundedRect(ctx, -W, -H, 2 * W, 2 * H, cr);
			if (patterns) {
				ctx.fillStyle = patterns.grass;
				ctx.save();
				ctx.scale(2, 2);
				ctx.fill();
				ctx.restore();
			} else {
				ctx.fillStyle = bgColor;
				ctx.fill();
			}

			// ── Step 3: border + centre line stroked together in one call ──
			// Game: after fill(), path is still the rounded rect. Then moveTo/lineTo
			// extends it with the centre line, and a single stroke() draws both.
			ctx.moveTo(0, -H);
			ctx.lineTo(0, H);
			ctx.stroke();
			// Kickoff circle — separate beginPath
			ctx.beginPath();
			ctx.arc(0, 0, ko, 0, Math.PI * 2);
			ctx.stroke();
		} else if (type === "hockey") {
			// ── Step 1: concrete2 pattern over visible world area ──
			ctx.save();
			const zoom = camera.zoom;
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
			ctx.restore();

			// ── Step 2: concrete pattern inside field ──
			ctx.strokeStyle = "#E9CC6E";
			roundedRect(ctx, -W, -H, 2 * W, 2 * H, cr);
			if (patterns) {
				ctx.save();
				ctx.scale(2, 2);
				ctx.fillStyle = patterns.concrete;
				ctx.fill();
				ctx.restore();
			} else {
				ctx.fillStyle = "#dce8f0";
				ctx.fill();
			}

			// ── Step 3: field border stroke ──
			// After restore() the transform is back but the path from vm() is still current.
			// Game calls ctx.stroke() directly here — no new beginPath or vm() call.
			ctx.stroke();

			// ── Step 4: dashed center line ──
			ctx.beginPath();
			ctx.moveTo(0, -H);
			ctx.setLineDash([15 / camera.zoom, 15 / camera.zoom]);
			ctx.lineTo(0, H);
			ctx.stroke();
			ctx.setLineDash([]);

			// ── Step 5: goal arcs + vertical goal lines ──
			// From game Cr() hockey section:
			//   e = a.Te  (goalLine)
			//   b -= e    (b = ce - goalLine = half-field-width minus goalLine offset)
			//   e < a.Gc && (b = 0)  (if goalLine < cornerRadius, no vertical line)
			let glX = W - gl; // x of goal line from centre
			if (gl < cr) glX = 0; // game: e<Gc → b=0

			const drawArc = (
				color: string,
				xLine: number,
				anticlockwise: boolean,
			): void => {
				ctx.beginPath();
				ctx.strokeStyle = color;
				ctx.arc(0, 0, ko, -Math.PI / 2, Math.PI / 2, anticlockwise);
				if (xLine !== 0) {
					ctx.moveTo(xLine, -H);
					ctx.lineTo(xLine, H);
				}
				ctx.stroke();
			};
			drawArc("#85ACF3", glX, false); // blue side (right)
			drawArc("#E18977", -glX, true); // red side  (left)
		} else {
			// type === 'none' — just fill canvas with bg color
			ctx.save();
			ctx.resetTransform();
			ctx.fillStyle = bgColor;
			ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
			ctx.restore();
		}
	}

	// ── 2. Segment — Ar() ───────────────────────────────────────────────────────

	private drawSegment(
		seg: Segment,
		verts: Vertex[],
		traits: StadiumObject["traits"],
	): void {
		const { ctx } = this;
		const s = resolveTraits(seg, traits);

		// game only draws if vis !== false (bb = visible flag)
		if (s.vis === false) return;

		const v0 = verts[s.v0];
		const v1 = verts[s.v1];
		if (!v0 || !v1) return;

		const color = toCSS(s.color) ?? "rgba(0,0,0,255)";
		ctx.beginPath();
		ctx.strokeStyle = color;

		const curveF = getCurveF(s.curve, s.curveF);

		if (!Number.isFinite(curveF)) {
			// Straight line
			ctx.moveTo(v0.x, v0.y);
			ctx.lineTo(v1.x, v1.y);
		} else {
			// Curved arc.
			// The game's Vc() negates negative curves and swaps v0/v1 (draws CW from
			// the swapped order). This is equivalent to drawing CCW with our original
			// vertex order when curveF < 0.
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

	// ── 3. Joint — wr() ─────────────────────────────────────────────────────────
	//
	// wr(joint, discs): draws a line from discs[d0].pos to discs[d1].pos.
	// Skipped if joint color < 0 (transparent). Default color is black (0x000000).
	// Goal trigger lines (goals[]) are NOT rendered — they are invisible in the game.

	private drawJoint(joint: Joint, discs: Disc[]): void {
		const { ctx } = this;

		// game: if(!(0>a.S)) — skip transparent (negative) color
		const cssColor = toCSS(joint.color);
		if (joint.color !== undefined && cssColor === null) return; // transparent → skip

		const d0 = discs[joint.d0];
		const d1 = discs[joint.d1];
		if (!d0 || !d1) return;

		const [x0, y0] = d0.pos ?? [0, 0];
		const [x1, y1] = d1.pos ?? [0, 0];

		ctx.beginPath();
		ctx.strokeStyle = cssColor ?? "rgba(0,0,0,255)"; // default: black
		ctx.moveTo(x0, y0);
		ctx.lineTo(x1, y1);
		ctx.stroke();
	}

	// ── 4. Disc — lm() ──────────────────────────────────────────────────────────

	private drawDisc(disc: Disc, traits: StadiumObject["traits"]): void {
		const { ctx } = this;
		const d = resolveTraits(disc, traits);
		const pos = d.pos ?? [0, 0];
		const radius = d.radius ?? 10;

		// game: 0>a.V → skip. V is radius, so negative radius = skip
		if (radius < 0) return;

		const cssColor = toCSS(d.color);

		ctx.beginPath();
		// game: null == b (no player avatar) → fillStyle=nc(a.S), strokeStyle="black"
		ctx.fillStyle = cssColor ?? "rgba(255,255,255,255)";
		ctx.strokeStyle = "black";
		ctx.arc(pos[0], pos[1], radius, 0, Math.PI * 2, false);

		// game: -1 != (a.S|0) → fill (transparent = -1 → don't fill)
		if (cssColor !== null) {
			ctx.fill();
		}
		ctx.stroke();
	}

	// ── Texture initialisation ───────────────────────────────────────────────────

	// ── Spawn point overlay ───────────────────────────────────────────────────────

	private drawSpawnPoints(
		points: [number, number][],
		color: string,
		zoom: number,
	): void {
		const { ctx } = this;
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
}
