export interface FileBindingsOptions {
	fileInput: HTMLInputElement;
	canvasArea: HTMLElement;
	dropOverlay: HTMLElement;
	isDirty: () => boolean;
	confirmDiscard: (message: string) => boolean;
	readFile: (file: File) => void;
}

export function bindFileIO({
	fileInput,
	canvasArea,
	dropOverlay,
	isDirty,
	confirmDiscard,
	readFile,
}: FileBindingsOptions): void {
	fileInput.addEventListener("change", () => {
		const file = fileInput.files?.[0];
		if (!file) return;
		readFile(file);
		fileInput.value = "";
	});

	canvasArea.addEventListener("dragover", (e) => {
		e.preventDefault();
		dropOverlay.classList.add("active");
	});

	canvasArea.addEventListener("dragleave", () =>
		dropOverlay.classList.remove("active"),
	);

	canvasArea.addEventListener("drop", (e) => {
		e.preventDefault();
		dropOverlay.classList.remove("active");
		const file = e.dataTransfer?.files[0];
		if (!file) return;
		if (
			isDirty() &&
			!confirmDiscard("You have unsaved changes. Discard and open this file?")
		) {
			return;
		}
		readFile(file);
	});
}
