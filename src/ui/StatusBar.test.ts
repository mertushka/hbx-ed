import { beforeEach, describe, expect, it } from "vitest";

import { StatusBar } from "./StatusBar.ts";

describe("StatusBar", () => {
	beforeEach(() => {
		document.body.innerHTML = `
			<div id="status-coords"></div>
			<div id="status-zoom"></div>
			<div id="status-sel"></div>
		`;
	});

	it("updates coordinates, zoom, and selection text", () => {
		const status = new StatusBar();

		status.setCoords(1.234, -5.678);
		status.setZoom(125);
		status.setSelection("vertex #2");

		expect(document.getElementById("status-coords")?.textContent).toBe(
			"x: 1.2  y: -5.7",
		);
		expect(document.getElementById("status-zoom")?.textContent).toBe(
			"zoom: 125%",
		);
		expect(document.getElementById("status-sel")?.textContent).toBe(
			"vertex #2",
		);
	});

	it("throws when a required element is missing", () => {
		document.body.innerHTML = '<div id="status-coords"></div>';

		expect(() => new StatusBar()).toThrow("Element not found: #status-zoom");
	});
});
