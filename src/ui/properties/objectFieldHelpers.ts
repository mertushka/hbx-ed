import type { Vec2 } from "../../types/stadium.ts";
import type { ChangeCallback, SectionBuilder } from "./inputs.ts";

export function vec2Number(
	section: SectionBuilder,
	label: string,
	value: Vec2 | undefined,
	index: 0 | 1,
	defaultValue: Vec2,
	ensureValue: () => Vec2,
	notify: ChangeCallback,
): SectionBuilder {
	return section.num(label, value?.[index] ?? defaultValue[index], (n) => {
		const vec = ensureValue();
		vec[index] = n;
		notify();
	});
}
