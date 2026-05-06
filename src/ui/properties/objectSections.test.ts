import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StadiumObject } from "../../types/stadium.ts";
import {
	renderDiscSection,
	renderGoalSection,
	renderJointSection,
	renderPlaneSection,
	renderSegmentSection,
	renderVertexSection,
} from "./objectSections.ts";

function stadium(): StadiumObject {
	return {
		name: "Object Sections",
		width: 100,
		height: 50,
		traits: { wall: { bCoef: 0.5 }, metal: { bCoef: 1 } },
		vertexes: [{ x: 1, y: 2, cMask: ["ball"], trait: "wall" }],
		segments: [{ v0: 0, v1: 0, curveF: 1, vis: false, cGroup: ["wall"] }],
		goals: [{ p0: [0, 1], p1: [2, 3], team: "red", trait: "wall" }],
		discs: [{ pos: [4, 5], radius: 10, color: "ABCDEF", cMask: ["ball"] }],
		planes: [{ normal: [0, 1], dist: 20, cMask: ["wall"] }],
		joints: [{ d0: 0, d1: 1, color: "000000", trait: "wall" }],
	};
}

function parent(): HTMLElement {
	const el = document.getElementById("props-inner");
	if (!el) throw new Error("Expected properties container");
	return el;
}

function rowByLabel(label: string): HTMLElement {
	const row = [...document.querySelectorAll<HTMLElement>(".prop-row")].find(
		(el) => el.querySelector(".prop-label")?.textContent === label,
	);
	if (!row) throw new Error(`Expected row for ${label}`);
	return row;
}

function rowStartingWith(prefix: string): HTMLElement {
	const row = [...document.querySelectorAll<HTMLElement>(".prop-row")].find(
		(el) => el.querySelector(".prop-label")?.textContent?.startsWith(prefix),
	);
	if (!row) throw new Error(`Expected row starting with ${prefix}`);
	return row;
}

function control<T extends HTMLElement>(label: string): T {
	const input = rowByLabel(label).querySelector<T>("input, select");
	if (!input) throw new Error(`Expected control for ${label}`);
	return input;
}

function setNumber(label: string, value: string): void {
	const input = control<HTMLInputElement>(label);
	input.value = value;
	input.dispatchEvent(new Event("change"));
}

function flag(label: string, name: string): HTMLInputElement {
	const item = [...rowByLabel(label).querySelectorAll("label")].find(
		(el) => el.textContent?.trim() === name,
	);
	const input = item?.querySelector<HTMLInputElement>("input");
	if (!input) throw new Error(`Expected ${label} flag ${name}`);
	return input;
}

describe("objectSections", () => {
	beforeEach(() => {
		document.body.innerHTML = '<div id="props-inner"></div>';
	});

	it("renders vertex fields, flag toggles, trait selection, and delete action", () => {
		const s = stadium();
		const notify = vi.fn();
		const onDelete = vi.fn();

		renderVertexSection(parent(), s, 0, notify, onDelete);

		expect(document.querySelector(".prop-section-title")?.textContent).toBe(
			"Vertex #0",
		);
		setNumber("x", "42");
		setNumber("y", "24");
		setNumber("bCoef", "0.7");

		const red = flag("cMask", "red");
		red.checked = true;
		red.dispatchEvent(new Event("change"));
		const wall = flag("cGroup", "wall");
		wall.checked = true;
		wall.dispatchEvent(new Event("change"));

		const trait = control<HTMLSelectElement>("trait");
		trait.value = "metal";
		trait.dispatchEvent(new Event("change"));
		trait.value = "(none)";
		trait.dispatchEvent(new Event("change"));

		document.querySelector<HTMLButtonElement>(".prop-btn.danger")?.click();

		expect(s.vertexes[0]).toMatchObject({
			x: 42,
			y: 24,
			bCoef: 0.7,
			cMask: ["ball", "red"],
			cGroup: ["wall"],
		});
		expect(s.vertexes[0]?.trait).toBeUndefined();
		expect(notify).toHaveBeenCalledTimes(7);
		expect(onDelete).toHaveBeenCalledOnce();
	});

	it("renders segment fields and clears curveF when editing curve", () => {
		const s = stadium();
		const notify = vi.fn();

		renderSegmentSection(parent(), s, 0, notify, vi.fn());

		setNumber("v0", "1.9");
		setNumber("v1", "2.1");
		const curve =
			rowStartingWith("curve").querySelector<HTMLInputElement>("input");
		if (!curve) throw new Error("Expected curve input");
		curve.value = "45";
		curve.dispatchEvent(new Event("change"));

		const visible = control<HTMLInputElement>("visible");
		visible.checked = true;
		visible.dispatchEvent(new Event("change"));

		const color =
			rowByLabel("color").querySelector<HTMLInputElement>('input[type="text"]');
		if (!color) throw new Error("Expected color text input");
		color.value = "123ABC";
		color.dispatchEvent(new Event("change"));

		setNumber("bCoef", "0.8");
		setNumber("bias", "2");

		const blue = flag("cMask", "blue");
		blue.checked = true;
		blue.dispatchEvent(new Event("change"));
		const kick = flag("cGroup", "kick");
		kick.checked = true;
		kick.dispatchEvent(new Event("change"));
		const trait = control<HTMLSelectElement>("trait");
		trait.value = "metal";
		trait.dispatchEvent(new Event("change"));

		expect(s.segments[0]).toMatchObject({
			v0: 2,
			v1: 2,
			curve: 45,
			vis: true,
			color: "123ABC",
			bCoef: 0.8,
			bias: 2,
			cMask: ["blue"],
			cGroup: ["wall", "kick"],
			trait: "metal",
		});
		expect(s.segments[0]?.curveF).toBeUndefined();
		expect(notify).toHaveBeenCalledTimes(10);
	});

	it("renders disc fields and initializes optional position fields", () => {
		const s = stadium();
		s.discs[0] = {};
		const notify = vi.fn();

		renderDiscSection(parent(), s, 0, notify, vi.fn());

		setNumber("x", "11");
		setNumber("y", "12");
		setNumber("radius", "25");
		setNumber("invMass", "2");
		setNumber("damping", "0.8");
		setNumber("bCoef", "0.9");
		const color =
			rowByLabel("color").querySelector<HTMLInputElement>('input[type="text"]');
		if (!color) throw new Error("Expected color text input");
		color.value = "FEDCBA";
		color.dispatchEvent(new Event("change"));
		const red = flag("cMask", "red");
		red.checked = true;
		red.dispatchEvent(new Event("change"));
		const kick = flag("cGroup", "kick");
		kick.checked = true;
		kick.dispatchEvent(new Event("change"));
		const trait = control<HTMLSelectElement>("trait");
		trait.value = "metal";
		trait.dispatchEvent(new Event("change"));

		expect(s.discs[0]).toMatchObject({
			pos: [11, 12],
			radius: 25,
			invMass: 2,
			damping: 0.8,
			bCoef: 0.9,
			color: "FEDCBA",
			cMask: ["red"],
			cGroup: ["kick"],
			trait: "metal",
		});
		expect(notify).toHaveBeenCalledTimes(10);
	});

	it("renders plane fields and initializes optional normal fields", () => {
		const s = stadium();
		s.planes[0] = {};
		const notify = vi.fn();

		renderPlaneSection(parent(), s, 0, notify, vi.fn());

		setNumber("normal.x", "1");
		setNumber("normal.y", "0");
		setNumber("dist", "55");
		setNumber("bCoef", "0.7");
		const all = flag("cMask", "all");
		all.checked = true;
		all.dispatchEvent(new Event("change"));
		const kick = flag("cGroup", "kick");
		kick.checked = true;
		kick.dispatchEvent(new Event("change"));
		const trait = control<HTMLSelectElement>("trait");
		trait.value = "metal";
		trait.dispatchEvent(new Event("change"));

		expect(s.planes[0]).toMatchObject({
			normal: [1, 0],
			dist: 55,
			bCoef: 0.7,
			cMask: ["all"],
			cGroup: ["kick"],
			trait: "metal",
		});
		expect(notify).toHaveBeenCalledTimes(7);
	});

	it("renders joint fields with rounded disc refs and trait deletion", () => {
		const s = stadium();
		const notify = vi.fn();

		renderJointSection(parent(), s, 0, notify, vi.fn());

		setNumber("d0", "2.4");
		setNumber("d1", "3.6");
		const color =
			rowByLabel("color").querySelector<HTMLInputElement>('input[type="text"]');
		if (!color) throw new Error("Expected joint color input");
		color.value = "123ABC";
		color.dispatchEvent(new Event("change"));
		const trait = control<HTMLSelectElement>("trait");
		trait.value = "(none)";
		trait.dispatchEvent(new Event("change"));

		expect(s.joints[0]).toMatchObject({ d0: 2, d1: 4, color: "123ABC" });
		expect(s.joints[0]?.trait).toBeUndefined();
		expect(notify).toHaveBeenCalledTimes(4);
	});

	it("renders goal fields, team selection, and optional endpoints", () => {
		const s = stadium();
		s.goals[0] = {};
		const notify = vi.fn();

		renderGoalSection(parent(), s, 0, notify, vi.fn());

		const team = control<HTMLSelectElement>("team");
		team.value = "blue";
		team.dispatchEvent(new Event("change"));
		setNumber("p0.x", "-1");
		setNumber("p0.y", "-2");
		setNumber("p1.x", "3");
		setNumber("p1.y", "4");
		const trait = control<HTMLSelectElement>("trait");
		trait.value = "metal";
		trait.dispatchEvent(new Event("change"));

		expect(s.goals[0]).toEqual({
			team: "blue",
			p0: [-1, -2],
			p1: [3, 4],
			trait: "metal",
		});
		expect(notify).toHaveBeenCalledTimes(6);
	});
});
