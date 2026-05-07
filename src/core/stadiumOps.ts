import type { ObjectType, Selection, StadiumObject } from "../types/stadium.ts";
import { isObjectType } from "../types/stadium.ts";

const DUPLICATE_OFFSET = 10;
const PASTE_OFFSET = 15;
export const INVALID_REFERENCE = -1;

export interface ClipboardEntry {
	type: string;
	data: unknown;
}

export type StadiumArrayKey =
	| "vertexes"
	| "segments"
	| "discs"
	| "goals"
	| "planes"
	| "joints";

export function normalizeStadium(data: StadiumObject): StadiumObject {
	data.vertexes ??= [];
	data.segments ??= [];
	data.goals ??= [];
	data.discs ??= [];
	data.planes ??= [];
	data.joints ??= [];
	data.traits ??= {};
	data.bg ??= {
		type: "grass",
		width: 400,
		height: 170,
		kickOffRadius: 65,
		cornerRadius: 0,
		color: "718C5A",
	};
	return data;
}

export function objectTypeToKey(type: ObjectType): StadiumArrayKey {
	const map: Record<ObjectType, StadiumArrayKey> = {
		vertex: "vertexes",
		segment: "segments",
		disc: "discs",
		goal: "goals",
		plane: "planes",
		joint: "joints",
	};
	return map[type];
}

export function cloneForClipboard(
	stadium: StadiumObject,
	source: Selection | null,
): ClipboardEntry | null {
	if (!source) return null;
	const arr = stadium[objectTypeToKey(source.type)] as unknown[];
	const item = arr[source.index];
	if (!item) return null;
	return {
		type: source.type,
		data: cloneJson(item),
	};
}

export function duplicateSelection(
	stadium: StadiumObject,
	selection: Selection | null,
): Selection | null {
	if (!selection) return null;
	return appendOffsetCopy(
		stadium,
		selection.type,
		selection.index,
		DUPLICATE_OFFSET,
	);
}

export function pasteClipboard(
	stadium: StadiumObject,
	clipboard: ClipboardEntry | null,
): Selection | null {
	if (!clipboard || !isObjectType(clipboard.type)) return null;
	return appendOffsetData(
		stadium,
		clipboard.type,
		clipboard.data,
		PASTE_OFFSET,
	);
}

export function deleteSelections(
	stadium: StadiumObject,
	selections: readonly Selection[],
): number {
	const groups = new Map<ObjectType, number[]>();
	for (const { type, index } of selections) {
		if (!groups.has(type)) groups.set(type, []);
		groups.get(type)?.push(index);
	}

	let deletedCount = 0;
	for (const [type, indices] of groups) {
		deletedCount += deleteByType(stadium, type, indices);
	}

	return deletedCount;
}

export function reindexSegmentsAfterVertexDelete(
	stadium: StadiumObject,
	deletedIndices: readonly number[],
): void {
	const deleted = normalizeDeletedIndices(deletedIndices);
	for (const seg of stadium.segments) {
		seg.v0 = remapReference(seg.v0, deleted);
		seg.v1 = remapReference(seg.v1, deleted);
	}
}

export function reindexJointsAfterDiscDelete(
	stadium: StadiumObject,
	deletedIndices: readonly number[],
): void {
	const deleted = normalizeDeletedIndices(deletedIndices);
	for (const joint of stadium.joints) {
		joint.d0 = remapReference(joint.d0, deleted);
		joint.d1 = remapReference(joint.d1, deleted);
	}
}

function deleteByType(
	stadium: StadiumObject,
	type: ObjectType,
	indices: readonly number[],
): number {
	const normalized = normalizeDeletedIndices(indices);
	const arr = stadium[objectTypeToKey(type)] as unknown[];
	const removedIndices: number[] = [];

	for (let i = normalized.length - 1; i >= 0; i--) {
		const index = normalized[i];
		if (index !== undefined && index >= 0 && index < arr.length) {
			arr.splice(index, 1);
			removedIndices.push(index);
		}
	}

	if (type === "vertex")
		reindexSegmentsAfterVertexDelete(stadium, removedIndices);
	if (type === "disc") reindexJointsAfterDiscDelete(stadium, removedIndices);
	return removedIndices.length;
}

function appendOffsetCopy(
	stadium: StadiumObject,
	type: ObjectType,
	index: number,
	offset: number,
): Selection | null {
	const arr = stadium[objectTypeToKey(type)] as unknown[];
	const original = arr[index];
	if (!original) return null;
	return appendOffsetData(stadium, type, original, offset);
}

function appendOffsetData(
	stadium: StadiumObject,
	type: ObjectType,
	data: unknown,
	offset: number,
): Selection {
	const copy = cloneJson(data) as Record<string, unknown>;
	offsetObject(type, copy, offset);
	const arr = stadium[objectTypeToKey(type)] as unknown[];
	arr.push(copy);
	return { type, index: arr.length - 1 };
}

function offsetObject(
	type: ObjectType,
	copy: Record<string, unknown>,
	offset: number,
): void {
	if (type === "vertex") {
		copy.x = ((copy.x as number | undefined) ?? 0) + offset;
		copy.y = ((copy.y as number | undefined) ?? 0) + offset;
		return;
	}

	if (type === "disc") {
		const pos = (copy.pos as [number, number] | undefined) ?? [0, 0];
		copy.pos = [pos[0] + offset, pos[1] + offset];
		return;
	}

	if (type === "goal") {
		const p0 = (copy.p0 as [number, number] | undefined) ?? [0, 0];
		const p1 = (copy.p1 as [number, number] | undefined) ?? [0, 0];
		copy.p0 = [p0[0] + offset, p0[1] + offset];
		copy.p1 = [p1[0] + offset, p1[1] + offset];
	}
}

function remapReference(
	value: number | undefined,
	deleted: readonly number[],
): number {
	const ref = value ?? INVALID_REFERENCE;
	if (deleted.includes(ref)) return INVALID_REFERENCE;
	const shift = deleted.filter((idx) => idx < ref).length;
	return ref - shift;
}

function normalizeDeletedIndices(indices: readonly number[]): number[] {
	return [...new Set(indices)].sort((a, b) => a - b);
}

function cloneJson<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}
