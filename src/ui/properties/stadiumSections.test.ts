import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StadiumObject } from "../../types/stadium.ts";
import {
	findTraitUsages,
	renderBallPhysicsSection,
	renderPlayerPhysicsSection,
	renderStadiumSection,
	renderTraitsSection,
} from "./stadiumSections.ts";

function stadium(): StadiumObject {
	return {
		name: "Sections",
		width: 100,
		height: 50,
		bg: {
			type: "grass",
			width: 90,
			height: 40,
			kickOffRadius: 20,
			cornerRadius: 0,
			color: "718C5A",
		},
		traits: { wall: { bCoef: 0.5, color: "ABCDEF" } },
		vertexes: [{ x: 0, y: 0, trait: "wall" }],
		segments: [{ v0: 0, v1: 0, trait: "wall" }],
		goals: [],
		discs: [],
		planes: [],
		joints: [],
		playerPhysics: {},
	};
}

function render(s = stadium()) {
	const parent = document.getElementById("props-inner") as HTMLElement;
	const notify = vi.fn();
	const rebuild = vi.fn();
	renderStadiumSection({ parent, stadium: s, notify, rebuild });
	return { parent, notify, rebuild, stadium: s };
}

function control<T extends HTMLElement>(label: string): T {
	const row = [...document.querySelectorAll(".prop-row")].find(
		(el) => el.querySelector(".prop-label")?.textContent === label,
	);
	if (!row) throw new Error(`Expected row for ${label}`);
	const input = row.querySelector<T>("input, select");
	if (!input) throw new Error(`Expected control for ${label}`);
	return input;
}

function section(title: string): HTMLElement {
	const found = [
		...document.querySelectorAll<HTMLElement>(".prop-section"),
	].find(
		(el) => el.querySelector(".prop-section-title")?.textContent === title,
	);
	if (!found) throw new Error(`Expected section ${title}`);
	return found;
}

function rowIn(root: ParentNode, label: string): HTMLElement {
	const row = [...root.querySelectorAll<HTMLElement>(".prop-row")].find(
		(el) => el.querySelector(".prop-label")?.textContent === label,
	);
	if (!row) throw new Error(`Expected row for ${label}`);
	return row;
}

function controlIn<T extends HTMLElement>(root: ParentNode, label: string): T {
	const input = rowIn(root, label).querySelector<T>("input, select");
	if (!input) throw new Error(`Expected control for ${label}`);
	return input;
}

function flagIn(
	root: ParentNode,
	label: string,
	name: string,
): HTMLInputElement {
	const item = [...rowIn(root, label).querySelectorAll("label")].find(
		(el) => el.textContent?.trim() === name,
	);
	const input = item?.querySelector<HTMLInputElement>("input");
	if (!input) throw new Error(`Expected ${label} flag ${name}`);
	return input;
}

describe("stadiumSections", () => {
	beforeEach(() => {
		document.body.innerHTML = `
			<div id="stadium-name-display"></div>
			<div id="props-inner"></div>
		`;
		window.prompt = vi.fn(() => "newTrait");
		window.alert = vi.fn();
		window.confirm = vi.fn(() => true);
	});

	it("edits stadium and background fields", () => {
		const { notify, stadium: s } = render();

		const name = control<HTMLInputElement>("name");
		name.value = "Renamed";
		name.dispatchEvent(new Event("change"));

		const width = control<HTMLInputElement>("width");
		width.value = "222";
		width.dispatchEvent(new Event("change"));

		const bgType = control<HTMLSelectElement>("bg.type");
		bgType.value = "hockey";
		bgType.dispatchEvent(new Event("change"));

		expect(s.name).toBe("Renamed");
		expect(s.width).toBe(222);
		expect(s.bg?.type).toBe("hockey");
		expect(document.getElementById("stadium-name-display")?.textContent).toBe(
			"Renamed",
		);
		expect(notify).toHaveBeenCalledTimes(3);
	});

	it("switches ball physics source and rebuilds the panel", () => {
		const { notify, rebuild, stadium: s } = render();

		const source = control<HTMLSelectElement>("source");
		source.value = "disc0";
		source.dispatchEvent(new Event("change"));

		expect(s.ballPhysics).toBe("disc0");
		expect(notify).toHaveBeenCalledOnce();
		expect(rebuild).toHaveBeenCalledOnce();

		const inner = document.getElementById("props-inner");
		if (!inner) throw new Error("Expected props inner");
		inner.innerHTML = "";
		render(s);
		const customSource = control<HTMLSelectElement>("source");
		customSource.value = "custom";
		customSource.dispatchEvent(new Event("change"));
		expect(s.ballPhysics).toMatchObject({ radius: 10, color: "FFCC00" });
	});

	it("adds and deletes traits while reporting usage", () => {
		const { notify, rebuild, stadium: s } = render();

		expect(document.querySelector(".prop-trait-usage")?.textContent).toBe(
			"Used by: v0, seg0",
		);

		document.querySelector<HTMLButtonElement>(".prop-trait-add")?.click();
		expect(s.traits?.newTrait).toEqual({});
		expect(notify).toHaveBeenCalledOnce();
		expect(rebuild).toHaveBeenCalledOnce();

		document.querySelector<HTMLButtonElement>(".prop-trait-del")?.click();
		expect(s.traits?.wall).toBeUndefined();
		expect(window.confirm).toHaveBeenCalledOnce();
	});

	it("collects trait usage labels across all object types", () => {
		const s = stadium();
		s.discs.push({ trait: "wall" });
		s.planes.push({ trait: "wall" });
		s.goals.push({ trait: "wall" });
		s.joints.push({ d0: 0, d1: 0, trait: "wall" });

		expect(findTraitUsages(s, "wall")).toEqual([
			"v0",
			"seg0",
			"disc0",
			"plane0",
			"goal0",
			"joint0",
		]);
	});

	it("edits custom ball physics fields, color, and flags", () => {
		const s = stadium();
		delete s.ballPhysics;
		const notify = vi.fn();
		const rebuild = vi.fn();

		renderBallPhysicsSection(
			document.getElementById("props-inner") as HTMLElement,
			s,
			notify,
			rebuild,
		);

		const ball = section("Ball Physics");
		expect(s.ballPhysics).toBeUndefined();

		const posX = controlIn<HTMLInputElement>(ball, "pos.x");
		posX.value = "7";
		posX.dispatchEvent(new Event("change"));
		const radius = controlIn<HTMLInputElement>(ball, "radius");
		radius.value = "12";
		radius.dispatchEvent(new Event("change"));
		const color = rowIn(ball, "color").querySelector<HTMLInputElement>(
			'input[type="text"]',
		);
		if (!color) throw new Error("Expected ball color input");
		color.value = "123ABC";
		color.dispatchEvent(new Event("change"));
		const red = flagIn(ball, "cMask", "red");
		red.checked = true;
		red.dispatchEvent(new Event("change"));

		expect(s.ballPhysics).toMatchObject({
			pos: [7, 0],
			radius: 12,
			color: "123ABC",
			cMask: ["red"],
		});
		expect(notify).toHaveBeenCalledTimes(4);
		expect(rebuild).not.toHaveBeenCalled();
	});

	it("edits player physics fields and initializes missing playerPhysics", () => {
		const s = stadium();
		delete s.playerPhysics;
		const notify = vi.fn();

		renderPlayerPhysicsSection(
			document.getElementById("props-inner") as HTMLElement,
			s,
			notify,
		);

		const player = section("Player Physics");
		expect(s.playerPhysics).toBeUndefined();

		const radius = controlIn<HTMLInputElement>(player, "radius");
		radius.value = "21";
		radius.dispatchEvent(new Event("change"));
		const accel = controlIn<HTMLInputElement>(player, "accel");
		accel.value = "0.2";
		accel.dispatchEvent(new Event("change"));
		const kick = flagIn(player, "cGroup", "kick");
		kick.checked = true;
		kick.dispatchEvent(new Event("change"));

		expect(s.playerPhysics).toMatchObject({
			radius: 21,
			acceleration: 0.2,
			cGroup: ["kick"],
		});
		expect(notify).toHaveBeenCalledTimes(3);
	});

	it("edits trait fields and supports unsetting optional values", () => {
		const s = stadium();
		const notify = vi.fn();

		renderTraitsSection(
			document.getElementById("props-inner") as HTMLElement,
			s,
			notify,
			vi.fn(),
		);

		const trait = document.querySelector<HTMLElement>(".prop-trait-block");
		if (!trait) throw new Error("Expected trait block");

		const bCoef = controlIn<HTMLInputElement>(trait, "bCoef");
		bCoef.value = "1.25";
		bCoef.dispatchEvent(new Event("change"));
		bCoef.value = "";
		bCoef.dispatchEvent(new Event("change"));

		const visible = controlIn<HTMLInputElement>(trait, "vis");
		visible.checked = false;
		visible.dispatchEvent(new Event("change"));
		trait.querySelector<HTMLButtonElement>(".prop-trait-unset")?.click();

		const blue = flagIn(trait, "cMask", "blue");
		blue.checked = true;
		blue.dispatchEvent(new Event("change"));

		const color = rowIn(trait, "color").querySelector<HTMLInputElement>(
			'input[type="text"]',
		);
		if (!color) throw new Error("Expected trait color input");
		color.value = "654321";
		color.dispatchEvent(new Event("change"));
		color.value = "";
		color.dispatchEvent(new Event("change"));

		const swatch = rowIn(trait, "color").querySelector<HTMLElement>(
			".prop-color-swatch",
		);
		const picker = rowIn(trait, "color").querySelector<HTMLInputElement>(
			'input[type="color"]',
		);

		expect(s.traits?.wall).toEqual({ cMask: ["blue"] });
		expect(visible.indeterminate).toBe(true);
		expect(swatch?.style.background).toBe("");
		expect(picker?.value).not.toBe("#654321");
		expect(notify).toHaveBeenCalledTimes(7);
	});

	it("handles empty, duplicate, blank, and cancelled trait actions", () => {
		const s = stadium();
		s.traits = {};
		const notify = vi.fn();
		const rebuild = vi.fn();
		const parent = document.getElementById("props-inner") as HTMLElement;

		renderTraitsSection(parent, s, notify, rebuild);
		expect(document.querySelector(".prop-trait-empty")?.textContent).toBe(
			"No traits defined",
		);

		window.prompt = vi.fn(() => "   ");
		document.querySelector<HTMLButtonElement>(".prop-trait-add")?.click();
		expect(s.traits).toEqual({});
		expect(notify).not.toHaveBeenCalled();

		parent.innerHTML = "";
		s.traits = { wall: {} };
		window.prompt = vi.fn(() => "wall");
		renderTraitsSection(parent, s, notify, rebuild);
		document.querySelector<HTMLButtonElement>(".prop-trait-add")?.click();
		expect(window.alert).toHaveBeenCalledWith('Trait "wall" already exists.');
		expect(notify).not.toHaveBeenCalled();

		window.confirm = vi.fn(() => false);
		document.querySelector<HTMLButtonElement>(".prop-trait-del")?.click();
		expect(s.traits.wall).toEqual({});
		expect(notify).not.toHaveBeenCalled();
		expect(rebuild).not.toHaveBeenCalled();
	});
});
