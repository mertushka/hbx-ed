import type { ObjectType, Selection, StadiumObject } from "../types/stadium.ts";

interface TraitBearingObject {
	trait?: string;
}

type TraitRecord = Record<string, unknown>;

const TRAIT_COPY_KEYS: Record<ObjectType, readonly string[]> = {
	vertex: ["bCoef", "cMask", "cGroup"],
	segment: [
		"bCoef",
		"curve",
		"curveF",
		"bias",
		"cMask",
		"cGroup",
		"vis",
		"color",
	],
	disc: [
		"speed",
		"gravity",
		"radius",
		"invMass",
		"damping",
		"color",
		"bCoef",
		"cMask",
		"cGroup",
	],
	goal: ["team"],
	plane: ["normal", "bCoef", "cMask", "cGroup"],
	joint: ["length", "strength", "color"],
};

export function getSelectionObject(
	stadium: StadiumObject,
	selection: Selection,
): TraitBearingObject | null {
	switch (selection.type) {
		case "vertex":
			return stadium.vertexes[selection.index] ?? null;
		case "segment":
			return stadium.segments[selection.index] ?? null;
		case "disc":
			return stadium.discs[selection.index] ?? null;
		case "goal":
			return stadium.goals[selection.index] ?? null;
		case "plane":
			return stadium.planes[selection.index] ?? null;
		case "joint":
			return stadium.joints[selection.index] ?? null;
	}
}

export function getSelectionTrait(
	stadium: StadiumObject,
	selection: Selection,
): string | undefined {
	return getSelectionObject(stadium, selection)?.trait;
}

export function setSelectionTrait(
	stadium: StadiumObject,
	selection: Selection,
	trait: string | undefined,
): boolean {
	return applyTraitToSelection(stadium, selection, trait);
}

export function applyTraitToSelection(
	stadium: StadiumObject,
	selection: Selection,
	trait: string | undefined,
): boolean {
	const object = getSelectionObject(stadium, selection);
	if (!object) return false;
	if (trait) {
		Object.assign(
			object,
			getTraitValuesForType(stadium, selection.type, trait) ?? {},
		);
		object.trait = trait;
	} else {
		delete object.trait;
	}
	return true;
}

export function syncTraitUsages(
	stadium: StadiumObject,
	trait: string,
	previousTrait?: TraitRecord,
): number {
	if (!stadium.traits?.[trait]) return 0;
	let count = 0;

	const syncObject = (type: ObjectType, object: TraitBearingObject): void => {
		if (object.trait !== trait) return;
		syncTraitFields(stadium, type, trait, object, previousTrait);
		count += 1;
	};

	stadium.vertexes.forEach((object) => {
		syncObject("vertex", object);
	});
	stadium.segments.forEach((object) => {
		syncObject("segment", object);
	});
	stadium.discs.forEach((object) => {
		syncObject("disc", object);
	});
	stadium.goals.forEach((object) => {
		syncObject("goal", object);
	});
	stadium.planes.forEach((object) => {
		syncObject("plane", object);
	});
	stadium.joints.forEach((object) => {
		syncObject("joint", object);
	});

	return count;
}

export function getTraitValuesForType(
	stadium: StadiumObject | null,
	type: ObjectType,
	trait: string | undefined,
): Record<string, unknown> | undefined {
	if (!stadium || !trait) return undefined;
	const source = stadium.traits?.[trait];
	if (!source) return undefined;

	const values: Record<string, unknown> = {};
	for (const key of TRAIT_COPY_KEYS[type]) {
		if (key in source) {
			values[key] = structuredClone(source[key as keyof typeof source]);
		}
	}
	return values;
}

function syncTraitFields(
	stadium: StadiumObject,
	type: ObjectType,
	trait: string,
	object: TraitBearingObject,
	previousTrait: TraitRecord | undefined,
): void {
	const source = stadium.traits?.[trait];
	if (!source) return;
	const record = object as TraitRecord;
	for (const key of TRAIT_COPY_KEYS[type]) {
		const nextHasValue = key in source;
		const previousHasValue = previousTrait ? key in previousTrait : false;
		const previousValue = previousTrait?.[key];

		if (nextHasValue) {
			if (
				!previousTrait ||
				!previousHasValue ||
				record[key] === undefined ||
				valuesEqual(record[key], previousValue)
			) {
				record[key] = structuredClone(source[key as keyof typeof source]);
			}
			continue;
		}

		if (previousHasValue && valuesEqual(record[key], previousValue)) {
			delete record[key];
		}
	}
}

function valuesEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true;
	if (Array.isArray(a) && Array.isArray(b)) {
		return (
			a.length === b.length && a.every((value, i) => valuesEqual(value, b[i]))
		);
	}
	return false;
}
