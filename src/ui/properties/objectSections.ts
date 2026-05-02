import type {
	Disc,
	Goal,
	Joint,
	Plane,
	Segment,
	StadiumObject,
	Vertex,
} from "../../types/stadium.ts";
import type { ChangeCallback } from "./inputs.ts";
import { SectionBuilder, setOrDelete } from "./inputs.ts";

export function renderVertexSection(
	parent: HTMLElement,
	s: StadiumObject,
	i: number,
	notify: ChangeCallback,
	onDelete: () => void,
): void {
	const v = s.vertexes[i] as Vertex;
	new SectionBuilder(`Vertex #${i}`, parent)
		.num("x", v.x, (n) => {
			v.x = n;
			notify();
		})
		.num("y", v.y, (n) => {
			v.y = n;
			notify();
		})
		.num("bCoef", v.bCoef, (n) => {
			v.bCoef = n;
			notify();
		})
		.flags("cMask", v.cMask, (f) => {
			v.cMask = f;
			notify();
		})
		.flags("cGroup", v.cGroup, (f) => {
			v.cGroup = f;
			notify();
		})
		.trait("trait", v.trait, s, (t) => {
			setOrDelete(v, "trait", t);
			notify();
		})
		.button("Delete vertex", onDelete, "danger");
}

export function renderSegmentSection(
	parent: HTMLElement,
	s: StadiumObject,
	i: number,
	notify: ChangeCallback,
	onDelete: () => void,
): void {
	const seg = s.segments[i] as Segment;
	new SectionBuilder(`Segment #${i}`, parent)
		.num("v0", seg.v0, (n) => {
			seg.v0 = Math.round(n);
			notify();
		})
		.num("v1", seg.v1, (n) => {
			seg.v1 = Math.round(n);
			notify();
		})
		.num("curve °", seg.curve ?? 0, (n) => {
			seg.curve = n;
			delete seg.curveF;
			notify();
		})
		.color("color", seg.color, (h) => {
			seg.color = h;
			notify();
		})
		.bool("visible", seg.vis !== false, (b) => {
			seg.vis = b;
			notify();
		})
		.num("bCoef", seg.bCoef, (n) => {
			seg.bCoef = n;
			notify();
		})
		.num("bias", seg.bias ?? 0, (n) => {
			seg.bias = n;
			notify();
		})
		.flags("cMask", seg.cMask, (f) => {
			seg.cMask = f;
			notify();
		})
		.flags("cGroup", seg.cGroup, (f) => {
			seg.cGroup = f;
			notify();
		})
		.trait("trait", seg.trait, s, (t) => {
			setOrDelete(seg, "trait", t);
			notify();
		})
		.button("Delete segment", onDelete, "danger");
}

export function renderDiscSection(
	parent: HTMLElement,
	s: StadiumObject,
	i: number,
	notify: ChangeCallback,
	onDelete: () => void,
): void {
	const d = s.discs[i] as Disc;
	new SectionBuilder(`Disc #${i}`, parent)
		.num("x", d.pos?.[0] ?? 0, (n) => {
			d.pos ??= [0, 0];
			d.pos[0] = n;
			notify();
		})
		.num("y", d.pos?.[1] ?? 0, (n) => {
			d.pos ??= [0, 0];
			d.pos[1] = n;
			notify();
		})
		.num("radius", d.radius ?? 10, (n) => {
			d.radius = n;
			notify();
		})
		.num("invMass", d.invMass ?? 1, (n) => {
			d.invMass = n;
			notify();
		})
		.num("damping", d.damping ?? 0.99, (n) => {
			d.damping = n;
			notify();
		})
		.num("bCoef", d.bCoef ?? 0.5, (n) => {
			d.bCoef = n;
			notify();
		})
		.color("color", d.color, (h) => {
			d.color = h;
			notify();
		})
		.flags("cMask", d.cMask, (f) => {
			d.cMask = f;
			notify();
		})
		.flags("cGroup", d.cGroup, (f) => {
			d.cGroup = f;
			notify();
		})
		.trait("trait", d.trait, s, (t) => {
			setOrDelete(d, "trait", t);
			notify();
		})
		.button("Delete disc", onDelete, "danger");
}

export function renderPlaneSection(
	parent: HTMLElement,
	s: StadiumObject,
	i: number,
	notify: ChangeCallback,
	onDelete: () => void,
): void {
	const p = s.planes[i] as Plane;
	new SectionBuilder(`Plane #${i}`, parent)
		.num("normal.x", p.normal?.[0] ?? 0, (n) => {
			p.normal ??= [0, 1];
			p.normal[0] = n;
			notify();
		})
		.num("normal.y", p.normal?.[1] ?? 1, (n) => {
			p.normal ??= [0, 1];
			p.normal[1] = n;
			notify();
		})
		.num("dist", p.dist ?? 0, (n) => {
			p.dist = n;
			notify();
		})
		.num("bCoef", p.bCoef ?? 1, (n) => {
			p.bCoef = n;
			notify();
		})
		.flags("cMask", p.cMask, (f) => {
			p.cMask = f;
			notify();
		})
		.flags("cGroup", p.cGroup, (f) => {
			p.cGroup = f;
			notify();
		})
		.trait("trait", p.trait, s, (t) => {
			setOrDelete(p, "trait", t);
			notify();
		})
		.button("Delete plane", onDelete, "danger");
}

export function renderJointSection(
	parent: HTMLElement,
	s: StadiumObject,
	i: number,
	notify: ChangeCallback,
	onDelete: () => void,
): void {
	const j = s.joints[i] as Joint;
	new SectionBuilder(`Joint #${i}`, parent)
		.num("d0", j.d0, (n) => {
			j.d0 = Math.round(n);
			notify();
		})
		.num("d1", j.d1, (n) => {
			j.d1 = Math.round(n);
			notify();
		})
		.color("color", j.color, (h) => {
			j.color = h;
			notify();
		})
		.trait("trait", j.trait, s, (t) => {
			setOrDelete(j, "trait", t);
			notify();
		})
		.button("Delete joint", onDelete, "danger");
}

export function renderGoalSection(
	parent: HTMLElement,
	s: StadiumObject,
	i: number,
	notify: ChangeCallback,
	onDelete: () => void,
): void {
	const g = s.goals[i] as Goal;
	new SectionBuilder(`Goal #${i}`, parent)
		.select("team", g.team ?? "red", ["red", "blue"], (v) => {
			setOrDelete(g, "team", v as Goal["team"]);
			notify();
		})
		.num("p0.x", g.p0?.[0] ?? 0, (n) => {
			g.p0 ??= [0, 0];
			g.p0[0] = n;
			notify();
		})
		.num("p0.y", g.p0?.[1] ?? 0, (n) => {
			g.p0 ??= [0, 0];
			g.p0[1] = n;
			notify();
		})
		.num("p1.x", g.p1?.[0] ?? 0, (n) => {
			g.p1 ??= [0, 0];
			g.p1[0] = n;
			notify();
		})
		.num("p1.y", g.p1?.[1] ?? 0, (n) => {
			g.p1 ??= [0, 0];
			g.p1[1] = n;
			notify();
		})
		.trait("trait", g.trait, s, (v) => {
			setOrDelete(g, "trait", v);
			notify();
		})
		.button("Delete goal", onDelete, "danger");
}
