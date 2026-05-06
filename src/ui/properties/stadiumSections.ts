import type { StadiumObject } from "../../types/stadium.ts";
import { renderBasicStadiumSection } from "./basicStadiumSection.ts";
import type { ChangeCallback } from "./inputs.ts";
import {
	renderBallPhysicsSection,
	renderPlayerPhysicsSection,
} from "./physicsSections.ts";
import { renderTraitsSection } from "./traitSections.ts";

export { renderBasicStadiumSection } from "./basicStadiumSection.ts";
export {
	renderBallPhysicsSection,
	renderPlayerPhysicsSection,
} from "./physicsSections.ts";
export { findTraitUsages, renderTraitsSection } from "./traitSections.ts";

export interface StadiumSectionOptions {
	parent: HTMLElement;
	stadium: StadiumObject;
	notify: ChangeCallback;
	rebuild: () => void;
}

export function renderStadiumSection({
	parent,
	stadium: s,
	notify,
	rebuild,
}: StadiumSectionOptions): void {
	renderBasicStadiumSection(parent, s, notify);
	renderBallPhysicsSection(parent, s, notify, rebuild);
	renderPlayerPhysicsSection(parent, s, notify);
	renderTraitsSection(parent, s, notify, rebuild);
}
