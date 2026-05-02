import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Template } from "../data/templates.ts";
import type { StadiumObject } from "../types/stadium.ts";
import { NewStadiumController } from "./newStadiumController.ts";

function stadium(name: string): StadiumObject {
	return {
		name,
		width: 100,
		height: 50,
		traits: {},
		vertexes: [],
		segments: [],
		goals: [],
		discs: [],
		planes: [],
		joints: [],
	};
}

function templates(): Template[] {
	return [
		{
			id: "blank",
			name: "Blank",
			description: "Start empty",
			build: (name) => stadium(name),
		},
		{
			id: "hockey",
			name: "Hockey",
			description: "Ice rink",
			build: (name) => ({ ...stadium(name), height: 80 }),
		},
	];
}

function setup(
	options: { dirty?: boolean; confirm?: boolean; items?: Template[] } = {},
) {
	document.body.innerHTML = `
		<button id="open"></button>
		<div id="modal">
			<button id="close"></button>
			<input id="name" />
			<div id="grid"></div>
			<button id="create"></button>
		</div>
	`;
	const loadStadium = vi.fn();
	const confirmDiscard = vi.fn(() => options.confirm ?? true);
	const controller = new NewStadiumController({
		openButton: document.getElementById("open") as HTMLElement,
		modal: document.getElementById("modal") as HTMLElement,
		closeButton: document.getElementById("close") as HTMLElement,
		nameInput: document.getElementById("name") as HTMLInputElement,
		templateGrid: document.getElementById("grid") as HTMLElement,
		createButton: document.getElementById("create") as HTMLElement,
		templates: options.items ?? templates(),
		isDirty: () => options.dirty ?? false,
		confirmDiscard,
		loadStadium,
	});
	return { confirmDiscard, controller, loadStadium };
}

describe("NewStadiumController", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("renders template cards and marks the first template active", () => {
		setup();

		expect(document.querySelectorAll(".template-card")).toHaveLength(2);
		expect(
			document.querySelector(".template-card.active")?.textContent,
		).toContain("Blank");
		expect(
			document.querySelector<HTMLElement>('[data-id="hockey"]')?.textContent,
		).toContain("Ice rink");
	});

	it("opens and closes the modal while respecting dirty confirmation", () => {
		const denied = setup({ dirty: true, confirm: false });
		document.getElementById("open")?.click();
		expect(denied.confirmDiscard).toHaveBeenCalledWith(
			"You have unsaved changes. Discard and create a new stadium?",
		);
		expect(document.getElementById("modal")?.classList.contains("active")).toBe(
			false,
		);

		const allowed = setup({ dirty: true, confirm: true });
		document.getElementById("open")?.click();
		expect(allowed.confirmDiscard).toHaveBeenCalledOnce();
		expect(document.getElementById("modal")?.classList.contains("active")).toBe(
			true,
		);

		document.getElementById("close")?.click();
		expect(document.getElementById("modal")?.classList.contains("active")).toBe(
			false,
		);

		document.getElementById("open")?.click();
		document
			.getElementById("modal")
			?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		expect(document.getElementById("modal")?.classList.contains("active")).toBe(
			false,
		);
	});

	it("selects a template and creates a cloned stadium with a trimmed name", () => {
		const { loadStadium } = setup();
		const hockey = document.querySelector<HTMLElement>('[data-id="hockey"]');
		if (!hockey) throw new Error("Expected hockey template card");

		hockey.click();
		expect(hockey.classList.contains("active")).toBe(true);
		const name = document.getElementById("name") as HTMLInputElement;
		name.value = "  Arena  ";
		document.getElementById("create")?.click();

		expect(document.getElementById("modal")?.classList.contains("active")).toBe(
			false,
		);
		expect(loadStadium).toHaveBeenCalledWith(
			expect.objectContaining({ name: "Arena", height: 80 }),
		);
	});

	it("uses the default name and supports Enter submit", () => {
		const { loadStadium } = setup();
		document.getElementById("open")?.click();
		const name = document.getElementById("name") as HTMLInputElement;
		name.value = " ";
		name.dispatchEvent(
			new KeyboardEvent("keydown", {
				key: "Enter",
				bubbles: true,
			}),
		);

		expect(loadStadium).toHaveBeenCalledWith(
			expect.objectContaining({ name: "My Stadium" }),
		);
	});

	it("throws a clear error when no templates are available", () => {
		expect(() => setup({ items: [] })).toThrow(
			"No stadium templates are available",
		);
	});
});
