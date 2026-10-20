import type { NormalizedKey } from './types';
/** `KeyEvent.META_*` flags. */
export declare const ANDROID_META: {
    readonly SHIFT_ON: 1;
    readonly ALT_ON: 2;
    readonly ALT_RIGHT_ON: 32;
    readonly CTRL_ON: 4096;
    readonly META_ON: 65536;
    readonly CAPS_LOCK_ON: 1048576;
};
/**
 * Linux evdev scan codes (`KEY_*` in linux/input-event-codes.h) by W3C code.
 * Hardware keyboards report these as `KeyEvent.getScanCode()`, and unlike
 * key codes they identify the physical key regardless of layout.
 */
export declare const EVDEV_SCAN_CODES: Readonly<Record<number, string>>;
/** `KeyEvent.KEYCODE_*` values by W3C code, for keys without a known scan code. */
export declare const ANDROID_KEY_CODES: Readonly<Record<number, string>>;
export declare const EVDEV_SCAN_CODES_BY_CODE: ReadonlyMap<string, readonly number[]>;
export declare const ANDROID_KEY_CODES_BY_CODE: ReadonlyMap<string, readonly number[]>;
/** A `KeyEvent` as the Android module reports it. */
export interface AndroidKeyPayload {
    type: 'keydown' | 'keyup';
    keyCode: number;
    scanCode: number;
    metaState: number;
    /** `getUnicodeChar` with only Shift and Caps Lock applied; 0 when none. */
    unicodeChar: number;
    /** `getUnicodeChar` with Shift, Caps Lock, and right Alt (AltGr) applied. */
    altGraphUnicodeChar: number;
    /** The key is a dead key that starts a composed character. */
    deadKey: boolean;
    repeatCount: number;
    textInputFocused: boolean;
}
/** Normalizes an Android hardware key event. */
export declare function normalizeAndroidKey(payload: AndroidKeyPayload): NormalizedKey;
