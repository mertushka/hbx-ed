import type { StadiumObject } from "../../types/stadium.ts";
import { colorToHex, hexToHbs } from "../../utils/color.ts";

export type ChangeCallback = () => void;

const COLLISION_FLAGS = [
	"ball",
	"red",
	"blue",
	"redKO",
	"blueKO",
	"wall",
	"all",
	"kick",
	"score",
	"c0",
	"c1",
	"c2",
	"c3",
] as const;

export function el<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	cls?: string,
): HTMLElementTagNameMap[K] {
	const e = document.createElement(tag);
	if (cls) e.className = cls;
	return e;
}

export function buildRow(label: string, input: HTMLElement): HTMLElement {
	const row = el("div", "prop-row");
	const lbl = el("span", "prop-label");
	lbl.textContent = label;
	const val = el("div", "prop-val");
	val.appendChild(input);
	row.appendChild(lbl);
	row.appendChild(val);
	return row;
}

export function numInput(
	value: number | undefined,
	onChange: (v: number) => void,
): HTMLInputElement {
	const inp = el("input", "prop-input");
	inp.type = "text";
	inp.value = value !== undefined ? String(value) : "";
	inp.addEventListener("change", () => {
		const v = parseFloat(inp.value);
		if (!Number.isNaN(v)) onChange(v);
	});
	return inp;
}

export function strInput(
	value: string | undefined,
	onChange: (v: string) => void,
): HTMLInputElement {
	const inp = el("input", "prop-input");
	inp.type = "text";
	inp.value = value ?? "";
	inp.addEventListener("change", () => onChange(inp.value));
	return inp;
}

export function boolInput(
	value: boolean,
	onChange: (v: boolean) => void,
): HTMLInputElement {
	const inp = el("input", "prop-checkbox");
	inp.type = "checkbox";
	inp.checked = value;
	inp.addEventListener("change", () => onChange(inp.checked));
	return inp;
}

export function selectInput(
	value: string,
	options: string[],
	onChange: (v: string) => void,
): HTMLSelectElement {
	const sel = el("select", "prop-input");
	for (const opt of options) {
		const o = el("option");
		o.value = opt;
		o.textContent = opt;
		if (opt === value) o.selected = true;
		sel.appendChild(o);
	}
	sel.addEventListener("change", () => onChange(sel.value));
	return sel;
}

export function colorInput(
	value: unknown,
	onChange: (hex6: string) => void,
): HTMLElement {
	const wrap = el("div", "prop-color-wrap");
	const hexStr = colorToHex(value as never);

	const picker = el("input");
	picker.type = "color";
	picker.style.display = "none";
	picker.value = hexStr;

	const swatch = el("div", "prop-color-swatch");
	swatch.style.background = hexStr;
	swatch.title = "Click to pick colour";
	swatch.addEventListener("click", () => picker.click());

	const txt = el("input", "prop-input");
	txt.type = "text";
	txt.style.flex = "1";
	txt.value = hexStr.slice(1);

	picker.addEventListener("input", () => {
		const hbs = hexToHbs(picker.value);
		txt.value = hbs;
		swatch.style.background = picker.value;
		onChange(hbs);
	});

	txt.addEventListener("change", () => {
		const raw = txt.value.replace("#", "").toUpperCase();
		if (/^[0-9A-F]{6}$/.test(raw)) {
			swatch.style.background = `#${raw}`;
			picker.value = `#${raw}`;
			onChange(raw);
		}
	});

	wrap.appendChild(swatch);
	wrap.appendChild(txt);
	wrap.appendChild(picker);
	return wrap;
}

export function setOrDelete<T extends object, K extends keyof T>(
	obj: T,
	key: K,
	value: T[K] | undefined,
): void {
	if (value === undefined) {
		delete obj[key];
	} else {
		obj[key] = value;
	}
}

export function flagsInput(
	value: string[] | undefined,
	onChange: (v: string[]) => void,
): HTMLElement {
	const wrap = el("div", "prop-flags-wrap");
	const current = new Set(value ?? []);

	for (const flag of COLLISION_FLAGS) {
		const label = el("label", "prop-flag-label");
		const cb = el("input");
		cb.type = "checkbox";
		cb.className = "prop-flag-cb";
		cb.checked = current.has(flag);
		cb.addEventListener("change", () => {
			if (cb.checked) current.add(flag);
			else current.delete(flag);
			onChange([...current]);
		});
		label.appendChild(cb);
		label.appendChild(document.createTextNode(flag));
		wrap.appendChild(label);
	}
	return wrap;
}

export class SectionBuilder {
	private readonly section: HTMLElement;

	constructor(title: string, parent: HTMLElement) {
		this.section = el("div", "prop-section");
		const heading = el("div", "prop-section-title");
		heading.textContent = title;
		this.section.appendChild(heading);
		parent.appendChild(this.section);
	}

	num(
		label: string,
		value: number | undefined,
		onChange: (v: number) => void,
	): this {
		this.section.appendChild(buildRow(label, numInput(value, onChange)));
		return this;
	}

	str(
		label: string,
		value: string | undefined,
		onChange: (v: string) => void,
	): this {
		this.section.appendChild(buildRow(label, strInput(value, onChange)));
		return this;
	}

	bool(label: string, value: boolean, onChange: (v: boolean) => void): this {
		this.section.appendChild(buildRow(label, boolInput(value, onChange)));
		return this;
	}

	select(
		label: string,
		value: string,
		options: string[],
		onChange: (v: string) => void,
	): this {
		this.section.appendChild(
			buildRow(label, selectInput(value, options, onChange)),
		);
		return this;
	}

	color(label: string, value: unknown, onChange: (hex6: string) => void): this {
		this.section.appendChild(buildRow(label, colorInput(value, onChange)));
		return this;
	}

	flags(
		label: string,
		value: string[] | undefined,
		onChange: (v: string[]) => void,
	): this {
		const row = el("div", "prop-row prop-row--flags");
		const lbl = el("span", "prop-label");
		lbl.textContent = label;
		row.appendChild(lbl);
		const val = el("div", "prop-val");
		val.appendChild(flagsInput(value, onChange));
		row.appendChild(val);
		this.section.appendChild(row);
		return this;
	}

	trait(
		label: string,
		current: string | undefined,
		stadium: StadiumObject,
		onChange: (v: string | undefined) => void,
	): this {
		const names = ["(none)", ...Object.keys(stadium.traits ?? {})];
		const sel = el("select", "prop-input");
		for (const n of names) {
			const o = el("option");
			o.value = n;
			o.textContent = n;
			if (n === (current ?? "(none)")) o.selected = true;
			sel.appendChild(o);
		}
		sel.addEventListener("change", () => {
			onChange(sel.value === "(none)" ? undefined : sel.value);
		});
		this.section.appendChild(buildRow(label, sel));
		return this;
	}

	button(label: string, onClick: () => void, variant?: "danger"): this {
		const btn = el("button", `prop-btn${variant ? ` ${variant}` : ""}`);
		btn.textContent = label;
		btn.addEventListener("click", onClick);
		this.section.appendChild(btn);
		return this;
	}
}
