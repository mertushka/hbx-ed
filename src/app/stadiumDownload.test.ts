import { describe, expect, it } from "vitest";

import { parseHbs } from "../core/hbsFormat.ts";
import type { StadiumObject } from "../types/stadium.ts";
import { createStadiumDownload } from "./stadiumDownload.ts";

function stadium(): StadiumObject {
	return {
		name: "Save Me",
		width: 100,
		height: 50,
		traits: {},
		bg: { type: "grass", width: Infinity },
		vertexes: [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
		],
		segments: [{ v0: 0, v1: 1, curveF: 1 }],
		goals: [],
		discs: [],
		planes: [],
		joints: [],
	};
}

describe("createStadiumDownload", () => {
	it("builds an hbs download without losing JSON5-only values", () => {
		const download = createStadiumDownload(stadium());

		expect(download.filename).toBe("Save_Me.hbs");
		expect(download.mimeType).toBe("application/json");
		expect(download.contents).toContain("width: Infinity");
		expect(download.contents).not.toContain("curveF");
		expect(parseHbs(download.contents).bg?.width).toBe(Infinity);
	});

	it("sanitizes unsafe stadium names for download filenames", () => {
		const unsafe = stadium();
		unsafe.name = " Classic / Big: Easy? ";

		expect(createStadiumDownload(unsafe).filename).toBe("Classic_Big_Easy.hbs");

		const hidden = stadium();
		hidden.name = ".env";

		expect(createStadiumDownload(hidden).filename).toBe("download_env.hbs");

		const empty = stadium();
		empty.name = "***";

		expect(createStadiumDownload(empty).filename).toBe("stadium.hbs");
	});
});
