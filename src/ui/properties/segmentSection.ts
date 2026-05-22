import { setSelectionTrait } from "../../core/selectionTraits.ts";
import type { Segment, StadiumObject } from "../../types/stadium.ts";
import type { ChangeCallback } from "./inputs.ts";
import { SectionBuilder } from "./inputs.ts";

export function renderSegmentSection(
	parent: HTMLElement,
	s: StadiumObject,
	i: number,
	notify: ChangeCallback,
	onDelete: () => void,
	rebuild?: ChangeCallback,
): void {
	const seg = s.segments[i] as Segment;
	new SectionBuilder(`Segment #${i}`, parent)
		.num("v0", seg.v0, (n) => {
			seg.v0 = Math.round(n);
			notify();
		})
		.num("v1", seg.v1, (n) => {
			seg.v1 = Math.round(n);
			notify();
		})
		.num("curve \u00b0", seg.curve ?? 0, (n) => {
			seg.curve = n;
			delete seg.curveF;
			notify();
		})
		.color("color", seg.color, (h) => {
			seg.color = h;
			notify();
		})
		.bool("visible", seg.vis !== false, (b) => {
			seg.vis = b;
			notify();
		})
		.num("bCoef", seg.bCoef, (n) => {
			seg.bCoef = n;
			notify();
		})
		.num("bias", seg.bias ?? 0, (n) => {
			seg.bias = n;
			notify();
		})
		.flags("cMask", seg.cMask, (f) => {
			seg.cMask = f;
			notify();
		})
		.flags("cGroup", seg.cGroup, (f) => {
			seg.cGroup = f;
			notify();
		})
		.trait("trait", seg.trait, s, (t) => {
			setSelectionTrait(s, { type: "segment", index: i }, t);
			notify();
			rebuild?.();
		})
		.button("Delete segment", onDelete, "danger");
}
