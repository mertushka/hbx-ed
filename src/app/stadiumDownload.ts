import { serializeHbs } from "../core/hbsFormat.ts";
import type { StadiumObject } from "../types/stadium.ts";

export interface StadiumDownload {
	filename: string;
	contents: string;
	mimeType: "application/json";
}

export function createStadiumDownload(stadium: StadiumObject): StadiumDownload {
	return {
		filename: `${stadium.name.replace(/\s+/g, "_")}.hbs`,
		contents: serializeHbs(stadium),
		mimeType: "application/json",
	};
}
