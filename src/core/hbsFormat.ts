import { parse } from "json5";

import type { StadiumObject } from "../types/stadium.ts";

export function parseHbs(text: string): StadiumObject {
	try {
		return parse(text) as StadiumObject;
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		throw new Error(`HBS parse error: ${msg}`);
	}
}

export function serializeHbs(stadium: StadiumObject): string {
	return JSON.stringify(stadium, stripExportOnlyFields, 2);
}

function stripExportOnlyFields(key: string, value: unknown): unknown {
	if (key === "curveF") return undefined;
	return value;
}
