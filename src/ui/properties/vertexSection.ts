import type { StadiumObject, Vertex } from "../../types/stadium.ts";
import type { ChangeCallback } from "./inputs.ts";
import { SectionBuilder, setOrDelete } from "./inputs.ts";

export function renderVertexSection(
	parent: HTMLElement,
	s: StadiumObject,
	i: number,
	notify: ChangeCallback,
	onDelete: () => void,
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
			setOrDelete(v, "trait", t);
			notify();
		})
		.button("Delete vertex", onDelete, "danger");
}
