import { describe, expect, it, vi } from "vitest";

import type { StadiumObject } from "../types/stadium.ts";
import { drawEditorOverlays } from "./editorOverlays.ts";

function mockContext(): CanvasRenderingContext2D {
	return {
		arc: vi.fn(),
		beginPath: vi.fn(),
		fill: vi.fn(),
		fillText: vi.fn(),
		lineTo: vi.fn(),
		moveTo: vi.fn(),
		rect: vi.fn(),
		restore: vi.fn(),
		save: vi.fn(),
		setLineDash: vi.fn(),
		stroke: vi.fn(),
		set fillStyle(_value: string | CanvasGradient | CanvasPattern) {},
		set font(_value: string) {},
		set lineWidth(_value: number) {},
		set strokeStyle(_value: string | CanvasGradient | CanvasPattern) {},
		set textAlign(_value: CanvasTextAlign) {},
		set textBaseline(_value: CanvasTextBaseline) {},
	} as unknown as CanvasRenderingContext2D;
}

function stadium(): StadiumObject {
	return {
		name: "Overlay",
		width: 100,
		height: 50,
		traits: {},
		vertexes: [{ x: 1, y: 2 }],
		segments: [],
		goals: [{ p0: [30, 40], p1: [50, 60] }],
		discs: [{ pos: [10, 20], radius: 5 }],
		planes: [],
		joints: [],
		redSpawnPoints: [[70, 80]],
		blueSpawnPoints: [[90, 100]],
	};
}

describe("drawEditorOverlays", () => {
	it("draws labels, spawns, previews, selections, and drag affordances", () => {
		const ctx = mockContext();

		drawEditorOverlays(
			ctx,
			stadium(),
			{
				showVertexLabels: true,
				showSpawnPoints: true,
				segPreview: { x0: 1, y0: 2, x1: 3, y1: 4 },
				multiSelection: {
					items: [
						{ type: "vertex", index: 0 },
						{ type: "disc", index: 0 },
						{ type: "goal", index: 0 },
					],
				},
				boxSelect: { x: 5, y: 6, w: 7, h: 8 },
				vertexSnapTarget: { x: 9, y: 10 },
			},
			1,
		);

		expect(ctx.fillText).toHaveBeenCalledWith("v0", 6, -3);
		expect(ctx.fillText).toHaveBeenCalledWith("0", 70, 80);
		expect(ctx.fillText).toHaveBeenCalledWith("0", 90, 100);
		expect(ctx.setLineDash).toHaveBeenCalledWith([6, 4]);
		expect(ctx.moveTo).toHaveBeenCalledWith(1, 2);
		expect(ctx.lineTo).toHaveBeenCalledWith(3, 4);
		expect(ctx.arc).toHaveBeenCalledWith(1, 2, 7, 0, Math.PI * 2);
		expect(ctx.arc).toHaveBeenCalledWith(10, 20, 9, 0, Math.PI * 2);
		expect(ctx.moveTo).toHaveBeenCalledWith(30, 40);
		expect(ctx.lineTo).toHaveBeenCalledWith(50, 60);
		expect(ctx.rect).toHaveBeenCalledWith(5, 6, 7, 8);
		expect(ctx.arc).toHaveBeenCalledWith(9, 10, 9, 0, Math.PI * 2);
	});

	it("honors disabled label and spawn overlays", () => {
		const ctx = mockContext();

		drawEditorOverlays(
			ctx,
			stadium(),
			{
				showVertexLabels: false,
				showSpawnPoints: false,
				segPreview: null,
				multiSelection: null,
				boxSelect: null,
				vertexSnapTarget: null,
			},
			1,
		);

		expect(ctx.fillText).not.toHaveBeenCalled();
		expect(ctx.arc).not.toHaveBeenCalled();
	});
});
