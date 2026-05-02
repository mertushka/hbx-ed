import { describe, expect, it, vi } from "vitest";

import { Camera } from "../core/camera.ts";
import { createTestStadium, createToolContext } from "../test/toolContext.ts";
import { PanTool } from "./PanTool.ts";

function pointer(clientX: number, clientY: number): MouseEvent {
	return new MouseEvent("mousemove", { clientX, clientY });
}

describe("PanTool", () => {
	it("pans the camera based on screen delta and zoom", () => {
		const camera = new Camera();
		camera.x = 100;
		camera.y = 50;
		camera.zoom = 2;
		const harness = createToolContext(createTestStadium());
		const getScreenPos = vi.fn((e: MouseEvent) => ({
			x: e.clientX,
			y: e.clientY,
		}));
		const tool = new PanTool(harness.ctx, camera, getScreenPos);

		tool.onMouseDown({ x: 0, y: 0 }, pointer(10, 20));
		tool.onMouseMove({ x: 0, y: 0 }, pointer(30, 10));

		expect(camera.x).toBe(90);
		expect(camera.y).toBe(55);
		expect(document.body.style.cursor).toBe("grabbing");
		expect(harness.ctx.refresh).toHaveBeenCalledTimes(1);
	});

	it("ignores movement until dragging starts", () => {
		const camera = new Camera();
		const harness = createToolContext(createTestStadium());
		const tool = new PanTool(harness.ctx, camera, () => ({ x: 20, y: 20 }));

		tool.onMouseMove({ x: 0, y: 0 }, pointer(20, 20));

		expect(camera.x).toBe(0);
		expect(camera.y).toBe(0);
		expect(harness.ctx.refresh).not.toHaveBeenCalled();
	});

	it("stops dragging and restores the cursor on mouseup or deactivation", () => {
		const camera = new Camera();
		const harness = createToolContext(createTestStadium());
		const tool = new PanTool(harness.ctx, camera, (e) => ({
			x: e.clientX,
			y: e.clientY,
		}));

		tool.onMouseDown({ x: 0, y: 0 }, pointer(0, 0));
		tool.onMouseUp();
		tool.onMouseMove({ x: 0, y: 0 }, pointer(10, 10));

		expect(document.body.style.cursor).toBe("");
		expect(harness.ctx.refresh).not.toHaveBeenCalled();

		tool.onMouseDown({ x: 0, y: 0 }, pointer(0, 0));
		tool.onDeactivate();
		tool.onMouseMove({ x: 0, y: 0 }, pointer(10, 10));

		expect(document.body.style.cursor).toBe("");
		expect(harness.ctx.refresh).not.toHaveBeenCalled();
	});
});
