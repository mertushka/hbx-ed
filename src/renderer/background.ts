import type { Camera } from "../core/camera.ts";
import type { Background } from "../types/stadium.ts";
import { parseColor } from "../utils/color.ts";
import type { TexturePatterns } from "./textures.ts";

export interface CanvasSize {
	width: number;
	height: number;
}

export function drawEditorBackground(
	ctx: CanvasRenderingContext2D,
	bg: Background,
	camera: Camera,
	patterns: TexturePatterns | null,
	canvasSize: CanvasSize,
): void {
	const { zoom } = camera;
	const type = bg.type ?? "none";
	if (type === "none") return;

	// bg.width and bg.height in .hbs are half-extents.
	const W = bg.width ?? 0;
	const H = bg.height ?? 0;
	const cr = bg.cornerRadius ?? 0;
	const ko = bg.kickOffRadius ?? 0;
	const bgFill = parseColor(bg.color) ?? "#718C5A";

	if (type === "grass") {
		drawRoundedRect(ctx, -W, -H, 2 * W, 2 * H, cr);
		if (patterns) {
			ctx.save();
			ctx.scale(2, 2);
			ctx.fillStyle = patterns.grass;
			ctx.fill();
			ctx.restore();
		} else {
			ctx.fillStyle = bgFill;
			ctx.fill();
		}
	} else if (type === "hockey") {
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

		drawRoundedRect(ctx, -W, -H, 2 * W, 2 * H, cr);
		if (patterns) {
			ctx.save();
			ctx.scale(2, 2);
			ctx.fillStyle = patterns.concrete;
			ctx.fill();
			ctx.restore();
		} else {
			ctx.fillStyle = bgFill;
			ctx.fill();
		}
	} else {
		ctx.fillStyle = bgFill;
		drawRoundedRect(ctx, -W, -H, 2 * W, 2 * H, cr);
		ctx.fill();
	}

	ctx.strokeStyle = type === "grass" ? "rgba(199,230,189,0.8)" : "#E9CC6E";
	ctx.lineWidth = 2 / zoom;

	drawRoundedRect(ctx, -W, -H, 2 * W, 2 * H, cr);
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(0, -H);
	ctx.lineTo(0, H);
	ctx.stroke();

	if (ko > 0) {
		ctx.beginPath();
		ctx.arc(0, 0, ko, 0, Math.PI * 2);
		ctx.stroke();
	}

	if (type === "hockey") {
		const gl = bg.goalLine ?? 0;
		let glX = W - gl;
		if (gl < cr) glX = 0;

		ctx.strokeStyle = "rgba(133,172,243,0.7)";
		ctx.beginPath();
		ctx.arc(0, 0, ko, -Math.PI / 2, Math.PI / 2, false);
		if (glX !== 0) {
			ctx.moveTo(glX, -H);
			ctx.lineTo(glX, H);
		}
		ctx.stroke();

		ctx.strokeStyle = "rgba(225,137,119,0.7)";
		ctx.beginPath();
		ctx.arc(0, 0, ko, -Math.PI / 2, Math.PI / 2, true);
		if (glX !== 0) {
			ctx.moveTo(-glX, -H);
			ctx.lineTo(-glX, H);
		}
		ctx.stroke();
	}
}

function drawRoundedRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
): void {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + w - r, y);
	ctx.arcTo(x + w, y, x + w, y + r, r);
	ctx.lineTo(x + w, y + h - r);
	ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
	ctx.lineTo(x + r, y + h);
	ctx.arcTo(x, y + h, x, y + h - r, r);
	ctx.lineTo(x, y + r);
	ctx.arcTo(x, y, x + r, y, r);
	ctx.closePath();
}
