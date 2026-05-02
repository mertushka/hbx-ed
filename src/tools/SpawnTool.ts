import type { WorldPoint } from "../core/camera.ts";
import type { AppContext } from "./context.ts";
import type { Tool } from "./types.ts";

export class SpawnTool implements Tool {
	readonly name = "spawn";
	readonly cursor = "crosshair";
	private readonly ctx: AppContext;
	/** Which team's spawn points to edit. */
	team: "red" | "blue";

	constructor(ctx: AppContext, team: "red" | "blue" = "red") {
		this.ctx = ctx;
		this.team = team;
	}

	onMouseDown(pos: WorldPoint): void {
		const stadium = this.ctx.getStadium();
		if (!stadium) {
			this.ctx.toast("Load a stadium first");
			return;
		}

		const pt: [number, number] = [Math.round(pos.x), Math.round(pos.y)];

		if (this.team === "red") {
			stadium.redSpawnPoints ??= [];
			stadium.redSpawnPoints.push(pt);
			this.ctx.toast(`Added red spawn #${stadium.redSpawnPoints.length - 1}`);
		} else {
			stadium.blueSpawnPoints ??= [];
			stadium.blueSpawnPoints.push(pt);
			this.ctx.toast(`Added blue spawn #${stadium.blueSpawnPoints.length - 1}`);
		}

		this.ctx.saveHistory();
		this.ctx.refresh();
	}
}
