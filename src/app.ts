import "./styles/main.css";

import { bindCanvasEvents as bindCanvasEventHandlers } from "./app/canvasBindings.ts";
import { bindFileIO as bindFileInput } from "./app/fileBindings.ts";
import { bindKeyboard as bindKeyboardShortcuts } from "./app/keyboardBindings.ts";
import { NewStadiumController } from "./app/newStadiumController.ts";
import { buildObjectContextMenuItems } from "./app/objectContextMenu.ts";
import { PreviewController } from "./app/previewController.ts";
import {
	bindToolbarButtons as bindToolbarButtonControls,
	syncOverlayToggleButtons,
} from "./app/toolbarBindings.ts";
import { renderValidationPanel } from "./app/validationPanel.ts";
import { Camera } from "./core/camera.ts";
import { parseHbs, serializeHbs } from "./core/hbsFormat.ts";
import { History } from "./core/history.ts";
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
	Selection,
	StadiumObject,
} from "./types/stadium.ts";
import { ContextMenu } from "./ui/ContextMenu.ts";
import { ObjectTree } from "./ui/ObjectTree.ts";
import { PropertiesPanel } from "./ui/PropertiesPanel.ts";
import { StatusBar } from "./ui/StatusBar.ts";
import { Toast } from "./ui/Toast.ts";

export class App {
	// ── Core state ─────────────────────────────────────────────────────────────
	private stadium: StadiumObject | null = null;
	private selection: Selection | null = null;
	private multiSelection: MultiSelection | null = null;
	private readonly camera = new Camera();
	private readonly history = new History<StadiumObject>();

	// ── Subsystems ─────────────────────────────────────────────────────────────
	private readonly renderer: Renderer;
	private readonly preview: PreviewController;

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

		const ctx = this.buildAppContext();

		this.objectTree = new ObjectTree(
			(sel) => this.select(sel),
			(e, sel) => this.showObjectContextMenu(e, sel),
			() => this.saveMutation(),
		);

		this.propertiesPanel = new PropertiesPanel(
			() => {
				// Save history and update canvas + tree, but do NOT rebuild the
				// properties form — that would destroy the focused input mid-edit.
				this.saveMutation();
				this.objectTree.render(
					this.stadium,
					this.selection,
					this.multiSelection,
				);
				this.render();
			},
			() => this.deleteSelected(),
		);
		// When a trait is added or deleted, rebuild the full panel.
		this.propertiesPanel.setRebuildCallback(() => {
			if (this.stadium && this.selection) {
				this.propertiesPanel.render(this.stadium, this.selection);
			}
		});

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
			setMultiSelection: (ms) => {
				this.multiSelection = ms;
				this.renderer.multiSelection = ms;
				// Update status bar
				const count = ms?.items.length ?? 0;
				if (count > 1) {
					this.getEl("#status-sel").textContent = `${count} objects selected`;
				}
				this.render();
			},
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
		const normalized = normalizeStadium(data);
		this.stadium = normalized;
		this.selection = null;
		this.history.clear();
		this.history.save(normalized);
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

		const json = serializeHbs(this.stadium);
		const blob = new Blob([json], { type: "application/json" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = `${this.stadium.name.replace(/\s+/g, "_")}.hbs`;
		a.click();
		URL.revokeObjectURL(a.href);
		this.markClean();
		this.toast.show(`Saved ${a.download}`);
	}

	// ── Selection ──────────────────────────────────────────────────────────────

	private select(sel: Selection | null): void {
		this.selection = sel;
		if (sel !== null) {
			this.multiSelection = null;
			this.renderer.multiSelection = null;
		}
		this.objectTree.render(this.stadium, sel, this.multiSelection);

		if (!sel || !this.stadium) {
			this.propertiesPanel.clear();
			this.statusBar.setSelection(
				this.multiSelection
					? `${this.multiSelection.items.length} objects selected`
					: "nothing selected",
			);
		} else {
			this.propertiesPanel.render(this.stadium, sel);
			this.statusBar.setSelection(`${sel.type} #${sel.index} selected`);
		}

		this.render();
	}

	private deleteSelected(): void {
		// ── Multi-delete ──────────────────────────────────────────────────────────
		if (
			this.multiSelection &&
			this.multiSelection.items.length > 0 &&
			this.stadium
		) {
			const count = deleteSelections(this.stadium, this.multiSelection.items);
			this.multiSelection = null;
			this.renderer.multiSelection = null;
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

	private saveMutation(): void {
		if (!this.stadium) return;
		this.history.save(this.stadium);
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
		const prev = this.history.undo();
		if (!prev) return;
		this.stadium = prev;
		this.multiSelection = null;
		this.renderer.multiSelection = null;
		this.select(null);
		this.runValidation();
		this.markDirty();
		this.updateUndoRedoState();
	}

	private redo(): void {
		const next = this.history.redo();
		if (!next) return;
		this.stadium = next;
		this.multiSelection = null;
		this.renderer.multiSelection = null;
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
		if (this.stadium && this.selection) {
			this.propertiesPanel.render(this.stadium, this.selection);
		}
		this.render();
	}

	private fitView(): void {
		if (!this.stadium) return;
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
			zoomAt: (factor, anchorX, anchorY) =>
				this.camera.zoomAt(factor, anchorX, anchorY),
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
		const multiSelectionCount = this.multiSelectionContains(sel)
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

	private multiSelectionContains(selection: Selection): boolean {
		return (
			this.multiSelection?.items.some(
				(item) =>
					item.type === selection.type && item.index === selection.index,
			) ?? false
		);
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
			this.camera.zoomAt(1.25, this.camera.x, this.camera.y);
			this.render();
		});
		this.getEl("#btn-zoom-out").addEventListener("click", () => {
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
			clearMultiSelection: () => {
				if (!this.multiSelection) return false;
				this.multiSelection = null;
				this.renderer.multiSelection = null;
				this.statusBar.setSelection("nothing selected");
				this.objectTree.render(this.stadium, this.selection, null);
				this.render();
				return true;
			},
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
		const reader = new FileReader();
		reader.addEventListener("load", () => {
			try {
				const raw = parseHbs(reader.result as string);
				this.loadStadium(raw as StadiumObject);
			} catch (err) {
				this.toast.show(
					`Error: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		});
		reader.readAsText(file);
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
		);
	}

	// ── Utilities ─────────────────────────────────────────────────────────────

	private getEl<T extends HTMLElement = HTMLElement>(selector: string): T {
		const el = document.querySelector<T>(selector);
		if (!el) throw new Error(`Element not found: ${selector}`);
		return el;
	}
}
