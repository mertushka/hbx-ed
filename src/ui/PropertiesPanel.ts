import type {
	MultiSelection,
	ObjectType,
	Selection,
	StadiumObject,
} from "../types/stadium.ts";
import { renderBatchSection } from "./properties/batchSection.ts";
import type { ChangeCallback } from "./properties/inputs.ts";
import {
	renderDiscSection,
	renderGoalSection,
	renderJointSection,
	renderPlaneSection,
	renderSegmentSection,
	renderVertexSection,
} from "./properties/objectSections.ts";
import { renderStadiumSection } from "./properties/stadiumSections.ts";
import { renderToolDefaultsSection } from "./properties/toolDefaultsSection.ts";

export interface PropertiesPanelOptions {
	getToolDefaultTrait?: (type: ObjectType) => string | undefined;
	setToolDefaultTrait?: (type: ObjectType, trait: string | undefined) => void;
}

export class PropertiesPanel {
	private readonly placeholder: HTMLElement;
	private readonly inner: HTMLElement;
	private readonly onChange: ChangeCallback;
	private readonly onDelete: (selection: Selection) => void;
	private readonly options: PropertiesPanelOptions;
	private rebuildCallback: (() => void) | null = null;

	constructor(
		onChange: ChangeCallback,
		onDelete: (selection: Selection) => void,
		options: PropertiesPanelOptions = {},
	) {
		this.onChange = onChange;
		this.onDelete = onDelete;
		this.options = options;
		const placeholder = document.getElementById("props-placeholder");
		const inner = document.getElementById("props-inner");
		if (!placeholder || !inner) {
			throw new Error("Properties panel elements not found");
		}
		this.placeholder = placeholder;
		this.inner = inner;
	}

	clear(): void {
		this.inner.innerHTML = "";
		this.inner.classList.add("hidden");
		this.placeholder.classList.remove("hidden");
	}

	render(stadium: StadiumObject, selection: Selection): void {
		const notify = this.prepare();
		this.renderObjectSection(stadium, selection, notify);
		this.renderGlobalSections(stadium, notify);
	}

	renderGlobal(stadium: StadiumObject): void {
		const notify = this.prepare();
		this.renderGlobalSections(stadium, notify);
	}

	renderMultiSelection(
		stadium: StadiumObject,
		multiSelection: MultiSelection,
	): void {
		const notify = this.prepare();
		renderBatchSection(this.inner, stadium, multiSelection, notify);
		this.renderGlobalSections(stadium, notify);
	}

	setRebuildCallback(cb: () => void): void {
		this.rebuildCallback = cb;
	}

	private prepare(): ChangeCallback {
		this.inner.innerHTML = "";
		this.placeholder.classList.add("hidden");
		this.inner.classList.remove("hidden");
		this.inner.parentElement?.scrollTo({ top: 0 });
		const notify = (): void => this.onChange();
		return notify;
	}

	private renderGlobalSections(
		stadium: StadiumObject,
		notify: ChangeCallback,
	): void {
		if (this.options.getToolDefaultTrait && this.options.setToolDefaultTrait) {
			renderToolDefaultsSection({
				parent: this.inner,
				stadium,
				getDefaultTrait: this.options.getToolDefaultTrait,
				setDefaultTrait: this.options.setToolDefaultTrait,
			});
		}
		renderStadiumSection({
			parent: this.inner,
			stadium,
			notify,
			rebuild: () => this.rebuildCallback?.(),
		});
	}

	private renderObjectSection(
		stadium: StadiumObject,
		selection: Selection,
		notify: ChangeCallback,
	): void {
		const deleteSelection = (): void => this.onDelete(selection);
		switch (selection.type) {
			case "vertex":
				renderVertexSection(
					this.inner,
					stadium,
					selection.index,
					notify,
					deleteSelection,
				);
				break;
			case "segment":
				renderSegmentSection(
					this.inner,
					stadium,
					selection.index,
					notify,
					deleteSelection,
				);
				break;
			case "disc":
				renderDiscSection(
					this.inner,
					stadium,
					selection.index,
					notify,
					deleteSelection,
				);
				break;
			case "goal":
				renderGoalSection(
					this.inner,
					stadium,
					selection.index,
					notify,
					deleteSelection,
				);
				break;
			case "plane":
				renderPlaneSection(
					this.inner,
					stadium,
					selection.index,
					notify,
					deleteSelection,
				);
				break;
			case "joint":
				renderJointSection(
					this.inner,
					stadium,
					selection.index,
					notify,
					deleteSelection,
				);
				break;
		}
	}
}
