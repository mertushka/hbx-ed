import { describe, expect, it } from "vitest";

import { CLASSIC_STADIUM } from "./classic.ts";
import { TEMPLATES } from "./templates.ts";

function template(id: string) {
	const tpl = TEMPLATES.find((item) => item.id === id);
	if (!tpl) throw new Error(`Expected template ${id}`);
	return tpl;
}

describe("templates", () => {
	it("exposes the expected template order", () => {
		expect(TEMPLATES.map((item) => item.id)).toEqual([
			"blank",
			"classic",
			"hockey",
			"empty",
		]);
	});

	it("builds a blank grass stadium with boundary planes and physics defaults", () => {
		const stadium = template("blank").build("Blank Test");

		expect(stadium).toMatchObject({
			name: "Blank Test",
			width: 420,
			height: 200,
			bg: {
				type: "grass",
				width: 400,
				height: 170,
				color: "718C5A",
			},
			ballPhysics: {
				pos: [0, 0],
				color: "FFCC00",
				cGroup: ["ball", "score", "kick"],
			},
			playerPhysics: {
				radius: 15,
				kickStrength: 5,
			},
		});
		expect(stadium.planes).toHaveLength(4);
		expect(stadium.redSpawnPoints).toEqual([[80, 0]]);
		expect(stadium.blueSpawnPoints).toEqual([[-80, 0]]);
	});

	it("builds a renamed classic stadium without mutating the source name", () => {
		const stadium = template("classic").build("Classic Copy");

		expect(stadium.name).toBe("Classic Copy");
		expect(stadium.vertexes).toHaveLength(CLASSIC_STADIUM.vertexes.length);
		expect(CLASSIC_STADIUM.name).toBe("Classic");
	});

	it("builds the hockey template with goal nets, posts, and hockey background", () => {
		const stadium = template("hockey").build("Hockey Test");

		expect(stadium.name).toBe("Hockey Test");
		expect(stadium.bg).toMatchObject({
			type: "hockey",
			goalLine: 120,
			cornerRadius: 100,
		});
		expect(stadium.vertexes).toHaveLength(20);
		expect(stadium.segments.some((seg) => seg.curve === 180)).toBe(true);
		expect(stadium.goals).toEqual([
			{ p0: [-278, 68], p1: [-278, -68], team: "red" },
			{ p0: [278, 68], p1: [278, -68], team: "blue" },
		]);
		expect(stadium.traits?.goalPost).toMatchObject({ radius: 8, invMass: 0 });
	});

	it("builds the empty template with no geometry and no background", () => {
		const stadium = template("empty").build("Empty Test");

		expect(stadium).toMatchObject({
			name: "Empty Test",
			bg: { type: "none" },
			vertexes: [],
			segments: [],
			goals: [],
			discs: [],
			planes: [],
			joints: [],
			redSpawnPoints: [],
			blueSpawnPoints: [],
		});
	});
});
