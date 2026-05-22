import type { Selection, StadiumObject } from "../types/stadium.ts";

interface TraitBearingObject {
	trait?: string;
}

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
	const object = getSelectionObject(stadium, selection);
	if (!object) return false;
	if (trait) {
		object.trait = trait;
	} else {
		delete object.trait;
	}
	return true;
}
