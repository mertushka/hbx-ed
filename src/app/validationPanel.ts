import { validateStadium } from "../core/validator.ts";
import type { StadiumObject } from "../types/stadium.ts";

const MAX_VISIBLE_ISSUES = 5;

export function renderValidationPanel(
	panel: HTMLElement | null,
	stadium: StadiumObject | null,
): void {
	if (!panel) return;
	panel.innerHTML = "";
	if (!stadium) return;

	const issues = validateStadium(stadium);
	for (const issue of issues.slice(0, MAX_VISIBLE_ISSUES)) {
		panel.appendChild(createValidationItem(issue.severity, issue.message));
	}

	if (issues.length > MAX_VISIBLE_ISSUES) {
		panel.appendChild(
			createValidationItem(
				"warn",
				`…and ${issues.length - MAX_VISIBLE_ISSUES} more issues`,
			),
		);
	}
}

function createValidationItem(
	severity: "error" | "warn",
	message: string,
): HTMLElement {
	const div = document.createElement("div");
	div.className = `validation-item${severity === "warn" ? " warn" : ""}`;
	div.textContent = `${severity === "error" ? "✖" : "⚠"} ${message}`;
	div.title = "Click to dismiss";
	div.addEventListener("click", () => div.remove());
	return div;
}
