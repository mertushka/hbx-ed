import { beforeEach, describe, expect, it, vi } from "vitest";

import { Camera } from "../core/camera.ts";
import type { StadiumObject } from "../types/stadium.ts";
import { PreviewRenderer } from "./previewRenderer.ts";
import { Renderer } from "./renderer.ts";

type MockCanvasContext = CanvasRenderingContext2D & {
	[key: string]: unknown;
};

function canvas(): HTMLCanvasElement {
	const el = document.createElement("canvas");
	el.width = 240;
	el.height = 160;
	return el;
}

function camera(): Camera {
	const cam = new Camera();
	cam.zoom = 1;
	return cam;
}

function stadium(): StadiumObject {
	return {
		name: "Render",
		width: 100,
		height: 60,
		bg: {
			type: "grass",
			width: 90,
			height: 45,
			kickOffRadius: 20,
			cornerRadius: 8,
			color: "718C5A",
		},
		traits: {
			discTrait: { color: "00FF00", radius: 8 },
			segTrait: { color: "FF00FF" },
		},
		vertexes: [
			{ x: -30, y: 0 },
			{ x: 30, y: 0 },
			{ x: 0, y: 20 },
		],
		segments: [
			{ v0: 0, v1: 1, color: "FFFFFF" },
			{ v0: 1, v1: 2, curve: 90, trait: "segTrait" },
			{ v0: 2, v1: 0, vis: false },
		],
		goals: [{ p0: [-80, -20], p1: [-80, 20], team: "red" }],
		discs: [
			{ pos: [0, 0], radius: 10, color: "ABCDEF" },
			{ pos: [40, 0], trait: "discTrait" },
		],
		planes: [{ normal: [0, 1], dist: 50 }],
		joints: [{ d0: 0, d1: 1, color: "123456" }],
		redSpawnPoints: [[-20, -20]],
		blueSpawnPoints: [[20, 20]],
	};
}

function ctxOf(renderer: Renderer | PreviewRenderer): MockCanvasContext {
	return renderer.ctx as MockCanvasContext;
}

describe("Renderer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("resizes the canvas and clears to the editor background when no stadium is loaded", () => {
		const renderer = new Renderer(canvas());
		renderer.resize(300, 200);

		renderer.render(null, camera(), null);

		const ctx = ctxOf(renderer);
		expect(renderer.width).toBe(300);
		expect(renderer.height).toBe(200);
		expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 300, 200);
		expect(ctx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
		expect(ctx.save).toHaveBeenCalledTimes(2);
		expect(ctx.restore).toHaveBeenCalledTimes(2);
	});

	it("draws stadium primitives and editor overlays", () => {
		const renderer = new Renderer(canvas());
		renderer.showVertexLabels = true;
		renderer.segPreview = { x0: -10, y0: -10, x1: 10, y1: 10 };
		renderer.multiSelection = {
			items: [
				{ type: "vertex", index: 0 },
				{ type: "disc", index: 0 },
				{ type: "goal", index: 0 },
			],
		};
		renderer.boxSelect = { x: -40, y: -30, w: 80, h: 60 };
		renderer.vertexSnapTarget = { x: 30, y: 0 };

		renderer.render(stadium(), camera(), { type: "segment", index: 1 });

		const ctx = ctxOf(renderer);
		expect(ctx.translate).toHaveBeenCalledWith(120, 80);
		expect(ctx.scale).toHaveBeenCalledWith(1, 1);
		expect(ctx.arcTo).toHaveBeenCalled();
		expect(ctx.arc).toHaveBeenCalled();
		expect(ctx.moveTo).toHaveBeenCalled();
		expect(ctx.lineTo).toHaveBeenCalled();
		expect(ctx.rect).toHaveBeenCalledWith(-40, -30, 80, 60);
		expect(ctx.fillText).toHaveBeenCalledWith("v0", -25, -5);
		expect(ctx.fillText).toHaveBeenCalledWith("0", -20, -20);
		expect(ctx.setLineDash).toHaveBeenCalledWith([6, 4]);
		expect(ctx.setLineDash).toHaveBeenCalledWith([]);
		expect(ctx.stroke).toHaveBeenCalled();
		expect(ctx.fill).toHaveBeenCalled();
	});

	it("can hide optional spawn and vertex-label overlays", () => {
		const renderer = new Renderer(canvas());
		renderer.showSpawnPoints = false;
		renderer.showVertexLabels = false;

		renderer.render(stadium(), camera(), null);

		const ctx = ctxOf(renderer);
		expect(ctx.fillText).not.toHaveBeenCalledWith("0", -20, -20);
		expect(ctx.fillText).not.toHaveBeenCalledWith("v0", -25, -5);
	});

	it("restores canvas state if transformed rendering throws", () => {
		const renderer = new Renderer(canvas());
		const ctx = ctxOf(renderer);
		vi.mocked(ctx.translate).mockImplementationOnce(() => {
			throw new Error("transform failed");
		});

		expect(() => renderer.render(stadium(), camera(), null)).toThrow(
			"transform failed",
		);
		expect(ctx.restore).toHaveBeenCalledTimes(3);
	});
});

describe("PreviewRenderer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("resizes and draws game-style stadium primitives plus spawn overlays", () => {
		const renderer = new PreviewRenderer(canvas());
		renderer.resize(320, 180);

		renderer.render(stadium(), camera());

		const ctx = ctxOf(renderer);
		expect(renderer.width).toBe(320);
		expect(renderer.height).toBe(180);
		expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 320, 180);
		expect(ctx.resetTransform).toHaveBeenCalled();
		expect(ctx.translate).toHaveBeenCalledWith(160, 90);
		expect(ctx.arc).toHaveBeenCalled();
		expect(ctx.moveTo).toHaveBeenCalled();
		expect(ctx.lineTo).toHaveBeenCalled();
		expect(ctx.fillText).toHaveBeenCalledWith("0", -20, -20);
		expect(ctx.stroke).toHaveBeenCalled();
	});

	it("draws hockey background branches and skips invisible game primitives", () => {
		const s = stadium();
		s.bg = {
			type: "hockey",
			width: 100,
			height: 50,
			kickOffRadius: 25,
			cornerRadius: 10,
			goalLine: 5,
		};
		s.segments = [{ v0: 0, v1: 1, vis: false }];
		s.discs = [{ pos: [0, 0], radius: -1, color: "ABCDEF" }];
		s.joints = [{ d0: 0, d1: 1, color: "transparent" }];
		const renderer = new PreviewRenderer(canvas());

		renderer.render(s, camera());

		const ctx = ctxOf(renderer);
		expect(ctx.rect).toHaveBeenCalled();
		expect(ctx.setLineDash).toHaveBeenCalledWith([15, 15]);
		expect(ctx.arc).toHaveBeenCalled();
		expect(ctx.stroke).toHaveBeenCalled();
	});

	it("restores canvas state if preview rendering throws", () => {
		const renderer = new PreviewRenderer(canvas());
		const ctx = ctxOf(renderer);
		vi.mocked(ctx.translate).mockImplementationOnce(() => {
			throw new Error("preview transform failed");
		});

		expect(() => renderer.render(stadium(), camera())).toThrow(
			"preview transform failed",
		);
		expect(ctx.restore).toHaveBeenCalledTimes(1);
	});
});
