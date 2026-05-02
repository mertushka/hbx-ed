import type { Template } from "../data/templates.ts";
import type { StadiumObject } from "../types/stadium.ts";

export interface NewStadiumControllerOptions {
	openButton: HTMLElement;
	modal: HTMLElement;
	closeButton: HTMLElement;
	nameInput: HTMLInputElement;
	templateGrid: HTMLElement;
	createButton: HTMLElement;
	templates: Template[];
	isDirty: () => boolean;
	confirmDiscard: (message: string) => boolean;
	loadStadium: (stadium: StadiumObject) => void;
}

export class NewStadiumController {
	private readonly modal: HTMLElement;
	private readonly nameInput: HTMLInputElement;
	private readonly templateGrid: HTMLElement;
	private readonly createButton: HTMLElement;
	private readonly templates: Template[];
	private readonly isDirty: () => boolean;
	private readonly confirmDiscard: (message: string) => boolean;
	private readonly loadStadium: (stadium: StadiumObject) => void;
	private selectedTemplateId: string | undefined;

	constructor(options: NewStadiumControllerOptions) {
		const firstTemplate = options.templates[0];
		if (!firstTemplate) {
			throw new Error("No stadium templates are available");
		}

		this.modal = options.modal;
		this.nameInput = options.nameInput;
		this.templateGrid = options.templateGrid;
		this.createButton = options.createButton;
		this.templates = options.templates;
		this.isDirty = options.isDirty;
		this.confirmDiscard = options.confirmDiscard;
		this.loadStadium = options.loadStadium;
		this.selectedTemplateId = firstTemplate.id;

		this.renderTemplateCards();
		options.openButton.addEventListener("click", () => this.open());
		options.closeButton.addEventListener("click", () => this.close());
		this.modal.addEventListener("click", (e) => {
			if (e.target === this.modal) this.close();
		});
		this.createButton.addEventListener("click", () => this.createStadium());
		this.nameInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") this.createButton.click();
		});
	}

	private open(): void {
		if (
			this.isDirty() &&
			!this.confirmDiscard(
				"You have unsaved changes. Discard and create a new stadium?",
			)
		) {
			return;
		}
		this.modal.classList.add("active");
		this.nameInput.focus();
	}

	private close(): void {
		this.modal.classList.remove("active");
	}

	private renderTemplateCards(): void {
		this.templateGrid.innerHTML = "";
		for (const template of this.templates) {
			const card = document.createElement("div");
			card.className = `template-card${template.id === this.selectedTemplateId ? " active" : ""}`;
			card.dataset.id = template.id;
			card.innerHTML = `<div class="template-card-name">${template.name}</div><div class="template-card-desc">${template.description}</div>`;
			card.addEventListener("click", () => this.selectTemplate(template.id));
			this.templateGrid.appendChild(card);
		}
	}

	private selectTemplate(templateId: string): void {
		this.selectedTemplateId = templateId;
		this.templateGrid.querySelectorAll(".template-card").forEach((card) => {
			card.classList.toggle(
				"active",
				(card as HTMLElement).dataset.id === templateId,
			);
		});
	}

	private createStadium(): void {
		const name = this.nameInput.value.trim() || "My Stadium";
		const template =
			this.templates.find((item) => item.id === this.selectedTemplateId) ??
			this.templates[0];
		if (!template) throw new Error("No stadium templates are available");

		this.close();
		this.loadStadium(structuredClone(template.build(name)));
	}
}
