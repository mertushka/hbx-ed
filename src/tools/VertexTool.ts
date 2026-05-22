import type { WorldPoint } from "../core/camera.ts";
import type { Vertex } from "../types/stadium.ts";
import { snapToGrid } from "../utils/math.ts";
import type { AppContext } from "./context.ts";
import type { Tool } from "./types.ts";

const SNAP_RADIUS_PX = 12;

export class VertexTool implements Tool {
	readonly name = "vertex";
	readonly cursor = "crosshair";
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

		// If click lands on an existing vertex, select it instead of creating a duplicate
		let best: number | null = null;
		let bestDist = Infinity;
		stadium.vertexes.forEach((v, i) => {
			const d = Math.hypot(v.x - pos.x, v.y - pos.y);
			if (d < snapR && d < bestDist) {
				bestDist = d;
				best = i;
			}
		});

		if (best !== null) {
			this.ctx.setSelection({ type: "vertex", index: best });
			this.ctx.toast(`Selected existing vertex #${best}`);
			return;
		}

		const p = snapToGrid(pos.x, pos.y, zoom, e.shiftKey);
		const vertex: Vertex = {
			...this.ctx.getToolDefaultObject("vertex"),
			x: Math.round(p.x),
			y: Math.round(p.y),
		};
		const trait = this.ctx.getToolDefaultTrait("vertex");
		if (trait) vertex.trait = trait;
		stadium.vertexes.push(vertex);
		const idx = stadium.vertexes.length - 1;

		this.ctx.saveHistory();
		this.ctx.setSelection({ type: "vertex", index: idx });
		this.ctx.toast(`Added vertex #${idx}`);
	}
}
