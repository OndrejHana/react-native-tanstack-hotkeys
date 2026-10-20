import { AppHotkey, HeldModifierOptions, RegisterableHotkey } from "@tanstack/hotkeys";
//#region src/useHotkeyHint.d.ts
/**
 * Returns a boolean indicating whether held modifiers reveal this shortcut.
 * Only visibility changes from held-key updates cause a rerender.
 * Uses the nonempty-subset/AltGr rules of `matchesHeldModifiers`; `exact` requires
 * every modifier. A sequence reveals its hint from its first step, and an app
 * hotkey uses its effective hotkey (false while unbound). Combine with the
 * action's enabled state before showing a badge. This helper does not register
 * a shortcut or check whether its target is focused.
 */
export declare function useHotkeyHint(hotkey: RegisterableHotkey | AppHotkey, options?: HeldModifierOptions): boolean;
//#endregion