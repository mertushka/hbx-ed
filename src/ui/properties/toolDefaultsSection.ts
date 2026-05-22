import type { ObjectType, StadiumObject } from "../../types/stadium.ts";
import { OBJECT_TYPES } from "../../types/stadium.ts";
import { SectionBuilder } from "./inputs.ts";

const TOOL_LABELS: Record<ObjectType, string> = {
	vertex: "vertex trait",
	segment: "segment trait",
	disc: "disc trait",
	goal: "goal trait",
	plane: "plane trait",
	joint: "joint trait",
};

export interface ToolDefaultsSectionOptions {
	parent: HTMLElement;
	stadium: StadiumObject;
	getDefaultTrait: (type: ObjectType) => string | undefined;
	setDefaultTrait: (type: ObjectType, trait: string | undefined) => void;
}

export function renderToolDefaultsSection({
	parent,
	stadium,
	getDefaultTrait,
	setDefaultTrait,
}: ToolDefaultsSectionOptions): void {
	const section = new SectionBuilder("Tool Defaults", parent);
	for (const type of OBJECT_TYPES) {
		section.trait(
			TOOL_LABELS[type],
			getDefaultTrait(type),
			stadium,
			(trait) => {
				setDefaultTrait(type, trait);
			},
		);
	}
}
