import type { Severity, ValidationIssue } from "../core/validator.ts";
import { validateStadium } from "../core/validator.ts";
import type { StadiumObject } from "../types/stadium.ts";

export function renderValidationPanel(
	panel: HTMLElement | null,
	stadium: StadiumObject | null,
): void {
	if (!panel) return;

	const wasOpen =
		panel.querySelector<HTMLDetailsElement>(".validation-dock")?.open ?? false;
	panel.innerHTML = "";
	if (!stadium) return;

	const issues = validateStadium(stadium);
	if (issues.length === 0) return;

	panel.appendChild(createValidationDock(issues, wasOpen));
}

function createValidationDock(
	issues: ValidationIssue[],
	wasOpen: boolean,
): HTMLElement {
	const errorCount = issues.filter(
		(issue) => issue.severity === "error",
	).length;
	const warnCount = issues.length - errorCount;

	const dock = document.createElement("details");
	dock.className = `validation-dock${
		errorCount > 0 ? " has-errors" : " has-warnings"
	}`;
	dock.open = wasOpen;

	const summary = document.createElement("summary");
	summary.className = "validation-summary";
	summary.appendChild(createTextSpan("validation-summary-title", "Problems"));
	summary.appendChild(
		createTextSpan(
			"validation-summary-count",
			formatIssueCounts(errorCount, warnCount),
		),
	);
	dock.appendChild(summary);

	const list = document.createElement("div");
	list.className = "validation-list";
	for (const issue of issues) {
		list.appendChild(createValidationItem(issue.severity, issue.message));
	}
	dock.appendChild(list);

	return dock;
}

function createValidationItem(
	severity: Severity,
	message: string,
): HTMLElement {
	const div = document.createElement("div");
	div.className = `validation-item ${severity}`;
	div.appendChild(createTextSpan("validation-item-severity", severity));
	div.appendChild(createTextSpan("validation-item-message", message));
	return div;
}

function createTextSpan(className: string, text: string): HTMLSpanElement {
	const span = document.createElement("span");
	span.className = className;
	span.textContent = text;
	return span;
}

function formatIssueCounts(errorCount: number, warnCount: number): string {
	const parts: string[] = [];
	if (errorCount > 0) {
		parts.push(`${errorCount} ${errorCount === 1 ? "error" : "errors"}`);
	}
	if (warnCount > 0) {
		parts.push(`${warnCount} ${warnCount === 1 ? "warning" : "warnings"}`);
	}
	return parts.join(" | ");
}
