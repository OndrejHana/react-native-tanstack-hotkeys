import { CanonicalModifier } from "./key.types.js";
//#region src/display-labels.d.ts
/**
 * Modifier key symbols for macOS display.
 *
 * Used by formatting functions to display hotkeys with macOS-style symbols
 * (e.g., ⌘ for Command, ⌃ for Control) instead of text labels. This provides
 * a native macOS look and feel in hotkey displays.
 *
 * @example
 * ```ts
 * MAC_MODIFIER_SYMBOLS['Meta'] // '⌘'
 * MAC_MODIFIER_SYMBOLS['Control'] // '⌃'
 * MAC_MODIFIER_SYMBOLS['Alt'] // '⌥'
 * MAC_MODIFIER_SYMBOLS['Shift'] // '⇧'
 * ```
 */
export declare const MAC_MODIFIER_SYMBOLS: Record<CanonicalModifier | 'Mod', string>;
/**
 * Modifier key labels for macOS display.
 *
 * Used by formatting functions to display hotkeys with macOS-style text labels
 * (e.g., 'Control' for Control, 'Option' for Alt, 'Cmd' for Meta) instead of symbols.
 * This provides a familiar macOS look and feel in hotkey displays.
 *
 * @example
 * ```ts
 * MAC_MODIFIER_LABELS['Control'] // 'control'
 * MAC_MODIFIER_LABELS['Alt'] // 'option'
 * MAC_MODIFIER_LABELS['Shift'] // 'shift'
 * MAC_MODIFIER_LABELS['Meta'] // 'cmd'
 * ```
 */
export declare const MAC_MODIFIER_LABELS: Record<CanonicalModifier | 'Mod', string>;
/**
 * Modifier key labels for Windows/Linux display.
 *
 * Used by formatting functions to display hotkeys with standard text labels
 * (e.g., 'Ctrl' for Control, 'Win' for Meta/Windows key) instead of symbols.
 * This provides a familiar Windows/Linux look and feel in hotkey displays.
 *
 * @example
 * ```ts
 * STANDARD_MODIFIER_LABELS['Control'] // 'Ctrl'
 * STANDARD_MODIFIER_LABELS['Meta'] // 'Win'
 * STANDARD_MODIFIER_LABELS['Alt'] // 'Alt'
 * STANDARD_MODIFIER_LABELS['Shift'] // 'Shift'
 * ```
 */
export declare const WINDOWS_MODIFIER_LABELS: Record<CanonicalModifier | 'Mod', string>;
export declare const LINUX_MODIFIER_LABELS: Record<CanonicalModifier | 'Mod', string>;
export declare const PUNCTUATION_KEY_DISPLAY_LABELS: {
  readonly '`': "Backquote";
  readonly '\\': "Backslash";
  readonly '[': "Left Bracket";
  readonly ']': "Right Bracket";
  readonly ',': "Comma";
  readonly '=': "Equal";
  readonly '-': "Minus";
  readonly '.': "Period";
  readonly ';': "Semicolon";
};
/**
 * Special key symbols for display formatting.
 *
 * Maps certain keys to their visual symbols for better readability in hotkey displays.
 * Used by formatting functions to show symbols like ↑ for ArrowUp or ↵ for Enter
 * instead of text labels.
 *
 * @example
 * ```ts
 * KEY_DISPLAY_SYMBOLS['ArrowUp'] // '↑'
 * KEY_DISPLAY_SYMBOLS['Enter'] // '↵'
 * KEY_DISPLAY_SYMBOLS['Escape'] // 'Esc'
 * KEY_DISPLAY_SYMBOLS['Space'] // '␣'
 * ```
 */
export declare const KEY_DISPLAY_SYMBOLS: {
  readonly ArrowUp: "↑";
  readonly ArrowDown: "↓";
  readonly ArrowLeft: "←";
  readonly ArrowRight: "→";
  readonly Enter: "↵";
  readonly Escape: "Esc";
  readonly Backspace: "⌫";
  readonly Delete: "⌦";
  readonly Tab: "⇥";
  readonly Space: "␣";
};
//#endregion