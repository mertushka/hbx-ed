import { describe, expect, it } from "vitest";

import { createTestStadium, createToolContext } from "../test/toolContext.ts";
import { SpawnTool } from "./SpawnTool.ts";

describe("SpawnTool", () => {
	it("initializes red spawn points and appends rounded coordinates", () => {
		const stadium = createTestStadium();
		const harness = createToolContext(stadium);
		const tool = new SpawnTool(harness.ctx, "red");

		tool.onMouseDown({ x: 1.4, y: -2.6 });

		expect(stadium.redSpawnPoints).toEqual([[1, -3]]);
		expect(harness.ctx.saveHistory).toHaveBeenCalledTimes(1);
		expect(harness.ctx.refresh).toHaveBeenCalledTimes(1);
		expect(harness.ctx.toast).toHaveBeenCalledWith("Added red spawn #0");
	});

	it("initializes blue spawn points and appends rounded coordinates", () => {
		const stadium = createTestStadium();
		const harness = createToolContext(stadium);
		const tool = new SpawnTool(harness.ctx, "blue");

		tool.onMouseDown({ x: 10.5, y: 19.49 });

		expect(stadium.blueSpawnPoints).toEqual([[11, 19]]);
		expect(harness.ctx.saveHistory).toHaveBeenCalledTimes(1);
		expect(harness.ctx.refresh).toHaveBeenCalledTimes(1);
		expect(harness.ctx.toast).toHaveBeenCalledWith("Added blue spawn #0");
	});

	it("shows a toast when no stadium is loaded", () => {
		const harness = createToolContext(null);
		const tool = new SpawnTool(harness.ctx);

		tool.onMouseDown({ x: 1, y: 2 });

		expect(harness.ctx.toast).toHaveBeenCalledWith("Load a stadium first");
		expect(harness.ctx.saveHistory).not.toHaveBeenCalled();
		expect(harness.ctx.refresh).not.toHaveBeenCalled();
	});
});
