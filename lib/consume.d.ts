import type { HotkeyManager } from './tanstack';
/**
 * A key the native modules swallow before the app's native views see it,
 * because a registered hotkey with `preventDefault` handles it. Events reach
 * JavaScript asynchronously, so this decision is made natively from rules
 * that JavaScript keeps up to date. A swallowed keydown's keyup is swallowed
 * too.
 */
export interface ConsumeRule {
    /** W3C codes of the physical keys. */
    codes: ReadonlyArray<string>;
    /** Lowercase characters the key types. */
    chars: ReadonlyArray<string>;
    /** `MODIFIER` bits that must be held, and no others. */
    modifiers: number;
    /** Shift may also be held, as when it types the glyph (`?` is Shift+/). */
    shiftOptional: boolean;
    /** Let the key through while a text field has focus. */
    skipInText: boolean;
}
/** A `ConsumeRule` in a native module's own key codes. */
export interface NativeConsumeRule {
    /** iOS: HID usages. macOS: virtual key codes. Android: `KEYCODE_*`. */
    keyCodes: Array<number>;
    /** Android: evdev scan codes, which take precedence when the event has one. */
    scanCodes: Array<number>;
    chars: Array<string>;
    modifiers: number;
    shiftOptional: boolean;
    skipInText: boolean;
}
/** react-native-windows `keyDownEvents` entry. */
export interface WindowsHandledKey {
    code: string;
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
    /** 1: capturing, so the focused view does not receive the key. */
    handledEventPhase: 1;
}
/**
 * Rules for the live keydown hotkeys on `root` that prevent default:
 * enabled, in an active scope, and not targeted at a single text field.
 */
export declare function computeConsumeRules(manager: HotkeyManager, root: object): Array<ConsumeRule>;
/** Translates rules into a native module's key codes. */
export declare function toNativeConsumeRules(rules: ReadonlyArray<ConsumeRule>, os: 'ios' | 'macos' | 'android'): Array<NativeConsumeRule>;
/**
 * Translates keydown rules into react-native-windows `keyDownEvents`, which
 * match codes only: characters map to their US layout keys. Rules that let
 * keys through to text fields are left out, since the root cannot tell.
 */
export declare function toWindowsHandledKeys(rules: ReadonlyArray<ConsumeRule>): Array<WindowsHandledKey>;
/**
 * Calls `onChange` with the rules now and whenever registrations or scopes
 * change them. Returns a function that stops watching.
 */
export declare function watchConsumeRules(manager: HotkeyManager, root: object, onChange: (rules: Array<ConsumeRule>) => void): () => void;
