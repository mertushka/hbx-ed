import type {
	MultiSelection,
	StadiumObject,
	Vec2,
	Vertex,
} from "../types/stadium.ts";

const COL_SELECTED = "#f5a623";
const COL_MULTI_SELECT = "#39c77c";

export interface SegmentPreview {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}

export interface BoxSelect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface VertexSnapTarget {
	x: number;
	y: number;
}

export interface EditorOverlayState {
	showVertexLabels: boolean;
	showSpawnPoints: boolean;
	segPreview: SegmentPreview | null;
	multiSelection: MultiSelection | null;
	boxSelect: BoxSelect | null;
	vertexSnapTarget: VertexSnapTarget | null;
}

export function drawEditorOverlays(
	ctx: CanvasRenderingContext2D,
	stadium: StadiumObject,
	state: EditorOverlayState,
	zoom: number,
): void {
	if (state.showVertexLabels) {
		drawVertexLabels(ctx, stadium.vertexes, zoom);
	}

	if (state.showSpawnPoints) {
		drawSpawnPoints(ctx, stadium.redSpawnPoints ?? [], "#ff4d6d", zoom);
		drawSpawnPoints(ctx, stadium.blueSpawnPoints ?? [], "#4d9eff", zoom);
	}

	if (state.segPreview) drawSegmentPreview(ctx, state.segPreview, zoom);
	if (state.multiSelection) {
		drawMultiSelection(ctx, stadium, state.multiSelection, zoom);
	}
	if (state.boxSelect) drawBoxSelect(ctx, state.boxSelect, zoom);
	if (state.vertexSnapTarget) {
		drawVertexSnapTarget(ctx, state.vertexSnapTarget, zoom);
	}
}

function drawSegmentPreview(
	ctx: CanvasRenderingContext2D,
	preview: SegmentPreview,
	zoom: number,
): void {
	ctx.beginPath();
	ctx.setLineDash([6 / zoom, 4 / zoom]);
	ctx.strokeStyle = "rgba(245,166,35,0.7)";
	ctx.lineWidth = 1.5 / zoom;
	ctx.moveTo(preview.x0, preview.y0);
	ctx.lineTo(preview.x1, preview.y1);
	ctx.stroke();
	ctx.setLineDash([]);
}

function drawMultiSelection(
	ctx: CanvasRenderingContext2D,
	stadium: StadiumObject,
	multiSelection: MultiSelection,
	zoom: number,
): void {
	multiSelection.items.forEach(({ type, index }) => {
		if (type === "vertex") {
			const v = stadium.vertexes[index];
			if (!v) return;
			ctx.beginPath();
			ctx.arc(v.x, v.y, 7 / zoom, 0, Math.PI * 2);
			ctx.strokeStyle = COL_MULTI_SELECT;
			ctx.lineWidth = 2 / zoom;
			ctx.stroke();
		} else if (type === "disc") {
			const d = stadium.discs[index];
			if (!d) return;
			const [px, py] = d.pos ?? [0, 0];
			const r = (d.radius ?? 10) + 4 / zoom;
			ctx.beginPath();
			ctx.arc(px, py, r, 0, Math.PI * 2);
			ctx.strokeStyle = COL_MULTI_SELECT;
			ctx.lineWidth = 2 / zoom;
			ctx.stroke();
		} else if (type === "goal") {
			const g = stadium.goals[index];
			if (!g) return;
			const [p0x, p0y] = g.p0 ?? [0, 0];
			const [p1x, p1y] = g.p1 ?? [0, 0];
			ctx.beginPath();
			ctx.moveTo(p0x, p0y);
			ctx.lineTo(p1x, p1y);
			ctx.strokeStyle = COL_MULTI_SELECT;
			ctx.lineWidth = 4 / zoom;
			ctx.stroke();
		} else if (type === "segment") {
			const seg = stadium.segments[index];
			if (!seg) return;
			const v0 = stadium.vertexes[seg.v0];
			const v1 = stadium.vertexes[seg.v1];
			if (!v0 || !v1) return;
			ctx.beginPath();
			ctx.moveTo(v0.x, v0.y);
			ctx.lineTo(v1.x, v1.y);
			ctx.strokeStyle = COL_MULTI_SELECT;
			ctx.lineWidth = 4 / zoom;
			ctx.stroke();
		}
	});
}

function drawBoxSelect(
	ctx: CanvasRenderingContext2D,
	box: BoxSelect,
	zoom: number,
): void {
	ctx.beginPath();
	ctx.rect(box.x, box.y, box.w, box.h);
	ctx.strokeStyle = COL_MULTI_SELECT;
	ctx.lineWidth = 1 / zoom;
	ctx.setLineDash([4 / zoom, 3 / zoom]);
	ctx.stroke();
	ctx.setLineDash([]);
	ctx.fillStyle = "rgba(57,199,124,0.07)";
	ctx.fill();
}

function drawVertexSnapTarget(
	ctx: CanvasRenderingContext2D,
	target: VertexSnapTarget,
	zoom: number,
): void {
	ctx.beginPath();
	ctx.arc(target.x, target.y, 9 / zoom, 0, Math.PI * 2);
	ctx.strokeStyle = COL_SELECTED;
	ctx.lineWidth = 2 / zoom;
	ctx.stroke();
}

function drawVertexLabels(
	ctx: CanvasRenderingContext2D,
	verts: Vertex[],
	zoom: number,
): void {
	const fontSize = Math.max(8, Math.min(14, 11 / zoom));
	ctx.save();
	ctx.font = `${fontSize / zoom}px "IBM Plex Mono", monospace`;
	ctx.textAlign = "left";
	ctx.textBaseline = "bottom";
	verts.forEach((v, i) => {
		const label = `v${i}`;
		const offsetX = 5 / zoom;
		const offsetY = -5 / zoom;
		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillText(label, v.x + offsetX + 0.5 / zoom, v.y + offsetY + 0.5 / zoom);
		ctx.fillStyle = "rgba(200,210,230,0.9)";
		ctx.fillText(label, v.x + offsetX, v.y + offsetY);
	});
	ctx.restore();
}

function drawSpawnPoints(
	ctx: CanvasRenderingContext2D,
	points: Vec2[],
	color: string,
	zoom: number,
): void {
	const r = 8 / zoom;
	const fontSize = Math.max(7, 9 / zoom);
	ctx.save();
	ctx.font = `bold ${fontSize / zoom}px "IBM Plex Mono", monospace`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	points.forEach(([x, y], i) => {
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.strokeStyle = color;
		ctx.lineWidth = 1.5 / zoom;
		ctx.stroke();
		ctx.fillStyle = `${color}44`;
		ctx.fill();
		ctx.fillStyle = color;
		ctx.fillText(String(i), x, y);
	});
	ctx.restore();
}
