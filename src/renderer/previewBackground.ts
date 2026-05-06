import type { Camera } from "../core/camera.ts";
import type { StadiumObject } from "../types/stadium.ts";
import { parseColor } from "../utils/color.ts";
import type { CanvasSize } from "./background.ts";
import type { TexturePatterns } from "./textures.ts";

export function drawPreviewBackground(
	ctx: CanvasRenderingContext2D,
	stadium: StadiumObject,
	camera: Camera,
	patterns: TexturePatterns | null,
	canvasSize: CanvasSize,
): void {
	const bg = stadium.bg;
	if (!bg) return;

	const type = bg.type ?? "none";
	const W = bg.width ?? 0;
	const H = bg.height ?? 0;
	const cr = bg.cornerRadius ?? 0;
	const ko = bg.kickOffRadius ?? 0;
	const gl = bg.goalLine ?? 0;
	const bgColor = parseColor(bg.color) ?? "rgba(113,140,90,255)";

	if (type === "grass") {
		fillCanvas(ctx, bgColor, canvasSize);

		ctx.strokeStyle = "#C7E6BD";
		roundedRect(ctx, -W, -H, 2 * W, 2 * H, cr);
		if (patterns) {
			ctx.fillStyle = patterns.grass;
			ctx.save();
			ctx.scale(2, 2);
			ctx.fill();
			ctx.restore();
		} else {
			ctx.fillStyle = bgColor;
			ctx.fill();
		}

		ctx.moveTo(0, -H);
		ctx.lineTo(0, H);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(0, 0, ko, 0, Math.PI * 2);
		ctx.stroke();
	} else if (type === "hockey") {
		ctx.save();
		const zoom = camera.zoom;
		const ext = Math.max(canvasSize.width, canvasSize.height) / zoom + 20000;
		ctx.beginPath();
		ctx.rect(camera.x - ext, camera.y - ext, ext * 2, ext * 2);
		if (patterns) {
			ctx.save();
			ctx.scale(2, 2);
			ctx.fillStyle = patterns.concrete2;
			ctx.fill();
			ctx.restore();
		} else {
			ctx.fillStyle = "#8a8f96";
			ctx.fill();
		}
		ctx.restore();

		ctx.strokeStyle = "#E9CC6E";
		roundedRect(ctx, -W, -H, 2 * W, 2 * H, cr);
		if (patterns) {
			ctx.save();
			ctx.scale(2, 2);
			ctx.fillStyle = patterns.concrete;
			ctx.fill();
			ctx.restore();
		} else {
			ctx.fillStyle = "#dce8f0";
			ctx.fill();
		}

		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(0, -H);
		ctx.setLineDash([15 / camera.zoom, 15 / camera.zoom]);
		ctx.lineTo(0, H);
		ctx.stroke();
		ctx.setLineDash([]);

		let glX = W - gl;
		if (gl < cr) glX = 0;

		drawHockeyArc(ctx, "#85ACF3", glX, H, ko, false);
		drawHockeyArc(ctx, "#E18977", -glX, H, ko, true);
	} else {
		fillCanvas(ctx, bgColor, canvasSize);
	}
}

function fillCanvas(
	ctx: CanvasRenderingContext2D,
	color: string,
	canvasSize: CanvasSize,
): void {
	ctx.save();
	ctx.resetTransform();
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
	ctx.restore();
}

function roundedRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
): void {
	const x2 = x + w;
	const y2 = y + h;
	ctx.beginPath();
	ctx.moveTo(x2 - r, y);
	ctx.arcTo(x2, y, x2, y + r, r);
	ctx.lineTo(x2, y2 - r);
	ctx.arcTo(x2, y2, x2 - r, y2, r);
	ctx.lineTo(x + r, y2);
	ctx.arcTo(x, y2, x, y2 - r, r);
	ctx.lineTo(x, y + r);
	ctx.arcTo(x, y, x + r, y, r);
	ctx.closePath();
}

function drawHockeyArc(
	ctx: CanvasRenderingContext2D,
	color: string,
	xLine: number,
	height: number,
	kickOffRadius: number,
	anticlockwise: boolean,
): void {
	ctx.beginPath();
	ctx.strokeStyle = color;
	ctx.arc(xLine, 0, kickOffRadius, -Math.PI / 2, Math.PI / 2, anticlockwise);
	if (xLine !== 0) {
		ctx.moveTo(xLine, -height);
		ctx.lineTo(xLine, height);
	}
	ctx.stroke();
}
