import { describe, expect, it, vi } from "vitest";

import { Camera } from "../core/camera.ts";
import type { Background } from "../types/stadium.ts";
import { drawEditorBackground } from "./background.ts";
import type { TexturePatterns } from "./textures.ts";

function mockContext(): CanvasRenderingContext2D {
	return {
		arc: vi.fn(),
		arcTo: vi.fn(),
		beginPath: vi.fn(),
		closePath: vi.fn(),
		fill: vi.fn(),
		lineTo: vi.fn(),
		moveTo: vi.fn(),
		rect: vi.fn(),
		restore: vi.fn(),
		save: vi.fn(),
		scale: vi.fn(),
		stroke: vi.fn(),
		set fillStyle(_value: string | CanvasGradient | CanvasPattern) {},
		set lineWidth(_value: number) {},
		set strokeStyle(_value: string | CanvasGradient | CanvasPattern) {},
	} as unknown as CanvasRenderingContext2D;
}

function camera(): Camera {
	const cam = new Camera();
	cam.zoom = 2;
	cam.x = 5;
	cam.y = -7;
	return cam;
}

function patterns(): TexturePatterns {
	return {
		concrete: {} as CanvasPattern,
		concrete2: {} as CanvasPattern,
		grass: {} as CanvasPattern,
	};
}

describe("drawEditorBackground", () => {
	it("skips empty backgrounds", () => {
		const ctx = mockContext();

		drawEditorBackground(ctx, { type: "none" }, camera(), null, {
			width: 240,
			height: 160,
		});

		expect(ctx.fill).not.toHaveBeenCalled();
		expect(ctx.stroke).not.toHaveBeenCalled();
	});

	it("draws grass field bounds, center line, and kickoff circle", () => {
		const ctx = mockContext();
		const bg: Background = {
			type: "grass",
			width: 90,
			height: 45,
			kickOffRadius: 20,
			cornerRadius: 8,
			color: "718C5A",
		};

		drawEditorBackground(ctx, bg, camera(), null, { width: 240, height: 160 });

		expect(ctx.arcTo).toHaveBeenCalled();
		expect(ctx.moveTo).toHaveBeenCalledWith(0, -45);
		expect(ctx.lineTo).toHaveBeenCalledWith(0, 45);
		expect(ctx.arc).toHaveBeenCalledWith(0, 0, 20, 0, Math.PI * 2);
		expect(ctx.fill).toHaveBeenCalled();
		expect(ctx.stroke).toHaveBeenCalled();
	});

	it("draws custom solid backgrounds without texture patterns", () => {
		const ctx = mockContext();

		drawEditorBackground(
			ctx,
			{
				type: "custom" as Background["type"],
				width: 80,
				height: 40,
				cornerRadius: 4,
				color: "112233",
			},
			camera(),
			null,
			{ width: 240, height: 160 },
		);

		expect(ctx.arcTo).toHaveBeenCalled();
		expect(ctx.fill).toHaveBeenCalledOnce();
		expect(ctx.stroke).toHaveBeenCalled();
	});

	it("draws hockey concrete fill and side goal-line arcs", () => {
		const ctx = mockContext();
		const cam = camera();
		const bg: Background = {
			type: "hockey",
			width: 100,
			height: 50,
			kickOffRadius: 25,
			cornerRadius: 10,
			goalLine: 20,
		};
		const ext = Math.max(240, 160) / cam.zoom + 20000;

		drawEditorBackground(ctx, bg, cam, patterns(), { width: 240, height: 160 });

		expect(ctx.rect).toHaveBeenCalledWith(
			cam.x - ext,
			cam.y - ext,
			ext * 2,
			ext * 2,
		);
		expect(ctx.scale).toHaveBeenCalledWith(2, 2);
		expect(ctx.arc).toHaveBeenCalledWith(
			0,
			0,
			25,
			-Math.PI / 2,
			Math.PI / 2,
			false,
		);
		expect(ctx.arc).toHaveBeenCalledWith(
			0,
			0,
			25,
			-Math.PI / 2,
			Math.PI / 2,
			true,
		);
		expect(ctx.moveTo).toHaveBeenCalledWith(80, -50);
		expect(ctx.lineTo).toHaveBeenCalledWith(80, 50);
		expect(ctx.moveTo).toHaveBeenCalledWith(-80, -50);
		expect(ctx.lineTo).toHaveBeenCalledWith(-80, 50);
	});

	it("uses solid hockey fills when texture patterns are unavailable", () => {
		const ctx = mockContext();

		drawEditorBackground(
			ctx,
			{
				type: "hockey",
				width: 100,
				height: 50,
				kickOffRadius: 25,
				cornerRadius: 80,
				goalLine: 20,
			},
			camera(),
			null,
			{ width: 240, height: 160 },
		);

		expect(ctx.scale).not.toHaveBeenCalled();
		expect(ctx.fill).toHaveBeenCalled();
		expect(ctx.arc).toHaveBeenCalledWith(
			0,
			0,
			25,
			-Math.PI / 2,
			Math.PI / 2,
			false,
		);
		expect(ctx.arc).toHaveBeenCalledWith(
			0,
			0,
			25,
			-Math.PI / 2,
			Math.PI / 2,
			true,
		);
	});
});
