import type { Camera } from "../core/camera.ts";

const COL_GRID = "rgba(255,255,255,0.04)";
const COL_AXIS = "rgba(255,255,255,0.12)";

export function calcGridStep(zoom: number): number {
	const candidates = [5, 10, 20, 25, 50, 100, 200, 500, 1000];
	const targetPx = 60;
	for (const candidate of candidates) {
		if (candidate * zoom >= targetPx) return candidate;
	}
	return 1000;
}

export function drawEditorGrid(
	ctx: CanvasRenderingContext2D,
	camera: Camera,
	width: number,
	height: number,
): void {
	const step = calcGridStep(camera.zoom);
	const p0 = camera.screenToWorld(0, 0, width, height);
	const p1 = camera.screenToWorld(width, height, width, height);

	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.strokeStyle = COL_GRID;
	ctx.lineWidth = 1;

	const startX = Math.floor(p0.x / step) * step;
	for (let wx = startX; wx <= p1.x; wx += step) {
		const sx = (wx - camera.x) * camera.zoom + width / 2;
		ctx.beginPath();
		ctx.moveTo(sx, 0);
		ctx.lineTo(sx, height);
		ctx.stroke();
	}

	const startY = Math.floor(p0.y / step) * step;
	for (let wy = startY; wy <= p1.y; wy += step) {
		const sy = (wy - camera.y) * camera.zoom + height / 2;
		ctx.beginPath();
		ctx.moveTo(0, sy);
		ctx.lineTo(width, sy);
		ctx.stroke();
	}

	ctx.strokeStyle = COL_AXIS;
	const ox = -camera.x * camera.zoom + width / 2;
	const oy = -camera.y * camera.zoom + height / 2;
	ctx.beginPath();
	ctx.moveTo(ox, 0);
	ctx.lineTo(ox, height);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(0, oy);
	ctx.lineTo(width, oy);
	ctx.stroke();

	ctx.restore();
}
