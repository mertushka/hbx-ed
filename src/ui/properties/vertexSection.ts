import { setSelectionTrait } from "../../core/selectionTraits.ts";
import type { StadiumObject, Vertex } from "../../types/stadium.ts";
import type { ChangeCallback } from "./inputs.ts";
import { SectionBuilder } from "./inputs.ts";

export function renderVertexSection(
	parent: HTMLElement,
	s: StadiumObject,
	i: number,
	notify: ChangeCallback,
	onDelete: () => void,
	rebuild?: ChangeCallback,
): void {
	const v = s.vertexes[i] as Vertex;
	new SectionBuilder(`Vertex #${i}`, parent)
		.num("x", v.x, (n) => {
			v.x = n;
			notify();
		})
		.num("y", v.y, (n) => {
			v.y = n;
			notify();
		})
		.num("bCoef", v.bCoef, (n) => {
			v.bCoef = n;
			notify();
		})
		.flags("cMask", v.cMask, (f) => {
			v.cMask = f;
			notify();
		})
		.flags("cGroup", v.cGroup, (f) => {
			v.cGroup = f;
			notify();
		})
		.trait("trait", v.trait, s, (t) => {
			setSelectionTrait(s, { type: "vertex", index: i }, t);
			notify();
			rebuild?.();
		})
		.button("Delete vertex", onDelete, "danger");
}
