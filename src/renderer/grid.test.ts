import { describe, expect, it, vi } from "vitest";

import { Camera } from "../core/camera.ts";
import { calcGridStep, drawEditorGrid } from "./grid.ts";

function mockContext(): CanvasRenderingContext2D {
	return {
		beginPath: vi.fn(),
		lineTo: vi.fn(),
		moveTo: vi.fn(),
		restore: vi.fn(),
		save: vi.fn(),
		setTransform: vi.fn(),
		stroke: vi.fn(),
		set lineWidth(_value: number) {},
		set strokeStyle(_value: string | CanvasGradient | CanvasPattern) {},
	} as unknown as CanvasRenderingContext2D;
}

describe("renderer grid", () => {
	it("chooses readable grid steps across zoom levels", () => {
		expect(calcGridStep(20)).toBe(5);
		expect(calcGridStep(3)).toBe(20);
		expect(calcGridStep(1)).toBe(100);
		expect(calcGridStep(0.05)).toBe(1000);
	});

	it("draws world-space grid lines and origin axes", () => {
		const camera = new Camera();
		camera.zoom = 1;
		camera.x = 0;
		camera.y = 0;
		const ctx = mockContext();

		drawEditorGrid(ctx, camera, 200, 100);

		expect(ctx.save).toHaveBeenCalledOnce();
		expect(ctx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
		expect(ctx.moveTo).toHaveBeenCalledWith(100, 0);
		expect(ctx.lineTo).toHaveBeenCalledWith(100, 100);
		expect(ctx.moveTo).toHaveBeenCalledWith(0, 50);
		expect(ctx.lineTo).toHaveBeenCalledWith(200, 50);
		expect(ctx.restore).toHaveBeenCalledOnce();
	});
});
