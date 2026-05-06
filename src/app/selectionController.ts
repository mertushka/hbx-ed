import type {
	MultiSelection,
	Selection,
	StadiumObject,
} from "../types/stadium.ts";

interface SelectionEditorState {
	readonly selection: Selection | null;
	readonly multiSelection: MultiSelection | null;
	select(selection: Selection | null): void;
	setMultiSelection(multiSelection: MultiSelection | null): void;
}

interface SelectionRenderer {
	multiSelection: MultiSelection | null;
}

interface SelectionObjectTree {
	render(
		stadium: StadiumObject | null,
		selection: Selection | null,
		multiSelection?: MultiSelection | null,
	): void;
}

interface SelectionPropertiesPanel {
	clear(): void;
	render(stadium: StadiumObject, selection: Selection): void;
}

interface SelectionStatusBar {
	setSelection(text: string): void;
}

export interface SelectionControllerOptions {
	editorState: SelectionEditorState;
	renderer: SelectionRenderer;
	objectTree: SelectionObjectTree;
	propertiesPanel: SelectionPropertiesPanel;
	statusBar: SelectionStatusBar;
	getStadium(): StadiumObject | null;
	render(): void;
}

export class SelectionController {
	private readonly editorState: SelectionEditorState;
	private readonly renderer: SelectionRenderer;
	private readonly objectTree: SelectionObjectTree;
	private readonly propertiesPanel: SelectionPropertiesPanel;
	private readonly statusBar: SelectionStatusBar;
	private readonly getStadium: () => StadiumObject | null;
	private readonly renderCanvas: () => void;

	constructor(options: SelectionControllerOptions) {
		this.editorState = options.editorState;
		this.renderer = options.renderer;
		this.objectTree = options.objectTree;
		this.propertiesPanel = options.propertiesPanel;
		this.statusBar = options.statusBar;
		this.getStadium = options.getStadium;
		this.renderCanvas = options.render;
	}

	select(selection: Selection | null): void {
		this.editorState.select(selection);
		if (selection !== null) {
			this.editorState.setMultiSelection(null);
			this.renderer.multiSelection = null;
		}

		const stadium = this.getStadium();
		this.objectTree.render(stadium, selection, this.editorState.multiSelection);

		if (!selection || !stadium) {
			this.propertiesPanel.clear();
			this.statusBar.setSelection(
				this.editorState.multiSelection
					? `${this.editorState.multiSelection.items.length} objects selected`
					: "nothing selected",
			);
		} else {
			this.propertiesPanel.render(stadium, selection);
			this.statusBar.setSelection(
				`${selection.type} #${selection.index} selected`,
			);
		}

		this.renderCanvas();
	}

	setMultiSelection(multiSelection: MultiSelection | null): void {
		this.editorState.setMultiSelection(multiSelection);
		this.renderer.multiSelection = multiSelection;

		const count = multiSelection?.items.length ?? 0;
		if (count > 1) {
			this.statusBar.setSelection(`${count} objects selected`);
		}

		this.renderCanvas();
	}

	clearMultiSelection(): boolean {
		const hadMultiSelection = this.editorState.multiSelection !== null;

		this.editorState.setMultiSelection(null);
		this.renderer.multiSelection = null;
		if (!hadMultiSelection) return false;

		this.statusBar.setSelection("nothing selected");
		this.objectTree.render(this.getStadium(), this.editorState.selection, null);
		this.renderCanvas();
		return true;
	}

	contains(selection: Selection): boolean {
		return (
			this.editorState.multiSelection?.items.some(
				(item) =>
					item.type === selection.type && item.index === selection.index,
			) ?? false
		);
	}
}
