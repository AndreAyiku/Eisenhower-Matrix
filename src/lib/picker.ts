import type { MouseEvent } from "react";

export function openPicker(e: MouseEvent<HTMLInputElement>): void {
  try {
    e.currentTarget.showPicker();
  } catch {
    // the browser opens its own picker
  }
}