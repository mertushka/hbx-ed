import type { ObjectType, StadiumObject } from "../types/stadium.ts";

export type ToolDefaultTraits = Partial<Record<ObjectType, string>>;

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
