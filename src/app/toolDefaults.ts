import { getTraitValuesForType } from "../core/selectionTraits.ts";
import type {
	Disc,
	Goal,
	Joint,
	ObjectType,
	Plane,
	Segment,
	Selection,
	StadiumObject,
	Vertex,
} from "../types/stadium.ts";

export type ToolDefaultTraits = Partial<Record<ObjectType, string>>;

export interface ToolObjectDefaultMap {
	vertex: Partial<Omit<Vertex, "x" | "y">>;
	segment: Partial<Omit<Segment, "v0" | "v1">>;
	disc: Partial<Omit<Disc, "pos">>;
	goal: Partial<Omit<Goal, "p0" | "p1">>;
	plane: Partial<Omit<Plane, "dist">>;
	joint: Partial<Omit<Joint, "d0" | "d1">>;
}

export type ToolObjectDefault<T extends ObjectType = ObjectType> =
	ToolObjectDefaultMap[T];
export type ToolObjectDefaults = Partial<ToolObjectDefaultMap>;

export function getValidToolDefaultTrait(
	stadium: StadiumObject | null,
	defaults: ToolDefaultTraits,
	type: ObjectType,
): string | undefined {
	const trait = defaults[type];
	if (!trait || !stadium?.traits?.[trait]) return undefined;
	return trait;
}

export function setToolDefaultTrait(
	defaults: ToolDefaultTraits,
	type: ObjectType,
	trait: string | undefined,
): void {
	if (trait) {
		defaults[type] = trait;
		return;
	}
	delete defaults[type];
}

export function getValidToolObjectDefault<T extends ObjectType>(
	stadium: StadiumObject | null,
	defaults: ToolObjectDefaults,
	traits: ToolDefaultTraits,
	type: T,
): ToolObjectDefault<T> | undefined {
	const objectDefault = defaults[type];
	const trait = getValidToolDefaultTrait(stadium, traits, type);
	if (!objectDefault && !trait) return undefined;

	const traitValues = trait ? getTraitValuesForType(stadium, type, trait) : {};
	const objectValues = structuredClone(objectDefault ?? {}) as Record<
		string,
		unknown
	>;
	const objectMatchesTrait =
		trait !== undefined && objectValues.trait === trait;
	const next = objectMatchesTrait
		? { ...traitValues, ...objectValues }
		: { ...objectValues, ...traitValues };
	if (trait) {
		next.trait = trait;
	} else {
		delete next.trait;
	}
	return next as ToolObjectDefault<T>;
}

export function setToolObjectDefault<T extends ObjectType>(
	defaults: ToolObjectDefaults,
	type: T,
	value: ToolObjectDefault<T> | undefined,
): void {
	if (value && Object.keys(value).length > 0) {
		defaults[type] = structuredClone(value) as ToolObjectDefaultMap[T];
		return;
	}
	delete defaults[type];
}

export function extractToolObjectDefault(
	stadium: StadiumObject,
	selection: Selection,
): ToolObjectDefault | null {
	switch (selection.type) {
		case "vertex": {
			const object = stadium.vertexes[selection.index];
			if (!object) return null;
			const { x: _x, y: _y, ...defaults } = object;
			return defaults;
		}
		case "segment": {
			const object = stadium.segments[selection.index];
			if (!object) return null;
			const { v0: _v0, v1: _v1, ...defaults } = object;
			return defaults;
		}
		case "disc": {
			const object = stadium.discs[selection.index];
			if (!object) return null;
			const { pos: _pos, ...defaults } = object;
			return defaults;
		}
		case "goal": {
			const object = stadium.goals[selection.index];
			if (!object) return null;
			const { p0: _p0, p1: _p1, ...defaults } = object;
			return defaults;
		}
		case "plane": {
			const object = stadium.planes[selection.index];
			if (!object) return null;
			const { dist: _dist, ...defaults } = object;
			return defaults;
		}
		case "joint": {
			const object = stadium.joints[selection.index];
			if (!object) return null;
			const { d0: _d0, d1: _d1, ...defaults } = object;
			return defaults;
		}
	}
}
