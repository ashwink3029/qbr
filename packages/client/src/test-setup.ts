// jsdom ships no PointerEvent, and the whole input model here is pointer-based.
// A MouseEvent subclass carrying the coordinate fields is enough for the gesture
// path under test.
class ShimPointerEvent extends MouseEvent {
  readonly pointerId: number;
  readonly pointerType: string;
  constructor(type: string, init: MouseEventInit & { pointerId?: number; pointerType?: string } = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? 'touch';
  }
}
if (typeof globalThis.PointerEvent === 'undefined') {
  (globalThis as unknown as { PointerEvent: typeof ShimPointerEvent }).PointerEvent = ShimPointerEvent;
}
// jsdom has no layout, so ResizeObserver never fires and the board would size to
// zero; a no-op keeps the component's effect happy and the default cell size.
if (typeof globalThis.ResizeObserver === 'undefined') {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}
