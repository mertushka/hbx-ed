import type { Camera } from "../core/camera.ts";
import type {
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
import { drawEditorBackground } from "./background.ts";
import {
	type BoxSelect,
	drawEditorOverlays,
	type SegmentPreview,
	type VertexSnapTarget,
} from "./editorOverlays.ts";
import { drawEditorGrid } from "./grid.ts";
import {
	drawEditorCurveHandle,
	drawEditorDisc,
	drawEditorGoal,
	drawEditorJoint,
	drawEditorPlane,
	drawEditorSegment,
	drawEditorVertex,
} from "./primitives.ts";
import { TexturePatternCache } from "./textures.ts";

// ─── Colours used in the editor ──────────────────────────────────────────────
const COL_CANVAS_BG = "#0e0f12";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isSelected(
	sel: Selection | null,
	type: Selection["type"],
	idx: number,
): boolean {
	return sel !== null && sel.type === type && sel.index === idx;
}

// ─── Renderer class ───────────────────────────────────────────────────────────

export class Renderer {
	private readonly canvas: HTMLCanvasElement;
	readonly ctx: CanvasRenderingContext2D;
	private readonly textures: TexturePatternCache;

	/** Optional preview line drawn by the segment / joint tool. */
	segPreview: SegmentPreview | null = null;

	/** When true, vertex indices (v0, v1…) are drawn on the canvas. */
	showVertexLabels = false;

	/** When true, red/blue spawn points are drawn on the canvas. */
	showSpawnPoints = true;

	/** Multi-selection set — highlighted in teal. */
	multiSelection: MultiSelection | null = null;

	/** Box-select drag rect in world coords. */
	boxSelect: BoxSelect | null = null;

	/** World position of the active vertex-snap target, drawn as a ring indicator. */
	vertexSnapTarget: VertexSnapTarget | null = null;

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

		drawEditorGrid(ctx, camera, W, H);

		if (!stadium) return;
		const patterns = this.textures.getPatterns();

		ctx.save();
		ctx.translate(W / 2, H / 2);
		ctx.scale(camera.zoom, camera.zoom);
		ctx.translate(-camera.x, -camera.y);

		if (stadium.bg) {
			drawEditorBackground(ctx, stadium.bg, camera, patterns, {
				width: this.canvas.width,
				height: this.canvas.height,
			});
		}

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

		// Editor overlays
		drawEditorOverlays(
			ctx,
			stadium,
			{
				showVertexLabels: this.showVertexLabels,
				showSpawnPoints: this.showSpawnPoints,
				segPreview: this.segPreview,
				multiSelection: this.multiSelection,
				boxSelect: this.boxSelect,
				vertexSnapTarget: this.vertexSnapTarget,
			},
			camera.zoom,
		);

		ctx.restore();
	}

	// ── Private draw methods ────────────────────────────────────────────────────

	private drawVertex(v: Vertex, selected: boolean, zoom: number): void {
		drawEditorVertex(this.ctx, v, selected, zoom);
	}

	private drawSegment(
		seg: Segment,
		verts: Vertex[],
		traits: StadiumObject["traits"],
		selected: boolean,
		zoom: number,
	): void {
		drawEditorSegment(this.ctx, seg, verts, traits, selected, zoom);
	}

	private drawDisc(
		disc: Disc,
		traits: StadiumObject["traits"],
		selected: boolean,
		zoom: number,
	): void {
		drawEditorDisc(this.ctx, disc, traits, selected, zoom);
	}

	private drawGoal(goal: Goal, selected: boolean, zoom: number): void {
		drawEditorGoal(this.ctx, goal, selected, zoom);
	}

	private drawPlane(plane: Plane, selected: boolean, camera: Camera): void {
		drawEditorPlane(this.ctx, plane, selected, camera, {
			width: this.canvas.width,
			height: this.canvas.height,
		});
	}

	private drawJoint(
		joint: Joint,
		discs: Disc[],
		selected: boolean,
		zoom: number,
	): void {
		drawEditorJoint(this.ctx, joint, discs, selected, zoom);
	}

	private drawCurveHandle(seg: Segment, verts: Vertex[], zoom: number): void {
		drawEditorCurveHandle(this.ctx, seg, verts, zoom);
	}
}
