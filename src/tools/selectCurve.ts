import type { Segment, Selection, StadiumObject } from "../types/stadium.ts";
import { arcMidpoint } from "./selectGeometry.ts";

const CURVE_HANDLE_PX = 12;
const CURVE_FLAT_THRESHOLD = 0.5;
const MIN_CHORD_LENGTH = 0.001;

type Point = { x: number; y: number };

export interface CurveHandleDragOrigin {
	index: number;
	v0: Point;
	v1: Point;
}

export function findCurveHandleDragOrigin(
	stadium: StadiumObject,
	selection: Selection | null,
	pos: Point,
	zoom: number,
): CurveHandleDragOrigin | null {
	if (selection?.type !== "segment") return null;

	const seg = stadium.segments[selection.index];
	if (!seg) return null;

	const v0 = stadium.vertexes[seg.v0];
	const v1 = stadium.vertexes[seg.v1];
	if (!v0 || !v1) return null;

	const midpoint = arcMidpoint(seg, stadium.vertexes);
	const handleX = midpoint ? midpoint.x : (v0.x + v1.x) / 2;
	const handleY = midpoint ? midpoint.y : (v0.y + v1.y) / 2;
	const handleRadius = CURVE_HANDLE_PX / zoom;

	if (Math.hypot(handleX - pos.x, handleY - pos.y) >= handleRadius) {
		return null;
	}

	return {
		index: selection.index,
		v0: { x: v0.x, y: v0.y },
		v1: { x: v1.x, y: v1.y },
	};
}

export function applyCurveHandleDrag(
	segment: Segment,
	origin: CurveHandleDragOrigin,
	pos: Point,
): boolean {
	const { v0, v1 } = origin;
	const chordLength = Math.hypot(v1.x - v0.x, v1.y - v0.y);
	if (chordLength < MIN_CHORD_LENGTH) return false;

	const halfChord = chordLength / 2;
	const midX = (v0.x + v1.x) / 2;
	const midY = (v0.y + v1.y) / 2;
	const perpX = -(v1.y - v0.y) / chordLength;
	const perpY = (v1.x - v0.x) / chordLength;
	const projection = (pos.x - midX) * perpX + (pos.y - midY) * perpY;
	const absProjection = Math.abs(projection);

	if (absProjection < CURVE_FLAT_THRESHOLD) {
		segment.curve = 0;
		delete segment.curveF;
		return true;
	}

	const radius =
		(halfChord * halfChord + absProjection * absProjection) /
		(2 * absProjection);
	const theta = 2 * Math.asin(Math.min(1, halfChord / radius));
	segment.curve = ((projection < 0 ? 1 : -1) * theta * 180) / Math.PI;
	delete segment.curveF;
	return true;
}
