import { serializeHbs } from "../core/hbsFormat.ts";
import type { StadiumObject } from "../types/stadium.ts";

export interface StadiumDownload {
	filename: string;
	contents: string;
	mimeType: "application/json";
}

export function createStadiumDownload(stadium: StadiumObject): StadiumDownload {
	const filenameStem = sanitizeDownloadFilenameStem(stadium.name);

	return {
		filename: `${filenameStem}.hbs`,
		contents: serializeHbs(stadium),
		mimeType: "application/json",
	};
}

function sanitizeDownloadFilenameStem(name: string): string {
	let safeName = name
		.trim()
		.replace(/\s+/g, "_")
		.replace(/[\\/]+/g, "_")
		.replace(/[^A-Za-z0-9._-]+/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_+|_+$/g, "");

	if (!safeName) return "stadium";

	if (safeName.startsWith(".")) {
		const visibleName = safeName.replace(/^[._-]+/, "");
		safeName = visibleName ? `download_${visibleName}` : "stadium";
	}

	return safeName;
}
