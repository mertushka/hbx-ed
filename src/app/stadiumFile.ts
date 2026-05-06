import { parseHbs } from "../core/hbsFormat.ts";
import type { StadiumObject } from "../types/stadium.ts";

interface StadiumFileReader extends EventTarget {
	readonly result: string | ArrayBuffer | null;
	readAsText(file: File): void;
}

export interface ReadStadiumFileOptions {
	loadStadium: (stadium: StadiumObject) => void;
	reportError: (message: string) => void;
	createReader?: () => StadiumFileReader;
}

export function readStadiumFile(
	file: File,
	{
		loadStadium,
		reportError,
		createReader = () => new FileReader(),
	}: ReadStadiumFileOptions,
): void {
	const reader = createReader();
	reader.addEventListener("load", () => {
		try {
			loadStadium(parseHbs(String(reader.result ?? "")));
		} catch (err) {
			reportError(formatReadError(err));
		}
	});
	reader.addEventListener("error", () => {
		reportError("Error: Could not read file");
	});
	reader.readAsText(file);
}

function formatReadError(err: unknown): string {
	return `Error: ${err instanceof Error ? err.message : String(err)}`;
}
