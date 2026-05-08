import { describe, expect, it } from "vitest";

import { Camera } from "../core/camera.ts";
import type { StadiumObject } from "../types/stadium.ts";
import {
	revealSelection,
	selectionFocusPoint,
	selectionRevealTarget,
} from "./selectionReveal.ts";

function stadium(overrides: Partial<StadiumObject> = {}): StadiumObject {
	return {
		name: "Reveal Test",
		width: 100,
		height: 50,
		vertexes: [],
		segments: [],
		goals: [],
		discs: [],
		planes: [],
		joints: [],
		...overrides,
	};
}

describe("selectionFocusPoint", () => {
	it("finds a representative point for each object type", () => {
		const s = stadium({
			vertexes: [
				{ x: 10, y: 20 },
				{ x: 30, y: 60 },
			],
			segments: [{ v0: 0, v1: 1 }],
			goals: [{ p0: [100, 0], p1: [100, 40], team: "red" }],
			discs: [{ pos: [4, 8] }, { pos: [24, 28] }],
			planes: [{ normal: [1, 0], dist: 75 }],
			joints: [{ d0: 0, d1: 1 }],
		});

		expect(selectionFocusPoint(s, { type: "vertex", index: 0 })).toEqual({
			x: 10,
			y: 20,
		});
		expect(selectionFocusPoint(s, { type: "segment", index: 0 })).toEqual({
			x: 20,
			y: 40,
		});
		expect(selectionFocusPoint(s, { type: "goal", index: 0 })).toEqual({
			x: 100,
			y: 20,
		});
		expect(selectionFocusPoint(s, { type: "disc", index: 0 })).toEqual({
			x: 4,
			y: 8,
		});
		expect(selectionFocusPoint(s, { type: "plane", index: 0 })).toEqual({
			x: 75,
			y: 0,
		});
		expect(selectionFocusPoint(s, { type: "joint", index: 0 })).toEqual({
			x: 14,
			y: 18,
		});
	});

	it("uses safe default points for optional coordinates", () => {
		const s = stadium({
			goals: [{ team: "blue" }],
			discs: [{}],
			planes: [{}],
		});

		expect(selectionFocusPoint(s, { type: "goal", index: 0 })).toEqual({
			x: 0,
			y: 0,
		});
		expect(selectionFocusPoint(s, { type: "disc", index: 0 })).toEqual({
			x: 0,
			y: 0,
		});
		expect(selectionFocusPoint(s, { type: "plane", index: 0 })).toEqual({
			x: 0,
			y: 0,
		});
	});

	it("returns null for missing objects or missing references", () => {
		const s = stadium({
			vertexes: [{ x: 0, y: 0 }],
			segments: [{ v0: 0, v1: 9 }],
			discs: [{ pos: [0, 0] }],
			joints: [{ d0: 0, d1: 9 }],
		});

		expect(selectionFocusPoint(s, { type: "vertex", index: 9 })).toBeNull();
		expect(selectionFocusPoint(s, { type: "segment", index: 0 })).toBeNull();
		expect(selectionFocusPoint(s, { type: "joint", index: 0 })).toBeNull();
	});
});

describe("revealSelection", () => {
	it("returns the target point only when the selected object is offscreen", () => {
		const camera = new Camera();
		const s = stadium({ vertexes: [{ x: 1000, y: -500 }] });

		expect(
			selectionRevealTarget(camera, s, { type: "vertex", index: 0 }, 800, 400),
		).toEqual({ x: 1000, y: -500 });

		camera.x = 1000;
		camera.y = -500;
		expect(
			selectionRevealTarget(camera, s, { type: "vertex", index: 0 }, 800, 400),
		).toBeNull();
	});

	it("leaves the camera alone when the selected object is already visible", () => {
		const camera = new Camera();
		const s = stadium({ vertexes: [{ x: 10, y: 20 }] });

		expect(
			revealSelection(camera, s, { type: "vertex", index: 0 }, 800, 400),
		).toBe(false);
		expect(camera.x).toBe(0);
		expect(camera.y).toBe(0);
	});

	it("centers the camera on offscreen selections without changing zoom", () => {
		const camera = new Camera();
		camera.zoom = 2;
		const s = stadium({ vertexes: [{ x: 1000, y: -500 }] });

		expect(
			revealSelection(camera, s, { type: "vertex", index: 0 }, 800, 400),
		).toBe(true);
		expect(camera.x).toBe(1000);
		expect(camera.y).toBe(-500);
		expect(camera.zoom).toBe(2);
	});

	it("does nothing when there is no selected stadium object to reveal", () => {
		const camera = new Camera();

		expect(
			revealSelection(camera, null, { type: "vertex", index: 0 }, 800, 400),
		).toBe(false);
		expect(revealSelection(camera, stadium(), null, 800, 400)).toBe(false);
		expect(
			revealSelection(
				camera,
				stadium({ vertexes: [] }),
				{ type: "vertex", index: 0 },
				800,
				400,
			),
		).toBe(false);
		expect(camera.x).toBe(0);
		expect(camera.y).toBe(0);
	});
});
