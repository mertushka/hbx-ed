import type { Selection, StadiumObject } from "../types/stadium.ts";
import type { MenuDef } from "../ui/ContextMenu.ts";

export interface ObjectContextMenuActions {
	select: (selection: Selection) => void;
	deleteSelected: () => void;
	saveHistory: (stadium: StadiumObject) => void;
	refresh: () => void;
}

export interface ObjectContextMenuOptions {
	deleteLabel?: string;
}

export function buildObjectContextMenuItems(
	stadium: StadiumObject | null,
	selection: Selection,
	actions: ObjectContextMenuActions,
	options: ObjectContextMenuOptions = {},
): MenuDef | null {
	const type = selection.type;

	const items: MenuDef = [
		{
			label: `Select ${type} #${selection.index}`,
			action: () => actions.select(selection),
		},
		"separator",
	];

	if (type === "segment" && stadium) {
		const segment = stadium.segments[selection.index];
		if (!segment) return null;

		items.push(
			{
				label: "Reverse direction",
				action: () => {
					[segment.v0, segment.v1] = [segment.v1, segment.v0];
					if (segment.curveF !== undefined) segment.curveF = -segment.curveF;
					if (segment.curve !== undefined) segment.curve = -segment.curve;
					actions.saveHistory(stadium);
					actions.refresh();
				},
			},
			{
				label: segment.vis === false ? "Make visible" : "Make invisible",
				action: () => {
					segment.vis = segment.vis === false;
					actions.saveHistory(stadium);
					actions.refresh();
				},
			},
			"separator",
		);
	}

	if (type === "goal" && stadium) {
		const goal = stadium.goals[selection.index];
		if (!goal) return null;

		items.push(
			{
				label: "Switch team",
				action: () => {
					goal.team = (goal.team ?? "red") === "red" ? "blue" : "red";
					actions.saveHistory(stadium);
					actions.refresh();
				},
			},
			"separator",
		);
	}

	items.push({
		label: options.deleteLabel ?? `Delete ${type}`,
		action: () => actions.deleteSelected(),
		variant: "danger",
	});

	return items;
}
