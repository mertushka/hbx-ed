const MAX_HISTORY = 64;

/**
 * JSON-snapshot based undo/redo.
 * T must be JSON-serialisable.
 */
export class History<T> {
	private snapshots: string[] = [];
	private cursor = -1;

	get canUndo(): boolean {
		return this.cursor > 0;
	}

	get canRedo(): boolean {
		return this.cursor < this.snapshots.length - 1;
	}

	save(state: T): void {
		// Drop any redo history ahead of the cursor
		this.snapshots = this.snapshots.slice(0, this.cursor + 1);
		this.snapshots.push(JSON.stringify(state));

		if (this.snapshots.length > MAX_HISTORY) {
			this.snapshots.shift();
		} else {
			this.cursor++;
		}
	}

	undo(): T | null {
		if (!this.canUndo) return null;
		this.cursor--;
		const snapshot = this.snapshots[this.cursor];
		return snapshot ? (JSON.parse(snapshot) as T) : null;
	}

	redo(): T | null {
		if (!this.canRedo) return null;
		this.cursor++;
		const snapshot = this.snapshots[this.cursor];
		return snapshot ? (JSON.parse(snapshot) as T) : null;
	}

	clear(): void {
		this.snapshots = [];
		this.cursor = -1;
	}
}
