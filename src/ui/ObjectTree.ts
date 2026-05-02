import { resolveTraits } from "../core/traits.ts";
import type {
	MultiSelection,
	ObjectType,
	Selection,
	StadiumObject,
} from "../types/stadium.ts";
import { parseColor } from "../utils/color.ts";

type SelectCallback = (sel: Selection) => void;
type ContextMenuCallback = (e: MouseEvent, sel: Selection) => void;
type VisToggleCallback = () => void;

interface GroupDef {
	type: ObjectType;
	label: string;
	key: keyof Pick<
		StadiumObject,
		"vertexes" | "segments" | "discs" | "goals" | "planes" | "joints"
	>;
	dotColor: (item: unknown, stadium: StadiumObject) => string;
	itemLabel: (item: unknown, index: number) => string;
}

const GROUPS: GroupDef[] = [
	{
		type: "vertex",
		label: "Vertexes",
		key: "vertexes",
		dotColor: () => "rgba(255,255,255,0.6)",
		itemLabel: (v, i) => {
			const vertex = v as { x: number; y: number };
			return `v${i} (${vertex.x.toFixed(0)}, ${vertex.y.toFixed(0)})`;
		},
	},
	{
		type: "segment",
		label: "Segments",
		key: "segments",
		dotColor: (item, stadium) => {
			const s = resolveTraits(
				item as Parameters<typeof resolveTraits>[0],
				stadium.traits,
			);
			return parseColor((s as { color?: unknown }).color as never) ?? "#ffffff";
		},
		itemLabel: (s, i) => {
			const seg = s as { v0: number; v1: number };
			return `seg${i}: v${seg.v0}→v${seg.v1}`;
		},
	},
	{
		type: "disc",
		label: "Discs",
		key: "discs",
		dotColor: (item, stadium) => {
			const d = resolveTraits(
				item as Parameters<typeof resolveTraits>[0],
				stadium.traits,
			);
			return parseColor((d as { color?: unknown }).color as never) ?? "#ffcc00";
		},
		itemLabel: (d, i) => {
			const disc = d as { pos?: [number, number] };
			const [x, y] = disc.pos ?? [0, 0];
			return `disc${i} (${x}, ${y})`;
		},
	},
	{
		type: "goal",
		label: "Goals",
		key: "goals",
		dotColor: (item) => {
			const g = item as { team: string };
			return g.team === "red" ? "#ff4d6d" : "#4d9eff";
		},
		itemLabel: (g, i) => {
			const goal = g as { team: string };
			return `goal${i} [${goal.team}]`;
		},
	},
	{
		type: "plane",
		label: "Planes",
		key: "planes",
		dotColor: () => "rgba(255,200,100,0.7)",
		itemLabel: (p, i) => {
			const plane = p as { normal?: [number, number]; dist?: number };
			const n = plane.normal ?? [0, 0];
			return `plane${i} n(${n.map((v) => v.toFixed(1)).join(",")})`;
		},
	},
	{
		type: "joint",
		label: "Joints",
		key: "joints",
		dotColor: () => "rgba(255,255,255,0.4)",
		itemLabel: (j, i) => {
			const joint = j as { d0: number; d1: number };
			return `joint${i}: d${joint.d0}↔d${joint.d1}`;
		},
	},
];

export class ObjectTree {
	private readonly container: HTMLElement;
	private readonly onSelect: SelectCallback;
	private readonly onContextMenu: ContextMenuCallback;
	private readonly onVisToggle: VisToggleCallback;

	constructor(
		onSelect: SelectCallback,
		onContextMenu: ContextMenuCallback,
		onVisToggle: VisToggleCallback,
	) {
		this.onSelect = onSelect;
		this.onContextMenu = onContextMenu;
		this.onVisToggle = onVisToggle;
		const el = document.getElementById("obj-tree");
		if (!el) throw new Error("#obj-tree element not found");
		this.container = el;
	}

	render(
		stadium: StadiumObject | null,
		selection: Selection | null,
		multiSelection?: MultiSelection | null,
	): void {
		this.container.innerHTML = "";
		if (!stadium) return;

		for (const group of GROUPS) {
			const items = stadium[group.key] as unknown[];
			this.renderGroup(
				group,
				items,
				stadium,
				selection,
				multiSelection ?? null,
			);
		}
	}

	private renderGroup(
		group: GroupDef,
		items: unknown[],
		stadium: StadiumObject,
		selection: Selection | null,
		multiSelection: MultiSelection | null,
	): void {
		const head = document.createElement("div");
		head.className = "obj-group-head";
		head.innerHTML = `<span>${group.label}</span><span class="count">${items.length}</span>`;
		this.container.appendChild(head);

		items.forEach((item, i) => {
			const el = document.createElement("div");
			const isSingleSelected =
				selection?.type === group.type && selection.index === i;
			const isMultiSelected =
				multiSelection?.items.some(
					(s) => s.type === group.type && s.index === i,
				) ?? false;

			let cls = "obj-item";
			if (isSingleSelected) cls += " selected";
			if (isMultiSelected) cls += " multi-selected";
			// Dim invisible segments
			if (group.type === "segment") {
				const seg = item as { vis?: boolean; trait?: string };
				if (seg.vis === false) cls += " seg-invisible";
			}
			el.className = cls;

			const dot = document.createElement("div");
			dot.className = "obj-dot";
			dot.style.background = group.dotColor(item, stadium);

			const label = document.createElement("span");
			label.textContent = group.itemLabel(item, i);
			label.style.overflow = "hidden";
			label.style.textOverflow = "ellipsis";
			label.style.whiteSpace = "nowrap";
			label.style.flex = "1";

			el.appendChild(dot);
			el.appendChild(label);

			// Visibility toggle for segments
			if (group.type === "segment") {
				const seg = item as { vis?: boolean };
				const visBtn = document.createElement("button");
				visBtn.className = "vis-btn";
				visBtn.title = seg.vis === false ? "Show segment" : "Hide segment";
				visBtn.textContent = seg.vis === false ? "👁️" : "🙈";
				visBtn.addEventListener("click", (e) => {
					e.stopPropagation();
					seg.vis = seg.vis === false;
					this.onVisToggle();
					this.onSelect({ type: "segment", index: i });
				});
				el.appendChild(visBtn);
			}

			el.addEventListener("click", () =>
				this.onSelect({ type: group.type, index: i }),
			);
			el.addEventListener("contextmenu", (e) => {
				e.preventDefault();
				this.onContextMenu(e, { type: group.type, index: i });
			});

			this.container.appendChild(el);

			// Scroll the selected row into view after the DOM settles
			if (isSingleSelected) {
				requestAnimationFrame(() =>
					el.scrollIntoView({ block: "nearest", behavior: "smooth" }),
				);
			}
		});
	}
}
