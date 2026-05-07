import { describe, expect, it, vi } from "vitest";

import { Camera } from "../core/camera.ts";
import type { StadiumObject, Vertex } from "../types/stadium.ts";
import {
	drawEditorCurveHandle,
	drawEditorDisc,
	drawEditorGoal,
	drawEditorJoint,
	drawEditorPlane,
	drawEditorSegment,
	drawEditorVertex,
} from "./primitives.ts";

type MockStyles = {
	fillStyle?: string | CanvasGradient | CanvasPattern;
	lineDash?: number[];
	lineWidth?: number;
	strokeStyle?: string | CanvasGradient | CanvasPattern;
};

type MockContext = CanvasRenderingContext2D & {
	styles: MockStyles;
};

function mockContext(): MockContext {
	const styles: MockStyles = {};

	return {
		arc: vi.fn(),
		beginPath: vi.fn(),
		closePath: vi.fn(),
		fill: vi.fn(),
		lineTo: vi.fn(),
		moveTo: vi.fn(),
		setLineDash: vi.fn((dash: number[]) => {
			styles.lineDash = dash;
		}),
		stroke: vi.fn(),
		styles,
		set fillStyle(value: string | CanvasGradient | CanvasPattern) {
			styles.fillStyle = value;
		},
		set lineWidth(value: number) {
			styles.lineWidth = value;
		},
		set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
			styles.strokeStyle = value;
		},
	} as unknown as MockContext;
}

function camera(): Camera {
	const cam = new Camera();
	cam.zoom = 2;
	return cam;
}

const verts: Vertex[] = [
	{ x: 0, y: 0 },
	{ x: 10, y: 0 },
];

describe("editor primitive drawing", () => {
	it("draws selected vertices with zoom-scaled handles", () => {
		const ctx = mockContext();

		drawEditorVertex(ctx, { x: 4, y: 8 }, true, 2);

		expect(ctx.arc).toHaveBeenCalledWith(4, 8, 2.5, 0, Math.PI * 2);
		expect(ctx.styles.fillStyle).toBe("#f5a623");
		expect(ctx.styles.strokeStyle).toBe("#000");
		expect(ctx.styles.lineWidth).toBe(0.5);
		expect(ctx.fill).toHaveBeenCalled();
		expect(ctx.stroke).toHaveBeenCalled();
	});

	it("draws straight and invisible segments with the editor styling branches", () => {
		const straightCtx = mockContext();

		drawEditorSegment(
			straightCtx,
			{ v0: 0, v1: 1, color: "FFFFFF" },
			verts,
			{},
			false,
			2,
		);

		expect(straightCtx.moveTo).toHaveBeenCalledWith(0, 0);
		expect(straightCtx.lineTo).toHaveBeenCalledWith(10, 0);
		expect(straightCtx.styles.strokeStyle).toBe("rgba(255,255,255,1)");
		expect(straightCtx.styles.lineWidth).toBe(1.5);

		const invisibleCtx = mockContext();
		drawEditorSegment(
			invisibleCtx,
			{ v0: 0, v1: 1, vis: false },
			verts,
			{},
			false,
			2,
		);

		expect(invisibleCtx.setLineDash).toHaveBeenCalledWith([2, 2]);
		expect(invisibleCtx.setLineDash).toHaveBeenCalledWith([]);
		expect(invisibleCtx.styles.strokeStyle).toBe("rgba(255,255,255,0.14)");
		expect(invisibleCtx.styles.lineWidth).toBe(0.5);

		const selectedInvisibleCtx = mockContext();
		drawEditorSegment(
			selectedInvisibleCtx,
			{ v0: 0, v1: 1, vis: false },
			verts,
			{},
			true,
			2,
		);
		expect(selectedInvisibleCtx.styles.strokeStyle).toBe("#f5a623");
		expect(selectedInvisibleCtx.styles.lineWidth).toBe(2);
	});

	it("skips segments with missing endpoint references", () => {
		const ctx = mockContext();

		drawEditorSegment(ctx, { v0: 0, v1: 9 }, verts, {}, false, 2);

		expect(ctx.moveTo).not.toHaveBeenCalled();
		expect(ctx.stroke).not.toHaveBeenCalled();
	});

	it("draws curved segments and preserves negative-curve direction", () => {
		const ctx = mockContext();

		drawEditorSegment(ctx, { v0: 0, v1: 1, curve: -90 }, verts, {}, false, 1);

		const arcCall = vi.mocked(ctx.arc).mock.calls[0];
		expect(arcCall).toBeDefined();
		expect(arcCall?.[5]).toBe(true);
		expect(ctx.stroke).toHaveBeenCalled();
	});

	it("draws discs through resolved traits", () => {
		const ctx = mockContext();
		const traits: StadiumObject["traits"] = {
			ball: { color: "00FF00", radius: 12 },
		};

		drawEditorDisc(ctx, { pos: [3, 4], trait: "ball" }, traits, false, 2);

		expect(ctx.arc).toHaveBeenCalledWith(3, 4, 12, 0, Math.PI * 2);
		expect(ctx.styles.fillStyle).toBe("rgba(0,255,0,1)");
		expect(ctx.styles.strokeStyle).toBe("#000000");
		expect(ctx.styles.lineWidth).toBe(1);
	});

	it("still strokes transparent discs without filling them", () => {
		const ctx = mockContext();

		drawEditorDisc(ctx, { color: "transparent" }, {}, true, 2);

		expect(ctx.arc).toHaveBeenCalledWith(0, 0, 10, 0, Math.PI * 2);
		expect(ctx.fill).not.toHaveBeenCalled();
		expect(ctx.styles.strokeStyle).toBe("#f5a623");
	});

	it("draws goals with team colors and selection highlight", () => {
		const redCtx = mockContext();

		drawEditorGoal(redCtx, { p0: [1, 2], p1: [3, 4], team: "red" }, false, 2);

		expect(redCtx.moveTo).toHaveBeenCalledWith(1, 2);
		expect(redCtx.lineTo).toHaveBeenCalledWith(3, 4);
		expect(redCtx.styles.strokeStyle).toBe("#ff4d6d");
		expect(redCtx.styles.lineWidth).toBe(1.25);

		const selectedCtx = mockContext();
		drawEditorGoal(selectedCtx, {}, true, 2);

		expect(selectedCtx.styles.strokeStyle).toBe("#f5a623");
		expect(selectedCtx.styles.lineWidth).toBe(2);

		const blueCtx = mockContext();
		drawEditorGoal(blueCtx, { p0: [1, 2], p1: [3, 4], team: "blue" }, false, 2);
		expect(blueCtx.styles.strokeStyle).toBe("#4d9eff");
	});

	it("draws planes using viewport-scaled extents and normal arrows", () => {
		const ctx = mockContext();

		drawEditorPlane(ctx, { normal: [0, 1], dist: 10 }, false, camera(), {
			width: 200,
			height: 100,
		});

		expect(ctx.moveTo).toHaveBeenCalledWith(-100, 10);
		expect(ctx.lineTo).toHaveBeenCalledWith(100, 10);
		expect(ctx.setLineDash).toHaveBeenCalledWith([4, 3]);
		expect(ctx.setLineDash).toHaveBeenCalledWith([]);
		expect(ctx.moveTo).toHaveBeenCalledWith(0, 10);
		expect(ctx.lineTo).toHaveBeenCalledWith(0, 30);
	});

	it("draws joints only when both referenced discs exist", () => {
		const missingCtx = mockContext();

		drawEditorJoint(missingCtx, { d0: 0, d1: 2 }, [{ pos: [1, 2] }], false, 2);

		expect(missingCtx.beginPath).not.toHaveBeenCalled();

		const ctx = mockContext();
		drawEditorJoint(
			ctx,
			{ d0: 0, d1: 1, color: "123456" },
			[{ pos: [1, 2] }, { pos: [3, 4] }],
			false,
			2,
		);

		expect(ctx.moveTo).toHaveBeenCalledWith(1, 2);
		expect(ctx.lineTo).toHaveBeenCalledWith(3, 4);
		expect(ctx.styles.strokeStyle).toBe("rgba(18,52,86,1)");
		expect(ctx.styles.lineWidth).toBe(0.5);
	});

	it("draws straight and curved segment handles", () => {
		const straightCtx = mockContext();

		drawEditorCurveHandle(straightCtx, { v0: 0, v1: 1 }, verts, 2);

		expect(straightCtx.arc).toHaveBeenCalledWith(5, 0, 2, 0, Math.PI * 2);
		expect(straightCtx.styles.fillStyle).toBe("rgba(245,166,35,0.55)");

		const curvedCtx = mockContext();
		drawEditorCurveHandle(curvedCtx, { v0: 0, v1: 1, curve: 90 }, verts, 2);

		expect(curvedCtx.setLineDash).toHaveBeenCalledWith([1.5, 1.5]);
		expect(curvedCtx.setLineDash).toHaveBeenCalledWith([]);
		expect(curvedCtx.closePath).toHaveBeenCalled();
		expect(curvedCtx.styles.fillStyle).toBe("rgba(245,166,35,0.9)");

		const negativeCtx = mockContext();
		drawEditorCurveHandle(negativeCtx, { v0: 0, v1: 1, curve: -90 }, verts, 2);

		expect(negativeCtx.setLineDash).toHaveBeenCalledWith([1.5, 1.5]);
		expect(negativeCtx.closePath).toHaveBeenCalled();
	});
});
