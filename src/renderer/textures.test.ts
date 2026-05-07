import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TexturePatternCache } from "./textures.ts";

class MockImage extends EventTarget {
	static instances: MockImage[] = [];

	complete = false;
	naturalWidth = 0;
	src = "";

	constructor() {
		super();
		MockImage.instances.push(this);
	}

	load(width = 16): void {
		this.complete = true;
		this.naturalWidth = width;
		this.dispatchEvent(new Event("load"));
	}
}

function mockContext(pattern: CanvasPattern | null = {} as CanvasPattern) {
	return {
		createPattern: vi.fn(() => pattern),
	} as unknown as CanvasRenderingContext2D & {
		createPattern: ReturnType<typeof vi.fn>;
	};
}

describe("TexturePatternCache", () => {
	const RealImage = globalThis.Image;

	beforeEach(() => {
		MockImage.instances = [];
		globalThis.Image = MockImage as unknown as typeof Image;
	});

	afterEach(() => {
		globalThis.Image = RealImage;
	});

	it("waits for all texture images before creating cached patterns", () => {
		const onLoad = vi.fn();
		const ctx = mockContext();
		const cache = new TexturePatternCache(ctx, onLoad);

		expect(cache.ready).toBe(false);
		expect(cache.getPatterns()).toBeNull();
		expect(ctx.createPattern).not.toHaveBeenCalled();

		for (const image of MockImage.instances) image.load();

		expect(onLoad).toHaveBeenCalledTimes(3);
		expect(cache.ready).toBe(true);

		const first = cache.getPatterns();
		const second = cache.getPatterns();

		expect(first).toEqual({
			concrete: expect.any(Object),
			concrete2: expect.any(Object),
			grass: expect.any(Object),
		});
		expect(second).toBe(first);
		expect(ctx.createPattern).toHaveBeenCalledTimes(3);
	});

	it("throws when the canvas cannot create a texture pattern", () => {
		const ctx = mockContext(null);
		const cache = new TexturePatternCache(ctx);
		for (const image of MockImage.instances) image.load();

		expect(() => cache.getPatterns()).toThrow(
			"Could not create grass texture pattern",
		);
	});
});
