/**
 * PreviewRenderer faithfully mirrors the HaxBall game-style stadium view.
 *
 * Pipeline:
 * 1. Background field
 * 2. Visible segments
 * 3. Visible joints
 * 4. Discs
 * 5. Spawn point overlay for editor preview convenience
 */

import type { Camera } from "../core/camera.ts";
import type { StadiumObject } from "../types/stadium.ts";
import { drawPreviewBackground } from "./previewBackground.ts";
import {
	drawPreviewDisc,
	drawPreviewJoint,
	drawPreviewSegment,
	drawPreviewSpawnPoints,
} from "./previewPrimitives.ts";
import { TexturePatternCache } from "./textures.ts";

export class PreviewRenderer {
	private readonly canvas: HTMLCanvasElement;
	readonly ctx: CanvasRenderingContext2D;
	private readonly textures: TexturePatternCache;

	constructor(canvas: HTMLCanvasElement, onTextureLoad?: () => void) {
		this.canvas = canvas;
		const ctx = canvas.getContext("2d", { alpha: false });
		if (!ctx)
			throw new Error("Could not acquire 2D context for preview canvas");
		this.ctx = ctx;
		this.textures = new TexturePatternCache(ctx, onTextureLoad);
	}

	resize(width: number, height: number): void {
		this.canvas.width = width;
		this.canvas.height = height;
	}

	get width(): number {
		return this.canvas.width;
	}

	get height(): number {
		return this.canvas.height;
	}

	render(stadium: StadiumObject, camera: Camera): void {
		const { ctx } = this;
		const W = this.canvas.width;
		const H = this.canvas.height;
		const patterns = this.textures.getPatterns();

		ctx.fillStyle = "#000000";
		ctx.fillRect(0, 0, W, H);

		ctx.save();
		try {
			ctx.translate(W / 2, H / 2);
			ctx.scale(camera.zoom, camera.zoom);
			ctx.translate(-camera.x, -camera.y);

			ctx.lineWidth = 3 / camera.zoom;
			drawPreviewBackground(ctx, stadium, camera, patterns, {
				width: this.canvas.width,
				height: this.canvas.height,
			});

			ctx.lineWidth = 3 / camera.zoom;
			ctx.imageSmoothingEnabled = false;
			for (const seg of stadium.segments) {
				drawPreviewSegment(ctx, seg, stadium.vertexes, stadium.traits);
			}

			for (const joint of stadium.joints) {
				drawPreviewJoint(ctx, joint, stadium.discs);
			}

			ctx.lineWidth = 2 / camera.zoom;
			ctx.imageSmoothingEnabled = true;
			for (const disc of stadium.discs) {
				drawPreviewDisc(ctx, disc, stadium.traits);
			}

			drawPreviewSpawnPoints(
				ctx,
				stadium.redSpawnPoints ?? [],
				"#ff4d6d",
				camera.zoom,
			);
			drawPreviewSpawnPoints(
				ctx,
				stadium.blueSpawnPoints ?? [],
				"#4d9eff",
				camera.zoom,
			);
		} finally {
			ctx.restore();
		}
	}
}
