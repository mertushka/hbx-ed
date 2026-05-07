import { describe, expect, it } from "vitest";

import {
	createTestStadium,
	createToolContext,
	mouseEvent,
} from "../test/toolContext.ts";
import { SelectTool } from "./SelectTool.ts";

describe("SelectTool", () => {
	it("selects and drags a vertex", () => {
		const stadium = createTestStadium({
			vertexes: [{ x: 0, y: 0 }],
		});
		const harness = createToolContext(stadium);
		const tool = new SelectTool(harness.ctx, () => 1);

		tool.onMouseDown({ x: 0, y: 0 }, mouseEvent());
		tool.onMouseMove({ x: 4, y: 5 }, mouseEvent());
		tool.onMouseUp({ x: 4, y: 5 });

		expect(harness.selection).toEqual({ type: "vertex", index: 0 });
		expect(stadium.vertexes[0]).toEqual({ x: 4, y: 5 });
		expect(harness.ctx.saveHistory).toHaveBeenCalledTimes(1);
		expect(harness.ctx.refresh).toHaveBeenCalledTimes(2);
		expect(harness.ctx.renderer.vertexSnapTarget).toBeNull();
	});

	it("snaps a dragged vertex to a nearby existing vertex", () => {
		const stadium = createTestStadium({
			vertexes: [
				{ x: 0, y: 0 },
				{ x: 20, y: 0 },
			],
		});
		const harness = createToolContext(stadium);
		const tool = new SelectTool(harness.ctx, () => 1);

		tool.onMouseDown({ x: 0, y: 0 }, mouseEvent());
		tool.onMouseMove({ x: 19, y: 1 }, mouseEvent());

		expect(stadium.vertexes[0]).toEqual({ x: 20, y: 0 });
		expect(harness.ctx.renderer.vertexSnapTarget).toEqual({ x: 20, y: 0 });

		tool.onMouseUp({ x: 19, y: 1 });

		expect(harness.ctx.renderer.vertexSnapTarget).toBeNull();
		expect(harness.ctx.saveHistory).toHaveBeenCalledTimes(1);
	});

	it("drags discs and goals from hit-tested selections", () => {
		const stadium = createTestStadium({
			discs: [{ pos: [20, 20], radius: 8 }],
			goals: [{ p0: [0, -10], p1: [0, 10] }],
		});
		const harness = createToolContext(stadium);
		const tool = new SelectTool(harness.ctx, () => 1);

		tool.onMouseDown({ x: 20, y: 20 }, mouseEvent());
		tool.onMouseMove({ x: 30, y: 40 }, mouseEvent());
		tool.onMouseUp({ x: 30, y: 40 });

		expect(harness.selection).toEqual({ type: "disc", index: 0 });
		expect(stadium.discs[0]?.pos).toEqual([30, 40]);

		tool.onMouseDown({ x: 0, y: 0 }, mouseEvent());
		tool.onMouseMove({ x: 10, y: 20 }, mouseEvent());
		tool.onMouseUp({ x: 10, y: 20 });

		expect(harness.selection).toEqual({ type: "goal", index: 0 });
		expect(stadium.goals[0]).toEqual({ p0: [10, 10], p1: [10, 30] });
		expect(harness.ctx.saveHistory).toHaveBeenCalledTimes(2);
	});

	it("shift-click toggles multi-selection without starting a drag", () => {
		const stadium = createTestStadium({
			vertexes: [{ x: 0, y: 0 }],
		});
		const harness = createToolContext(stadium);
		const tool = new SelectTool(harness.ctx, () => 1);

		tool.onMouseDown({ x: 0, y: 0 }, mouseEvent(true));
		expect(harness.selection).toBeNull();
		expect(harness.multiSelection).toEqual({
			items: [{ type: "vertex", index: 0 }],
		});

		tool.onMouseDown({ x: 0, y: 0 }, mouseEvent(true));
		expect(harness.multiSelection).toBeNull();
		expect(harness.ctx.saveHistory).not.toHaveBeenCalled();
		expect(harness.ctx.refresh).toHaveBeenCalledTimes(2);
	});

	it("box-selects objects inside a dragged rectangle", () => {
		const stadium = createTestStadium({
			vertexes: [
				{ x: 0, y: 0 },
				{ x: 40, y: 40 },
			],
			discs: [{ pos: [10, 10] }],
			goals: [{ p0: [15, 0], p1: [15, 20] }],
		});
		const harness = createToolContext(stadium);
		const tool = new SelectTool(harness.ctx, () => 1);

		tool.onMouseDown({ x: -20, y: -20 }, mouseEvent(true));
		tool.onMouseMove({ x: 25, y: 25 }, mouseEvent(true));
		tool.onMouseUp({ x: 25, y: 25 });

		expect(harness.multiSelection).toEqual({
			items: [
				{ type: "vertex", index: 0 },
				{ type: "disc", index: 0 },
				{ type: "goal", index: 0 },
			],
		});
		expect(harness.ctx.renderer.boxSelect).toBeNull();
		expect(harness.ctx.saveHistory).toHaveBeenCalledTimes(1);
	});

	it("translates all objects in an existing multi-selection", () => {
		const stadium = createTestStadium({
			vertexes: [{ x: 0, y: 0 }],
			discs: [{ pos: [20, 20] }],
			goals: [{ p0: [40, 40], p1: [40, 50] }],
		});
		const harness = createToolContext(stadium);
		const tool = new SelectTool(harness.ctx, () => 1);
		harness.ctx.setMultiSelection({
			items: [
				{ type: "vertex", index: 0 },
				{ type: "disc", index: 0 },
				{ type: "goal", index: 0 },
			],
		});

		tool.onMouseDown({ x: 0, y: 0 }, mouseEvent());
		tool.onMouseMove({ x: 10, y: 10 }, mouseEvent());
		tool.onMouseUp({ x: 10, y: 10 });

		expect(stadium.vertexes[0]).toEqual({ x: 10, y: 10 });
		expect(stadium.discs[0]?.pos).toEqual([30, 30]);
		expect(stadium.goals[0]).toEqual({ p0: [50, 50], p1: [50, 60] });
		expect(harness.ctx.saveHistory).toHaveBeenCalledTimes(1);
	});

	it("clears selection and commits an empty box drag when clicking empty space", () => {
		const stadium = createTestStadium({
			vertexes: [{ x: 0, y: 0 }],
		});
		const harness = createToolContext(stadium);
		const tool = new SelectTool(harness.ctx, () => 1);
		harness.ctx.setSelection({ type: "vertex", index: 0 });
		harness.ctx.setMultiSelection({ items: [{ type: "vertex", index: 0 }] });

		tool.onMouseDown({ x: 50, y: 50 }, mouseEvent());
		tool.onMouseMove({ x: 70, y: 70 }, mouseEvent());
		tool.onMouseUp({ x: 70, y: 70 });

		expect(harness.selection).toBeNull();
		expect(harness.multiSelection).toBeNull();
		expect(harness.ctx.renderer.boxSelect).toBeNull();
		expect(harness.ctx.saveHistory).toHaveBeenCalledTimes(1);
	});

	it("drags red spawn points without changing object selection", () => {
		const stadium = createTestStadium({
			redSpawnPoints: [[5, 5]],
		});
		const harness = createToolContext(stadium);
		const tool = new SelectTool(harness.ctx, () => 1);

		tool.onMouseDown({ x: 5, y: 5 }, mouseEvent());
		tool.onMouseMove({ x: 10, y: 13 }, mouseEvent());
		tool.onMouseUp({ x: 10, y: 13 });

		expect(stadium.redSpawnPoints).toEqual([[10, 13]]);
		expect(harness.selection).toBeNull();
		expect(harness.multiSelection).toBeNull();
		expect(harness.ctx.saveHistory).toHaveBeenCalledTimes(1);
	});

	it("drags blue spawn points too", () => {
		const stadium = createTestStadium({
			blueSpawnPoints: [[5, 5]],
		});
		const harness = createToolContext(stadium);
		const tool = new SelectTool(harness.ctx, () => 1);

		tool.onMouseDown({ x: 5, y: 5 }, mouseEvent());
		tool.onMouseMove({ x: 12, y: 15 }, mouseEvent());
		tool.onMouseUp({ x: 12, y: 15 });

		expect(stadium.blueSpawnPoints).toEqual([[12, 15]]);
		expect(harness.selection).toBeNull();
		expect(harness.multiSelection).toBeNull();
		expect(harness.ctx.saveHistory).toHaveBeenCalledTimes(1);
	});

	it("selects segments without starting a drag", () => {
		const stadium = createTestStadium({
			vertexes: [
				{ x: 0, y: 0 },
				{ x: 20, y: 0 },
			],
			segments: [{ v0: 0, v1: 1 }],
		});
		const harness = createToolContext(stadium);
		const tool = new SelectTool(harness.ctx, () => 1);

		tool.onMouseDown({ x: 10, y: 0 }, mouseEvent());
		tool.onMouseMove({ x: 20, y: 20 }, mouseEvent());
		tool.onMouseUp({ x: 20, y: 20 });

		expect(harness.selection).toEqual({ type: "segment", index: 0 });
		expect(stadium.vertexes).toEqual([
			{ x: 0, y: 0 },
			{ x: 20, y: 0 },
		]);
		expect(harness.ctx.saveHistory).not.toHaveBeenCalled();
	});

	it("ignores selection starts when no stadium is loaded", () => {
		const harness = createToolContext(null);
		const tool = new SelectTool(harness.ctx, () => 1);

		tool.onMouseDown({ x: 0, y: 0 }, mouseEvent());
		tool.onMouseMove({ x: 5, y: 5 }, mouseEvent());
		tool.onMouseUp({ x: 5, y: 5 });

		expect(harness.selection).toBeNull();
		expect(harness.ctx.saveHistory).not.toHaveBeenCalled();
	});

	it("updates a selected segment curve from its curve handle", () => {
		const stadium = createTestStadium({
			vertexes: [
				{ x: 0, y: 0 },
				{ x: 20, y: 0 },
			],
			segments: [{ v0: 0, v1: 1 }],
		});
		const harness = createToolContext(stadium);
		const tool = new SelectTool(harness.ctx, () => 1);
		harness.ctx.setSelection({ type: "segment", index: 0 });

		tool.onMouseDown({ x: 10, y: 0 }, mouseEvent());
		tool.onMouseMove({ x: 10, y: -10 }, mouseEvent());
		tool.onMouseUp({ x: 10, y: -10 });

		expect(stadium.segments[0]?.curve).toBeCloseTo(180);
		expect(stadium.segments[0]?.curveF).toBeUndefined();
		expect(harness.ctx.saveHistory).toHaveBeenCalledTimes(1);
	});

	it("clears renderer drag affordances when deactivated", () => {
		const stadium = createTestStadium();
		const harness = createToolContext(stadium);
		const tool = new SelectTool(harness.ctx, () => 1);

		harness.ctx.renderer.boxSelect = { x: 0, y: 0, w: 1, h: 1 };
		harness.ctx.renderer.multiSelection = {
			items: [{ type: "vertex", index: 0 }],
		};
		harness.ctx.renderer.vertexSnapTarget = { x: 1, y: 2 };

		tool.onDeactivate();

		expect(harness.ctx.renderer.boxSelect).toBeNull();
		expect(harness.ctx.renderer.multiSelection).toBeNull();
		expect(harness.ctx.renderer.vertexSnapTarget).toBeNull();
	});
});
