import { useEffect, useCallback } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
  disabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

/**
 * Custom hook for registering keyboard shortcuts
 *
 * @example
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     { key: ' ', description: 'Play/Pause', action: () => togglePlay() },
 *     { key: 'n', description: 'Next step', action: () => stepForward() },
 *     { key: 's', ctrl: true, description: 'Save', action: () => save() },
 *   ],
 *   enabled: true
 * });
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs, textareas, or contenteditable elements
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Find matching shortcut
      const matchingShortcut = shortcuts.find((shortcut) => {
        if (shortcut.disabled) return false;

        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const metaMatches = shortcut.meta ? event.metaKey : !event.metaKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;

        return keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches;
      });

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.action();
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}

/**
 * Format a keyboard shortcut for display
 *
 * @example
 * formatShortcut({ key: 's', ctrl: true }) // => "Ctrl + S"
 * formatShortcut({ key: ' ' }) // => "Space"
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.meta) parts.push(isMac() ? "⌘" : "Cmd");
  if (shortcut.shift) parts.push("Shift");
  if (shortcut.alt) parts.push("Alt");

  // Format special keys
  let key = shortcut.key;
  if (key === " ") key = "Space";
  else if (key === "Escape") key = "Esc";
  else if (key === "ArrowLeft") key = "←";
  else if (key === "ArrowRight") key = "→";
  else if (key === "ArrowUp") key = "↑";
  else if (key === "ArrowDown") key = "↓";
  else key = key.toUpperCase();

  parts.push(key);

  return parts.join(" + ");
}

/**
 * Check if running on macOS
 */
function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

/**
 * Get the modifier key label (Cmd on Mac, Ctrl on others)
 */
export function getModifierKey(): "Cmd" | "Ctrl" {
  return isMac() ? "Cmd" : "Ctrl";
}
