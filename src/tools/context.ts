import type { Renderer } from "../renderer/renderer.ts";
import type {
	MultiSelection,
	Selection,
	StadiumObject,
} from "../types/stadium.ts";

/** Minimal interface the tools need from App, to avoid circular imports. */
export interface AppContext {
	getStadium(): StadiumObject | null;
	getSelection(): Selection | null;
	setSelection(sel: Selection | null): void;
	getMultiSelection(): MultiSelection | null;
	setMultiSelection(ms: MultiSelection | null): void;
	saveHistory(): void;
	refresh(): void;
	toast(msg: string): void;
	renderer: Renderer;
	/** True while the Shift key is currently held. */
	isShiftHeld(): boolean;
	/** Duplicate the currently-selected object and select the copy. */
	duplicate(): void;
}
