export class StatusBar {
	private readonly coords: HTMLElement;
	private readonly zoom: HTMLElement;
	private readonly sel: HTMLElement;

	constructor() {
		this.coords = this.q("#status-coords");
		this.zoom = this.q("#status-zoom");
		this.sel = this.q("#status-sel");
	}

	setCoords(x: number, y: number): void {
		this.coords.textContent = `x: ${x.toFixed(1)}  y: ${y.toFixed(1)}`;
	}

	setZoom(percent: number): void {
		this.zoom.textContent = `zoom: ${percent}%`;
	}

	setSelection(text: string): void {
		this.sel.textContent = text;
	}

	private q(selector: string): HTMLElement {
		const el = document.querySelector<HTMLElement>(selector);
		if (!el) throw new Error(`Element not found: ${selector}`);
		return el;
	}
}
