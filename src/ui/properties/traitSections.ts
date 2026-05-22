import { syncTraitUsages } from "../../core/selectionTraits.ts";
import type { StadiumObject } from "../../types/stadium.ts";
import { colorToHex, hexToHbs } from "../../utils/color.ts";
import type { ChangeCallback } from "./inputs.ts";
import { flagsInput } from "./inputs.ts";

export function renderTraitsSection(
	parent: HTMLElement,
	s: StadiumObject,
	notify: ChangeCallback,
	rebuild: () => void,
): void {
	const traits = s.traits ?? {};
	s.traits = traits;

	const sec = document.createElement("div");
	sec.className = "prop-section";

	const titleRow = document.createElement("div");
	titleRow.className = "prop-section-title prop-section-title--action";
	const titleText = document.createElement("span");
	titleText.textContent = "Traits";
	const addBtn = document.createElement("button");
	addBtn.className = "prop-trait-add";
	addBtn.textContent = "+ Add";
	addBtn.addEventListener("click", () => {
		const name = prompt("Trait name:");
		if (!name || name.trim() === "") return;
		const key = name.trim();
		if (traits[key]) {
			alert(`Trait "${key}" already exists.`);
			return;
		}
		traits[key] = {};
		notify();
		rebuild();
	});
	titleRow.appendChild(titleText);
	titleRow.appendChild(addBtn);
	sec.appendChild(titleRow);
	parent.appendChild(sec);

	const traitNames = Object.keys(traits);
	if (traitNames.length === 0) {
		const empty = document.createElement("div");
		empty.className = "prop-trait-empty";
		empty.textContent = "No traits defined";
		sec.appendChild(empty);
		return;
	}

	for (const traitName of traitNames) {
		renderOneTrait(sec, traits, traitName, notify, s, rebuild);
	}
}

export function findTraitUsages(s: StadiumObject, name: string): string[] {
	const results: string[] = [];
	s.vertexes.forEach((v, i) => {
		if (v.trait === name) results.push(`v${i}`);
	});
	s.segments.forEach((seg, i) => {
		if (seg.trait === name) results.push(`seg${i}`);
	});
	s.discs.forEach((d, i) => {
		if (d.trait === name) results.push(`disc${i}`);
	});
	s.planes.forEach((p, i) => {
		if (p.trait === name) results.push(`plane${i}`);
	});
	s.goals.forEach((g, i) => {
		if (g.trait === name) results.push(`goal${i}`);
	});
	s.joints.forEach((j, i) => {
		if (j.trait === name) results.push(`joint${i}`);
	});
	return results;
}

function renderOneTrait(
	parent: HTMLElement,
	traits: NonNullable<StadiumObject["traits"]>,
	name: string,
	notify: ChangeCallback,
	s: StadiumObject,
	rebuild: () => void,
): void {
	const trait = traits[name];
	if (!trait) return;

	const block = document.createElement("div");
	block.className = "prop-trait-block";
	const traitRecord = trait as Record<string, unknown>;
	const snapshotTrait = (): Record<string, unknown> =>
		structuredClone(traitRecord);
	const notifyTraitChange = (previousTrait: Record<string, unknown>): void => {
		syncTraitUsages(s, name, previousTrait);
		notify();
	};

	const header = document.createElement("div");
	header.className = "prop-trait-header";
	const nameEl = document.createElement("span");
	nameEl.className = "prop-trait-name";
	nameEl.textContent = name;
	const delBtn = document.createElement("button");
	delBtn.className = "prop-trait-del";
	delBtn.textContent = "✕";
	delBtn.title = `Delete trait "${name}"`;
	delBtn.addEventListener("click", () => {
		if (
			!confirm(
				`Delete trait "${name}"? This won't update objects that reference it.`,
			)
		) {
			return;
		}
		delete traits[name];
		notify();
		rebuild();
	});
	header.appendChild(nameEl);
	header.appendChild(delBtn);
	block.appendChild(header);

	const fields: Array<{
		label: string;
		key: string;
		type: "num" | "bool" | "flags" | "color";
	}> = [
		{ label: "vis", key: "vis", type: "bool" },
		{ label: "bCoef", key: "bCoef", type: "num" },
		{ label: "cMask", key: "cMask", type: "flags" },
		{ label: "cGroup", key: "cGroup", type: "flags" },
		{ label: "color", key: "color", type: "color" },
		{ label: "radius", key: "radius", type: "num" },
		{ label: "invMass", key: "invMass", type: "num" },
	];

	for (const field of fields) {
		const row = document.createElement("div");
		row.className = "prop-row";
		const lbl = document.createElement("span");
		lbl.className = "prop-label";
		lbl.textContent = field.label;
		row.appendChild(lbl);

		const val = document.createElement("div");
		val.className = "prop-val";

		if (field.type === "num") {
			const inp = document.createElement("input");
			inp.className = "prop-input";
			inp.type = "text";
			inp.placeholder = "unset";
			inp.value =
				traitRecord[field.key] !== undefined
					? String(traitRecord[field.key])
					: "";
			inp.addEventListener("change", () => {
				const previousTrait = snapshotTrait();
				const n = parseFloat(inp.value);
				if (inp.value === "" || inp.value === "unset") {
					delete traitRecord[field.key];
				} else if (!Number.isNaN(n)) {
					traitRecord[field.key] = n;
				}
				notifyTraitChange(previousTrait);
			});
			val.appendChild(inp);
		} else if (field.type === "bool") {
			val.appendChild(
				renderTraitBoolInput(traitRecord, field.key, notifyTraitChange),
			);
		} else if (field.type === "flags") {
			val.appendChild(
				flagsInput(traitRecord[field.key] as string[] | undefined, (f) => {
					const previousTrait = snapshotTrait();
					traitRecord[field.key] = f;
					notifyTraitChange(previousTrait);
				}),
			);
		} else if (field.type === "color") {
			val.appendChild(renderTraitColorInput(trait, notifyTraitChange));
		}

		row.appendChild(val);
		block.appendChild(row);
	}

	const usedBy = findTraitUsages(s, name);
	if (usedBy.length > 0) {
		const info = document.createElement("div");
		info.className = "prop-trait-usage";
		info.textContent = `Used by: ${usedBy.join(", ")}`;
		block.appendChild(info);
	}

	parent.appendChild(block);
}

function renderTraitBoolInput(
	trait: Record<string, unknown>,
	key: string,
	notify: (previousTrait: Record<string, unknown>) => void,
): HTMLElement {
	const wrap = document.createElement("div");
	wrap.style.display = "flex";
	wrap.style.alignItems = "center";
	wrap.style.gap = "6px";
	const cb = document.createElement("input");
	cb.type = "checkbox";
	cb.className = "prop-checkbox";
	cb.checked = (trait[key] as boolean | undefined) ?? true;
	cb.indeterminate = trait[key] === undefined;
	cb.addEventListener("change", () => {
		const previousTrait = structuredClone(trait);
		trait[key] = cb.checked;
		cb.indeterminate = false;
		notify(previousTrait);
	});
	const unset = document.createElement("button");
	unset.className = "prop-trait-unset";
	unset.textContent = "unset";
	unset.title = "Remove this field from trait";
	unset.addEventListener("click", () => {
		const previousTrait = structuredClone(trait);
		delete trait[key];
		cb.indeterminate = true;
		notify(previousTrait);
	});
	wrap.appendChild(cb);
	wrap.appendChild(unset);
	return wrap;
}

function renderTraitColorInput(
	trait: NonNullable<StadiumObject["traits"]>[string],
	notify: (previousTrait: Record<string, unknown>) => void,
): HTMLElement {
	const hexStr =
		trait.color !== undefined ? colorToHex(trait.color as never) : "#000000";
	const wrap = document.createElement("div");
	wrap.className = "prop-color-wrap";
	const picker = document.createElement("input");
	picker.type = "color";
	picker.style.display = "none";
	picker.value = hexStr;
	const swatch = document.createElement("div");
	swatch.className = "prop-color-swatch";
	swatch.style.background = hexStr;
	swatch.addEventListener("click", () => picker.click());
	const txt = document.createElement("input");
	txt.className = "prop-input";
	txt.type = "text";
	txt.style.flex = "1";
	txt.placeholder = "unset";
	txt.value = trait.color !== undefined ? hexStr.slice(1) : "";
	const update = (h: string): void => {
		const previousTrait = structuredClone(trait) as Record<string, unknown>;
		trait.color = h;
		swatch.style.background = `#${h}`;
		picker.value = `#${h}`;
		txt.value = h;
		notify(previousTrait);
	};
	picker.addEventListener("input", () => update(hexToHbs(picker.value)));
	txt.addEventListener("change", () => {
		const raw = txt.value.replace("#", "").toUpperCase();
		if (raw === "") {
			const previousTrait = structuredClone(trait) as Record<string, unknown>;
			delete trait.color;
			txt.value = "";
			swatch.style.background = "";
			picker.value = "#000000";
			picker.removeAttribute("value");
			notify(previousTrait);
			return;
		}
		if (/^[0-9A-F]{6}$/.test(raw)) update(raw);
	});
	wrap.appendChild(swatch);
	wrap.appendChild(txt);
	wrap.appendChild(picker);
	return wrap;
}
