import { Key } from "./key.types.js";
import { Hotkey, HotkeyChord, HotkeySequence, ParsedHotkeyChord, RegisterableHotkey, RegisterableHotkeyChord, RegisterableHotkeySequence } from "./hotkey.types.js";
//#region src/parse.d.ts
type Platform = 'mac' | 'windows' | 'linux';
/** A chord in any form: a string, a chord object, or an already-parsed chord. */
type AnyChord = RegisterableHotkeyChord | ParsedHotkeyChord | (string & {});
/**
 * Whether a hotkey is a sequence. Use this instead of `Array.isArray`, which
 * does not narrow readonly arrays.
 */
export declare function isHotkeySequence<T extends RegisterableHotkey>(hotkey: T): hotkey is Extract<T, ReadonlyArray<unknown>>;
/**
 * Collapses a one-step sequence to its chord without otherwise changing the hotkey.
 * Registration APIs treat `['Mod+S']` exactly like `'Mod+S'`.
 */
export declare function simplifyHotkey<T extends RegisterableHotkey>(hotkey: T): T extends HotkeySequence ? Hotkey : T extends RegisterableHotkeySequence ? RegisterableHotkey : T;
/**
 * Parses a hotkey, resolving `Mod` for the platform. A chord, written as a
 * string or an object, returns one parsed chord. A sequence returns one
 * parsed chord per step. Physical tokens such as `[KeyQ]` keep `code`; they
 * never become a logical Q.
 *
 * @param hotkey - A chord string such as `'Mod+S'`, a chord object, or a sequence
 * @param platform - The target platform for resolving 'Mod' (defaults to auto-detection)
 *
 * @example
 * ```ts
 * parseHotkey('Mod+S', 'mac') // { key: 'S', ctrl: false, shift: false, alt: false, meta: true, modifiers: ['Meta'] }
 * parseHotkey({ key: 'S', mod: true }, 'windows') // { key: 'S', ctrl: true, ..., modifiers: ['Control'] }
 * parseHotkey(['G', 'Shift+G']) // [{ key: 'G', ... }, { key: 'G', shift: true, ... }]
 * ```
 */
export declare function parseHotkey(hotkey: AnyChord, platform?: Platform): ParsedHotkeyChord;
export declare function parseHotkey(hotkey: ReadonlyArray<AnyChord>, platform?: Platform): Array<ParsedHotkeyChord>;
export declare function parseHotkey(hotkey: AnyChord | ReadonlyArray<AnyChord>, platform?: Platform): ParsedHotkeyChord | Array<ParsedHotkeyChord>;
/**
 * Normalizes a hotkey to its canonical string form. Accepts a chord string, a
 * chord object, a parsed chord, or a sequence of any of these. Each sequence
 * step is normalized, and a one-step sequence becomes its chord.
 *
 * - When `Mod` is allowed for the platform (Command on Mac without Control;
 *   Control on Windows/Linux without Meta): emits `Mod`, then `Alt`, then `Shift`,
 *   then the key (e.g. `Mod+Shift+E`, `Mod+S`).
 * - Otherwise: literal modifiers in `Control+Alt+Shift+Meta` order, then the key.
 * - Resolves aliases and normalizes key casing (e.g. `esc` → `Escape`, `a` → `A`).
 *
 * @param hotkey - The hotkey to normalize
 * @param platform - The target platform for resolving `Mod` (defaults to auto-detection)
 *
 * @example
 * ```ts
 * normalizeHotkey('shift+meta+e', 'mac') // 'Mod+Shift+E'
 * normalizeHotkey('ctrl+a', 'windows') // 'Mod+A'
 * normalizeHotkey({ key: 's', mod: true }) // 'Mod+S'
 * normalizeHotkey(['g', 'shift+g']) // ['G', 'Shift+G']
 * normalizeHotkey(parseKeyboardEvent(event)) // The chord the event pressed
 * ```
 */
export declare function normalizeHotkey(hotkey: AnyChord, platform?: Platform): HotkeyChord;
export declare function normalizeHotkey(hotkey: AnyChord | ReadonlyArray<AnyChord>, platform?: Platform): Hotkey;
/**
 * Checks if a string is a recognized modifier token (including aliases).
 *
 * For a `KeyboardEvent`, use `isModifier(normalizeKeyName(event.key))` so DOM
 * spellings like `OS` / `Win` match the same alias table.
 *
 * @param key - Key name or alias (e.g. from a hotkey string or `event.key`)
 * @returns True if the string is a recognized modifier
 */
export declare function isModifierKey(key: Key | (string & {})): boolean;
/**
 * Parses a KeyboardEvent into the chord it pressed, in the same format as
 * `parseHotkey()`. Pass the result to `normalizeHotkey` for its canonical string.
 *
 * @param event - The KeyboardEvent to parse
 * @param platform - The target platform for resolving modifiers (defaults to auto-detection)
 * @returns The parsed chord for the keyboard event
 *
 * @example
 * ```ts
 * document.addEventListener('keydown', (event) => {
 *   const parsed = parseKeyboardEvent(event)
 *   console.log(parsed) // { key: 'S', ctrl: true, shift: false, ... }
 * })
 * ```
 */
export declare function parseKeyboardEvent(event: KeyboardEvent, platform?: Platform): ParsedHotkeyChord;
/**
 * Checks if a chord contains at least one non-modifier key.
 *
 * This is useful for validating that a recorded chord is complete and not
 * just a combination of modifiers without an action key.
 *
 * @param chord - The chord string or parsed chord to check
 * @param platform - The target platform for parsing (defaults to auto-detection)
 * @returns True if the chord contains at least one non-modifier key
 *
 * @example
 * ```ts
 * hasNonModifierKey('Control+Shift+S') // true
 * hasNonModifierKey('Control+Shift') // false (no action key)
 * hasNonModifierKey(parseHotkey('Mod+A')) // true
 * ```
 */
export declare function hasNonModifierKey(chord: HotkeyChord | ParsedHotkeyChord | (string & {}), platform?: Platform): boolean;
//#endregion