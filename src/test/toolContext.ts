import { vi } from "vitest";
import type {
	ToolObjectDefault,
	ToolObjectDefaults,
} from "../app/toolDefaults.ts";
import type { AppContext } from "../tools/context.ts";
import type {
	MultiSelection,
	ObjectType,
	Selection,
	StadiumObject,
} from "../types/stadium.ts";

export function createTestStadium(
	overrides: Partial<StadiumObject> = {},
): StadiumObject {
	const base: StadiumObject = {
		name: "Tools",
		width: 100,
		height: 50,
		traits: {},
		vertexes: [],
		segments: [],
		goals: [],
		discs: [],
		planes: [],
		joints: [],
	};

	return Object.assign(base, overrides);
}

export function createToolContext(stadium: StadiumObject | null) {
	let selection: Selection | null = null;
	let multiSelection: MultiSelection | null = null;
	const toolDefaultTraits: Partial<Record<ObjectType, string>> = {};
	const toolObjectDefaults: ToolObjectDefaults = {};

	const ctx: AppContext = {
		getStadium: () => stadium,
		getSelection: () => selection,
		setSelection: vi.fn((sel: Selection | null) => {
			selection = sel;
		}),
		getMultiSelection: () => multiSelection,
		setMultiSelection: vi.fn((ms: MultiSelection | null) => {
			multiSelection = ms;
		}),
		getToolDefaultTrait: vi.fn((type: ObjectType) => toolDefaultTraits[type]),
		getToolDefaultObject: vi.fn(
			<T extends ObjectType>(type: T): ToolObjectDefault<T> | undefined =>
				toolObjectDefaults[type] as ToolObjectDefault<T> | undefined,
		),
		saveHistory: vi.fn(),
		refresh: vi.fn(),
		toast: vi.fn(),
		renderer: {} as AppContext["renderer"],
		isShiftHeld: vi.fn(() => false),
		duplicate: vi.fn(),
	};

	return {
		ctx,
		get selection() {
			return selection;
		},
		get multiSelection() {
			return multiSelection;
		},
		setToolDefaultTrait(type: ObjectType, trait: string | undefined) {
			if (trait) toolDefaultTraits[type] = trait;
			else delete toolDefaultTraits[type];
		},
		setToolDefaultObject<T extends ObjectType>(
			type: T,
			value: ToolObjectDefault<T> | undefined,
		) {
			if (value) toolObjectDefaults[type] = value;
			else delete toolObjectDefaults[type];
		},
	};
}

export function mouseEvent(shiftKey = false): MouseEvent {
	return new MouseEvent("mousedown", { shiftKey });
}
