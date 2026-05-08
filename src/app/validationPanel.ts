import type { ValidationIssue } from "../core/validator.ts";
import { validateStadium } from "../core/validator.ts";
import type { Selection, StadiumObject } from "../types/stadium.ts";

export interface ValidationPanelOptions {
	onSelectIssue?: (target: Selection) => void;
	onSelectIssueTargets?: (targets: Selection[]) => void;
}

type ValidationFilter = "all" | "error" | "warn";

export function renderValidationPanel(
	panel: HTMLElement | null,
	stadium: StadiumObject | null,
	options: ValidationPanelOptions = {},
): void {
	if (!panel) return;

	const wasOpen =
		panel.querySelector<HTMLDetailsElement>(".validation-dock")?.open ?? false;
	const activeFilter = readActiveFilter(panel);
	panel.innerHTML = "";
	if (!stadium) return;

	const issues = validateStadium(stadium);
	if (issues.length === 0) return;

	panel.appendChild(
		createValidationDock(issues, wasOpen, activeFilter, options),
	);
}

function createValidationDock(
	issues: ValidationIssue[],
	wasOpen: boolean,
	activeFilter: ValidationFilter,
	options: ValidationPanelOptions,
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
	const rows = document.createElement("div");
	rows.className = "validation-items";

	let currentFilter = activeFilter;
	const applyFilter = (filter: ValidationFilter): void => {
		currentFilter = filter;
		for (const button of list.querySelectorAll<HTMLButtonElement>(
			"[data-validation-filter]",
		)) {
			const isActive = button.dataset.validationFilter === filter;
			button.classList.toggle("active", isActive);
			button.setAttribute("aria-pressed", String(isActive));
		}
		renderFilteredIssues(rows, issues, filter, options);
	};

	list.appendChild(
		createFilterBar({
			errorCount,
			warnCount,
			getCurrentFilter: () => currentFilter,
			onFilter: applyFilter,
		}),
	);
	list.appendChild(rows);
	applyFilter(currentFilter);
	dock.appendChild(list);

	return dock;
}

interface FilterBarOptions {
	errorCount: number;
	warnCount: number;
	getCurrentFilter: () => ValidationFilter;
	onFilter: (filter: ValidationFilter) => void;
}

function createFilterBar({
	errorCount,
	warnCount,
	getCurrentFilter,
	onFilter,
}: FilterBarOptions): HTMLElement {
	const bar = document.createElement("div");
	bar.className = "validation-filters";

	const filters: Array<{
		filter: ValidationFilter;
		label: string;
		count: number;
	}> = [
		{ filter: "all", label: "All", count: errorCount + warnCount },
		{ filter: "error", label: "Errors", count: errorCount },
		{ filter: "warn", label: "Warnings", count: warnCount },
	];

	for (const { filter, label, count } of filters) {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "validation-filter";
		button.dataset.validationFilter = filter;
		button.setAttribute("aria-pressed", String(filter === getCurrentFilter()));
		button.textContent = `${label} ${count}`;
		button.addEventListener("click", () => onFilter(filter));
		bar.appendChild(button);
	}

	return bar;
}

function renderFilteredIssues(
	container: HTMLElement,
	issues: ValidationIssue[],
	filter: ValidationFilter,
	options: ValidationPanelOptions,
): void {
	container.innerHTML = "";
	const filteredIssues =
		filter === "all"
			? issues
			: issues.filter((issue) => issue.severity === filter);

	if (filteredIssues.length === 0) {
		container.appendChild(
			createTextSpan(
				"validation-empty",
				filter === "error" ? "No errors" : "No warnings",
			),
		);
		return;
	}

	for (const issue of filteredIssues) {
		container.appendChild(createValidationItem(issue, options));
	}
}

function createValidationItem(
	issue: ValidationIssue,
	options: ValidationPanelOptions,
): HTMLElement {
	const targets = getIssueTargets(issue);
	const item: HTMLElement =
		targets.length > 0
			? document.createElement("button")
			: document.createElement("div");
	item.className = `validation-item ${issue.severity}${
		targets.length > 0 ? " is-actionable" : ""
	}`;

	if (targets.length > 0) {
		(item as HTMLButtonElement).type = "button";
		item.title = formatIssueTargetTitle(targets);
		item.addEventListener("click", () => {
			if (targets.length > 1 && options.onSelectIssueTargets) {
				options.onSelectIssueTargets?.(targets);
				return;
			}
			const target = targets[0];
			if (target) options.onSelectIssue?.(target);
		});
	}

	item.appendChild(createTextSpan("validation-item-severity", issue.severity));
	item.appendChild(createTextSpan("validation-item-message", issue.message));
	return item;
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

function readActiveFilter(panel: HTMLElement): ValidationFilter {
	const value = panel.querySelector<HTMLElement>(
		".validation-filter.active, [data-validation-filter][aria-pressed='true']",
	)?.dataset.validationFilter;
	return value === "error" || value === "warn" ? value : "all";
}

function getIssueTargets(issue: ValidationIssue): Selection[] {
	return issue.targets?.length
		? issue.targets
		: issue.target
			? [issue.target]
			: [];
}

function formatIssueTargetTitle(targets: Selection[]): string {
	if (targets.length === 1) {
		const target = targets[0];
		return target ? `Select ${target.type} #${target.index}` : "Select object";
	}
	return `Select ${targets
		.map((target) => `${target.type} #${target.index}`)
		.join(" and ")}`;
}
