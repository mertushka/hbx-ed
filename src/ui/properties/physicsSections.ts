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

	const bp =
		!s.ballPhysics || s.ballPhysics === "disc0"
			? createDefaultBallPhysics()
			: s.ballPhysics;

	sec
		.num("pos.x", bp.pos?.[0] ?? 0, (n) => {
			const ball = ensureBallPhysics(s);
			ball.pos ??= [0, 0];
			ball.pos[0] = n;
			notify();
		})
		.num("pos.y", bp.pos?.[1] ?? 0, (n) => {
			const ball = ensureBallPhysics(s);
			ball.pos ??= [0, 0];
			ball.pos[1] = n;
			notify();
		})
		.num("radius", bp.radius ?? 10, (n) => {
			ensureBallPhysics(s).radius = n;
			notify();
		})
		.num("invMass", bp.invMass ?? 1, (n) => {
			ensureBallPhysics(s).invMass = n;
			notify();
		})
		.num("damping", bp.damping ?? 0.99, (n) => {
			ensureBallPhysics(s).damping = n;
			notify();
		})
		.num("bCoef", bp.bCoef ?? 0.5, (n) => {
			ensureBallPhysics(s).bCoef = n;
			notify();
		})
		.color("color", bp.color, (h) => {
			ensureBallPhysics(s).color = h;
			notify();
		})
		.flags("cMask", bp.cMask, (f) => {
			ensureBallPhysics(s).cMask = f;
			notify();
		})
		.flags("cGroup", bp.cGroup, (f) => {
			ensureBallPhysics(s).cGroup = f;
			notify();
		});
}

export function renderPlayerPhysicsSection(
	parent: HTMLElement,
	s: StadiumObject,
	notify: ChangeCallback,
): void {
	const pp = s.playerPhysics ?? {};

	new SectionBuilder("Player Physics", parent)
		.num("radius", pp.radius ?? 15, (n) => {
			ensurePlayerPhysics(s).radius = n;
			notify();
		})
		.num("invMass", pp.invMass ?? 0.5, (n) => {
			ensurePlayerPhysics(s).invMass = n;
			notify();
		})
		.num("damping", pp.damping ?? 0.96, (n) => {
			ensurePlayerPhysics(s).damping = n;
			notify();
		})
		.num("bCoef", pp.bCoef ?? 0.5, (n) => {
			ensurePlayerPhysics(s).bCoef = n;
			notify();
		})
		.num("accel", pp.acceleration ?? 0.1, (n) => {
			ensurePlayerPhysics(s).acceleration = n;
			notify();
		})
		.num("kickAccel", pp.kickingAcceleration ?? 0.07, (n) => {
			ensurePlayerPhysics(s).kickingAcceleration = n;
			notify();
		})
		.num("kickDamp", pp.kickingDamping ?? 0.7, (n) => {
			ensurePlayerPhysics(s).kickingDamping = n;
			notify();
		})
		.num("kickStr", pp.kickStrength ?? 5, (n) => {
			ensurePlayerPhysics(s).kickStrength = n;
			notify();
		})
		.num("kickback", pp.kickback ?? 0, (n) => {
			ensurePlayerPhysics(s).kickback = n;
			notify();
		})
		.flags("cGroup", pp.cGroup, (f) => {
			ensurePlayerPhysics(s).cGroup = f;
			notify();
		});
}

function ensureBallPhysics(
	s: StadiumObject,
): Exclude<StadiumObject["ballPhysics"], "disc0" | undefined> {
	if (!s.ballPhysics || s.ballPhysics === "disc0") {
		s.ballPhysics = createDefaultBallPhysics();
	}
	return s.ballPhysics;
}

function ensurePlayerPhysics(
	s: StadiumObject,
): NonNullable<StadiumObject["playerPhysics"]> {
	s.playerPhysics ??= {};
	return s.playerPhysics;
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
