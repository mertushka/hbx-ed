import { describe, expect, it, vi } from "vitest";

import { readStadiumFile } from "./stadiumFile.ts";

class MockReader extends EventTarget {
	result: string | ArrayBuffer | null = null;
	private readonly text: string;
	private readonly fail: boolean;

	constructor(text: string, fail = false) {
		super();
		this.text = text;
		this.fail = fail;
	}

	readAsText(): void {
		if (this.fail) {
			this.dispatchEvent(new Event("error"));
			return;
		}
		this.result = this.text;
		this.dispatchEvent(new Event("load"));
	}
}

function stadiumText(): string {
	return `{
		name: 'Read Me',
		width: 100,
		height: 50,
		bg: { type: 'grass', width: Infinity },
		vertexes: [],
		segments: [],
		goals: [],
		discs: [],
		planes: [],
		joints: [],
	}`;
}

describe("readStadiumFile", () => {
	it("reads and parses HBS files", () => {
		const loadStadium = vi.fn();
		const reportError = vi.fn();

		readStadiumFile(new File([""], "read.hbs"), {
			loadStadium,
			reportError,
			createReader: () => new MockReader(stadiumText()),
		});

		expect(loadStadium).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "Read Me",
				bg: expect.objectContaining({ width: Infinity }),
			}),
		);
		expect(reportError).not.toHaveBeenCalled();
	});

	it("reports parser and file-reader failures", () => {
		const loadStadium = vi.fn();
		const parseError = vi.fn();
		readStadiumFile(new File([""], "bad.hbs"), {
			loadStadium,
			reportError: parseError,
			createReader: () => new MockReader("{ bad"),
		});

		const readError = vi.fn();
		readStadiumFile(new File([""], "unreadable.hbs"), {
			loadStadium,
			reportError: readError,
			createReader: () => new MockReader("", true),
		});

		expect(loadStadium).not.toHaveBeenCalled();
		expect(parseError).toHaveBeenCalledWith(
			expect.stringContaining("Error: HBS parse error:"),
		);
		expect(readError).toHaveBeenCalledWith("Error: Could not read file");
	});
});
