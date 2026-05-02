import type { HBSColor } from "../types/stadium.ts";

/** Convert any HBS color representation to CSS rgba() string, or null for transparent. */
export function parseColor(
	color: HBSColor | undefined | null,
	alpha = 1,
): string | null {
	if (color == null || color === "transparent") return null;

	if (Array.isArray(color)) {
		return `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
	}

	if (typeof color === "string") {
		if (/^[0-9A-Fa-f]{6}$/.test(color)) {
			const r = parseInt(color.slice(0, 2), 16);
			const g = parseInt(color.slice(2, 4), 16);
			const b = parseInt(color.slice(4, 6), 16);
			return `rgba(${r},${g},${b},${alpha})`;
		}
		return color; // pass-through for named CSS colors or "transparent"
	}

	return null;
}

/** Convert any HBS color to a CSS hex string (#RRGGBB). Falls back to #ffffff. */
export function colorToHex(color: HBSColor | undefined | null): string {
	if (!color || color === "transparent") return "#ffffff";

	if (Array.isArray(color)) {
		return `#${color.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
	}

	if (typeof color === "string") {
		if (/^[0-9A-Fa-f]{6}$/.test(color)) return `#${color}`;
	}

	return "#ffffff";
}

/** Convert a CSS hex string (#RRGGBB or RRGGBB) to the HBS 6-char uppercase string. */
export function hexToHbs(hex: string): string {
	return hex.replace("#", "").toUpperCase();
}
