import type { Joint, StadiumObject } from "../../types/stadium.ts";
import type { ChangeCallback } from "./inputs.ts";
import { SectionBuilder, setOrDelete } from "./inputs.ts";

export function renderJointSection(
	parent: HTMLElement,
	s: StadiumObject,
	i: number,
	notify: ChangeCallback,
	onDelete: () => void,
): void {
	const j = s.joints[i] as Joint;
	new SectionBuilder(`Joint #${i}`, parent)
		.num("d0", j.d0, (n) => {
			j.d0 = Math.round(n);
			notify();
		})
		.num("d1", j.d1, (n) => {
			j.d1 = Math.round(n);
			notify();
		})
		.color("color", j.color, (h) => {
			j.color = h;
			notify();
		})
		.trait("trait", j.trait, s, (t) => {
			setOrDelete(j, "trait", t);
			notify();
		})
		.button("Delete joint", onDelete, "danger");
}
