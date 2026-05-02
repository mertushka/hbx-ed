import type { WorldPoint } from "../core/camera.ts";

export interface Tool {
	readonly name: string;
	readonly cursor: string;

	onMouseDown?(pos: WorldPoint, event: MouseEvent): void;
	onMouseMove?(pos: WorldPoint, event: MouseEvent): void;
	onMouseUp?(pos: WorldPoint, event: MouseEvent): void;
	/** Called when switching away from this tool. */
	onDeactivate?(): void;
}
