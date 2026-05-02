import type { TraitMap } from "../types/stadium.ts";

/** Merge a stadium trait onto an object (trait values are defaults, object values win). */
export function resolveTraits<T extends { trait?: string }>(
	obj: T,
	traits: TraitMap | undefined,
): T {
	if (!obj.trait || !traits) return obj;
	const traitValues = traits[obj.trait];
	if (!traitValues) return obj;
	return { ...traitValues, ...obj } as T;
}
