import type { WorldPoint } from "../core/camera.ts";
import type { Disc, Goal, Plane } from "../types/stadium.ts";
import { snapToGrid } from "../utils/math.ts";
import type { AppContext } from "./context.ts";
import type { Tool } from "./types.ts";

export class DiscTool implements Tool {
	readonly name = "disc";
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

		const p = snapToGrid(pos.x, pos.y, this.getZoom(), e.shiftKey);
		const disc: Disc = {
			radius: 10,
			invMass: 1,
			damping: 0.99,
			color: "FFFFFF",
			bCoef: 0.5,
			cMask: ["all"],
			...this.ctx.getToolDefaultObject("disc"),
			pos: [Math.round(p.x), Math.round(p.y)],
		};
		const trait = this.ctx.getToolDefaultTrait("disc");
		if (trait) disc.trait = trait;
		stadium.discs.push(disc);
		const idx = stadium.discs.length - 1;
		this.ctx.saveHistory();
		this.ctx.setSelection({ type: "disc", index: idx });
		this.ctx.toast(`Added disc #${idx}`);
	}
}

export class GoalTool implements Tool {
	readonly name = "goal";
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

		const p = snapToGrid(pos.x, pos.y, this.getZoom(), e.shiftKey);
		const x = Math.round(p.x),
			y = Math.round(p.y);
		const goal: Goal = {
			team: "red",
			...this.ctx.getToolDefaultObject("goal"),
			p0: [x, y - 50],
			p1: [x, y + 50],
		};
		const trait = this.ctx.getToolDefaultTrait("goal");
		if (trait) goal.trait = trait;
		stadium.goals.push(goal);
		const idx = stadium.goals.length - 1;
		this.ctx.saveHistory();
		this.ctx.setSelection({ type: "goal", index: idx });
		this.ctx.toast("Added goal — set team in Properties");
	}
}

export class PlaneTool implements Tool {
	readonly name = "plane";
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

		const p = snapToGrid(pos.x, pos.y, this.getZoom(), e.shiftKey);
		const defaults = this.ctx.getToolDefaultObject("plane");
		const normal = defaults?.normal ?? ([0, 1] as [number, number]);
		const plane: Plane = {
			bCoef: 1,
			cMask: ["all", "red", "blue", "ball"],
			...defaults,
			normal,
			dist: Math.round(p.x * normal[0] + p.y * normal[1]),
		};
		const trait = this.ctx.getToolDefaultTrait("plane");
		if (trait) plane.trait = trait;
		stadium.planes.push(plane);
		const idx = stadium.planes.length - 1;
		this.ctx.saveHistory();
		this.ctx.setSelection({ type: "plane", index: idx });
		this.ctx.toast("Added plane — adjust normal/dist in Properties");
	}
}
