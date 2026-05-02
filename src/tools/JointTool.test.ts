import { describe, expect, it } from "vitest";

import { createTestStadium, createToolContext } from "../test/toolContext.ts";
import { JointTool } from "./JointTool.ts";

describe("JointTool", () => {
	it("creates a rigid joint between two clicked discs", () => {
		const stadium = createTestStadium({
			discs: [
				{ pos: [0, 0], radius: 10 },
				{ pos: [40, 0], radius: 10 },
			],
		});
		const harness = createToolContext(stadium);
		const tool = new JointTool(harness.ctx, () => 2);

		tool.onMouseDown({ x: 1, y: 1 });
		tool.onMouseMove({ x: 20, y: 10 });
		tool.onMouseDown({ x: 40, y: 1 });

		expect(stadium.joints).toEqual([
			{
				d0: 0,
				d1: 1,
				length: null,
				strength: "rigid",
				color: "000000",
			},
		]);
		expect(harness.ctx.refresh).toHaveBeenCalledTimes(1);
		expect(harness.ctx.saveHistory).toHaveBeenCalledTimes(1);
		expect(harness.selection).toEqual({ type: "joint", index: 0 });
		expect(harness.ctx.renderer.segPreview).toBeNull();
		expect(harness.ctx.toast).toHaveBeenLastCalledWith(
			expect.stringContaining("Added joint"),
		);
	});

	it("updates the preview while waiting for the second disc", () => {
		const stadium = createTestStadium({
			discs: [{ pos: [5, 6], radius: 10 }],
		});
		const harness = createToolContext(stadium);
		const tool = new JointTool(harness.ctx, () => 1);

		tool.onMouseDown({ x: 5, y: 6 });
		tool.onMouseMove({ x: 20, y: 30 });

		expect(harness.ctx.renderer.segPreview).toEqual({
			x0: 5,
			y0: 6,
			x1: 20,
			y1: 30,
		});
		expect(harness.ctx.refresh).toHaveBeenCalledTimes(1);
		expect(stadium.joints).toEqual([]);
	});

	it("clears a pending joint when deactivated", () => {
		const stadium = createTestStadium({
			discs: [
				{ pos: [0, 0], radius: 10 },
				{ pos: [40, 0], radius: 10 },
			],
		});
		const harness = createToolContext(stadium);
		const tool = new JointTool(harness.ctx, () => 2);

		tool.onMouseDown({ x: 0, y: 0 });
		tool.onDeactivate();
		tool.onMouseDown({ x: 40, y: 0 });

		expect(stadium.joints).toEqual([]);
		expect(harness.ctx.renderer.segPreview).toEqual({
			x0: 40,
			y0: 0,
			x1: 40,
			y1: 0,
		});
		expect(harness.ctx.saveHistory).not.toHaveBeenCalled();
	});

	it("shows a toast when no stadium is loaded", () => {
		const harness = createToolContext(null);
		const tool = new JointTool(harness.ctx, () => 1);

		tool.onMouseDown({ x: 1, y: 2 });

		expect(harness.ctx.toast).toHaveBeenCalledWith("Load a stadium first");
		expect(harness.ctx.saveHistory).not.toHaveBeenCalled();
		expect(harness.ctx.setSelection).not.toHaveBeenCalled();
	});

	it("asks the user to click a disc when there is no hit", () => {
		const stadium = createTestStadium({
			discs: [{ pos: [0, 0], radius: 5 }],
		});
		const harness = createToolContext(stadium);
		const tool = new JointTool(harness.ctx, () => 4);

		tool.onMouseDown({ x: 50, y: 50 });

		expect(harness.ctx.toast).toHaveBeenCalledWith(
			"Click on a disc to start a joint",
		);
		expect(stadium.joints).toEqual([]);
		expect(harness.ctx.saveHistory).not.toHaveBeenCalled();
	});
});
