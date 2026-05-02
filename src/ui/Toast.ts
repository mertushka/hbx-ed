export class Toast {
	private readonly el: HTMLElement;
	private timer: ReturnType<typeof setTimeout> | null = null;

	constructor() {
		const el = document.getElementById("toast");
		if (!el) throw new Error("#toast element not found");
		this.el = el;
	}

	show(message: string, durationMs = 2500): void {
		this.el.textContent = message;
		this.el.classList.add("show");

		if (this.timer !== null) clearTimeout(this.timer);
		this.timer = setTimeout(() => {
			this.el.classList.remove("show");
			this.timer = null;
		}, durationMs);
	}
}
