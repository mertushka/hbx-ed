import type { Plane, StadiumObject } from "../../types/stadium.ts";
import type { ChangeCallback } from "./inputs.ts";
import { SectionBuilder, setOrDelete } from "./inputs.ts";
import { vec2Number } from "./objectFieldHelpers.ts";

export function renderPlaneSection(
	parent: HTMLElement,
	s: StadiumObject,
	i: number,
	notify: ChangeCallback,
	onDelete: () => void,
): void {
	const p = s.planes[i] as Plane;
	const sec = new SectionBuilder(`Plane #${i}`, parent);
	vec2Number(
		sec,
		"normal.x",
		p.normal,
		0,
		[0, 1],
		() => (p.normal ??= [0, 1]),
		notify,
	);
	vec2Number(
		sec,
		"normal.y",
		p.normal,
		1,
		[0, 1],
		() => (p.normal ??= [0, 1]),
		notify,
	)
		.num("dist", p.dist ?? 0, (n) => {
			p.dist = n;
			notify();
		})
		.num("bCoef", p.bCoef ?? 1, (n) => {
			p.bCoef = n;
			notify();
		})
		.flags("cMask", p.cMask, (f) => {
			p.cMask = f;
			notify();
		})
		.flags("cGroup", p.cGroup, (f) => {
			p.cGroup = f;
			notify();
		})
		.trait("trait", p.trait, s, (t) => {
			setOrDelete(p, "trait", t);
			notify();
		})
		.button("Delete plane", onDelete, "danger");
}
