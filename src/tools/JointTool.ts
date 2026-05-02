import type { WorldPoint } from "../core/camera.ts";
import type { AppContext } from "./context.ts";
import type { Tool } from "./types.ts";

const SNAP_RADIUS_PX = 18;

export class JointTool implements Tool {
	readonly name = "joint";
	readonly cursor = "crosshair";

	/** Index of the first disc chosen, or null when waiting for first click. */
	private pendingD0: number | null = null;
	private readonly ctx: AppContext;
	private readonly getZoom: () => number;

	constructor(ctx: AppContext, getZoom: () => number) {
		this.ctx = ctx;
		this.getZoom = getZoom;
	}

	onMouseDown(pos: WorldPoint): void {
		const stadium = this.ctx.getStadium();
		if (!stadium) {
			this.ctx.toast("Load a stadium first");
			return;
		}

		const snapR = SNAP_RADIUS_PX / this.getZoom();
		const discIdx = this.findNearestDisc(pos.x, pos.y, snapR);

		if (discIdx === null) {
			this.ctx.toast("Click on a disc to start a joint");
			return;
		}

		if (this.pendingD0 === null) {
			this.pendingD0 = discIdx;
			// Show preview line anchored to disc centre
			const d = stadium.discs[discIdx];
			if (!d) return;
			const [dx, dy] = d.pos ?? [0, 0];
			this.ctx.renderer.segPreview = { x0: dx, y0: dy, x1: pos.x, y1: pos.y };
			this.ctx.toast(
				`Joint start: disc #${discIdx}. Click another disc to complete.`,
			);
		} else {
			if (this.pendingD0 !== discIdx) {
				stadium.joints.push({
					d0: this.pendingD0,
					d1: discIdx,
					length: null,
					strength: "rigid",
					color: "000000",
				});
				const idx = stadium.joints.length - 1;
				this.ctx.saveHistory();
				this.ctx.setSelection({ type: "joint", index: idx });
				this.ctx.toast(`Added joint d${this.pendingD0} ↔ d${discIdx}`);
			}
			this.pendingD0 = null;
			this.ctx.renderer.segPreview = null;
		}
	}

	onMouseMove(pos: WorldPoint): void {
		if (this.pendingD0 === null) return;
		const stadium = this.ctx.getStadium();
		if (!stadium) return;
		const d = stadium.discs[this.pendingD0];
		if (!d) return;
		const [dx, dy] = d.pos ?? [0, 0];
		this.ctx.renderer.segPreview = { x0: dx, y0: dy, x1: pos.x, y1: pos.y };
		this.ctx.refresh();
	}

	onDeactivate(): void {
		this.pendingD0 = null;
		this.ctx.renderer.segPreview = null;
	}

	private findNearestDisc(
		wx: number,
		wy: number,
		snapR: number,
	): number | null {
		const stadium = this.ctx.getStadium();
		if (!stadium) return null;
		let best: number | null = null;
		let bestDist = Infinity;
		stadium.discs.forEach((d, i) => {
			const [dx, dy] = d.pos ?? [0, 0];
			const r = (d.radius ?? 10) + snapR;
			const dist = Math.hypot(dx - wx, dy - wy);
			if (dist < r && dist < bestDist) {
				bestDist = dist;
				best = i;
			}
		});
		return best;
	}
}
