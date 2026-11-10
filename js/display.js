// Screen resolution used for the canvas. Capped at 2x: on 3x phone screens the
// difference isn't visible, but drawing 2.25x more pixels every frame is.
export function dpr() {
  return Math.min(2, window.devicePixelRatio || 1);
}
