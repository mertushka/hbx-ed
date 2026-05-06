import type { StadiumObject } from "../../types/stadium.ts";
import type { ChangeCallback } from "./inputs.ts";
import { SectionBuilder } from "./inputs.ts";

export function renderBasicStadiumSection(
	parent: HTMLElement,
	s: StadiumObject,
	notify: ChangeCallback,
): void {
	const sec = new SectionBuilder("Stadium", parent);
	sec
		.str("name", s.name, (v) => {
			s.name = v;
			const nameEl = document.getElementById("stadium-name-display");
			if (nameEl) nameEl.textContent = v;
			notify();
		})
		.num("width", s.width, (n) => {
			s.width = n;
			notify();
		})
		.num("height", s.height, (n) => {
			s.height = n;
			notify();
		})
		.num("maxViewWidth", s.maxViewWidth ?? 0, (n) => {
			s.maxViewWidth = n;
			notify();
		})
		.select(
			"cameraFollow",
			s.cameraFollow ?? "ball",
			["ball", "player"],
			(v) => {
				s.cameraFollow = v as "ball" | "player";
				notify();
			},
		)
		.num("spawnDist", s.spawnDistance ?? 200, (n) => {
			s.spawnDistance = n;
			notify();
		})
		.select(
			"kickOffReset",
			s.kickOffReset ?? "partial",
			["partial", "full"],
			(v) => {
				s.kickOffReset = v as "partial" | "full";
				notify();
			},
		)
		.bool("canBeStored", s.canBeStored ?? true, (v) => {
			s.canBeStored = v;
			notify();
		});

	if (!s.bg) return;

	const bg = s.bg;
	sec
		.select("bg.type", bg.type ?? "grass", ["grass", "hockey", "none"], (v) => {
			bg.type = v as typeof bg.type;
			notify();
		})
		.num("bg.width", bg.width ?? 0, (n) => {
			bg.width = n;
			notify();
		})
		.num("bg.height", bg.height ?? 0, (n) => {
			bg.height = n;
			notify();
		})
		.num("bg.koRadius", bg.kickOffRadius ?? 0, (n) => {
			bg.kickOffRadius = n;
			notify();
		})
		.num("bg.cornerR", bg.cornerRadius ?? 0, (n) => {
			bg.cornerRadius = n;
			notify();
		})
		.num("bg.goalLine", bg.goalLine ?? 0, (n) => {
			bg.goalLine = n;
			notify();
		})
		.color("bg.color", bg.color, (h) => {
			bg.color = h;
			notify();
		});
}
