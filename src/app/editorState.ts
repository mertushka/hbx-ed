import { History } from "../core/history.ts";
import type {
	MultiSelection,
	Selection,
	StadiumObject,
} from "../types/stadium.ts";

export class EditorState {
	readonly history = new History<StadiumObject>();

	private currentStadium: StadiumObject | null = null;
	private currentSelection: Selection | null = null;
	private currentMultiSelection: MultiSelection | null = null;

	get stadium(): StadiumObject | null {
		return this.currentStadium;
	}

	set stadium(stadium: StadiumObject | null) {
		this.currentStadium = stadium;
	}

	get selection(): Selection | null {
		return this.currentSelection;
	}

	set selection(selection: Selection | null) {
		this.currentSelection = selection;
	}

	get multiSelection(): MultiSelection | null {
		return this.currentMultiSelection;
	}

	set multiSelection(multiSelection: MultiSelection | null) {
		this.currentMultiSelection = multiSelection;
	}

	load(stadium: StadiumObject): void {
		this.currentStadium = stadium;
		this.currentSelection = null;
		this.currentMultiSelection = null;
		this.history.clear();
		this.history.save(stadium);
	}

	select(selection: Selection | null): void {
		this.currentSelection = selection;
		if (selection !== null) this.currentMultiSelection = null;
	}

	setMultiSelection(multiSelection: MultiSelection | null): void {
		this.currentMultiSelection = multiSelection;
		if (multiSelection) this.currentSelection = null;
	}

	clearMultiSelection(): boolean {
		if (!this.currentMultiSelection) return false;
		this.currentMultiSelection = null;
		return true;
	}

	saveMutation(): boolean {
		if (!this.currentStadium) return false;
		this.history.save(this.currentStadium);
		return true;
	}

	undo(): StadiumObject | null {
		const previous = this.history.undo();
		if (!previous) return null;
		this.currentStadium = previous;
		this.currentSelection = null;
		this.currentMultiSelection = null;
		return previous;
	}

	redo(): StadiumObject | null {
		const next = this.history.redo();
		if (!next) return null;
		this.currentStadium = next;
		this.currentSelection = null;
		this.currentMultiSelection = null;
		return next;
	}
}
