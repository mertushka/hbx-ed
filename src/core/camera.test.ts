import { describe, expect, it } from "vitest";

import { Camera } from "./camera.ts";

describe("Camera", () => {
	it("converts world and screen coordinates as inverses", () => {
		const camera = new Camera();
		camera.x = 10;
		camera.y = -5;
		camera.zoom = 2;

		const screen = camera.worldToScreen(20, 15, 200, 100);
		expect(screen).toEqual({ x: 120, y: 90 });
		expect(camera.screenToWorld(screen.x, screen.y, 200, 100)).toEqual({
			x: 20,
			y: 15,
		});
	});

	it("zooms toward an anchor and clamps zoom limits", () => {
		const camera = new Camera();

		camera.zoomAt(2, 10, 0);
		expect(camera.zoom).toBe(2);
		expect(camera.x).toBe(5);
		expect(camera.y).toBe(0);

		camera.zoomAt(100, 10, 0);
		expect(camera.zoom).toBe(20);

		camera.zoomAt(0.0001, 10, 0);
		expect(camera.zoom).toBe(0.05);
	});

	it("fits centered rectangles and reports zoom percentage", () => {
		const camera = new Camera();
		camera.fitRect(100, 50, 260, 130);

		expect(camera.x).toBe(0);
		expect(camera.y).toBe(0);
		expect(camera.zoom).toBeCloseTo(2);
		expect(camera.zoomPercent).toBe(200);
	});
});
