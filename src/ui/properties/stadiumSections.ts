import type { StadiumObject } from "../../types/stadium.ts";
import { colorToHex, hexToHbs } from "../../utils/color.ts";
import type { ChangeCallback } from "./inputs.ts";
import { flagsInput, SectionBuilder } from "./inputs.ts";

export interface StadiumSectionOptions {
	parent: HTMLElement;
	stadium: StadiumObject;
	notify: ChangeCallback;
	rebuild: () => void;
}

export function renderStadiumSection({
	parent,
	stadium: s,
	notify,
	rebuild,
}: StadiumSectionOptions): void {
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

	if (s.bg) {
		const bg = s.bg;
		sec
			.select(
				"bg.type",
				bg.type ?? "grass",
				["grass", "hockey", "none"],
				(v) => {
					bg.type = v as typeof bg.type;
					notify();
				},
			)
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

	renderBallPhysicsSection(parent, s, notify, rebuild);
	renderPlayerPhysicsSection(parent, s, notify);
	renderTraitsSection(parent, s, notify, rebuild);
}

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
			s.ballPhysics = {
				pos: [0, 0],
				radius: 10,
				invMass: 1,
				damping: 0.99,
				bCoef: 0.5,
				color: "FFCC00",
			};
		}
		notify();
		rebuild();
	});

	if (isSec) return;

	if (!s.ballPhysics || s.ballPhysics === "disc0") {
		s.ballPhysics = {
			pos: [0, 0],
			radius: 10,
			invMass: 1,
			damping: 0.99,
			bCoef: 0.5,
			color: "FFCC00",
		};
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

export function renderTraitsSection(
	parent: HTMLElement,
	s: StadiumObject,
	notify: ChangeCallback,
	rebuild: () => void,
): void {
	const traits = s.traits ?? {};
	s.traits = traits;

	const sec = document.createElement("div");
	sec.className = "prop-section";

	const titleRow = document.createElement("div");
	titleRow.className = "prop-section-title prop-section-title--action";
	const titleText = document.createElement("span");
	titleText.textContent = "Traits";
	const addBtn = document.createElement("button");
	addBtn.className = "prop-trait-add";
	addBtn.textContent = "+ Add";
	addBtn.addEventListener("click", () => {
		const name = prompt("Trait name:");
		if (!name || name.trim() === "") return;
		const key = name.trim();
		if (traits[key]) {
			alert(`Trait "${key}" already exists.`);
			return;
		}
		traits[key] = {};
		notify();
		rebuild();
	});
	titleRow.appendChild(titleText);
	titleRow.appendChild(addBtn);
	sec.appendChild(titleRow);
	parent.appendChild(sec);

	const traitNames = Object.keys(traits);
	if (traitNames.length === 0) {
		const empty = document.createElement("div");
		empty.className = "prop-trait-empty";
		empty.textContent = "No traits defined";
		sec.appendChild(empty);
		return;
	}

	for (const traitName of traitNames) {
		renderOneTrait(sec, traits, traitName, notify, s, rebuild);
	}
}

export function findTraitUsages(s: StadiumObject, name: string): string[] {
	const results: string[] = [];
	s.vertexes.forEach((v, i) => {
		if (v.trait === name) results.push(`v${i}`);
	});
	s.segments.forEach((seg, i) => {
		if (seg.trait === name) results.push(`seg${i}`);
	});
	s.discs.forEach((d, i) => {
		if (d.trait === name) results.push(`disc${i}`);
	});
	s.planes.forEach((p, i) => {
		if (p.trait === name) results.push(`plane${i}`);
	});
	s.goals.forEach((g, i) => {
		if (g.trait === name) results.push(`goal${i}`);
	});
	s.joints.forEach((j, i) => {
		if (j.trait === name) results.push(`joint${i}`);
	});
	return results;
}

function renderOneTrait(
	parent: HTMLElement,
	traits: NonNullable<StadiumObject["traits"]>,
	name: string,
	notify: ChangeCallback,
	s: StadiumObject,
	rebuild: () => void,
): void {
	const trait = traits[name];
	if (!trait) return;

	const block = document.createElement("div");
	block.className = "prop-trait-block";
	const traitRecord = trait as Record<string, unknown>;

	const header = document.createElement("div");
	header.className = "prop-trait-header";
	const nameEl = document.createElement("span");
	nameEl.className = "prop-trait-name";
	nameEl.textContent = name;
	const delBtn = document.createElement("button");
	delBtn.className = "prop-trait-del";
	delBtn.textContent = "✕";
	delBtn.title = `Delete trait "${name}"`;
	delBtn.addEventListener("click", () => {
		if (
			!confirm(
				`Delete trait "${name}"? This won't update objects that reference it.`,
			)
		) {
			return;
		}
		delete traits[name];
		notify();
		rebuild();
	});
	header.appendChild(nameEl);
	header.appendChild(delBtn);
	block.appendChild(header);

	const fields: Array<{
		label: string;
		key: string;
		type: "num" | "bool" | "flags" | "color";
	}> = [
		{ label: "vis", key: "vis", type: "bool" },
		{ label: "bCoef", key: "bCoef", type: "num" },
		{ label: "cMask", key: "cMask", type: "flags" },
		{ label: "cGroup", key: "cGroup", type: "flags" },
		{ label: "color", key: "color", type: "color" },
		{ label: "radius", key: "radius", type: "num" },
		{ label: "invMass", key: "invMass", type: "num" },
	];

	for (const field of fields) {
		const row = document.createElement("div");
		row.className = "prop-row";
		const lbl = document.createElement("span");
		lbl.className = "prop-label";
		lbl.textContent = field.label;
		row.appendChild(lbl);

		const val = document.createElement("div");
		val.className = "prop-val";

		if (field.type === "num") {
			const inp = document.createElement("input");
			inp.className = "prop-input";
			inp.type = "text";
			inp.placeholder = "unset";
			inp.value =
				traitRecord[field.key] !== undefined
					? String(traitRecord[field.key])
					: "";
			inp.addEventListener("change", () => {
				const n = parseFloat(inp.value);
				if (inp.value === "" || inp.value === "unset") {
					delete traitRecord[field.key];
				} else if (!Number.isNaN(n)) {
					traitRecord[field.key] = n;
				}
				notify();
			});
			val.appendChild(inp);
		} else if (field.type === "bool") {
			val.appendChild(renderTraitBoolInput(traitRecord, field.key, notify));
		} else if (field.type === "flags") {
			val.appendChild(
				flagsInput(traitRecord[field.key] as string[] | undefined, (f) => {
					traitRecord[field.key] = f;
					notify();
				}),
			);
		} else if (field.type === "color") {
			val.appendChild(renderTraitColorInput(trait, notify));
		}

		row.appendChild(val);
		block.appendChild(row);
	}

	const usedBy = findTraitUsages(s, name);
	if (usedBy.length > 0) {
		const info = document.createElement("div");
		info.className = "prop-trait-usage";
		info.textContent = `Used by: ${usedBy.join(", ")}`;
		block.appendChild(info);
	}

	parent.appendChild(block);
}

function renderTraitBoolInput(
	trait: Record<string, unknown>,
	key: string,
	notify: ChangeCallback,
): HTMLElement {
	const wrap = document.createElement("div");
	wrap.style.display = "flex";
	wrap.style.alignItems = "center";
	wrap.style.gap = "6px";
	const cb = document.createElement("input");
	cb.type = "checkbox";
	cb.className = "prop-checkbox";
	cb.checked = (trait[key] as boolean | undefined) ?? true;
	cb.indeterminate = trait[key] === undefined;
	cb.addEventListener("change", () => {
		trait[key] = cb.checked;
		cb.indeterminate = false;
		notify();
	});
	const unset = document.createElement("button");
	unset.className = "prop-trait-unset";
	unset.textContent = "unset";
	unset.title = "Remove this field from trait";
	unset.addEventListener("click", () => {
		delete trait[key];
		cb.indeterminate = true;
		notify();
	});
	wrap.appendChild(cb);
	wrap.appendChild(unset);
	return wrap;
}

function renderTraitColorInput(
	trait: NonNullable<StadiumObject["traits"]>[string],
	notify: ChangeCallback,
): HTMLElement {
	const hexStr =
		trait.color !== undefined ? colorToHex(trait.color as never) : "#000000";
	const wrap = document.createElement("div");
	wrap.className = "prop-color-wrap";
	const picker = document.createElement("input");
	picker.type = "color";
	picker.style.display = "none";
	picker.value = hexStr;
	const swatch = document.createElement("div");
	swatch.className = "prop-color-swatch";
	swatch.style.background = hexStr;
	swatch.addEventListener("click", () => picker.click());
	const txt = document.createElement("input");
	txt.className = "prop-input";
	txt.type = "text";
	txt.style.flex = "1";
	txt.placeholder = "unset";
	txt.value = trait.color !== undefined ? hexStr.slice(1) : "";
	const update = (h: string): void => {
		trait.color = h;
		swatch.style.background = `#${h}`;
		picker.value = `#${h}`;
		txt.value = h;
		notify();
	};
	picker.addEventListener("input", () => update(hexToHbs(picker.value)));
	txt.addEventListener("change", () => {
		const raw = txt.value.replace("#", "").toUpperCase();
		if (raw === "") {
			delete trait.color;
			notify();
			return;
		}
		if (/^[0-9A-F]{6}$/.test(raw)) update(raw);
	});
	wrap.appendChild(swatch);
	wrap.appendChild(txt);
	wrap.appendChild(picker);
	return wrap;
}
