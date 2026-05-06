import { describe, expect, it } from "vitest";

import { History } from "./history.ts";

describe("History", () => {
	it("undoes, redoes, and truncates redo branches", () => {
		const history = new History<{ value: number }>();
		history.save({ value: 1 });
		history.save({ value: 2 });
		history.save({ value: 3 });

		expect(history.undo()).toEqual({ value: 2 });
		expect(history.canRedo).toBe(true);

		history.save({ value: 4 });
		expect(history.canRedo).toBe(false);
		expect(history.undo()).toEqual({ value: 2 });
		expect(history.redo()).toEqual({ value: 4 });
	});

	it("stores cloned snapshots instead of object references", () => {
		const history = new History<{ nested: { value: number } }>();
		const state = { nested: { value: 1 } };
		history.save(state);
		state.nested.value = 2;
		history.save(state);

		expect(history.undo()).toEqual({ nested: { value: 1 } });
	});

	it("preserves structured-cloneable numeric values like Infinity", () => {
		const history = new History<{ value: number }>();
		history.save({ value: Infinity });
		history.save({ value: 1 });

		expect(history.undo()).toEqual({ value: Infinity });
	});

	it("returns stored falsy snapshots from undo and redo", () => {
		const numbers = new History<number>();
		numbers.save(0);
		numbers.save(1);

		expect(numbers.undo()).toBe(0);

		const booleans = new History<boolean>();
		booleans.save(true);
		booleans.save(false);
		booleans.undo();

		expect(booleans.redo()).toBe(false);
	});

	it("keeps the newest 64 snapshots", () => {
		const history = new History<{ value: number }>();
		for (let i = 0; i < 70; i++) history.save({ value: i });

		let current: { value: number } | null = null;
		while (history.canUndo) current = history.undo();

		expect(current).toEqual({ value: 6 });
	});
});
