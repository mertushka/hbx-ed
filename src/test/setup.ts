import { vi } from "vitest";

const canvasContext = {
	arc: vi.fn(),
	arcTo: vi.fn(),
	beginPath: vi.fn(),
	clearRect: vi.fn(),
	closePath: vi.fn(),
	createPattern: vi.fn(() => ({})),
	fill: vi.fn(),
	fillRect: vi.fn(),
	fillText: vi.fn(),
	lineTo: vi.fn(),
	measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
	moveTo: vi.fn(),
	rect: vi.fn(),
	restore: vi.fn(),
	rotate: vi.fn(),
	save: vi.fn(),
	scale: vi.fn(),
	resetTransform: vi.fn(),
	setLineDash: vi.fn(),
	setTransform: vi.fn(),
	stroke: vi.fn(),
	strokeRect: vi.fn(),
	translate: vi.fn(),
};

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
	value: vi.fn(() => canvasContext),
});

Object.defineProperty(HTMLCanvasElement.prototype, "toDataURL", {
	value: vi.fn(() => "data:image/png;base64,test"),
});

Object.defineProperty(HTMLElement.prototype, "scrollTo", {
	value: vi.fn(),
});

Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
	value: vi.fn(),
});

Object.defineProperty(window, "requestAnimationFrame", {
	value: (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0),
});

Object.defineProperty(window, "confirm", {
	value: vi.fn(() => true),
	writable: true,
});

Object.defineProperty(window, "prompt", {
	value: vi.fn(() => null),
	writable: true,
});

Object.defineProperty(window, "alert", {
	value: vi.fn(),
	writable: true,
});

Object.defineProperty(URL, "createObjectURL", {
	value: vi.fn(() => "blob:mock"),
	writable: true,
});

Object.defineProperty(URL, "revokeObjectURL", {
	value: vi.fn(),
	writable: true,
});
