/**
 * Module-level transition state shared between FgaGraph (writer) and TypeCardNode (reader).
 * Uses a plain variable instead of React state/Zustand to avoid re-renders on transition start/end.
 */

let _isTransitioning = false;

export function setIsTransitioning(value: boolean): void {
  _isTransitioning = value;
}

export function getIsTransitioning(): boolean {
  return _isTransitioning;
}
