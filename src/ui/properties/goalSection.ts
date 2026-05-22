import type { Goal, StadiumObject } from "../../types/stadium.ts";
import type { ChangeCallback } from "./inputs.ts";
import { SectionBuilder, setOrDelete } from "./inputs.ts";
import { vec2Number } from "./objectFieldHelpers.ts";

export function renderGoalSection(
	parent: HTMLElement,
	s: StadiumObject,
	i: number,
	notify: ChangeCallback,
	onDelete: () => void,
): void {
	const g = s.goals[i] as Goal;
	const sec = new SectionBuilder(`Goal #${i}`, parent).select(
		"team",
		g.team ?? "red",
		["red", "blue"],
		(v) => {
			setOrDelete(g, "team", v as Goal["team"]);
			notify();
		},
	);
	vec2Number(sec, "p0.x", g.p0, 0, [0, 0], () => (g.p0 ??= [0, 0]), notify);
	vec2Number(sec, "p0.y", g.p0, 1, [0, 0], () => (g.p0 ??= [0, 0]), notify);
	vec2Number(sec, "p1.x", g.p1, 0, [0, 0], () => (g.p1 ??= [0, 0]), notify);
	vec2Number(sec, "p1.y", g.p1, 1, [0, 0], () => (g.p1 ??= [0, 0]), notify)
		.trait("trait", g.trait, s, (v) => {
			setOrDelete(g, "trait", v);
			notify();
		})
		.button("Delete goal", onDelete, "danger");
}
