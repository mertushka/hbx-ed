import type { Segment, Selection, StadiumObject } from "../types/stadium.ts";

export type Severity = "error" | "warn";

export interface ValidationIssue {
	severity: Severity;
	message: string;
	target?: Selection;
	targets?: Selection[];
}

/** Validate a StadiumObject and return a list of issues. */
export function validateStadium(s: StadiumObject): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const nVerts = s.vertexes.length;
	const nDiscs = s.discs.length;

	// ── Segments ────────────────────────────────────────────────────────────────
	s.segments.forEach((seg, i) => {
		const v0 = seg.v0 ?? -1;
		const v1 = seg.v1 ?? -1;

		if (v0 < 0 || v0 >= nVerts) {
			issues.push({
				severity: "error",
				message: `seg${i}: v0=${v0} out of range (${nVerts} verts)`,
				target: { type: "segment", index: i },
			});
		}
		if (v1 < 0 || v1 >= nVerts) {
			issues.push({
				severity: "error",
				message: `seg${i}: v1=${v1} out of range (${nVerts} verts)`,
				target: { type: "segment", index: i },
			});
		}
		if (v0 === v1 && v0 >= 0) {
			issues.push({
				severity: "warn",
				message: `seg${i}: v0 === v1 (zero-length segment)`,
				target: { type: "segment", index: i },
			});
		}

		// Duplicate segments (same pair, regardless of order)
		for (let j = i + 1; j < s.segments.length; j++) {
			const other = s.segments[j];
			if (!other) continue;
			const ov0 = other.v0 ?? -1,
				ov1 = other.v1 ?? -1;
			if ((v0 === ov0 && v1 === ov1) || (v0 === ov1 && v1 === ov0)) {
				if (isCurvedSegment(seg) || isCurvedSegment(other)) continue;
				issues.push({
					severity: "warn",
					message: `seg${j}: duplicates seg${i} (same vertices v${v0}-v${v1})`,
					target: { type: "segment", index: j },
					targets: [
						{ type: "segment", index: i },
						{ type: "segment", index: j },
					],
				});
			}
		}

		// Trait reference
		if (seg.trait && !s.traits?.[seg.trait]) {
			issues.push({
				severity: "warn",
				message: `seg${i}: trait "${seg.trait}" not defined`,
				target: { type: "segment", index: i },
			});
		}
	});

	// ── Joints ──────────────────────────────────────────────────────────────────
	s.joints.forEach((j, i) => {
		const d0 = j.d0 ?? -1;
		const d1 = j.d1 ?? -1;
		if (d0 < 0 || d0 >= nDiscs) {
			issues.push({
				severity: "error",
				message: `joint${i}: d0=${d0} out of range (${nDiscs} discs)`,
				target: { type: "joint", index: i },
			});
		}
		if (d1 < 0 || d1 >= nDiscs) {
			issues.push({
				severity: "error",
				message: `joint${i}: d1=${d1} out of range (${nDiscs} discs)`,
				target: { type: "joint", index: i },
			});
		}
		if (d0 === d1 && d0 >= 0) {
			issues.push({
				severity: "warn",
				message: `joint${i}: d0 === d1 (self-joint)`,
				target: { type: "joint", index: i },
			});
		}
	});

	// ── Discs ───────────────────────────────────────────────────────────────────
	s.discs.forEach((d, i) => {
		if (d.trait && !s.traits?.[d.trait]) {
			issues.push({
				severity: "warn",
				message: `disc${i}: trait "${d.trait}" not defined`,
				target: { type: "disc", index: i },
			});
		}
	});

	// ── Vertexes ────────────────────────────────────────────────────────────────
	s.vertexes.forEach((v, i) => {
		// Note: unreferenced vertexes are intentionally NOT warned about.
		// They are legitimately used as collision points without segments,
		// and are common in goal-post constructions and decorative layouts.
		if (v.trait && !s.traits?.[v.trait]) {
			issues.push({
				severity: "warn",
				message: `v${i}: trait "${v.trait}" not defined`,
				target: { type: "vertex", index: i },
			});
		}
	});

	// ── Planes ──────────────────────────────────────────────────────────────────
	s.planes.forEach((p, i) => {
		const [nx, ny] = p.normal ?? [0, 0];
		if (nx === 0 && ny === 0) {
			issues.push({
				severity: "error",
				message: `plane${i}: normal is (0,0) — degenerate plane`,
				target: { type: "plane", index: i },
			});
		}
	});

	// ── Goals ───────────────────────────────────────────────────────────────────
	s.goals.forEach((g, i) => {
		const [p0x, p0y] = g.p0 ?? [0, 0];
		const [p1x, p1y] = g.p1 ?? [0, 0];
		if (p0x === p1x && p0y === p1y) {
			issues.push({
				severity: "warn",
				message: `goal${i}: p0 === p1 (zero-length goal line)`,
				target: { type: "goal", index: i },
			});
		}
	});

	return issues;
}

function isCurvedSegment(segment: Segment): boolean {
	return (segment.curve ?? 0) !== 0 || (segment.curveF ?? 0) !== 0;
}
