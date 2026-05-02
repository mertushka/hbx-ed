import concreteUrl from "../assets/concrete.png";
import concrete2Url from "../assets/concrete2.png";
import grassUrl from "../assets/grass.png";

export type TexturePatterns = {
	grass: CanvasPattern;
	concrete: CanvasPattern;
	concrete2: CanvasPattern;
};

type TextureImages = {
	grass: HTMLImageElement;
	concrete: HTMLImageElement;
	concrete2: HTMLImageElement;
};

const textureUrls = {
	grass: grassUrl,
	concrete: concreteUrl,
	concrete2: concrete2Url,
} as const;

function loadTextureImage(src: string, onLoad?: () => void): HTMLImageElement {
	const image = new Image();
	image.addEventListener("load", () => onLoad?.(), { once: true });
	image.src = src;
	return image;
}

function isReady(image: HTMLImageElement): boolean {
	return image.complete && image.naturalWidth > 0;
}

export class TexturePatternCache {
	private readonly ctx: CanvasRenderingContext2D;
	private readonly images: TextureImages;
	private patterns: TexturePatterns | null = null;

	constructor(ctx: CanvasRenderingContext2D, onLoad?: () => void) {
		this.ctx = ctx;
		this.images = {
			grass: loadTextureImage(textureUrls.grass, onLoad),
			concrete: loadTextureImage(textureUrls.concrete, onLoad),
			concrete2: loadTextureImage(textureUrls.concrete2, onLoad),
		};
	}

	get ready(): boolean {
		return (
			isReady(this.images.grass) &&
			isReady(this.images.concrete) &&
			isReady(this.images.concrete2)
		);
	}

	getPatterns(): TexturePatterns | null {
		if (!this.ready) return null;
		this.patterns ??= {
			grass: this.createPattern(this.images.grass, "grass"),
			concrete: this.createPattern(this.images.concrete, "concrete"),
			concrete2: this.createPattern(this.images.concrete2, "concrete2"),
		};
		return this.patterns;
	}

	private createPattern(
		image: HTMLImageElement,
		name: keyof TextureImages,
	): CanvasPattern {
		const pattern = this.ctx.createPattern(image, "repeat");
		if (!pattern) throw new Error(`Could not create ${name} texture pattern`);
		return pattern;
	}
}
