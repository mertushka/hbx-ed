import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Toast } from "./Toast.ts";

describe("Toast", () => {
	beforeEach(() => {
		document.body.innerHTML = '<div id="toast"></div>';
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("shows a message and hides it after the duration", () => {
		const toast = new Toast();
		const el = document.getElementById("toast");

		toast.show("Saved", 100);

		expect(el?.textContent).toBe("Saved");
		expect(el?.classList.contains("show")).toBe(true);

		vi.advanceTimersByTime(100);

		expect(el?.classList.contains("show")).toBe(false);
	});

	it("resets the hide timer when showing another message", () => {
		const toast = new Toast();
		const el = document.getElementById("toast");

		toast.show("First", 100);
		vi.advanceTimersByTime(50);
		toast.show("Second", 100);
		vi.advanceTimersByTime(50);

		expect(el?.textContent).toBe("Second");
		expect(el?.classList.contains("show")).toBe(true);

		vi.advanceTimersByTime(50);

		expect(el?.classList.contains("show")).toBe(false);
	});

	it("throws when the toast element is missing", () => {
		document.body.innerHTML = "";

		expect(() => new Toast()).toThrow("#toast element not found");
	});
});
