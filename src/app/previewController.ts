import { Camera } from "../core/camera.ts";
import { PreviewRenderer } from "../renderer/previewRenderer.ts";
import type { StadiumObject } from "../types/stadium.ts";
import {
	distanceBetweenTouches,
	firstTouch,
	midpointBetweenTouches,
} from "./touchGestures.ts";

export interface PreviewControllerOptions {
	canvas: HTMLCanvasElement;
	overlay: HTMLElement;
	title: HTMLElement;
	openButton: HTMLElement;
	closeButton: HTMLElement;
	exportButton: HTMLElement;
	zoomInButton: HTMLElement;
	zoomOutButton: HTMLElement;
	zoomFitButton: HTMLElement;
	getStadium: () => StadiumObject | null;
	toast: (message: string) => void;
}

export class PreviewController {
	private readonly canvas: HTMLCanvasElement;
	private readonly overlay: HTMLElement;
	private readonly title: HTMLElement;
	private readonly getStadium: () => StadiumObject | null;
	private readonly toast: (message: string) => void;
	private readonly renderer: PreviewRenderer;
	private readonly camera = new Camera();
	private open = false;

	constructor(options: PreviewControllerOptions) {
		this.canvas = options.canvas;
		this.overlay = options.overlay;
		this.title = options.title;
		this.getStadium = options.getStadium;
		this.toast = options.toast;
		this.renderer = new PreviewRenderer(this.canvas, () => this.render());

		options.openButton.addEventListener("click", () => this.openPreview());
		options.closeButton.addEventListener("click", () => this.close());
		options.exportButton.addEventListener("click", () => this.exportPng());
		options.zoomInButton.addEventListener("click", () => this.zoom(1.25));
		options.zoomOutButton.addEventListener("click", () => this.zoom(1 / 1.25));
		options.zoomFitButton.addEventListener("click", () => this.fitAndRender());

		this.bindCanvas();
	}

	get isOpen(): boolean {
		return this.open;
	}

	render(): void {
		const stadium = this.getStadium();
		if (!stadium || !this.open) return;
		this.renderer.render(stadium, this.camera);
	}

	resizeIfOpen(): void {
		if (!this.open) return;
		this.resize();
		this.render();
	}

	close(): void {
		this.open = false;
		this.overlay.classList.remove("active");
	}

	private openPreview(): void {
		const stadium = this.getStadium();
		if (!stadium) {
			this.toast("Load a stadium first");
			return;
		}

		this.open = true;
		this.overlay.classList.add("active");
		this.resize();
		this.fitCamera(stadium);
		this.title.textContent = `Preview — ${stadium.name}`;
		this.render();
	}

	private resize(): void {
		this.renderer.resize(this.canvas.clientWidth, this.canvas.clientHeight);
	}

	private fitCamera(stadium: StadiumObject): void {
		this.camera.fitRect(
			stadium.width,
			stadium.height,
			this.renderer.width,
			this.renderer.height,
		);
	}

	private fitAndRender(): void {
		const stadium = this.getStadium();
		if (!stadium) return;
		this.fitCamera(stadium);
		this.render();
	}

	private zoom(factor: number): void {
		this.camera.zoomAt(factor, this.camera.x, this.camera.y);
		this.render();
	}

	private exportPng(): void {
		const stadium = this.getStadium();
		if (!stadium) return;

		const url = this.canvas.toDataURL("image/png");
		const a = document.createElement("a");
		a.href = url;
		a.download = `${(stadium.name ?? "stadium").replace(/\s+/g, "_")}.png`;
		a.click();
		this.toast(`Exported ${a.download}`);
	}

	private bindCanvas(): void {
		let panning = false;
		let panStart = { x: 0, y: 0 };
		let camOrigin = { x: 0, y: 0 };
		let pinchDistance: number | null = null;
		const stopPanning = (): void => {
			panning = false;
			pinchDistance = null;
			this.canvas.style.cursor = "grab";
		};

		this.canvas.addEventListener("mousedown", (e) => {
			panning = true;
			panStart = { x: e.clientX, y: e.clientY };
			camOrigin = { x: this.camera.x, y: this.camera.y };
			this.canvas.style.cursor = "grabbing";
		});
		this.canvas.addEventListener("mousemove", (e) => {
			if (!panning) return;
			this.panTo(e.clientX, e.clientY, panStart, camOrigin);
		});
		this.canvas.addEventListener("mouseup", stopPanning);
		this.canvas.addEventListener("mouseleave", stopPanning);
		this.canvas.style.cursor = "grab";

		this.canvas.addEventListener(
			"touchstart",
			(e) => {
				e.preventDefault();
				if (e.touches.length > 1) {
					panning = false;
					pinchDistance = distanceBetweenTouches(e.touches);
					this.canvas.style.cursor = "grab";
					return;
				}
				const touch = firstTouch(e.touches);
				if (!touch) return;
				panning = true;
				pinchDistance = null;
				panStart = { x: touch.clientX, y: touch.clientY };
				camOrigin = { x: this.camera.x, y: this.camera.y };
				this.canvas.style.cursor = "grabbing";
			},
			{ passive: false },
		);
		this.canvas.addEventListener(
			"touchmove",
			(e) => {
				e.preventDefault();
				if (e.touches.length > 1) {
					panning = false;
					const distance = distanceBetweenTouches(e.touches);
					if (distance === null) return;
					if (pinchDistance !== null && pinchDistance > 0) {
						this.zoomAtTouchMidpoint(distance / pinchDistance, e.touches);
					}
					pinchDistance = distance;
					return;
				}
				pinchDistance = null;
				if (!panning) return;
				const touch = firstTouch(e.touches);
				if (!touch) return;
				this.panTo(touch.clientX, touch.clientY, panStart, camOrigin);
			},
			{ passive: false },
		);
		this.canvas.addEventListener("touchend", stopPanning);
		this.canvas.addEventListener("touchcancel", stopPanning);

		this.canvas.addEventListener(
			"wheel",
			(e) => {
				e.preventDefault();
				const factor = e.deltaY > 0 ? 0.85 : 1 / 0.85;
				const rect = this.canvas.getBoundingClientRect();
				const world = this.camera.screenToWorld(
					e.clientX - rect.left,
					e.clientY - rect.top,
					this.renderer.width,
					this.renderer.height,
				);
				this.camera.zoomAt(factor, world.x, world.y);
				this.render();
			},
			{ passive: false },
		);
	}

	private panTo(
		clientX: number,
		clientY: number,
		panStart: { x: number; y: number },
		camOrigin: { x: number; y: number },
	): void {
		this.camera.x = camOrigin.x - (clientX - panStart.x) / this.camera.zoom;
		this.camera.y = camOrigin.y - (clientY - panStart.y) / this.camera.zoom;
		this.render();
	}

	private zoomAtTouchMidpoint(factor: number, touches: TouchList): void {
		const midpoint = midpointBetweenTouches(touches);
		const rect = this.canvas.getBoundingClientRect();
		const world = this.camera.screenToWorld(
			midpoint.clientX - rect.left,
			midpoint.clientY - rect.top,
			this.renderer.width,
			this.renderer.height,
		);
		this.camera.zoomAt(factor, world.x, world.y);
		this.render();
	}
}
