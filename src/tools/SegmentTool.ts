import type { WorldPoint } from "../core/camera.ts";
import type { Segment, Vertex } from "../types/stadium.ts";
import { snapToGrid } from "../utils/math.ts";
import type { AppContext } from "./context.ts";
import type { Tool } from "./types.ts";

const SNAP_RADIUS_PX = 15;

export class SegmentTool implements Tool {
	readonly name = "segment";
	readonly cursor = "crosshair";

	/** Index of the first vertex chosen, or null when idle. */
	private pendingV0: number | null = null;

	/**
	 * Index of a vertex that was created by this tool's first click (not
	 * an existing vertex that was snapped to). Tracked so we can remove it
	 * if the user cancels before completing the segment — otherwise an
	 * unreachable orphan vertex is left in the array with no undo entry.
	 */
	private createdVertexIdx: number | null = null;
	private readonly ctx: AppContext;
	private readonly getZoom: () => number;

	constructor(ctx: AppContext, getZoom: () => number) {
		this.ctx = ctx;
		this.getZoom = getZoom;
	}

	onMouseDown(pos: WorldPoint, e: MouseEvent): void {
		const stadium = this.ctx.getStadium();
		if (!stadium) {
			this.ctx.toast("Load a stadium first");
			return;
		}

		const zoom = this.getZoom();
		const snapR = SNAP_RADIUS_PX / zoom;
		const snapped = snapToGrid(pos.x, pos.y, zoom, e.shiftKey);
		const existingIdx = this.findNearestVertex(pos.x, pos.y, snapR);

		// Use an existing vertex if within snap radius; otherwise create a new one.
		let v: number;
		let newlyCreated = false;
		if (existingIdx !== null) {
			v = existingIdx;
		} else {
			const vertex: Vertex = {
				...this.ctx.getToolDefaultObject("vertex"),
				x: Math.round(snapped.x),
				y: Math.round(snapped.y),
			};
			const vertexTrait = this.ctx.getToolDefaultTrait("vertex");
			if (vertexTrait) vertex.trait = vertexTrait;
			stadium.vertexes.push(vertex);
			v = stadium.vertexes.length - 1;
			newlyCreated = true;
		}

		if (this.pendingV0 === null) {
			// First click — set start vertex
			this.pendingV0 = v;
			this.createdVertexIdx = newlyCreated ? v : null;
			this.ctx.toast(`Segment start: vertex #${v}. Click another to complete.`);
			const vx = stadium.vertexes[v];
			if (!vx) return;
			this.ctx.renderer.segPreview = {
				x0: vx.x,
				y0: vx.y,
				x1: snapped.x,
				y1: snapped.y,
			};
		} else {
			// Second click — complete the segment
			if (this.pendingV0 !== v) {
				const segment: Segment = {
					v0: this.pendingV0,
					v1: v,
					vis: true,
					color: "ffffff",
					bCoef: 1,
					cMask: ["all", "red", "blue"],
					...this.ctx.getToolDefaultObject("segment"),
				};
				const segmentTrait = this.ctx.getToolDefaultTrait("segment");
				if (segmentTrait) segment.trait = segmentTrait;
				stadium.segments.push(segment);
				const idx = stadium.segments.length - 1;
				this.ctx.saveHistory();
				this.ctx.setSelection({ type: "segment", index: idx });
				this.ctx.toast(`Added segment v${this.pendingV0} → v${v}`);
			}
			this.pendingV0 = null;
			this.createdVertexIdx = null;
			this.ctx.renderer.segPreview = null;
		}
	}

	onMouseMove(pos: WorldPoint, e: MouseEvent): void {
		if (this.pendingV0 === null) return;
		const stadium = this.ctx.getStadium();
		if (!stadium) return;
		const v0 = stadium.vertexes[this.pendingV0];
		if (!v0) return;
		const snapped = snapToGrid(pos.x, pos.y, this.getZoom(), e.shiftKey);
		this.ctx.renderer.segPreview = {
			x0: v0.x,
			y0: v0.y,
			x1: snapped.x,
			y1: snapped.y,
		};
		this.ctx.refresh();
	}

	onDeactivate(): void {
		// If the user cancels mid-segment and we created a new vertex for the
		// start point, remove it — it's unreferenced and has no undo entry.
		if (this.createdVertexIdx !== null) {
			const stadium = this.ctx.getStadium();
			if (stadium && this.createdVertexIdx === stadium.vertexes.length - 1) {
				// Only safe to remove if it's the last vertex (no segments can reference it yet)
				stadium.vertexes.pop();
				this.ctx.refresh();
			}
		}
		this.pendingV0 = null;
		this.createdVertexIdx = null;
		this.ctx.renderer.segPreview = null;
	}

	private findNearestVertex(
		wx: number,
		wy: number,
		snapR: number,
	): number | null {
		const stadium = this.ctx.getStadium();
		if (!stadium) return null;
		let best: number | null = null;
		let bestDist = Infinity;
		stadium.vertexes.forEach((v, i) => {
			const d = Math.hypot(v.x - wx, v.y - wy);
			if (d < snapR && d < bestDist) {
				bestDist = d;
				best = i;
			}
		});
		return best;
	}
}
