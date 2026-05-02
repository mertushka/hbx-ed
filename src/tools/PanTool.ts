import type { Camera, WorldPoint } from "../core/camera.ts";
import type { AppContext } from "./context.ts";
import type { Tool } from "./types.ts";

export class PanTool implements Tool {
	readonly name = "pan";
	readonly cursor = "grab";

	private dragging = false;
	private startScreen = { x: 0, y: 0 };
	private camOrigin = { x: 0, y: 0 };
	private readonly appCtx: AppContext;
	private readonly camera: Camera;
	private readonly getScreenPos: (e: MouseEvent) => { x: number; y: number };

	constructor(
		appCtx: AppContext,
		camera: Camera,
		getScreenPos: (e: MouseEvent) => { x: number; y: number },
	) {
		this.appCtx = appCtx;
		this.camera = camera;
		this.getScreenPos = getScreenPos;
	}

	onMouseDown(_pos: WorldPoint, event: MouseEvent): void {
		this.dragging = true;
		this.startScreen = this.getScreenPos(event);
		this.camOrigin = { x: this.camera.x, y: this.camera.y };
		document.body.style.cursor = "grabbing";
	}

	onMouseMove(_pos: WorldPoint, event: MouseEvent): void {
		if (!this.dragging) return;
		const screen = this.getScreenPos(event);
		this.camera.x =
			this.camOrigin.x - (screen.x - this.startScreen.x) / this.camera.zoom;
		this.camera.y =
			this.camOrigin.y - (screen.y - this.startScreen.y) / this.camera.zoom;
		this.appCtx.refresh();
	}

	onMouseUp(): void {
		this.dragging = false;
		document.body.style.cursor = "";
	}

	onDeactivate(): void {
		this.dragging = false;
		document.body.style.cursor = "";
	}
}
