export interface ToolbarBindingsOptions {
	doc?: Document;
	fileInput: HTMLInputElement;
	openButton: HTMLElement;
	saveButton: HTMLElement;
	undoButton: HTMLElement;
	redoButton: HTMLElement;
	toggleLabelsButton: HTMLElement;
	toggleSpawnsButton: HTMLElement;
	isDirty: () => boolean;
	confirmDiscard: (message: string) => boolean;
	setTool: (name: string) => void;
	save: () => void;
	undo: () => void;
	redo: () => void;
	toggleVertexLabels: () => void;
	toggleSpawnPoints: () => void;
}

export interface OverlayToggleButtonState {
	labelsButton: HTMLElement;
	spawnsButton: HTMLElement;
	showVertexLabels: boolean;
	showSpawnPoints: boolean;
}

export function bindToolbarButtons({
	doc = document,
	fileInput,
	openButton,
	saveButton,
	undoButton,
	redoButton,
	toggleLabelsButton,
	toggleSpawnsButton,
	isDirty,
	confirmDiscard,
	setTool,
	save,
	undo,
	redo,
	toggleVertexLabels,
	toggleSpawnPoints,
}: ToolbarBindingsOptions): void {
	doc.querySelectorAll<HTMLElement>("[data-tool]").forEach((button) => {
		button.addEventListener("click", () => {
			const tool = button.dataset.tool;
			if (tool) setTool(tool);
		});
	});

	openButton.addEventListener("click", () => {
		if (
			isDirty() &&
			!confirmDiscard("You have unsaved changes. Discard and open a file?")
		) {
			return;
		}
		fileInput.click();
	});
	saveButton.addEventListener("click", () => save());
	undoButton.addEventListener("click", () => undo());
	redoButton.addEventListener("click", () => redo());
	toggleLabelsButton.addEventListener("click", () => toggleVertexLabels());
	toggleSpawnsButton.addEventListener("click", () => toggleSpawnPoints());
}

export function syncOverlayToggleButtons({
	labelsButton,
	spawnsButton,
	showVertexLabels,
	showSpawnPoints,
}: OverlayToggleButtonState): void {
	labelsButton.classList.toggle("active", showVertexLabels);
	spawnsButton.classList.toggle("active", showSpawnPoints);
}
