import { NAMED_KEYS, invert, isTypedCharacter, locationOf, usLayoutKey, } from './codes';
/** `UIKeyModifierFlags` and `NSEventModifierFlags`, which share their values. */
export const APPLE_FLAG = {
    CAPS_LOCK: 1 << 16,
    SHIFT: 1 << 17,
    CONTROL: 1 << 18,
    OPTION: 1 << 19,
    COMMAND: 1 << 20,
};
/** USB HID keyboard usages (`UIKeyboardHIDUsage`) by W3C code. */
export const HID_USAGE_CODES = {
    ...Object.fromEntries(Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ', (letter, index) => [
        0x04 + index,
        `Key${letter}`,
    ])),
    ...Object.fromEntries(Array.from('1234567890', (digit, index) => [0x1e + index, `Digit${digit}`])),
    0x28: 'Enter',
    0x29: 'Escape',
    0x2a: 'Backspace',
    0x2b: 'Tab',
    0x2c: 'Space',
    0x2d: 'Minus',
    0x2e: 'Equal',
    0x2f: 'BracketLeft',
    0x30: 'BracketRight',
    0x31: 'Backslash',
    // Non-US # and ~ sits where Backslash is on US keyboards
    0x32: 'Backslash',
    0x33: 'Semicolon',
    0x34: 'Quote',
    0x35: 'Backquote',
    0x36: 'Comma',
    0x37: 'Period',
    0x38: 'Slash',
    0x39: 'CapsLock',
    ...Object.fromEntries(Array.from({ length: 12 }, (_, index) => [0x3a + index, `F${index + 1}`])),
    0x46: 'PrintScreen',
    0x47: 'ScrollLock',
    0x48: 'Pause',
    0x49: 'Insert',
    0x4a: 'Home',
    0x4b: 'PageUp',
    0x4c: 'Delete',
    0x4d: 'End',
    0x4e: 'PageDown',
    0x4f: 'ArrowRight',
    0x50: 'ArrowLeft',
    0x51: 'ArrowDown',
    0x52: 'ArrowUp',
    0x53: 'NumLock',
    0x54: 'NumpadDivide',
    0x55: 'NumpadMultiply',
    0x56: 'NumpadSubtract',
    0x57: 'NumpadAdd',
    0x58: 'NumpadEnter',
    ...Object.fromEntries(Array.from('123456789', (digit, index) => [0x59 + index, `Numpad${digit}`])),
    0x62: 'Numpad0',
    0x63: 'NumpadDecimal',
    0x64: 'IntlBackslash',
    0x65: 'ContextMenu',
    0x66: 'Power',
    0x67: 'NumpadEqual',
    ...Object.fromEntries(Array.from({ length: 12 }, (_, index) => [0x68 + index, `F${index + 13}`])),
    0x75: 'Help',
    0x7f: 'AudioVolumeMute',
    0x80: 'AudioVolumeUp',
    0x81: 'AudioVolumeDown',
    0x85: 'NumpadComma',
    0x87: 'IntlRo',
    0x88: 'KanaMode',
    0x89: 'IntlYen',
    0x8a: 'Convert',
    0x8b: 'NonConvert',
    0x90: 'Lang1',
    0x91: 'Lang2',
    0xe0: 'ControlLeft',
    0xe1: 'ShiftLeft',
    0xe2: 'AltLeft',
    0xe3: 'MetaLeft',
    0xe4: 'ControlRight',
    0xe5: 'ShiftRight',
    0xe6: 'AltRight',
    0xe7: 'MetaRight',
};
/** macOS virtual key codes (`kVK_*` in Carbon's Events.h) by W3C code. */
export const MAC_KEY_CODES = {
    0x00: 'KeyA',
    0x01: 'KeyS',
    0x02: 'KeyD',
    0x03: 'KeyF',
    0x04: 'KeyH',
    0x05: 'KeyG',
    0x06: 'KeyZ',
    0x07: 'KeyX',
    0x08: 'KeyC',
    0x09: 'KeyV',
    0x0a: 'IntlBackslash',
    0x0b: 'KeyB',
    0x0c: 'KeyQ',
    0x0d: 'KeyW',
    0x0e: 'KeyE',
    0x0f: 'KeyR',
    0x10: 'KeyY',
    0x11: 'KeyT',
    0x12: 'Digit1',
    0x13: 'Digit2',
    0x14: 'Digit3',
    0x15: 'Digit4',
    0x16: 'Digit6',
    0x17: 'Digit5',
    0x18: 'Equal',
    0x19: 'Digit9',
    0x1a: 'Digit7',
    0x1b: 'Minus',
    0x1c: 'Digit8',
    0x1d: 'Digit0',
    0x1e: 'BracketRight',
    0x1f: 'KeyO',
    0x20: 'KeyU',
    0x21: 'BracketLeft',
    0x22: 'KeyI',
    0x23: 'KeyP',
    0x24: 'Enter',
    0x25: 'KeyL',
    0x26: 'KeyJ',
    0x27: 'Quote',
    0x28: 'KeyK',
    0x29: 'Semicolon',
    0x2a: 'Backslash',
    0x2b: 'Comma',
    0x2c: 'Slash',
    0x2d: 'KeyN',
    0x2e: 'KeyM',
    0x2f: 'Period',
    0x30: 'Tab',
    0x31: 'Space',
    0x32: 'Backquote',
    0x33: 'Backspace',
    0x34: 'NumpadEnter',
    0x35: 'Escape',
    0x36: 'MetaRight',
    0x37: 'MetaLeft',
    0x38: 'ShiftLeft',
    0x39: 'CapsLock',
    0x3a: 'AltLeft',
    0x3b: 'ControlLeft',
    0x3c: 'ShiftRight',
    0x3d: 'AltRight',
    0x3e: 'ControlRight',
    0x3f: 'Fn',
    0x40: 'F17',
    0x41: 'NumpadDecimal',
    0x43: 'NumpadMultiply',
    0x45: 'NumpadAdd',
    0x47: 'NumLock',
    0x48: 'AudioVolumeUp',
    0x49: 'AudioVolumeDown',
    0x4a: 'AudioVolumeMute',
    0x4b: 'NumpadDivide',
    0x4c: 'NumpadEnter',
    0x4e: 'NumpadSubtract',
    0x4f: 'F18',
    0x50: 'F19',
    0x51: 'NumpadEqual',
    0x52: 'Numpad0',
    0x53: 'Numpad1',
    0x54: 'Numpad2',
    0x55: 'Numpad3',
    0x56: 'Numpad4',
    0x57: 'Numpad5',
    0x58: 'Numpad6',
    0x59: 'Numpad7',
    0x5a: 'F20',
    0x5b: 'Numpad8',
    0x5c: 'Numpad9',
    0x5d: 'IntlYen',
    0x5e: 'IntlRo',
    0x5f: 'NumpadComma',
    0x60: 'F5',
    0x61: 'F6',
    0x62: 'F7',
    0x63: 'F3',
    0x64: 'F8',
    0x65: 'F9',
    0x66: 'Lang2',
    0x67: 'F11',
    0x68: 'Lang1',
    0x69: 'F13',
    0x6a: 'F16',
    0x6b: 'F14',
    0x6d: 'F10',
    0x6e: 'ContextMenu',
    0x6f: 'F12',
    0x71: 'F15',
    0x72: 'Insert',
    0x73: 'Home',
    0x74: 'PageUp',
    0x75: 'Delete',
    0x76: 'F4',
    0x77: 'End',
    0x78: 'F2',
    0x79: 'PageDown',
    0x7a: 'F1',
    0x7b: 'ArrowLeft',
    0x7c: 'ArrowRight',
    0x7d: 'ArrowDown',
    0x7e: 'ArrowUp',
};
export const HID_USAGES_BY_CODE = invert(HID_USAGE_CODES);
export const MAC_KEY_CODES_BY_CODE = invert(MAC_KEY_CODES);
/**
 * Device-dependent `NSEvent` flags (IOKit's `NX_DEVICE*KEYMASK`), which tell
 * whether a flagsChanged event pressed or released each side's modifier.
 */
const MAC_MODIFIER_DEVICE_MASKS = {
    ControlLeft: 0x0001,
    ShiftLeft: 0x0002,
    ShiftRight: 0x0004,
    MetaLeft: 0x0008,
    MetaRight: 0x0010,
    AltLeft: 0x0020,
    AltRight: 0x0040,
    ControlRight: 0x2000,
};
function modifiers(flags) {
    return {
        ctrlKey: (flags & APPLE_FLAG.CONTROL) !== 0,
        shiftKey: (flags & APPLE_FLAG.SHIFT) !== 0,
        altKey: (flags & APPLE_FLAG.OPTION) !== 0,
        metaKey: (flags & APPLE_FLAG.COMMAND) !== 0,
        capsLock: (flags & APPLE_FLAG.CAPS_LOCK) !== 0,
    };
}
/**
 * The `key` for an Apple key event, as Safari reports it: the layout's
 * character, ignoring Control and Command so Command+S is `s`, and the fixed
 * name for keys such as Enter and the arrows.
 */
function appleKey(code, characters, charactersIgnoringModifiers, flags) {
    const named = NAMED_KEYS[code];
    if (named)
        return named;
    const shortcut = (flags & (APPLE_FLAG.CONTROL | APPLE_FLAG.COMMAND)) !== 0;
    const preferred = shortcut ? charactersIgnoringModifiers : characters;
    if (isTypedCharacter(preferred))
        return preferred;
    // A dead key types nothing until the next key
    if (!shortcut && characters === '' && code !== '')
        return 'Dead';
    if (isTypedCharacter(charactersIgnoringModifiers)) {
        return charactersIgnoringModifiers;
    }
    return (usLayoutKey(code, (flags & APPLE_FLAG.SHIFT) !== 0) ?? 'Unidentified');
}
/** Normalizes a hardware key press on iOS, iPadOS, Mac Catalyst, or visionOS. */
export function normalizeIOSKey(payload) {
    const code = HID_USAGE_CODES[payload.keyCode] ?? '';
    return {
        type: payload.type,
        key: appleKey(code, payload.characters, payload.charactersIgnoringModifiers, payload.modifierFlags),
        code,
        ...modifiers(payload.modifierFlags),
        altGraph: false,
        repeat: false,
        location: locationOf(code),
        textInputFocused: payload.textInputFocused,
        isComposing: payload.isComposing ?? false,
    };
}
/**
 * Normalizes a macOS key event. Modifier keys arrive as `flagsChanged`, which
 * becomes a keydown or keyup depending on whether the key is now held.
 * Returns null for events that are not key presses, such as Fn.
 */
export function normalizeMacOSKey(payload) {
    const code = MAC_KEY_CODES[payload.keyCode] ?? '';
    let type;
    if (payload.type === 'flagsChanged') {
        if (code === 'CapsLock') {
            type =
                (payload.modifierFlags & APPLE_FLAG.CAPS_LOCK) !== 0
                    ? 'keydown'
                    : 'keyup';
        }
        else {
            const mask = MAC_MODIFIER_DEVICE_MASKS[code];
            if (mask === undefined)
                return null;
            type = (payload.modifierFlags & mask) !== 0 ? 'keydown' : 'keyup';
        }
    }
    else {
        type = payload.type;
    }
    return {
        type,
        key: appleKey(code, payload.characters, payload.charactersIgnoringModifiers, payload.modifierFlags),
        code,
        ...modifiers(payload.modifierFlags),
        altGraph: false,
        repeat: payload.repeat,
        location: locationOf(code),
        textInputFocused: payload.textInputFocused,
        isComposing: payload.isComposing ?? false,
    };
}
