import { CanonicalModifier, EditingKey, FunctionKey, LetterKey, NavigationKey, NumberKey, PunctuationKey } from "./key.types.js";
//#region src/constants.d.ts
/**
 * Canonical order for modifiers in normalized hotkey strings.
 *
 * Defines the standard order in which modifiers should appear when formatting
 * hotkeys. This ensures consistent, predictable output across the library.
 *
 * Order: Control → Alt → Shift → Meta
 *
 * @example
 * ```ts
 * // Input: 'Shift+Control+Meta+S'
 * // Normalized: 'Control+Alt+Shift+Meta+S' (following MODIFIER_ORDER)
 * ```
 */
export declare const MODIFIER_ORDER: Array<CanonicalModifier>;
/**
 * Set of canonical modifier key names for fast lookup.
 *
 * Derived from `MODIFIER_ORDER` to ensure consistency. Used to detect when
 * a modifier is released so we can clear non-modifier keys whose keyup events
 * may have been swallowed by the OS (e.g. macOS Cmd+key combos).
 */
export declare const MODIFIER_KEYS: Set<string>;
/**
 * Maps modifier key aliases to their canonical form or platform-adaptive 'Mod'.
 *
 * This map allows users to write hotkeys using various aliases (e.g., 'Ctrl', 'Cmd', 'Option')
 * which are then normalized to canonical names ('Control', 'Meta', 'Alt') or the
 * platform-adaptive 'Mod' token.
 *
 * The 'Mod' and 'CommandOrControl' aliases are resolved at runtime via `resolveModifier()`
 * based on the detected platform (Command on Mac, Control elsewhere).
 *
 * @remarks Case-insensitive lookups are supported via lowercase variants
 *
 * @example
 * ```ts
 * MODIFIER_ALIASES['Ctrl'] // 'Control'
 * MODIFIER_ALIASES['Cmd'] // 'Meta'
 * MODIFIER_ALIASES['Mod'] // 'Mod' (resolved at runtime)
 * ```
 */
export declare const MODIFIER_ALIASES: Record<string, CanonicalModifier | 'Mod'>;
/**
 * Set of all valid letter keys (A-Z).
 *
 * Used for validation and type checking. Letter keys are matched case-insensitively
 * in hotkey matching, but normalized to uppercase in canonical form.
 */
export declare const LETTER_KEYS: Set<LetterKey>;
/**
 * Set of all valid number keys (0-9).
 *
 * Note: Number keys are affected by Shift (Shift+1 → '!' on US layout),
 * so they're excluded from Shift-based hotkey combinations to avoid
 * layout-dependent behavior.
 */
export declare const NUMBER_KEYS: Set<NumberKey>;
/**
 * Set of all valid function keys (F1-F24).
 *
 * Function keys are commonly used for system shortcuts (e.g., F12 for DevTools,
 * Alt+F4 to close windows) and application-specific commands.
 */
export declare const FUNCTION_KEYS: Set<FunctionKey>;
/**
 * Set of all valid navigation keys for cursor movement and document navigation.
 *
 * Includes arrow keys, Home/End (line navigation), and PageUp/PageDown (page navigation).
 * These keys are commonly combined with modifiers for selection (Shift+ArrowUp) or
 * navigation shortcuts (Alt+ArrowLeft for back).
 */
export declare const NAVIGATION_KEYS: Set<NavigationKey>;
/**
 * Set of all valid editing and special keys.
 *
 * Includes keys commonly used for text editing (Enter, Backspace, Delete, Tab) and
 * special actions (Escape, Space). These keys are frequently combined with modifiers
 * for editor shortcuts (Mod+Enter to submit, Shift+Tab to go back).
 */
export declare const EDITING_KEYS: Set<EditingKey>;
/**
 * Set of all valid punctuation keys commonly used in keyboard shortcuts.
 *
 * These are the literal characters as they appear in `KeyboardEvent.key` (layout-dependent,
 * typically US keyboard layout). Common shortcuts include:
 * - `Mod+/` - Toggle comment
 * - `Mod+[` / `Mod+]` - Indent/outdent
 * - `Mod+=` / `Mod+-` - Zoom in/out
 *
 * Note: Punctuation keys are affected by Shift (Shift+',' → '<' on US layout),
 * so they're excluded from Shift-based hotkey combinations to avoid layout-dependent behavior.
 */
export declare const PUNCTUATION_KEYS: Set<PunctuationKey>;
/**
 * Maps `KeyboardEvent.code` values for punctuation keys to their canonical characters.
 *
 * On macOS, holding the Option (Alt) key transforms punctuation keys into special characters
 * (e.g., Option+Minus → en-dash '–'), causing `event.key` to differ from the expected character.
 * However, `event.code` still reports the physical key (e.g., 'Minus'). This map enables
 * falling back to `event.code` for punctuation keys, similar to the existing `Key*`/`Digit*`
 * fallbacks for letters and digits.
 */
export declare const PUNCTUATION_CODE_MAP: Record<string, string>;
/**
 * Set of all valid non-modifier keys.
 *
 * This is the union of all key type sets (letters, numbers, function keys, navigation,
 * editing, and punctuation). Used primarily for validation to check if a key string
 * is recognized and will have type-safe autocomplete support.
 *
 * @see {@link LETTER_KEYS}
 * @see {@link NUMBER_KEYS}
 * @see {@link FUNCTION_KEYS}
 * @see {@link NAVIGATION_KEYS}
 * @see {@link EDITING_KEYS}
 * @see {@link PUNCTUATION_KEYS}
 */
export declare const ALL_KEYS: Set<"CapsLock" | "ContextMenu" | "Convert" | "KanaMode" | "NonConvert" | "Help" | "Insert" | "NumLock" | "Fn" | "FnLock" | "PrintScreen" | "ScrollLock" | "Pause" | "BrowserBack" | "BrowserFavorites" | "BrowserForward" | "BrowserHome" | "BrowserRefresh" | "BrowserSearch" | "BrowserStop" | "Eject" | "LaunchMail" | "MediaPlayPause" | "MediaStop" | "MediaTrackNext" | "MediaTrackPrevious" | "Power" | "AudioVolumeDown" | "AudioVolumeMute" | "AudioVolumeUp" | "WakeUp" | "Hyper" | "Super" | "Again" | "Copy" | "Cut" | "Find" | "Open" | "Paste" | "Props" | "Select" | "Undo" | "Hiragana" | "Katakana" | "Clear" | "Cancel" | "Standby" | "LaunchApplication1" | "LaunchApplication2" | "LaunchMediaPlayer" | "HangulMode" | "HanjaMode" | "Zenkaku" | "Hankaku" | "ZenkakuHankaku" | LetterKey | NumberKey | FunctionKey | NavigationKey | EditingKey | PunctuationKey>;
/** Whether a key is a single Unicode letter, such as `'a'` or `'é'`. */
export declare function isSingleLetterKey(key: string): boolean;
/**
 * Normalizes a key name to its canonical form.
 *
 * @param key - The key name to normalize (can be an alias, lowercase, etc.)
 * @returns The canonical key name
 *
 * @example
 * ```ts
 * normalizeKeyName('esc') // 'Escape'
 * normalizeKeyName('a') // 'A'
 * normalizeKeyName('f1') // 'F1'
 * normalizeKeyName('ArrowUp') // 'ArrowUp' (already canonical)
 * ```
 */
export declare function normalizeKeyName(key: string): string;
//#endregion