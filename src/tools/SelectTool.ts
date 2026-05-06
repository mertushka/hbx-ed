import type { WorldPoint } from "../core/camera.ts";
import { hitTest } from "../core/hitTest.ts";
import type { Disc, Goal, Vertex } from "../types/stadium.ts";
import { snapToGrid } from "../utils/math.ts";
import type { AppContext } from "./context.ts";
import {
	applyCurveHandleDrag,
	type CurveHandleDragOrigin,
	findCurveHandleDragOrigin,
} from "./selectCurve.ts";
import {
	applyMultiDrag,
	createMultiDragOrigins,
	type MultiDragOrigin,
} from "./selectDrag.ts";
import { findSnapVertex, objectsInRect } from "./selectGeometry.ts";
import {
	applySpawnDrag,
	findSpawnDragOrigin,
	type SpawnDragOrigin,
} from "./selectSpawnDrag.ts";
import type { Tool } from "./types.ts";

// ── Drag state ───────────────────────────────────────────────────────────────

type DragKind =
	| "vertex"
	| "disc"
	| "goal"
	| "spawn-red"
	| "spawn-blue"
	| "curve-handle"
	| "box";

interface DragState {
	startWorld: WorldPoint;
	kind: DragKind;
	index: number;
	originVertex?: { x: number; y: number };
	originDisc?: [number, number];
	originGoal?: { p0: [number, number]; p1: [number, number] };
	spawnOrigin?: SpawnDragOrigin;
	curveOrigin?: CurveHandleDragOrigin;
	multiOrigins?: MultiDragOrigin[];
}

// ── SelectTool ────────────────────────────────────────────────────────────────

export class SelectTool implements Tool {
	readonly name = "select";
	readonly cursor = "default";

	private drag: DragState | null = null;
	private readonly ctx: AppContext;
	private readonly getZoom: () => number;

	constructor(ctx: AppContext, getZoom: () => number) {
		this.ctx = ctx;
		this.getZoom = getZoom;
	}

	onMouseDown(pos: WorldPoint, e: MouseEvent): void {
		const stadium = this.ctx.getStadium();
		if (!stadium) return;
		const zoom = this.getZoom();

		// ── 1. Spawn points ──────────────────────────────────────────────────────
		const spawnOrigin = findSpawnDragOrigin(stadium, pos, zoom);
		if (spawnOrigin) {
			this.ctx.setSelection(null);
			this.ctx.setMultiSelection(null);
			this.drag = {
				startWorld: pos,
				kind: spawnOrigin.kind,
				index: spawnOrigin.index,
				spawnOrigin,
			};
			return;
		}

		// ── 2. Curve handle on the selected segment ───────────────────────────────
		const curveOrigin = findCurveHandleDragOrigin(
			stadium,
			this.ctx.getSelection(),
			pos,
			zoom,
		);
		if (curveOrigin) {
			this.drag = {
				startWorld: pos,
				kind: "curve-handle",
				index: curveOrigin.index,
				curveOrigin,
			};
			return;
		}

		// ── 3. Multi-select: Shift+click existing item ────────────────────────────
		const hit = hitTest(stadium, pos.x, pos.y, zoom);

		if (e.shiftKey && hit) {
			const ms = this.ctx.getMultiSelection();
			const existing = ms?.items ?? [];
			const alreadyIdx = existing.findIndex(
				(s) => s.type === hit.type && s.index === hit.index,
			);
			const newItems =
				alreadyIdx >= 0
					? existing.filter((_, i) => i !== alreadyIdx) // deselect
					: [...existing, hit]; // add

			this.ctx.setSelection(null);
			this.ctx.setMultiSelection(newItems.length ? { items: newItems } : null);
			this.ctx.refresh();
			return;
		}

		// ── 4. Shift + no hit → start box-select ────────────────────────────────
		if (e.shiftKey && !hit) {
			this.ctx.setSelection(null);
			this.ctx.setMultiSelection(null);
			this.drag = { startWorld: pos, kind: "box", index: -1 };
			return;
		}

		// ── 5. Click with existing multi-select → start multi-drag ───────────────
		const ms = this.ctx.getMultiSelection();
		if (
			!e.shiftKey &&
			ms &&
			hit &&
			ms.items.some((s) => s.type === hit.type && s.index === hit.index)
		) {
			const origins = createMultiDragOrigins(stadium, ms.items);
			this.drag = {
				startWorld: pos,
				kind: "vertex",
				index: -1,
				multiOrigins: origins,
			};
			return;
		}

		// ── 6. Regular single-click ──────────────────────────────────────────────
		if (!e.shiftKey) {
			this.ctx.setMultiSelection(null);
		}

		if (!hit) {
			this.ctx.setSelection(null);
			// Start empty box-select if not Shift (cleared above)
			if (!e.shiftKey) {
				this.drag = { startWorld: pos, kind: "box", index: -1 };
			}
			return;
		}

		this.ctx.setSelection(hit);

		if (hit.type === "vertex") {
			const v = stadium.vertexes[hit.index] as Vertex;
			this.drag = {
				startWorld: pos,
				kind: "vertex",
				index: hit.index,
				originVertex: { x: v.x, y: v.y },
			};
		} else if (hit.type === "disc") {
			const d = stadium.discs[hit.index] as Disc;
			this.drag = {
				startWorld: pos,
				kind: "disc",
				index: hit.index,
				originDisc: [...(d.pos ?? [0, 0])] as [number, number],
			};
		} else if (hit.type === "goal") {
			const g = stadium.goals[hit.index] as Goal;
			this.drag = {
				startWorld: pos,
				kind: "goal",
				index: hit.index,
				originGoal: {
					p0: [...(g.p0 ?? [0, 0])] as [number, number],
					p1: [...(g.p1 ?? [0, 0])] as [number, number],
				},
			};
		}
	}

	onMouseMove(pos: WorldPoint, e: MouseEvent): void {
		if (!this.drag) return;
		const stadium = this.ctx.getStadium();
		if (!stadium) return;
		const zoom = this.getZoom();

		const rawDx = pos.x - this.drag.startWorld.x;
		const rawDy = pos.y - this.drag.startWorld.y;

		// Multi-drag
		if (this.drag.kind === "vertex" && this.drag.multiOrigins) {
			const snapped = snapToGrid(
				this.drag.startWorld.x + rawDx,
				this.drag.startWorld.y + rawDy,
				zoom,
				e.shiftKey,
			);
			const dx = snapped.x - this.drag.startWorld.x;
			const dy = snapped.y - this.drag.startWorld.y;
			applyMultiDrag(stadium, this.drag.multiOrigins, dx, dy);
			this.ctx.refresh();
			return;
		}

		// Box-select
		if (this.drag.kind === "box") {
			this.ctx.renderer.boxSelect = {
				x: this.drag.startWorld.x,
				y: this.drag.startWorld.y,
				w: rawDx,
				h: rawDy,
			};
			this.ctx.refresh();
			return;
		}

		// Single object drags (with snap)
		const sp = snapToGrid(
			this.drag.startWorld.x + rawDx,
			this.drag.startWorld.y + rawDy,
			zoom,
			e.shiftKey,
		);
		const dx = sp.x - this.drag.startWorld.x;
		const dy = sp.y - this.drag.startWorld.y;

		if (this.drag.kind === "vertex" && this.drag.originVertex) {
			const rawX = this.drag.originVertex.x + rawDx;
			const rawY = this.drag.originVertex.y + rawDy;
			// Try vertex snap first, then grid snap
			const snap = findSnapVertex(stadium, rawX, rawY, zoom, this.drag.index);
			let nx: number, ny: number;
			if (snap) {
				nx = snap.x;
				ny = snap.y;
				this.ctx.renderer.vertexSnapTarget = snap;
			} else {
				const gp = snapToGrid(rawX, rawY, zoom, e.shiftKey);
				nx = gp.x;
				ny = gp.y;
				this.ctx.renderer.vertexSnapTarget = null;
			}
			const v = stadium.vertexes[this.drag.index];
			if (!v) return;
			v.x = nx;
			v.y = ny;
		} else if (this.drag.kind === "disc" && this.drag.originDisc) {
			const np = snapToGrid(
				this.drag.originDisc[0] + rawDx,
				this.drag.originDisc[1] + rawDy,
				zoom,
				e.shiftKey,
			);
			const d = stadium.discs[this.drag.index];
			if (!d) return;
			d.pos = [np.x, np.y];
		} else if (this.drag.kind === "goal" && this.drag.originGoal) {
			const g = stadium.goals[this.drag.index];
			if (!g) return;
			g.p0 = [this.drag.originGoal.p0[0] + dx, this.drag.originGoal.p0[1] + dy];
			g.p1 = [this.drag.originGoal.p1[0] + dx, this.drag.originGoal.p1[1] + dy];
		} else if (
			(this.drag.kind === "spawn-red" || this.drag.kind === "spawn-blue") &&
			this.drag.spawnOrigin
		) {
			applySpawnDrag(stadium, this.drag.spawnOrigin, dx, dy);
		} else if (this.drag.kind === "curve-handle" && this.drag.curveOrigin) {
			const seg = stadium.segments[this.drag.curveOrigin.index];
			if (!seg) return;
			if (applyCurveHandleDrag(seg, this.drag.curveOrigin, pos)) {
				this.ctx.refresh();
			}
			return;
		}

		this.ctx.refresh();
	}

	onMouseUp(_pos: WorldPoint): void {
		if (this.drag?.kind === "box") {
			// Commit box selection
			const stadium = this.ctx.getStadium();
			if (stadium && this.ctx.renderer.boxSelect) {
				const b = this.ctx.renderer.boxSelect;
				const hits = objectsInRect(stadium, b.x, b.y, b.w, b.h);
				if (hits.length > 0) {
					this.ctx.setMultiSelection({ items: hits });
				}
			}
			this.ctx.renderer.boxSelect = null;
		}

		// Clear snap indicator
		this.ctx.renderer.vertexSnapTarget = null;

		if (this.drag) {
			this.ctx.saveHistory();
			this.drag = null;
		}
		this.ctx.refresh();
	}

	onDeactivate(): void {
		this.drag = null;
		this.ctx.renderer.boxSelect = null;
		this.ctx.renderer.multiSelection = null;
		this.ctx.renderer.vertexSnapTarget = null;
	}
}
