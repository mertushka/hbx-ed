import type { StadiumObject } from "../../types/stadium.ts";
import type { ChangeCallback } from "./inputs.ts";
import { SectionBuilder } from "./inputs.ts";

export function renderBallPhysicsSection(
	parent: HTMLElement,
	s: StadiumObject,
	notify: ChangeCallback,
	rebuild: () => void,
): void {
	const isSec = s.ballPhysics === "disc0";
	const sec = new SectionBuilder("Ball Physics", parent);

	sec.select("source", isSec ? "disc0" : "custom", ["custom", "disc0"], (v) => {
		if (v === "disc0") {
			s.ballPhysics = "disc0";
		} else {
			s.ballPhysics = createDefaultBallPhysics();
		}
		notify();
		rebuild();
	});

	if (isSec) return;

	if (!s.ballPhysics || s.ballPhysics === "disc0") {
		s.ballPhysics = createDefaultBallPhysics();
	}
	const bp = s.ballPhysics;

	sec
		.num("pos.x", bp.pos?.[0] ?? 0, (n) => {
			bp.pos ??= [0, 0];
			bp.pos[0] = n;
			notify();
		})
		.num("pos.y", bp.pos?.[1] ?? 0, (n) => {
			bp.pos ??= [0, 0];
			bp.pos[1] = n;
			notify();
		})
		.num("radius", bp.radius ?? 10, (n) => {
			bp.radius = n;
			notify();
		})
		.num("invMass", bp.invMass ?? 1, (n) => {
			bp.invMass = n;
			notify();
		})
		.num("damping", bp.damping ?? 0.99, (n) => {
			bp.damping = n;
			notify();
		})
		.num("bCoef", bp.bCoef ?? 0.5, (n) => {
			bp.bCoef = n;
			notify();
		})
		.color("color", bp.color, (h) => {
			bp.color = h;
			notify();
		})
		.flags("cMask", bp.cMask, (f) => {
			bp.cMask = f;
			notify();
		})
		.flags("cGroup", bp.cGroup, (f) => {
			bp.cGroup = f;
			notify();
		});
}

export function renderPlayerPhysicsSection(
	parent: HTMLElement,
	s: StadiumObject,
	notify: ChangeCallback,
): void {
	s.playerPhysics ??= {};
	const pp = s.playerPhysics;

	new SectionBuilder("Player Physics", parent)
		.num("radius", pp.radius ?? 15, (n) => {
			pp.radius = n;
			notify();
		})
		.num("invMass", pp.invMass ?? 0.5, (n) => {
			pp.invMass = n;
			notify();
		})
		.num("damping", pp.damping ?? 0.96, (n) => {
			pp.damping = n;
			notify();
		})
		.num("bCoef", pp.bCoef ?? 0.5, (n) => {
			pp.bCoef = n;
			notify();
		})
		.num("accel", pp.acceleration ?? 0.1, (n) => {
			pp.acceleration = n;
			notify();
		})
		.num("kickAccel", pp.kickingAcceleration ?? 0.07, (n) => {
			pp.kickingAcceleration = n;
			notify();
		})
		.num("kickDamp", pp.kickingDamping ?? 0.7, (n) => {
			pp.kickingDamping = n;
			notify();
		})
		.num("kickStr", pp.kickStrength ?? 5, (n) => {
			pp.kickStrength = n;
			notify();
		})
		.num("kickback", pp.kickback ?? 0, (n) => {
			pp.kickback = n;
			notify();
		})
		.flags("cGroup", pp.cGroup, (f) => {
			pp.cGroup = f;
			notify();
		});
}

function createDefaultBallPhysics(): Exclude<
	StadiumObject["ballPhysics"],
	"disc0" | undefined
> {
	return {
		pos: [0, 0],
		radius: 10,
		invMass: 1,
		damping: 0.99,
		bCoef: 0.5,
		color: "FFCC00",
	};
}
