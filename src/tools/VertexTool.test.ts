import { describe, expect, it } from "vitest";

import {
	createTestStadium,
	createToolContext,
	mouseEvent,
} from "../test/toolContext.ts";
import { VertexTool } from "./VertexTool.ts";

describe("VertexTool", () => {
	it("adds a snapped vertex, saves history, and selects the new vertex", () => {
		const stadium = createTestStadium();
		const harness = createToolContext(stadium);
		const tool = new VertexTool(harness.ctx, () => 3);

		tool.onMouseDown({ x: 27, y: 33 }, mouseEvent(true));

		expect(stadium.vertexes).toEqual([{ x: 20, y: 40 }]);
		expect(harness.ctx.saveHistory).toHaveBeenCalledTimes(1);
		expect(harness.ctx.setSelection).toHaveBeenCalledWith({
			type: "vertex",
			index: 0,
		});
		expect(harness.selection).toEqual({ type: "vertex", index: 0 });
		expect(harness.ctx.toast).toHaveBeenCalledWith("Added vertex #0");
	});

	it("selects a nearby existing vertex instead of creating a duplicate", () => {
		const stadium = createTestStadium({
			vertexes: [
				{ x: 0, y: 0 },
				{ x: 10, y: 10 },
			],
		});
		const harness = createToolContext(stadium);
		const tool = new VertexTool(harness.ctx, () => 1);

		tool.onMouseDown({ x: 12, y: 11 }, mouseEvent());

		expect(stadium.vertexes).toHaveLength(2);
		expect(harness.ctx.saveHistory).not.toHaveBeenCalled();
		expect(harness.selection).toEqual({ type: "vertex", index: 1 });
		expect(harness.ctx.toast).toHaveBeenCalledWith(
			"Selected existing vertex #1",
		);
	});

	it("shows a toast when no stadium is loaded", () => {
		const harness = createToolContext(null);
		const tool = new VertexTool(harness.ctx, () => 1);

		tool.onMouseDown({ x: 1, y: 2 }, mouseEvent());

		expect(harness.ctx.toast).toHaveBeenCalledWith("Load a stadium first");
		expect(harness.ctx.saveHistory).not.toHaveBeenCalled();
		expect(harness.ctx.setSelection).not.toHaveBeenCalled();
	});
});
