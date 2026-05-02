import type { Selection, StadiumObject } from "../types/stadium.ts";
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

export class PropertiesPanel {
	private readonly placeholder: HTMLElement;
	private readonly inner: HTMLElement;
	private readonly onChange: ChangeCallback;
	private readonly onDelete: () => void;
	private rebuildCallback: (() => void) | null = null;

	constructor(onChange: ChangeCallback, onDelete: () => void) {
		this.onChange = onChange;
		this.onDelete = onDelete;
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
		this.inner.innerHTML = "";
		this.placeholder.classList.add("hidden");
		this.inner.classList.remove("hidden");
		this.inner.parentElement?.scrollTo({ top: 0 });

		const notify = (): void => this.onChange();

		this.renderObjectSection(stadium, selection, notify);
		renderStadiumSection({
			parent: this.inner,
			stadium,
			notify,
			rebuild: () => this.rebuildCallback?.(),
		});
	}

	setRebuildCallback(cb: () => void): void {
		this.rebuildCallback = cb;
	}

	private renderObjectSection(
		stadium: StadiumObject,
		selection: Selection,
		notify: ChangeCallback,
	): void {
		switch (selection.type) {
			case "vertex":
				renderVertexSection(
					this.inner,
					stadium,
					selection.index,
					notify,
					this.onDelete,
				);
				break;
			case "segment":
				renderSegmentSection(
					this.inner,
					stadium,
					selection.index,
					notify,
					this.onDelete,
				);
				break;
			case "disc":
				renderDiscSection(
					this.inner,
					stadium,
					selection.index,
					notify,
					this.onDelete,
				);
				break;
			case "goal":
				renderGoalSection(
					this.inner,
					stadium,
					selection.index,
					notify,
					this.onDelete,
				);
				break;
			case "plane":
				renderPlaneSection(
					this.inner,
					stadium,
					selection.index,
					notify,
					this.onDelete,
				);
				break;
			case "joint":
				renderJointSection(
					this.inner,
					stadium,
					selection.index,
					notify,
					this.onDelete,
				);
				break;
		}
	}
}
