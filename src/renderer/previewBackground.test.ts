import { describe, expect, it, vi } from "vitest";

import { Camera } from "../core/camera.ts";
import type { StadiumObject } from "../types/stadium.ts";
import { drawPreviewBackground } from "./previewBackground.ts";
import type { TexturePatterns } from "./textures.ts";

type MockStyles = {
	fillStyle?: string | CanvasGradient | CanvasPattern;
	lineDash?: number[];
	strokeStyle?: string | CanvasGradient | CanvasPattern;
};

type MockContext = CanvasRenderingContext2D & {
	styles: MockStyles;
};

function mockContext(): MockContext {
	const styles: MockStyles = {};

	return {
		arc: vi.fn(),
		arcTo: vi.fn(),
		beginPath: vi.fn(),
		closePath: vi.fn(),
		fill: vi.fn(),
		fillRect: vi.fn(),
		lineTo: vi.fn(),
		moveTo: vi.fn(),
		rect: vi.fn(),
		resetTransform: vi.fn(),
		restore: vi.fn(),
		save: vi.fn(),
		scale: vi.fn(),
		setLineDash: vi.fn((dash: number[]) => {
			styles.lineDash = dash;
		}),
		stroke: vi.fn(),
		styles,
		set fillStyle(value: string | CanvasGradient | CanvasPattern) {
			styles.fillStyle = value;
		},
		set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
			styles.strokeStyle = value;
		},
	} as unknown as MockContext;
}

function camera(): Camera {
	const cam = new Camera();
	cam.zoom = 2;
	cam.x = 5;
	cam.y = -7;
	return cam;
}

function stadium(bg?: StadiumObject["bg"]): StadiumObject {
	const s: StadiumObject = {
		name: "Preview",
		width: 100,
		height: 50,
		traits: {},
		vertexes: [],
		segments: [],
		goals: [],
		discs: [],
		planes: [],
		joints: [],
	};
	if (bg) s.bg = bg;
	return s;
}

function patterns(): TexturePatterns {
	return {
		concrete: {} as CanvasPattern,
		concrete2: {} as CanvasPattern,
		grass: {} as CanvasPattern,
	};
}

describe("drawPreviewBackground", () => {
	it("skips stadiums without a background", () => {
		const ctx = mockContext();

		drawPreviewBackground(ctx, stadium(undefined), camera(), null, {
			width: 240,
			height: 160,
		});

		expect(ctx.fill).not.toHaveBeenCalled();
		expect(ctx.fillRect).not.toHaveBeenCalled();
		expect(ctx.stroke).not.toHaveBeenCalled();
	});

	it("fills the full canvas for none backgrounds", () => {
		const ctx = mockContext();

		drawPreviewBackground(
			ctx,
			stadium({ type: "none", color: "112233" }),
			camera(),
			null,
			{ width: 240, height: 160 },
		);

		expect(ctx.save).toHaveBeenCalledOnce();
		expect(ctx.resetTransform).toHaveBeenCalledOnce();
		expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 240, 160);
		expect(ctx.restore).toHaveBeenCalledOnce();
		expect(ctx.styles.fillStyle).toBe("rgba(17,34,51,1)");
	});

	it("draws grass canvas fill, field bounds, center line, and kickoff circle", () => {
		const ctx = mockContext();

		drawPreviewBackground(
			ctx,
			stadium({
				type: "grass",
				width: 90,
				height: 45,
				kickOffRadius: 20,
				cornerRadius: 8,
				color: "718C5A",
			}),
			camera(),
			null,
			{ width: 240, height: 160 },
		);

		expect(ctx.resetTransform).toHaveBeenCalledOnce();
		expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 240, 160);
		expect(ctx.arcTo).toHaveBeenCalled();
		expect(ctx.moveTo).toHaveBeenCalledWith(0, -45);
		expect(ctx.lineTo).toHaveBeenCalledWith(0, 45);
		expect(ctx.arc).toHaveBeenCalledWith(0, 0, 20, 0, Math.PI * 2);
		expect(ctx.fill).toHaveBeenCalled();
		expect(ctx.stroke).toHaveBeenCalled();
	});

	it("draws hockey concrete fill, dashed center, and side arcs", () => {
		const ctx = mockContext();
		const cam = camera();
		const ext = Math.max(240, 160) / cam.zoom + 20000;

		drawPreviewBackground(
			ctx,
			stadium({
				type: "hockey",
				width: 100,
				height: 50,
				kickOffRadius: 25,
				cornerRadius: 10,
				goalLine: 20,
			}),
			cam,
			patterns(),
			{ width: 240, height: 160 },
		);

		expect(ctx.rect).toHaveBeenCalledWith(
			cam.x - ext,
			cam.y - ext,
			ext * 2,
			ext * 2,
		);
		expect(ctx.scale).toHaveBeenCalledWith(2, 2);
		expect(ctx.setLineDash).toHaveBeenCalledWith([7.5, 7.5]);
		expect(ctx.setLineDash).toHaveBeenCalledWith([]);
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
});
