import { describe, expect, it, vi } from "vitest";

import type { Disc, StadiumObject, Vertex } from "../types/stadium.ts";
import {
	drawPreviewDisc,
	drawPreviewJoint,
	drawPreviewSegment,
	drawPreviewSpawnPoints,
	toPreviewCssColor,
} from "./previewPrimitives.ts";

type MockStyles = {
	fillStyle?: string | CanvasGradient | CanvasPattern;
	font?: string;
	lineWidth?: number;
	strokeStyle?: string | CanvasGradient | CanvasPattern;
	textAlign?: CanvasTextAlign;
	textBaseline?: CanvasTextBaseline;
};

type MockContext = CanvasRenderingContext2D & {
	styles: MockStyles;
};

function mockContext(): MockContext {
	const styles: MockStyles = {};

	return {
		arc: vi.fn(),
		beginPath: vi.fn(),
		fill: vi.fn(),
		fillText: vi.fn(),
		lineTo: vi.fn(),
		moveTo: vi.fn(),
		restore: vi.fn(),
		save: vi.fn(),
		stroke: vi.fn(),
		styles,
		set fillStyle(value: string | CanvasGradient | CanvasPattern) {
			styles.fillStyle = value;
		},
		set font(value: string) {
			styles.font = value;
		},
		set lineWidth(value: number) {
			styles.lineWidth = value;
		},
		set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
			styles.strokeStyle = value;
		},
		set textAlign(value: CanvasTextAlign) {
			styles.textAlign = value;
		},
		set textBaseline(value: CanvasTextBaseline) {
			styles.textBaseline = value;
		},
	} as unknown as MockContext;
}

const verts: Vertex[] = [
	{ x: 0, y: 0 },
	{ x: 10, y: 0 },
];

describe("preview primitive drawing", () => {
	it("converts game color values to preview CSS colors", () => {
		expect(toPreviewCssColor(null)).toBeNull();
		expect(toPreviewCssColor("transparent")).toBeNull();
		expect(toPreviewCssColor(-1)).toBeNull();
		expect(toPreviewCssColor([1, 2, 3])).toBe("rgba(1,2,3,1)");
		expect(toPreviewCssColor(0x123456)).toBe("rgba(18,52,86,1)");
		expect(toPreviewCssColor("ABCDEF")).toBe("rgba(171,205,239,1)");
		expect(toPreviewCssColor("red")).toBeNull();
	});

	it("draws visible straight segments and skips invisible ones", () => {
		const ctx = mockContext();

		drawPreviewSegment(ctx, { v0: 0, v1: 1, color: "FFFFFF" }, verts, {});

		expect(ctx.beginPath).toHaveBeenCalledOnce();
		expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
		expect(ctx.lineTo).toHaveBeenCalledWith(10, 0);
		expect(ctx.styles.strokeStyle).toBe("rgba(255,255,255,1)");
		expect(ctx.stroke).toHaveBeenCalledOnce();

		const invisibleCtx = mockContext();
		drawPreviewSegment(invisibleCtx, { v0: 0, v1: 1, vis: false }, verts, {});

		expect(invisibleCtx.beginPath).not.toHaveBeenCalled();

		const transparentCtx = mockContext();
		drawPreviewSegment(
			transparentCtx,
			{ v0: 0, v1: 1, color: "transparent" },
			verts,
			{},
		);

		expect(transparentCtx.beginPath).not.toHaveBeenCalled();

		const missingVertexCtx = mockContext();
		drawPreviewSegment(
			missingVertexCtx,
			{ v0: 0, v1: 99, color: "FFFFFF" },
			verts,
			{},
		);

		expect(missingVertexCtx.beginPath).not.toHaveBeenCalled();
	});

	it("draws curved segments through resolved traits", () => {
		const ctx = mockContext();
		const traits: StadiumObject["traits"] = {
			curveTrait: { color: "00FF00", curve: -90 },
		};

		drawPreviewSegment(
			ctx,
			{ v0: 0, v1: 1, trait: "curveTrait" },
			verts,
			traits,
		);

		const arcCall = vi.mocked(ctx.arc).mock.calls[0];
		expect(arcCall).toBeDefined();
		expect(arcCall?.[5]).toBe(true);
		expect(ctx.styles.strokeStyle).toBe("rgba(0,255,0,1)");
	});

	it("draws joints with game defaults and skips transparent joints", () => {
		const discs: Disc[] = [{ pos: [1, 2] }, { pos: [3, 4] }];
		const transparentCtx = mockContext();

		drawPreviewJoint(
			transparentCtx,
			{ d0: 0, d1: 1, color: "transparent" },
			discs,
		);

		expect(transparentCtx.beginPath).not.toHaveBeenCalled();

		const ctx = mockContext();
		drawPreviewJoint(ctx, { d0: 0, d1: 1 }, discs);

		expect(ctx.moveTo).toHaveBeenCalledWith(1, 2);
		expect(ctx.lineTo).toHaveBeenCalledWith(3, 4);
		expect(ctx.styles.strokeStyle).toBe("rgba(0,0,0,1)");
		expect(ctx.stroke).toHaveBeenCalledOnce();

		const defaultPosCtx = mockContext();
		drawPreviewJoint(defaultPosCtx, { d0: 0, d1: 1 }, [{}, {}]);

		expect(defaultPosCtx.moveTo).toHaveBeenCalledWith(0, 0);
		expect(defaultPosCtx.lineTo).toHaveBeenCalledWith(0, 0);

		const missingDiscCtx = mockContext();
		drawPreviewJoint(missingDiscCtx, { d0: 0, d1: 2 }, discs);

		expect(missingDiscCtx.beginPath).not.toHaveBeenCalled();
	});

	it("draws discs through resolved traits and respects transparent/negative guards", () => {
		const traits: StadiumObject["traits"] = {
			ball: { color: "FF0000", radius: 12 },
		};
		const ctx = mockContext();

		drawPreviewDisc(ctx, { pos: [5, 6], trait: "ball" }, traits);

		expect(ctx.arc).toHaveBeenCalledWith(5, 6, 12, 0, Math.PI * 2, false);
		expect(ctx.styles.fillStyle).toBe("rgba(255,0,0,1)");
		expect(ctx.styles.strokeStyle).toBe("black");
		expect(ctx.fill).toHaveBeenCalledOnce();
		expect(ctx.stroke).toHaveBeenCalledOnce();

		const transparentCtx = mockContext();
		drawPreviewDisc(transparentCtx, { pos: [5, 6], color: "transparent" }, {});

		expect(transparentCtx.fill).not.toHaveBeenCalled();
		expect(transparentCtx.stroke).toHaveBeenCalledOnce();

		const negativeCtx = mockContext();
		drawPreviewDisc(negativeCtx, { radius: -1 }, {});

		expect(negativeCtx.beginPath).not.toHaveBeenCalled();
	});

	it("draws preview spawn overlays with zoom-scaled screen constants", () => {
		const ctx = mockContext();

		drawPreviewSpawnPoints(ctx, [[10, 20]], "#ff4d6d", 2);

		expect(ctx.arc).toHaveBeenCalledWith(10, 20, 4, 0, Math.PI * 2);
		expect(ctx.styles.font).toBe("bold 4.5px sans-serif");
		expect(ctx.styles.lineWidth).toBe(0.75);
		expect(ctx.fillText).toHaveBeenCalledWith("0", 10, 20);
		expect(ctx.save).toHaveBeenCalledOnce();
		expect(ctx.restore).toHaveBeenCalledOnce();
	});
});
