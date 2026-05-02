export interface MenuItemDef {
	label: string;
	action: () => void;
	variant?: "danger";
}

export type MenuDef = (MenuItemDef | "separator")[];

export class ContextMenu {
	private readonly el: HTMLElement;

	constructor() {
		const el = document.getElementById("ctx-menu");
		if (!el) throw new Error("#ctx-menu element not found");
		this.el = el;

		document.addEventListener("click", () => this.hide());
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape") this.hide();
		});
	}

	show(x: number, y: number, items: MenuDef): void {
		this.el.innerHTML = "";

		for (const item of items) {
			if (item === "separator") {
				const sep = document.createElement("div");
				sep.className = "ctx-sep";
				this.el.appendChild(sep);
				continue;
			}

			const el = document.createElement("div");
			el.className = `ctx-item${item.variant ? ` ${item.variant}` : ""}`;
			el.textContent = item.label;
			el.addEventListener("click", (e) => {
				e.stopPropagation();
				this.hide();
				item.action();
			});
			this.el.appendChild(el);
		}

		// Clamp to viewport
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		this.el.style.display = "block";
		const rect = this.el.getBoundingClientRect();
		this.el.style.left = `${Math.min(x, vw - rect.width - 8)}px`;
		this.el.style.top = `${Math.min(y, vh - rect.height - 8)}px`;
	}

	hide(): void {
		this.el.style.display = "none";
	}
}
