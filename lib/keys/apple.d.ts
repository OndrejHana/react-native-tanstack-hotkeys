import type { NormalizedKey } from './types';
/** `UIKeyModifierFlags` and `NSEventModifierFlags`, which share their values. */
export declare const APPLE_FLAG: {
    readonly CAPS_LOCK: number;
    readonly SHIFT: number;
    readonly CONTROL: number;
    readonly OPTION: number;
    readonly COMMAND: number;
};
/** USB HID keyboard usages (`UIKeyboardHIDUsage`) by W3C code. */
export declare const HID_USAGE_CODES: Readonly<Record<number, string>>;
/** macOS virtual key codes (`kVK_*` in Carbon's Events.h) by W3C code. */
export declare const MAC_KEY_CODES: Readonly<Record<number, string>>;
export declare const HID_USAGES_BY_CODE: ReadonlyMap<string, readonly number[]>;
export declare const MAC_KEY_CODES_BY_CODE: ReadonlyMap<string, readonly number[]>;
/** A `pressesBegan`/`pressesEnded` key as the iOS module reports it. */
export interface IOSKeyPayload {
    type: 'keydown' | 'keyup';
    /** `UIKey.keyCode`, a USB HID usage. */
    keyCode: number;
    characters: string;
    charactersIgnoringModifiers: string;
    modifierFlags: number;
    textInputFocused: boolean;
    /** The focused text field has marked (uncommitted) text. */
    isComposing?: boolean;
}
/** An `NSEvent` key event as the macOS module reports it. */
export interface MacOSKeyPayload {
    type: 'keydown' | 'keyup' | 'flagsChanged';
    /** `NSEvent.keyCode`, a virtual key code. */
    keyCode: number;
    characters: string;
    charactersIgnoringModifiers: string;
    modifierFlags: number;
    repeat: boolean;
    textInputFocused: boolean;
    /** The focused text field has marked (uncommitted) text. */
    isComposing?: boolean;
}
/** Normalizes a hardware key press on iOS, iPadOS, Mac Catalyst, or visionOS. */
export declare function normalizeIOSKey(payload: IOSKeyPayload): NormalizedKey;
/**
 * Normalizes a macOS key event. Modifier keys arrive as `flagsChanged`, which
 * becomes a keydown or keyup depending on whether the key is now held.
 * Returns null for events that are not key presses, such as Fn.
 */
export declare function normalizeMacOSKey(payload: MacOSKeyPayload): NormalizedKey | null;
