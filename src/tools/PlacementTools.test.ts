import { describe, expect, it } from "vitest";

import {
	createTestStadium,
	createToolContext,
	mouseEvent,
} from "../test/toolContext.ts";
import { DiscTool, GoalTool, PlaneTool } from "./PlacementTools.ts";

describe("PlacementTools", () => {
	it("adds a snapped disc with editor defaults and selects it", () => {
		const stadium = createTestStadium();
		const harness = createToolContext(stadium);
		const tool = new DiscTool(harness.ctx, () => 3);

		tool.onMouseDown({ x: 27, y: 33 }, mouseEvent(true));

		expect(stadium.discs).toEqual([
			{
				pos: [20, 40],
				radius: 10,
				invMass: 1,
				damping: 0.99,
				color: "FFFFFF",
				bCoef: 0.5,
				cMask: ["all"],
			},
		]);
		expect(harness.ctx.saveHistory).toHaveBeenCalledTimes(1);
		expect(harness.selection).toEqual({ type: "disc", index: 0 });
		expect(harness.ctx.toast).toHaveBeenCalledWith("Added disc #0");
	});

	it("adds a vertical red goal centered on the snapped point", () => {
		const stadium = createTestStadium();
		const harness = createToolContext(stadium);
		const tool = new GoalTool(harness.ctx, () => 3);

		tool.onMouseDown({ x: 27, y: 33 }, mouseEvent(true));

		expect(stadium.goals).toEqual([
			{
				p0: [20, -10],
				p1: [20, 90],
				team: "red",
			},
		]);
		expect(harness.ctx.saveHistory).toHaveBeenCalledTimes(1);
		expect(harness.selection).toEqual({ type: "goal", index: 0 });
		expect(harness.ctx.toast).toHaveBeenCalledWith(
			expect.stringContaining("Added goal"),
		);
	});

	it("adds a plane at the snapped y coordinate and selects it", () => {
		const stadium = createTestStadium();
		const harness = createToolContext(stadium);
		const tool = new PlaneTool(harness.ctx, () => 3);

		tool.onMouseDown({ x: 27, y: 33 }, mouseEvent(true));

		expect(stadium.planes).toEqual([
			{
				normal: [0, 1],
				dist: 40,
				bCoef: 1,
				cMask: ["all", "red", "blue", "ball"],
			},
		]);
		expect(harness.ctx.saveHistory).toHaveBeenCalledTimes(1);
		expect(harness.selection).toEqual({ type: "plane", index: 0 });
		expect(harness.ctx.toast).toHaveBeenCalledWith(
			expect.stringContaining("Added plane"),
		);
	});

	it("shows a toast when no stadium is loaded", () => {
		const harness = createToolContext(null);
		const tool = new DiscTool(harness.ctx, () => 1);

		tool.onMouseDown({ x: 1, y: 2 }, mouseEvent());

		expect(harness.ctx.toast).toHaveBeenCalledWith("Load a stadium first");
		expect(harness.ctx.saveHistory).not.toHaveBeenCalled();
		expect(harness.ctx.setSelection).not.toHaveBeenCalled();
	});
});
