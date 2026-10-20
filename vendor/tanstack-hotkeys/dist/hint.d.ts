import { RegisterableHotkey } from "./hotkey.types.js";
//#region src/hint.d.ts
export interface HeldModifierOptions {
  /** Resolve Mod for this platform. Defaults to platform detection. */
  platform?: 'mac' | 'windows' | 'linux';
  /** Require every binding modifier to be held. Default: false (nonempty subset). */
  exact?: boolean;
}
/**
 * Returns whether held modifiers should reveal a shortcut hint.
 * By default, any nonempty subset of the binding's modifiers qualifies; an
 * unrelated modifier hides the hint. `exact` requires every binding modifier.
 * Nonmodifier keys are ignored. This does not check registration or focus.
 * A sequence reveals its hint from its first step.
 *
 * @example
 * matchesHeldModifiers('Alt+Shift+[KeyK]', ['Alt']) // true
 * matchesHeldModifiers('Alt+Shift+[KeyK]', ['Alt', 'Control']) // false
 */
export declare function matchesHeldModifiers(hotkey: RegisterableHotkey, heldKeys: ReadonlyArray<string>, options?: HeldModifierOptions): boolean;
//#endregion