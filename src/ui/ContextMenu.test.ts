import { beforeEach, describe, expect, it, vi } from "vitest";

import { ContextMenu } from "./ContextMenu.ts";

describe("ContextMenu", () => {
	beforeEach(() => {
		document.body.innerHTML = '<div id="ctx-menu"></div>';
	});

	it("renders items and separators, then runs an item action", () => {
		const action = vi.fn();
		const menu = new ContextMenu();

		menu.show(12, 18, [
			{ label: "Duplicate", action },
			"separator",
			{ label: "Delete", action: vi.fn(), variant: "danger" },
		]);

		const el = document.getElementById("ctx-menu");
		expect(el?.style.display).toBe("block");
		expect(el?.style.left).toBe("12px");
		expect(el?.style.top).toBe("18px");
		expect(document.querySelectorAll(".ctx-item")).toHaveLength(2);
		expect(document.querySelectorAll(".ctx-sep")).toHaveLength(1);
		expect(document.querySelector(".danger")?.textContent).toBe("Delete");

		document.querySelector<HTMLElement>(".ctx-item")?.click();

		expect(action).toHaveBeenCalledTimes(1);
		expect(el?.style.display).toBe("none");
	});

	it("clamps the menu position to the viewport", () => {
		const menu = new ContextMenu();
		const el = document.getElementById("ctx-menu");
		if (!el) throw new Error("Expected context menu element");
		el.getBoundingClientRect = vi.fn(
			() =>
				({
					width: 80,
					height: 40,
				}) as DOMRect,
		);
		Object.defineProperty(window, "innerWidth", {
			value: 100,
			configurable: true,
		});
		Object.defineProperty(window, "innerHeight", {
			value: 70,
			configurable: true,
		});

		menu.show(90, 60, [{ label: "Delete", action: vi.fn() }]);

		expect(el.style.left).toBe("12px");
		expect(el.style.top).toBe("22px");
	});

	it("hides on outside click or Escape", () => {
		const menu = new ContextMenu();
		const el = document.getElementById("ctx-menu");

		menu.show(0, 0, [{ label: "Delete", action: vi.fn() }]);
		document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		expect(el?.style.display).toBe("none");

		menu.show(0, 0, [{ label: "Delete", action: vi.fn() }]);
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		expect(el?.style.display).toBe("none");
	});

	it("throws when the menu element is missing", () => {
		document.body.innerHTML = "";

		expect(() => new ContextMenu()).toThrow("#ctx-menu element not found");
	});
});
