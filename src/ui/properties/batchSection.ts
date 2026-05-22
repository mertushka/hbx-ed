import {
	getSelectionObject,
	getSelectionTrait,
	setSelectionTrait,
} from "../../core/selectionTraits.ts";
import type { MultiSelection, StadiumObject } from "../../types/stadium.ts";
import type { ChangeCallback } from "./inputs.ts";
import { el, SectionBuilder } from "./inputs.ts";

const MIXED = "(mixed)";
const NONE = "(none)";

export function renderBatchSection(
	parent: HTMLElement,
	stadium: StadiumObject,
	multiSelection: MultiSelection,
	notify: ChangeCallback,
): void {
	const selections = multiSelection.items.filter(
		(selection) => getSelectionObject(stadium, selection) !== null,
	);
	if (selections.length === 0) return;

	const section = new SectionBuilder(
		`Batch Edit (${selections.length} objects)`,
		parent,
	);
	section.appendRow(
		"trait",
		batchTraitSelect(stadium, multiSelection, selections, notify),
	);
}

function batchTraitSelect(
	stadium: StadiumObject,
	multiSelection: MultiSelection,
	selections: MultiSelection["items"],
	notify: ChangeCallback,
): HTMLSelectElement {
	const values = selections.map((selection) =>
		getSelectionTrait(stadium, selection),
	);
	const first = values[0];
	const mixed = values.some((value) => value !== first);
	const current = mixed ? MIXED : (first ?? NONE);
	const options = [MIXED, NONE, ...Object.keys(stadium.traits ?? {})];
	const select = el("select", "prop-input");

	for (const option of options) {
		const item = el("option");
		item.value = option;
		item.textContent = option;
		if (option === current) item.selected = true;
		select.appendChild(item);
	}

	select.addEventListener("change", () => {
		if (select.value === MIXED) return;
		const trait = select.value === NONE ? undefined : select.value;
		let changed = false;
		for (const selection of multiSelection.items) {
			if (setSelectionTrait(stadium, selection, trait)) changed = true;
		}
		if (changed) notify();
	});

	return select;
}
