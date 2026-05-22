import { setSelectionTrait } from "../../core/selectionTraits.ts";
import type { Disc, StadiumObject } from "../../types/stadium.ts";
import type { ChangeCallback } from "./inputs.ts";
import { SectionBuilder } from "./inputs.ts";
import { vec2Number } from "./objectFieldHelpers.ts";

export function renderDiscSection(
	parent: HTMLElement,
	s: StadiumObject,
	i: number,
	notify: ChangeCallback,
	onDelete: () => void,
	rebuild?: ChangeCallback,
): void {
	const d = s.discs[i] as Disc;
	const sec = new SectionBuilder(`Disc #${i}`, parent);
	vec2Number(sec, "x", d.pos, 0, [0, 0], () => (d.pos ??= [0, 0]), notify);
	vec2Number(sec, "y", d.pos, 1, [0, 0], () => (d.pos ??= [0, 0]), notify)
		.num("radius", d.radius ?? 10, (n) => {
			d.radius = n;
			notify();
		})
		.num("invMass", d.invMass ?? 1, (n) => {
			d.invMass = n;
			notify();
		})
		.num("damping", d.damping ?? 0.99, (n) => {
			d.damping = n;
			notify();
		})
		.num("bCoef", d.bCoef ?? 0.5, (n) => {
			d.bCoef = n;
			notify();
		})
		.color("color", d.color, (h) => {
			d.color = h;
			notify();
		})
		.flags("cMask", d.cMask, (f) => {
			d.cMask = f;
			notify();
		})
		.flags("cGroup", d.cGroup, (f) => {
			d.cGroup = f;
			notify();
		})
		.trait("trait", d.trait, s, (t) => {
			setSelectionTrait(s, { type: "disc", index: i }, t);
			notify();
			rebuild?.();
		})
		.button("Delete disc", onDelete, "danger");
}
