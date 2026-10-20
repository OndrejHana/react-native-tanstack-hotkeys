import { ParsedHotkeyChord, RegisterableHotkeyChord } from "./hotkey.types.js";
//#region src/format.d.ts
/**
 * Converts a parsed hotkey back to a string, with each platform modifier
 * spelled out, such as `Control+Shift+S`. A parsed chord returns a string, and
 * a parsed sequence returns one string per step. To get `Mod` back where the
 * platform allows it, use `normalizeHotkey` instead.
 *
 * @param parsed - A parsed chord, or the parsed steps of a sequence
 *
 * @example
 * ```ts
 * formatHotkey(parseHotkey('Mod+Shift+S', 'windows')) // 'Control+Shift+S'
 * formatHotkey(parseHotkey(['G', 'Mod+K'], 'mac')) // ['G', 'Meta+K']
 * ```
 */
export declare function formatHotkey(parsed: ParsedHotkeyChord): string;
export declare function formatHotkey(parsed: ReadonlyArray<ParsedHotkeyChord>): Array<string>;
export declare function formatHotkey(parsed: ParsedHotkeyChord | ReadonlyArray<ParsedHotkeyChord>): string | Array<string>;
/** A single chord to display: a string, raw object, or parsed hotkey. */
export type DisplayHotkeyChord = RegisterableHotkeyChord | ParsedHotkeyChord | (string & {});
/** A hotkey to display: a chord or a sequence of chords. */
export type DisplayHotkey = DisplayHotkeyChord | ReadonlyArray<DisplayHotkeyChord>;
/**
 * Formats a hotkey for display in a user interface.
 *
 * On macOS, uses symbols (⇧⌘S) in Control, Option, Shift, Command order.
 * Display ordering does not change the normalized hotkey used for registration.
 * On Windows/Linux, uses text (Ctrl+Shift+S) with `+` separators.
 * The separator can be customized with `separatorToken`.
 * Physical codes use conventional display labels: `[KeyS]` becomes `S` and
 * `[Digit2]` becomes `2`. These labels do not infer the active keyboard layout
 * or change matching. Supply a resolved `layoutMap` for layout-aware labels;
 * `keyLabels` overrides both layout entries and fallback labels.
 * Sequence steps are formatted individually and joined with `sequenceSeparator`
 * (a space by default).
 *
 * @param hotkey - A logical or physical string, raw object, ParsedHotkeyChord, or sequence
 * @param options - Formatting options
 * @returns Display text, or individual key labels when parts is true (one array per step for sequences)
 *
 * @example
 * ```ts
 * formatForDisplay('Mod+Shift+S', { platform: 'mac' })
 * // Returns: '⇧ ⌘ S' (symbols separated by spaces on macOS)
 *
 * formatForDisplay('Mod+Shift+S', { platform: 'windows' })
 * // Returns: 'Ctrl+Shift+S'
 *
 * formatForDisplay('Escape')
 * // Returns: 'Esc' (on all platforms)
 *
 * formatForDisplay(['G', 'H'])
 * // Returns: 'G H'
 * ```
 */
export declare function formatForDisplay(hotkey: ReadonlyArray<DisplayHotkeyChord>, options: FormatDisplayOptions & {
  parts: true;
}): Array<Array<string>>;
export declare function formatForDisplay(hotkey: DisplayHotkeyChord, options: FormatDisplayOptions & {
  parts: true;
}): Array<string>;
export declare function formatForDisplay(hotkey: DisplayHotkey, options?: FormatDisplayOptions & {
  parts?: false;
}): string;
export declare function formatForDisplay(hotkey: DisplayHotkey, options: FormatDisplayOptions): string | Array<string> | Array<Array<string>>;
/**
 * Options for formatting hotkeys for display.
 */
export interface FormatDisplayOptions {
  /** The target platform. Defaults to auto-detection. */
  platform?: 'mac' | 'windows' | 'linux';
  /** Whether to use symbols for the display. Defaults to true. */
  useSymbols?: boolean | {
    modifiers?: boolean;
    keys?: boolean;
  };
  /** Return individual key labels instead of a joined string. Default: false. */
  parts?: boolean;
  /**
   * An already-resolved code-to-key map, such as KeyboardLayoutMap or Map.
   * Used only for physical bindings. Mapped keys receive normal display formatting;
   * missing or empty entries use conventional fallback labels. The caller owns
   * loading and refreshing the map; this formatter never calls browser APIs.
   */
  layoutMap?: {
    get: (code: string) => string | undefined;
  };
  /** Final display overrides for logical keys or physical codes; take precedence over layoutMap. Never changes matching. */
  keyLabels?: Readonly<Record<string, string>>;
  /** Override the separator between display tokens. Defaults to platform-specific formatting when null/undefined. */
  separatorToken?: string | null;
  /** Separator between sequence steps. Default: a space. */
  sequenceSeparator?: string;
}
//#endregion