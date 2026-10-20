import { HotkeyCallback, HotkeyChord, HotkeyChordCallbackContext, ParsedHotkeyChord, RegisterableHotkey, RegisterableHotkeySequence } from "./hotkey.types.js";
//#region src/match.d.ts
export interface KeyboardEventMatch {
  matched: boolean;
  score: 0 | 1 | 2 | 3;
  source?: 'key' | 'code' | 'fallback';
  identity?: {
    key: string;
    code: string;
  };
}
/**
 * Checks if a KeyboardEvent matches a hotkey.
 *
 * Physical bindings such as `Mod+[KeyS]` match `event.code` exactly.
 * Logical bindings use `event.key`, with a fallback to `code`
 * for letter keys, digit keys (0-9), and punctuation keys when `key` produces special
 * characters (e.g., macOS Option+letter, Shift+number, or Option+punctuation).
 * Letter keys are matched case-insensitively.
 *
 * Also handles "dead key" events where `event.key` is `'Dead'` instead of the expected
 * character. This commonly occurs on macOS with Option+letter combinations (e.g., Option+E,
 * Option+I, Option+U, Option+N) and on Windows/Linux with international keyboard layouts.
 * In these cases, `event.code` is used to determine the physical key.
 *
 * @param event - The KeyboardEvent to check
 * @param chord - The chord string or parsed chord to match against
 * @param platform - The target platform for resolving 'Mod' (defaults to auto-detection)
 * @returns True if the event matches the chord
 *
 * @example
 * ```ts
 * document.addEventListener('keydown', (event) => {
 *   if (matchesKeyboardEvent(event, 'Mod+S')) {
 *     event.preventDefault()
 *     handleSave()
 *   }
 * })
 * ```
 */
export declare function matchesKeyboardEvent(event: KeyboardEvent, chord: HotkeyChord | ParsedHotkeyChord, platform?: 'mac' | 'windows' | 'linux'): boolean;
/**
 * Options for creating a chord handler.
 */
export interface CreateHotkeyChordHandlerOptions {
  /** Prevent the default browser action when the chord matches. Defaults to true */
  preventDefault?: boolean;
  /** Stop event propagation when the chord matches. Defaults to true */
  stopPropagation?: boolean;
  /** The target platform for resolving 'Mod' */
  platform?: 'mac' | 'windows' | 'linux';
}
/**
 * Creates a keyboard event handler that calls the callback when the chord
 * matches. For sequences, use `createSequenceMatcher`.
 *
 * @param chord - The chord string or parsed chord to match
 * @param callback - The function to call when the hotkey matches
 * @param options - Options for matching and handling
 * @returns A function that can be used as an event handler
 *
 * @example
 * ```ts
 * const handler = createHotkeyChordHandler('Mod+S', (event, { hotkey, parsedChord }) => {
 *   console.log(`${hotkey} was pressed`)
 *   handleSave()
 * })
 *
 * document.addEventListener('keydown', handler)
 * ```
 */
export declare function createHotkeyChordHandler(chord: HotkeyChord | ParsedHotkeyChord, callback: HotkeyCallback<HotkeyChordCallbackContext>, options?: CreateHotkeyChordHandlerOptions): (event: KeyboardEvent) => void;
export type MultiHotkeyChordHandler = { [K in HotkeyChord]?: HotkeyCallback<HotkeyChordCallbackContext>; };
/**
 * Creates a handler that matches several chords.
 *
 * @param handlers - A map of chord strings to their handlers
 * @param options - Options for matching and handling
 * @returns A function that can be used as an event handler
 *
 * @example
 * ```ts
 * const handler = createMultiHotkeyChordHandler({
 *   'Mod+S': (event, { hotkey }) => handleSave(),
 *   'Mod+Z': (event, { hotkey }) => handleUndo(),
 *   'Mod+Shift+Z': (event, { hotkey }) => handleRedo(),
 * })
 *
 * document.addEventListener('keydown', handler)
 * ```
 */
export declare function createMultiHotkeyChordHandler(handlers: MultiHotkeyChordHandler, options?: CreateHotkeyChordHandlerOptions): (event: KeyboardEvent) => void;
/**
 * Compares normalized hotkey identity, including all four modifiers.
 * Sequences are equal when every step is equal; a one-step sequence equals its chord.
 * Aliases resolve on the supplied platform. A physical code and a logical key
 * remain distinct even when one keyboard event could match both.
 */
export declare function areHotkeysEqual(left: RegisterableHotkey, right: RegisterableHotkey, platform?: "mac" | "windows" | "linux"): boolean;
/** Default timeout between sequence steps (in milliseconds). */
export declare const DEFAULT_SEQUENCE_TIMEOUT = 1000;
/**
 * Creates a simple sequence matcher for one-off use.
 *
 * This is a low-level helper that does not support ignoreInputs, target,
 * or other HotkeyOptions. Callers must handle input filtering themselves
 * if attaching to document.
 *
 * @param sequence - The sequence of hotkeys to match
 * @param options - Options including timeout
 * @returns An object with match() and reset() methods
 *
 * @example
 * ```ts
 * const matcher = createSequenceMatcher(['G', 'G'], { timeout: 500 })
 *
 * document.addEventListener('keydown', (event) => {
 *   if (matcher.match(event)) {
 *     console.log('Sequence matched!')
 *   }
 * })
 * ```
 */
export declare function createSequenceMatcher(sequence: RegisterableHotkeySequence, options?: {
  timeout?: number;
  platform?: 'mac' | 'windows' | 'linux';
}): {
  match: (event: KeyboardEvent) => boolean;
  reset: () => void;
  getProgress: () => number;
};
//#endregion