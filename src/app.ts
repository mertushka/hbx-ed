import "./styles/main.css";

import { bindCanvasEvents as bindCanvasEventHandlers } from "./app/canvasBindings.ts";
import { EditorState } from "./app/editorState.ts";
import { bindFileIO as bindFileInput } from "./app/fileBindings.ts";
import { bindKeyboard as bindKeyboardShortcuts } from "./app/keyboardBindings.ts";
import { NewStadiumController } from "./app/newStadiumController.ts";
import { buildObjectContextMenuItems } from "./app/objectContextMenu.ts";
import { PreviewController } from "./app/previewController.ts";
import { SelectionController } from "./app/selectionController.ts";
import { selectionRevealTarget } from "./app/selectionReveal.ts";
import { createStadiumDownload } from "./app/stadiumDownload.ts";
import { readStadiumFile } from "./app/stadiumFile.ts";
import {
	bindToolbarButtons as bindToolbarButtonControls,
	syncOverlayToggleButtons,
} from "./app/toolbarBindings.ts";
import {
	extractToolObjectDefault,
	getValidToolDefaultTrait,
	getValidToolObjectDefault,
	setToolDefaultTrait,
	setToolObjectDefault,
	type ToolDefaultTraits,
	type ToolObjectDefaults,
} from "./app/toolDefaults.ts";
import { renderValidationPanel } from "./app/validationPanel.ts";
import { Camera } from "./core/camera.ts";
import { getTraitValuesForType } from "./core/selectionTraits.ts";
import {
	type ClipboardEntry,
	cloneForClipboard,
	deleteSelections,
	duplicateSelection,
	normalizeStadium,
	pasteClipboard,
} from "./core/stadiumOps.ts";
import { CLASSIC_STADIUM } from "./data/classic.ts";
import { TEMPLATES } from "./data/templates.ts";
import { Renderer } from "./renderer/renderer.ts";
import type { AppContext } from "./tools/context.ts";
import { JointTool } from "./tools/JointTool.ts";
import { PanTool } from "./tools/PanTool.ts";
import { DiscTool, GoalTool, PlaneTool } from "./tools/PlacementTools.ts";
import { SegmentTool } from "./tools/SegmentTool.ts";
import { SelectTool } from "./tools/SelectTool.ts";
import { SpawnTool } from "./tools/SpawnTool.ts";
import type { Tool } from "./tools/types.ts";
import { VertexTool } from "./tools/VertexTool.ts";
import type {
	MultiSelection,
	ObjectType,
	Selection,
	StadiumObject,
} from "./types/stadium.ts";
import { ContextMenu } from "./ui/ContextMenu.ts";
import { ObjectTree, type ObjectTreeSelectModifiers } from "./ui/ObjectTree.ts";
import { PropertiesPanel } from "./ui/PropertiesPanel.ts";
import { StatusBar } from "./ui/StatusBar.ts";
import { Toast } from "./ui/Toast.ts";

const SELECTION_REVEAL_DURATION_MS = 180;

function easeOutCubic(t: number): number {
	return 1 - (1 - t) ** 3;
}

export class App {
	// ── Core state ─────────────────────────────────────────────────────────────
	private readonly editorState = new EditorState();
	private readonly camera = new Camera();

	// ── Subsystems ─────────────────────────────────────────────────────────────
	private readonly renderer: Renderer;
	private readonly preview: PreviewController;
	private readonly selectionController: SelectionController;

	private readonly objectTree: ObjectTree;
	private readonly propertiesPanel: PropertiesPanel;
	private readonly statusBar: StatusBar;
	private readonly toast: Toast;
	private readonly contextMenu: ContextMenu;

	// ── Tools ──────────────────────────────────────────────────────────────────
	private readonly tools: ReadonlyMap<string, Tool>;
	private activeTool: Tool;

	// ── Canvas ─────────────────────────────────────────────────────────────────
	private readonly canvas: HTMLCanvasElement;

	// Track shift key state for grid snapping
	private shiftHeld = false;

	// Track unsaved changes
	private dirty = false;

	// Clipboard for copy/paste
	private clipboard: ClipboardEntry | null = null;

	private readonly toolDefaultTraits: ToolDefaultTraits = {};
	private readonly toolObjectDefaults: ToolObjectDefaults = {};
	private objectTreeSelectionAnchor: Selection | null = null;

	private revealAnimationFrame: number | null = null;
	private revealAnimationToken = 0;

	private get stadium(): StadiumObject | null {
		return this.editorState.stadium;
	}

	private set stadium(stadium: StadiumObject | null) {
		this.editorState.stadium = stadium;
	}

	private get selection(): Selection | null {
		return this.editorState.selection;
	}

	private set selection(selection: Selection | null) {
		this.editorState.selection = selection;
	}

	private get multiSelection(): MultiSelection | null {
		return this.editorState.multiSelection;
	}

	private set multiSelection(multiSelection: MultiSelection | null) {
		this.editorState.multiSelection = multiSelection;
	}

	private get history(): EditorState["history"] {
		return this.editorState.history;
	}

	constructor() {
		this.canvas = this.getEl<HTMLCanvasElement>("#main-canvas");
		this.renderer = new Renderer(this.canvas, () => this.render());
		this.statusBar = new StatusBar();
		this.toast = new Toast();
		this.contextMenu = new ContextMenu();
		this.preview = new PreviewController({
			canvas: this.getEl<HTMLCanvasElement>("#preview-canvas"),
			overlay: this.getEl("#preview-overlay"),
			title: this.getEl("#preview-title"),
			openButton: this.getEl("#btn-preview"),
			closeButton: this.getEl("#preview-close"),
			exportButton: this.getEl("#preview-export"),
			zoomInButton: this.getEl("#preview-zoom-in"),
			zoomOutButton: this.getEl("#preview-zoom-out"),
			zoomFitButton: this.getEl("#preview-zoom-fit"),
			getStadium: () => this.stadium,
			toast: (message) => this.toast.show(message),
		});
		new NewStadiumController({
			openButton: this.getEl("#btn-new"),
			modal: this.getEl("#new-modal"),
			closeButton: this.getEl("#new-modal-close"),
			nameInput: this.getEl<HTMLInputElement>("#new-stadium-name"),
			templateGrid: this.getEl("#template-grid"),
			createButton: this.getEl("#btn-create-stadium"),
			templates: TEMPLATES,
			isDirty: () => this.dirty,
			confirmDiscard: (message) => confirm(message),
			loadStadium: (stadium) => this.loadStadium(stadium),
		});

		this.objectTree = new ObjectTree(
			(sel, modifiers) => this.selectFromObjectTree(sel, modifiers),
			(e, sel) => this.showObjectContextMenu(e, sel),
			() => this.saveMutation(),
		);

		this.propertiesPanel = new PropertiesPanel(
			() => {
				// Save history and update canvas + tree, but do NOT rebuild the
				// properties form — that would destroy the focused input mid-edit.
				this.rememberToolDefaultFromSelection(this.selection);
				this.saveMutation();
				this.objectTree.render(
					this.stadium,
					this.selection,
					this.multiSelection,
				);
				this.render();
			},
			() => this.deleteSelected(),
			{
				getToolDefaultTrait: (type) => this.getToolDefaultTrait(type),
				setToolDefaultTrait: (type, trait) => {
					setToolDefaultTrait(this.toolDefaultTraits, type, trait);
					this.rememberToolDefaultTrait(type, trait);
				},
			},
		);
		// When a trait is added or deleted, rebuild the full panel.
		this.propertiesPanel.setRebuildCallback(() => this.renderProperties());

		this.selectionController = new SelectionController({
			editorState: this.editorState,
			renderer: this.renderer,
			objectTree: this.objectTree,
			propertiesPanel: this.propertiesPanel,
			statusBar: this.statusBar,
			getStadium: () => this.stadium,
			render: () => this.render(),
		});

		const ctx = this.buildAppContext();

		this.tools = new Map<string, Tool>([
			["select", new SelectTool(ctx, () => this.camera.zoom)],
			["pan", new PanTool(ctx, this.camera, (e) => this.canvasScreenPos(e))],
			["vertex", new VertexTool(ctx, () => this.camera.zoom)],
			["segment", new SegmentTool(ctx, () => this.camera.zoom)],
			["disc", new DiscTool(ctx, () => this.camera.zoom)],
			["goal", new GoalTool(ctx, () => this.camera.zoom)],
			["plane", new PlaneTool(ctx, () => this.camera.zoom)],
			["joint", new JointTool(ctx, () => this.camera.zoom)],
			["spawn-red", new SpawnTool(ctx, "red")],
			["spawn-blue", new SpawnTool(ctx, "blue")],
		]);

		const selectTool = this.tools.get("select");
		if (!selectTool) throw new Error("Select tool is not registered");
		this.activeTool = selectTool;

		this.bindToolbarButtons();
		this.bindCanvasEvents();
		this.bindKeyboard();
		this.bindFileIO();
		this.bindZoomButtons();

		this.loadStadium(structuredClone(CLASSIC_STADIUM));
		this.resizeCanvas();
	}

	// ── Public interface (AppContext) ──────────────────────────────────────────

	private buildAppContext(): AppContext {
		return {
			getStadium: () => this.stadium,
			getSelection: () => this.selection,
			setSelection: (sel) => this.select(sel),
			getMultiSelection: () => this.multiSelection,
			setMultiSelection: (ms) => this.selectionController.setMultiSelection(ms),
			getToolDefaultTrait: (type) => this.getToolDefaultTrait(type),
			getToolDefaultObject: (type) => this.getToolDefaultObject(type),
			saveHistory: () => {
				this.saveMutation();
			},
			refresh: () => this.refresh(),
			toast: (msg) => this.toast.show(msg),
			renderer: this.renderer,
			isShiftHeld: () => this.shiftHeld,
			duplicate: () => this.duplicateSelected(),
		};
	}

	// ── Stadium lifecycle ──────────────────────────────────────────────────────

	private loadStadium(data: StadiumObject): void {
		this.cancelRevealAnimation();
		const normalized = normalizeStadium(data);
		this.editorState.load(normalized);
		this.selectionController.clearMultiSelection();
		this.dirty = false;

		this.getEl("#stadium-name-display").textContent = normalized.name;
		this.fitView();
		this.refresh();
		this.updateOverlayToggles();
		this.updateUndoRedoState();
		this.runValidation();
		this.toast.show(`Loaded: ${normalized.name}`);
	}

	private saveStadium(): void {
		if (!this.stadium) {
			this.toast.show("Nothing to save");
			return;
		}

		const download = createStadiumDownload(this.stadium);
		const blob = new Blob([download.contents], { type: download.mimeType });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = download.filename;
		a.click();
		URL.revokeObjectURL(a.href);
		this.markClean();
		this.toast.show(`Saved ${a.download}`);
	}

	// ── Selection ──────────────────────────────────────────────────────────────

	private select(sel: Selection | null): void {
		this.selectionController.select(sel);
		this.rememberToolDefaultFromSelection(sel);
		this.revealSelected(sel);
	}

	private selectFromObjectTree(
		sel: Selection,
		modifiers: ObjectTreeSelectModifiers,
	): void {
		if (modifiers.range && this.objectTreeSelectionAnchor?.type === sel.type) {
			this.selectObjectTreeRange(this.objectTreeSelectionAnchor, sel);
			return;
		}

		if (modifiers.toggle || modifiers.range) {
			this.toggleObjectTreeSelection(sel);
			this.objectTreeSelectionAnchor =
				this.selection || this.multiSelection?.items.length ? sel : null;
			return;
		}

		this.objectTreeSelectionAnchor = sel;
		this.select(sel);
	}

	private toggleObjectTreeSelection(sel: Selection): void {
		const base =
			this.multiSelection?.items ?? (this.selection ? [this.selection] : []);
		const existingIndex = base.findIndex(
			(item) => item.type === sel.type && item.index === sel.index,
		);
		const items =
			existingIndex >= 0
				? base.filter((_, index) => index !== existingIndex)
				: [...base, sel];
		this.applyObjectTreeMultiSelection(items);
	}

	private selectObjectTreeRange(anchor: Selection, sel: Selection): void {
		const count = this.objectCount(anchor.type);
		const start = Math.max(0, Math.min(anchor.index, sel.index));
		const end = Math.min(count - 1, Math.max(anchor.index, sel.index));
		const items: Selection[] = [];
		for (let index = start; index <= end; index++) {
			items.push({ type: anchor.type, index });
		}
		this.applyObjectTreeMultiSelection(items);
	}

	private applyObjectTreeMultiSelection(items: Selection[]): void {
		if (items.length === 0) {
			this.select(null);
			return;
		}
		if (items.length === 1) {
			this.select(items[0] as Selection);
			return;
		}

		this.selectionController.setMultiSelection({ items });
		this.revealSelected(items[0] as Selection);
	}

	private selectValidationTargets(targets: Selection[]): void {
		if (targets.length === 0) return;
		if (targets.length === 1) {
			this.select(targets[0] ?? null);
			return;
		}

		this.selectionController.setMultiSelection({ items: targets });
		this.revealSelected(targets[0] ?? null);
	}

	private revealSelected(sel: Selection | null): void {
		this.cancelRevealAnimation();
		const target = selectionRevealTarget(
			this.camera,
			this.stadium,
			sel,
			this.renderer.width,
			this.renderer.height,
		);
		if (!target) return;

		this.animateCameraTo(target.x, target.y);
	}

	private animateCameraTo(targetX: number, targetY: number): void {
		const startX = this.camera.x;
		const startY = this.camera.y;
		const dx = targetX - startX;
		const dy = targetY - startY;
		const prefersReducedMotion =
			window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

		if (Math.hypot(dx, dy) < 0.5 || prefersReducedMotion) {
			this.camera.x = targetX;
			this.camera.y = targetY;
			this.render();
			return;
		}

		const token = ++this.revealAnimationToken;
		const startedAt = performance.now();
		const step = () => {
			if (token !== this.revealAnimationToken) return;

			const t = Math.min(
				1,
				(performance.now() - startedAt) / SELECTION_REVEAL_DURATION_MS,
			);
			const eased = easeOutCubic(t);
			this.camera.x = startX + dx * eased;
			this.camera.y = startY + dy * eased;
			this.render();

			if (t < 1) {
				this.revealAnimationFrame = window.requestAnimationFrame(step);
				return;
			}
			this.revealAnimationFrame = null;
		};

		this.revealAnimationFrame = window.requestAnimationFrame(step);
	}

	private cancelRevealAnimation(): void {
		this.revealAnimationToken += 1;
		if (this.revealAnimationFrame === null) return;
		window.cancelAnimationFrame?.(this.revealAnimationFrame);
		this.revealAnimationFrame = null;
	}

	private deleteSelected(): void {
		// ── Multi-delete ──────────────────────────────────────────────────────────
		if (
			this.multiSelection &&
			this.multiSelection.items.length > 0 &&
			this.stadium
		) {
			const count = deleteSelections(this.stadium, this.multiSelection.items);
			this.selectionController.clearMultiSelection();
			this.select(null);
			this.saveMutation();
			this.toast.show(`Deleted ${count} objects`);
			return;
		}

		// ── Single delete ─────────────────────────────────────────────────────────
		if (!this.stadium || !this.selection) return;
		const { type } = this.selection;
		deleteSelections(this.stadium, [this.selection]);
		this.select(null);
		this.saveMutation();
		this.toast.show(`Deleted ${type}`);
	}

	private duplicateSelected(): void {
		if (!this.stadium || !this.selection) return;
		const nextSelection = duplicateSelection(this.stadium, this.selection);
		if (!nextSelection) return;
		this.saveMutation();
		this.select(nextSelection);
		this.toast.show(
			`Duplicated ${nextSelection.type} → #${nextSelection.index}`,
		);
	}

	private copySelected(): void {
		if (!this.stadium) return;

		// Prefer multi-selection over single if both are active
		const source: Selection | null =
			this.multiSelection?.items[0] ?? this.selection;

		if (!source) {
			this.toast.show("Select something first");
			return;
		}

		this.clipboard = cloneForClipboard(this.stadium, source);
		if (!this.clipboard) return;
		this.toast.show(`Copied ${source.type} (Ctrl+V to paste)`);
	}

	private pasteClipboard(): void {
		if (!this.clipboard || !this.stadium) {
			this.toast.show("Nothing to paste");
			return;
		}

		const nextSelection = pasteClipboard(this.stadium, this.clipboard);
		if (!nextSelection) {
			this.toast.show("Cannot paste: unknown object type");
			return;
		}
		this.saveMutation();
		this.select(nextSelection);
		this.toast.show(`Pasted ${nextSelection.type} → #${nextSelection.index}`);
	}

	private getToolDefaultTrait(type: ObjectType): string | undefined {
		return getValidToolDefaultTrait(this.stadium, this.toolDefaultTraits, type);
	}

	private getToolDefaultObject<T extends ObjectType>(
		type: T,
	): ReturnType<typeof getValidToolObjectDefault<T>> {
		return getValidToolObjectDefault(
			this.stadium,
			this.toolObjectDefaults,
			this.toolDefaultTraits,
			type,
		);
	}

	private rememberToolDefaultFromSelection(selection: Selection | null): void {
		if (!this.stadium || !selection) return;
		const objectDefault = extractToolObjectDefault(this.stadium, selection);
		if (!objectDefault) return;
		setToolObjectDefault(
			this.toolObjectDefaults,
			selection.type,
			objectDefault,
		);
		setToolDefaultTrait(
			this.toolDefaultTraits,
			selection.type,
			"trait" in objectDefault && typeof objectDefault.trait === "string"
				? objectDefault.trait
				: undefined,
		);
	}

	private rememberToolDefaultTrait(
		type: ObjectType,
		trait: string | undefined,
	): void {
		const next = trait
			? {
					...(getTraitValuesForType(this.stadium, type, trait) ?? {}),
					trait,
				}
			: (structuredClone(this.toolObjectDefaults[type] ?? {}) as Record<
					string,
					unknown
				>);
		if (!trait) delete next.trait;
		setToolObjectDefault(
			this.toolObjectDefaults,
			type,
			next as Parameters<typeof setToolObjectDefault>[2],
		);
	}

	private objectCount(type: ObjectType): number {
		if (!this.stadium) return 0;
		switch (type) {
			case "vertex":
				return this.stadium.vertexes.length;
			case "segment":
				return this.stadium.segments.length;
			case "disc":
				return this.stadium.discs.length;
			case "goal":
				return this.stadium.goals.length;
			case "plane":
				return this.stadium.planes.length;
			case "joint":
				return this.stadium.joints.length;
		}
	}

	private saveMutation(): void {
		if (!this.editorState.saveMutation()) return;
		this.runValidation();
		this.markDirty();
	}

	private markDirty(): void {
		if (!this.dirty) {
			this.dirty = true;
			const nameEl = this.getEl("#stadium-name-display");
			if (!nameEl.textContent?.startsWith("●")) {
				nameEl.textContent = `● ${nameEl.textContent ?? ""}`;
			}
		}
		this.updateUndoRedoState();
	}

	private markClean(): void {
		this.dirty = false;
		const nameEl = this.getEl("#stadium-name-display");
		if (nameEl.textContent?.startsWith("● ")) {
			nameEl.textContent = nameEl.textContent.slice(2);
		}
	}

	private updateUndoRedoState(): void {
		this.getEl("#btn-undo").toggleAttribute("disabled", !this.history.canUndo);
		this.getEl("#btn-redo").toggleAttribute("disabled", !this.history.canRedo);
	}

	// ── Undo / Redo ────────────────────────────────────────────────────────────

	private undo(): void {
		const prev = this.editorState.undo();
		if (!prev) return;
		this.selectionController.clearMultiSelection();
		this.select(null);
		this.runValidation();
		this.markDirty();
		this.updateUndoRedoState();
	}

	private redo(): void {
		const next = this.editorState.redo();
		if (!next) return;
		this.selectionController.clearMultiSelection();
		this.select(null);
		this.runValidation();
		this.markDirty();
		this.updateUndoRedoState();
	}

	// ── Rendering ─────────────────────────────────────────────────────────────

	private render(): void {
		this.renderer.render(this.stadium, this.camera, this.selection);
		this.statusBar.setZoom(this.camera.zoomPercent);
		if (this.preview.isOpen) this.preview.render();
	}

	private refresh(): void {
		this.objectTree.render(this.stadium, this.selection, this.multiSelection);
		this.renderProperties();
		this.render();
	}

	private renderProperties(): void {
		if (!this.stadium) {
			this.propertiesPanel.clear();
			return;
		}
		if (this.selection) {
			this.propertiesPanel.render(this.stadium, this.selection);
			return;
		}
		if (this.multiSelection && this.multiSelection.items.length > 1) {
			this.propertiesPanel.renderMultiSelection(
				this.stadium,
				this.multiSelection,
			);
			return;
		}
		this.propertiesPanel.renderGlobal(this.stadium);
	}

	private fitView(): void {
		if (!this.stadium) return;
		this.cancelRevealAnimation();
		this.camera.fitRect(
			this.stadium.width,
			this.stadium.height,
			this.renderer.width,
			this.renderer.height,
		);
		this.render();
	}

	// ── Canvas events ──────────────────────────────────────────────────────────

	private bindCanvasEvents(): void {
		bindCanvasEventHandlers({
			canvas: this.canvas,
			getWorldPos: (event) => this.worldPos(event),
			getActiveTool: () => this.activeTool,
			getPanTool: () => this.tools.get("pan"),
			getStadium: () => this.stadium,
			getZoom: () => this.camera.zoom,
			zoomAt: (factor, anchorX, anchorY) => {
				this.cancelRevealAnimation();
				this.camera.zoomAt(factor, anchorX, anchorY);
			},
			cancelCameraAnimation: () => this.cancelRevealAnimation(),
			render: () => this.render(),
			setCoords: (x, y) => this.statusBar.setCoords(x, y),
			showContextMenu: (x, y, items) => this.contextMenu.show(x, y, items),
			showObjectContextMenu: (event, selection) =>
				this.showObjectContextMenu(event, selection),
			saveHistory: () => this.saveMutation(),
		});
	}

	private worldPos(e: MouseEvent): { x: number; y: number } {
		const rect = this.canvas.getBoundingClientRect();
		return this.camera.screenToWorld(
			e.clientX - rect.left,
			e.clientY - rect.top,
			this.renderer.width,
			this.renderer.height,
		);
	}

	private canvasScreenPos(e: MouseEvent): { x: number; y: number } {
		const rect = this.canvas.getBoundingClientRect();
		return { x: e.clientX - rect.left, y: e.clientY - rect.top };
	}

	// ── Context menu ───────────────────────────────────────────────────────────

	private showObjectContextMenu(e: MouseEvent, sel: Selection): void {
		const multiSelectionCount = this.selectionController.contains(sel)
			? (this.multiSelection?.items.length ?? 0)
			: 0;
		if (multiSelectionCount === 0) this.select(sel);

		const items = buildObjectContextMenuItems(
			this.stadium,
			sel,
			{
				select: (selection) => this.select(selection),
				deleteSelected: () => this.deleteSelected(),
				saveHistory: () => this.saveMutation(),
				refresh: () => this.refresh(),
			},
			multiSelectionCount > 1
				? { deleteLabel: `Delete ${multiSelectionCount} selected objects` }
				: undefined,
		);
		if (!items) return;

		this.contextMenu.show(e.clientX, e.clientY, items);
	}

	// ── Toolbar & keyboard ─────────────────────────────────────────────────────

	private bindToolbarButtons(): void {
		bindToolbarButtonControls({
			fileInput: this.getEl<HTMLInputElement>("#file-input"),
			openButton: this.getEl("#btn-open"),
			saveButton: this.getEl("#btn-save"),
			undoButton: this.getEl("#btn-undo"),
			redoButton: this.getEl("#btn-redo"),
			toggleLabelsButton: this.getEl("#btn-toggle-labels"),
			toggleSpawnsButton: this.getEl("#btn-toggle-spawns"),
			isDirty: () => this.dirty,
			confirmDiscard: (message) => confirm(message),
			setTool: (name) => this.setTool(name),
			save: () => this.saveStadium(),
			undo: () => this.undo(),
			redo: () => this.redo(),
			toggleVertexLabels: () => {
				this.renderer.showVertexLabels = !this.renderer.showVertexLabels;
				this.updateOverlayToggles();
				this.render();
			},
			toggleSpawnPoints: () => {
				this.renderer.showSpawnPoints = !this.renderer.showSpawnPoints;
				this.updateOverlayToggles();
				this.render();
			},
		});
	}

	private updateOverlayToggles(): void {
		syncOverlayToggleButtons({
			labelsButton: this.getEl("#btn-toggle-labels"),
			spawnsButton: this.getEl("#btn-toggle-spawns"),
			showVertexLabels: this.renderer.showVertexLabels,
			showSpawnPoints: this.renderer.showSpawnPoints,
		});
	}

	private bindZoomButtons(): void {
		this.getEl("#btn-zoom-in").addEventListener("click", () => {
			this.cancelRevealAnimation();
			this.camera.zoomAt(1.25, this.camera.x, this.camera.y);
			this.render();
		});
		this.getEl("#btn-zoom-out").addEventListener("click", () => {
			this.cancelRevealAnimation();
			this.camera.zoomAt(1 / 1.25, this.camera.x, this.camera.y);
			this.render();
		});
		this.getEl("#btn-zoom-fit").addEventListener("click", () => this.fitView());
	}

	private bindKeyboard(): void {
		const modal = this.getEl("#shortcut-modal");
		bindKeyboardShortcuts({
			shortcutModal: modal,
			shortcutClose: this.getEl("#shortcut-close"),
			newModal: document.getElementById("new-modal"),
			setShiftHeld: (held) => {
				this.shiftHeld = held;
			},
			undo: () => this.undo(),
			redo: () => this.redo(),
			save: () => this.saveStadium(),
			duplicate: () => this.duplicateSelected(),
			copy: () => this.copySelected(),
			paste: () => this.pasteClipboard(),
			deleteSelected: () => this.deleteSelected(),
			setTool: (name) => this.setTool(name),
			toggleVertexLabels: () => {
				this.renderer.showVertexLabels = !this.renderer.showVertexLabels;
				this.updateOverlayToggles();
				this.render();
			},
			toggleSpawnPoints: () => {
				this.renderer.showSpawnPoints = !this.renderer.showSpawnPoints;
				this.updateOverlayToggles();
				this.render();
			},
			isPreviewOpen: () => this.preview.isOpen,
			closePreview: () => this.preview.close(),
			clearMultiSelection: () => this.selectionController.clearMultiSelection(),
			clearSelection: () => {
				this.activeTool.onDeactivate?.();
				this.select(null);
			},
		});
	}

	private bindFileIO(): void {
		bindFileInput({
			fileInput: this.getEl<HTMLInputElement>("#file-input"),
			canvasArea: this.getEl("#canvas-area"),
			dropOverlay: this.getEl("#drop-overlay"),
			isDirty: () => this.dirty,
			confirmDiscard: (message) => confirm(message),
			readFile: (file) => this.readFile(file),
		});
	}

	private readFile(file: File): void {
		readStadiumFile(file, {
			loadStadium: (stadium) => this.loadStadium(stadium),
			reportError: (message) => this.toast.show(message),
		});
	}

	// ── Tool management ────────────────────────────────────────────────────────

	private setTool(name: string): void {
		const tool = this.tools.get(name);
		if (!tool) return;

		this.activeTool.onDeactivate?.();
		this.activeTool = tool;
		this.canvas.style.cursor = tool.cursor;

		document.querySelectorAll<HTMLElement>("[data-tool]").forEach((btn) => {
			btn.classList.toggle("active", btn.dataset.tool === name);
		});
	}

	// ── Resize ────────────────────────────────────────────────────────────────

	resizeCanvas(): void {
		const area = this.getEl("#canvas-area");
		this.renderer.resize(area.clientWidth, area.clientHeight);
		this.render();
		this.preview.resizeIfOpen();
	}

	// ── Stadium validation ─────────────────────────────────────────────────────

	private runValidation(): void {
		renderValidationPanel(
			document.getElementById("validation-panel"),
			this.stadium,
			{
				onSelectIssue: (selection) => this.select(selection),
				onSelectIssueTargets: (selections) =>
					this.selectValidationTargets(selections),
			},
		);
	}

	// ── Utilities ─────────────────────────────────────────────────────────────

	private getEl<T extends HTMLElement = HTMLElement>(selector: string): T {
		const el = document.querySelector<T>(selector);
		if (!el) throw new Error(`Element not found: ${selector}`);
		return el;
	}
}
