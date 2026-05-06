const TOOL_KEYS: Record<string, string> = {
	v: "select",
	h: "pan",
	a: "vertex",
	s: "segment",
	d: "disc",
	g: "goal",
	p: "plane",
	j: "joint",
	r: "spawn-red",
	b: "spawn-blue",
};

export interface KeyboardBindingsOptions {
	doc?: Document;
	win?: Window;
	shortcutModal: HTMLElement;
	shortcutClose: HTMLElement;
	newModal: HTMLElement | null;
	setShiftHeld: (held: boolean) => void;
	undo: () => void;
	redo: () => void;
	save: () => void;
	duplicate: () => void;
	copy: () => void;
	paste: () => void;
	deleteSelected: () => void;
	setTool: (name: string) => void;
	toggleVertexLabels: () => void;
	toggleSpawnPoints: () => void;
	isPreviewOpen: () => boolean;
	closePreview: () => void;
	clearMultiSelection: () => boolean;
	clearSelection: () => void;
}

export function bindKeyboard({
	doc = document,
	win = window,
	shortcutModal,
	shortcutClose,
	newModal,
	setShiftHeld,
	undo,
	redo,
	save,
	duplicate,
	copy,
	paste,
	deleteSelected,
	setTool,
	toggleVertexLabels,
	toggleSpawnPoints,
	isPreviewOpen,
	closePreview,
	clearMultiSelection,
	clearSelection,
}: KeyboardBindingsOptions): void {
	doc.addEventListener("keydown", (e) => {
		const isEditing = isEditingTarget(e.target);

		if (e.key === "Shift") {
			setShiftHeld(true);
			return;
		}

		if (
			handleCommandShortcut(
				e,
				{ undo, redo, save, duplicate, copy, paste },
				isEditing,
			)
		) {
			return;
		}

		if (isEditing) return;

		if (e.key === "Delete" || e.key === "Del") {
			e.preventDefault();
			deleteSelected();
			return;
		}

		const toolName = TOOL_KEYS[e.key.toLowerCase()];
		if (toolName) {
			setTool(toolName);
			return;
		}

		if (e.key === "i" || e.key === "I") {
			toggleVertexLabels();
			return;
		}
		if (e.key === "o" || e.key === "O") {
			toggleSpawnPoints();
			return;
		}

		if (e.key === "?" || (e.shiftKey && e.key === "/")) {
			shortcutModal.classList.add("active");
			return;
		}

		if (e.key === "Escape") {
			handleEscape({
				newModal,
				shortcutModal,
				isPreviewOpen,
				closePreview,
				clearMultiSelection,
				clearSelection,
			});
		}
	});

	doc.addEventListener("keyup", (e) => {
		if (e.key === "Shift") setShiftHeld(false);
	});

	win.addEventListener("blur", () => {
		setShiftHeld(false);
	});

	shortcutClose.addEventListener("click", () =>
		shortcutModal.classList.remove("active"),
	);
	shortcutModal.addEventListener("click", (e) => {
		if (e.target === shortcutModal) shortcutModal.classList.remove("active");
	});
}

function handleCommandShortcut(
	e: KeyboardEvent,
	actions: Pick<
		KeyboardBindingsOptions,
		"undo" | "redo" | "save" | "duplicate" | "copy" | "paste"
	>,
	isEditing: boolean,
): boolean {
	if (!e.ctrlKey && !e.metaKey) return false;

	const key = e.key.toLowerCase();
	if (isEditing && key !== "s") return false;

	if (key === "z" && !e.shiftKey) {
		e.preventDefault();
		actions.undo();
		return true;
	}
	if (key === "y" || (e.shiftKey && key === "z")) {
		e.preventDefault();
		actions.redo();
		return true;
	}
	if (key === "s") {
		e.preventDefault();
		actions.save();
		return true;
	}
	if (key === "d") {
		e.preventDefault();
		actions.duplicate();
		return true;
	}
	if (key === "c") {
		e.preventDefault();
		actions.copy();
		return true;
	}
	if (key === "v") {
		e.preventDefault();
		actions.paste();
		return true;
	}

	return false;
}

function handleEscape({
	newModal,
	shortcutModal,
	isPreviewOpen,
	closePreview,
	clearMultiSelection,
	clearSelection,
}: Pick<
	KeyboardBindingsOptions,
	| "newModal"
	| "shortcutModal"
	| "isPreviewOpen"
	| "closePreview"
	| "clearMultiSelection"
	| "clearSelection"
>): void {
	if (isPreviewOpen()) {
		closePreview();
		return;
	}
	if (newModal?.classList.contains("active")) {
		newModal.classList.remove("active");
		return;
	}
	if (shortcutModal.classList.contains("active")) {
		shortcutModal.classList.remove("active");
		return;
	}
	if (clearMultiSelection()) return;
	clearSelection();
}

function isEditingTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	return (
		target.tagName === "INPUT" ||
		target.tagName === "SELECT" ||
		target.tagName === "TEXTAREA"
	);
}
