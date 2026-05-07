export function firstTouch(list: TouchList): Touch | null {
	return list[0] ?? list.item?.(0) ?? null;
}

export function distanceBetweenTouches(touches: TouchList): number | null {
	const first = firstTouch(touches);
	const second = touches[1] ?? touches.item?.(1) ?? null;
	if (!first || !second) return null;
	return Math.hypot(
		first.clientX - second.clientX,
		first.clientY - second.clientY,
	);
}

export function midpointBetweenTouches(touches: TouchList): {
	clientX: number;
	clientY: number;
} {
	const first = firstTouch(touches);
	const second = touches[1] ?? touches.item?.(1) ?? first;
	if (!first || !second) return { clientX: 0, clientY: 0 };
	return {
		clientX: (first.clientX + second.clientX) / 2,
		clientY: (first.clientY + second.clientY) / 2,
	};
}
