import type { StadiumObject } from "../types/stadium.ts";
import { CLASSIC_STADIUM } from "./classic.ts";

export interface Template {
	id: string;
	name: string;
	description: string;
	build: (name: string) => StadiumObject;
}

/** Blank grass stadium — just boundaries, no goals. */
function buildBlank(name: string): StadiumObject {
	return {
		name,
		width: 420,
		height: 200,
		bg: {
			type: "grass",
			width: 400,
			height: 170,
			kickOffRadius: 65,
			cornerRadius: 0,
			color: "718C5A",
		},
		traits: {},
		vertexes: [],
		segments: [],
		goals: [],
		discs: [],
		planes: [
			{
				normal: [0, 1],
				dist: 85,
				bCoef: 0.2,
				cMask: ["all", "red", "blue", "ball"],
			},
			{
				normal: [0, -1],
				dist: 85,
				bCoef: 0.2,
				cMask: ["all", "red", "blue", "ball"],
			},
			{
				normal: [1, 0],
				dist: 210,
				bCoef: 0.2,
				cMask: ["all", "red", "blue", "ball"],
			},
			{
				normal: [-1, 0],
				dist: 210,
				bCoef: 0.2,
				cMask: ["all", "red", "blue", "ball"],
			},
		],
		joints: [],
		redSpawnPoints: [[80, 0]],
		blueSpawnPoints: [[-80, 0]],
		ballPhysics: {
			pos: [0, 0],
			radius: 10,
			invMass: 1,
			damping: 0.99,
			color: "FFCC00",
			bCoef: 0.5,
			cMask: ["all"],
			cGroup: ["ball", "score", "kick"],
		},
		playerPhysics: {
			radius: 15,
			bCoef: 0.5,
			invMass: 0.5,
			damping: 0.96,
			acceleration: 0.11,
			kickingAcceleration: 0.083,
			kickingDamping: 0.75,
			kickStrength: 5,
			kickback: 0,
		},
	};
}

/** Classic HaxBall stadium. */
function buildClassic(name: string): StadiumObject {
	return { ...CLASSIC_STADIUM, name };
}

/** Hockey rink — geometry aligned so visual goal arcs match collision goal boxes. */
function buildHockey(name: string): StadiumObject {
	return {
		name: name,

		width: 420,
		height: 204,

		spawnDistance: 180,

		bg: {
			type: "hockey",
			width: 398,
			height: 182,
			kickOffRadius: 75,
			cornerRadius: 100,
			goalLine: 120,
		},

		vertexes: [
			{ x: 0, y: 204, trait: "kickOffBarrier" },
			{ x: 0, y: 75, trait: "kickOffBarrier" },
			{ x: 0, y: -75, trait: "kickOffBarrier" },
			{ x: 0, y: -204, trait: "kickOffBarrier" },

			{ x: -288, y: -68, trait: "goalNet" },
			{ x: -308, y: -44, trait: "goalNet" },
			{ x: -308, y: 44, trait: "goalNet" },
			{ x: -288, y: 68, trait: "goalNet" },

			{ x: 288, y: -68, trait: "goalNet" },
			{ x: 308, y: -44, trait: "goalNet" },
			{ x: 308, y: 44, trait: "goalNet" },
			{ x: 288, y: 68, trait: "goalNet" },

			{ x: -295, y: -182, trait: "ballArea" },
			{ x: -398, y: -95, trait: "ballArea" },
			{ x: -398, y: 95, trait: "ballArea" },
			{ x: -295, y: 182, trait: "ballArea" },

			{ x: 295, y: -182, trait: "ballArea" },
			{ x: 398, y: -95, trait: "ballArea" },
			{ x: 398, y: 95, trait: "ballArea" },
			{ x: 295, y: 182, trait: "ballArea" },
		],

		segments: [
			{ v0: 0, v1: 1, trait: "kickOffBarrier" },
			{ v0: 1, v1: 2, trait: "kickOffBarrier", curve: 180, cGroup: ["blueKO"] },
			{ v0: 1, v1: 2, trait: "kickOffBarrier", curve: -180, cGroup: ["redKO"] },
			{ v0: 2, v1: 3, trait: "kickOffBarrier" },

			{ v0: 4, v1: 5, trait: "goalNet", curve: -90 },
			{ v0: 5, v1: 6, trait: "goalNet" },
			{ v0: 6, v1: 7, trait: "goalNet", curve: -90 },

			{ v0: 8, v1: 9, trait: "goalNet", curve: 90 },
			{ v0: 9, v1: 10, trait: "goalNet" },
			{ v0: 10, v1: 11, trait: "goalNet", curve: 90 },

			{ v0: 12, v1: 13, trait: "ballArea", curve: -90 },
			{ v0: 14, v1: 15, trait: "ballArea", curve: -90 },
			{ v0: 16, v1: 17, trait: "ballArea", curve: 90 },
			{ v0: 18, v1: 19, trait: "ballArea", curve: 90 },
		],

		goals: [
			{ p0: [-278, 68], p1: [-278, -68], team: "red" },
			{ p0: [278, 68], p1: [278, -68], team: "blue" },
		],

		discs: [
			{ pos: [-278, 68], trait: "goalPost", color: "FFCCCC" },
			{ pos: [-278, -68], trait: "goalPost", color: "FFCCCC" },
			{ pos: [278, 68], trait: "goalPost", color: "CCCCFF" },
			{ pos: [278, -68], trait: "goalPost", color: "CCCCFF" },
		],

		planes: [
			{ normal: [0, 1], dist: -182, trait: "ballArea" },
			{ normal: [0, -1], dist: -182, trait: "ballArea" },
			{ normal: [1, 0], dist: -398, trait: "ballArea" },
			{ normal: [-1, 0], dist: -398, trait: "ballArea" },
			{ normal: [0, 1], dist: -204, bCoef: 0.1 },
			{ normal: [0, -1], dist: -204, bCoef: 0.1 },
			{ normal: [1, 0], dist: -420, bCoef: 0.1 },
			{ normal: [-1, 0], dist: -420, bCoef: 0.1 },
		],

		joints: [],

		traits: {
			ballArea: { vis: false, bCoef: 1, cMask: ["ball"] },
			goalPost: { radius: 8, invMass: 0, bCoef: 0.5 },
			goalNet: { vis: true, bCoef: 0.1, cMask: ["all"] },
			kickOffBarrier: {
				vis: false,
				bCoef: 0.1,
				cGroup: ["redKO", "blueKO"],
				cMask: ["red", "blue"],
			},
		},
	};
}

export const TEMPLATES: Template[] = [
	{
		id: "blank",
		name: "Blank Grass",
		description: "Empty grass field with boundary planes. Build from scratch.",
		build: buildBlank,
	},
	{
		id: "classic",
		name: "Classic",
		description: "The default HaxBall stadium.",
		build: buildClassic,
	},
	{
		id: "hockey",
		name: "Hockey",
		description: "The default Haxball hockey stadium.",
		build: buildHockey,
	},
	{
		id: "empty",
		name: "Empty (no bg)",
		description: "Completely empty stadium. No background, no planes.",
		build: (name) => ({
			name,
			width: 420,
			height: 200,
			bg: { type: "none" },
			traits: {},
			vertexes: [],
			segments: [],
			goals: [],
			discs: [],
			planes: [],
			joints: [],
			redSpawnPoints: [],
			blueSpawnPoints: [],
		}),
	},
];
