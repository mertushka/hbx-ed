// ─── Primitives ──────────────────────────────────────────────────────────────

export type Vec2 = [number, number];

/**
 * HaxBall color value. Per the .hbs spec:
 *   - "transparent"
 *   - "RRGGBB" hex string
 *   - [Red, Green, Blue] integer array
 */
export type HBSColor = string | [number, number, number];

// ─── Stadium Objects ──────────────────────────────────────────────────────────

export interface Vertex {
	x: number;
	y: number;
	bCoef?: number;
	cMask?: string[];
	cGroup?: string[];
	trait?: string;
}

export interface Segment {
	v0: number;
	v1: number;
	bCoef?: number;
	/** Arc angle in degrees. Ignored when curveF is present. */
	curve?: number;
	/** Arc cotangent (1/tan(curve/2)). Takes priority over curve. */
	curveF?: number;
	bias?: number;
	cMask?: string[];
	cGroup?: string[];
	vis?: boolean;
	color?: HBSColor;
	trait?: string;
}

export interface Goal {
	p0?: Vec2;
	p1?: Vec2;
	team?: "red" | "blue";
	trait?: string;
}

export interface Disc {
	pos?: Vec2;
	speed?: Vec2;
	gravity?: Vec2;
	radius?: number;
	invMass?: number;
	damping?: number;
	color?: HBSColor;
	bCoef?: number;
	cMask?: string[];
	cGroup?: string[];
	trait?: string;
}

export interface Plane {
	normal?: Vec2;
	dist?: number;
	bCoef?: number;
	cMask?: string[];
	cGroup?: string[];
	trait?: string;
}

export interface Joint {
	d0: number;
	d1: number;
	length?: number | Vec2 | null;
	strength?: number | "rigid";
	color?: HBSColor;
	trait?: string;
}

export interface Background {
	type: "grass" | "hockey" | "none";
	width?: number;
	height?: number;
	kickOffRadius?: number;
	cornerRadius?: number;
	goalLine?: number;
	color?: HBSColor;
}

export interface PlayerPhysics {
	gravity?: Vec2;
	radius?: number;
	invMass?: number;
	bCoef?: number;
	damping?: number;
	cGroup?: string[];
	acceleration?: number;
	kickingAcceleration?: number;
	kickingDamping?: number;
	kickStrength?: number;
	kickback?: number;
}

export type TraitMap = Record<
	string,
	Partial<Vertex & Segment & Goal & Plane & Disc & Joint>
>;

export interface StadiumObject {
	name: string;
	width: number;
	height: number;
	maxViewWidth?: number;
	cameraFollow?: "ball" | "player";
	spawnDistance?: number;
	canBeStored?: boolean;
	kickOffReset?: "full" | "partial";
	bg?: Background;
	traits?: TraitMap;
	vertexes: Vertex[];
	segments: Segment[];
	goals: Goal[];
	discs: Disc[];
	planes: Plane[];
	joints: Joint[];
	redSpawnPoints?: Vec2[];
	blueSpawnPoints?: Vec2[];
	playerPhysics?: PlayerPhysics;
	ballPhysics?: Disc | "disc0";
}

// ─── Editor Selection ─────────────────────────────────────────────────────────

export type ObjectType =
	| "vertex"
	| "segment"
	| "disc"
	| "goal"
	| "plane"
	| "joint";

export const OBJECT_TYPES: readonly ObjectType[] = [
	"vertex",
	"segment",
	"disc",
	"goal",
	"plane",
	"joint",
] as const;

export function isObjectType(v: unknown): v is ObjectType {
	return (
		typeof v === "string" && (OBJECT_TYPES as readonly string[]).includes(v)
	);
}

export interface Selection {
	type: ObjectType;
	index: number;
}

/** A set of selected objects across multiple types and indices. */
export interface MultiSelection {
	items: Selection[];
}
