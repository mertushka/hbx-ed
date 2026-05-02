import { clamp } from "../utils/math.ts";

export interface WorldPoint {
	x: number;
	y: number;
}

export interface ScreenPoint {
	x: number;
	y: number;
}

export class Camera {
	x = 0;
	y = 0;
	zoom = 1;

	worldToScreen(
		wx: number,
		wy: number,
		canvasW: number,
		canvasH: number,
	): ScreenPoint {
		return {
			x: (wx - this.x) * this.zoom + canvasW / 2,
			y: (wy - this.y) * this.zoom + canvasH / 2,
		};
	}

	screenToWorld(
		sx: number,
		sy: number,
		canvasW: number,
		canvasH: number,
	): WorldPoint {
		return {
			x: (sx - canvasW / 2) / this.zoom + this.x,
			y: (sy - canvasH / 2) / this.zoom + this.y,
		};
	}

	/** Zoom toward a world anchor point. */
	zoomAt(factor: number, anchorX: number, anchorY: number): void {
		const newZoom = clamp(this.zoom * factor, 0.05, 20);
		const actualFactor = newZoom / this.zoom;
		this.x = anchorX - (anchorX - this.x) / actualFactor;
		this.y = anchorY - (anchorY - this.y) / actualFactor;
		this.zoom = newZoom;
	}

	/** Fit the camera to a rectangle centered at origin. */
	fitRect(rectW: number, rectH: number, viewW: number, viewH: number): void {
		this.x = 0;
		this.y = 0;
		this.zoom = Math.min(viewW / (rectW * 1.3), viewH / (rectH * 1.3));
	}

	get zoomPercent(): number {
		return Math.round(this.zoom * 100);
	}
}
