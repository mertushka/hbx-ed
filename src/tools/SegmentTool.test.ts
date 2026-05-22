import { describe, expect, it } from "vitest";

import {
	createTestStadium,
	createToolContext,
	mouseEvent,
} from "../test/toolContext.ts";
import { SegmentTool } from "./SegmentTool.ts";

describe("SegmentTool", () => {
	it("creates a segment from an existing vertex to a new snapped vertex", () => {
		const stadium = createTestStadium({
			vertexes: [{ x: 0, y: 0 }],
		});
		const harness = createToolContext(stadium);
		harness.setToolDefaultTrait("vertex", "post");
		harness.setToolDefaultTrait("segment", "wall");
		const tool = new SegmentTool(harness.ctx, () => 3);

		tool.onMouseDown({ x: 1, y: 1 }, mouseEvent(true));
		tool.onMouseMove({ x: 27, y: 33 }, mouseEvent(true));
		tool.onMouseDown({ x: 27, y: 33 }, mouseEvent(true));

		expect(stadium.vertexes).toEqual([
			{ x: 0, y: 0 },
			{ x: 20, y: 40, trait: "post" },
		]);
		expect(stadium.segments).toEqual([
			{
				v0: 0,
				v1: 1,
				vis: true,
				color: "ffffff",
				bCoef: 1,
				cMask: ["all", "red", "blue"],
				trait: "wall",
			},
		]);
		expect(harness.ctx.refresh).toHaveBeenCalledTimes(1);
		expect(harness.ctx.saveHistory).toHaveBeenCalledTimes(1);
		expect(harness.selection).toEqual({ type: "segment", index: 0 });
		expect(harness.ctx.renderer.segPreview).toBeNull();
		expect(harness.ctx.toast).toHaveBeenLastCalledWith(
			expect.stringContaining("Added segment"),
		);
	});

	it("updates the preview while waiting for the second vertex", () => {
		const stadium = createTestStadium({
			vertexes: [{ x: 0, y: 0 }],
		});
		const harness = createToolContext(stadium);
		const tool = new SegmentTool(harness.ctx, () => 3);

		tool.onMouseDown({ x: 1, y: 1 }, mouseEvent(true));
		tool.onMouseMove({ x: 27, y: 33 }, mouseEvent(true));

		expect(harness.ctx.renderer.segPreview).toEqual({
			x0: 0,
			y0: 0,
			x1: 20,
			y1: 40,
		});
		expect(harness.ctx.refresh).toHaveBeenCalledTimes(1);
		expect(stadium.segments).toEqual([]);
	});

	it("removes an unsaved start vertex when deactivated mid-segment", () => {
		const stadium = createTestStadium();
		const harness = createToolContext(stadium);
		const tool = new SegmentTool(harness.ctx, () => 3);

		tool.onMouseDown({ x: 27, y: 33 }, mouseEvent(true));
		expect(stadium.vertexes).toEqual([{ x: 20, y: 40 }]);

		tool.onDeactivate();

		expect(stadium.vertexes).toEqual([]);
		expect(harness.ctx.renderer.segPreview).toBeNull();
		expect(harness.ctx.refresh).toHaveBeenCalledTimes(1);
		expect(harness.ctx.saveHistory).not.toHaveBeenCalled();
	});

	it("shows a toast when no stadium is loaded", () => {
		const harness = createToolContext(null);
		const tool = new SegmentTool(harness.ctx, () => 1);

		tool.onMouseDown({ x: 1, y: 2 }, mouseEvent());

		expect(harness.ctx.toast).toHaveBeenCalledWith("Load a stadium first");
		expect(harness.ctx.saveHistory).not.toHaveBeenCalled();
		expect(harness.ctx.setSelection).not.toHaveBeenCalled();
	});
});
