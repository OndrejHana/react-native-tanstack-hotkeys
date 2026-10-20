import {
  NAMED_KEYS,
  invert,
  isTypedCharacter,
  locationOf,
  usLayoutKey,
} from './codes'
import type { NormalizedKey } from './types'

/** `KeyEvent.META_*` flags. */
export const ANDROID_META = {
  SHIFT_ON: 0x1,
  ALT_ON: 0x2,
  ALT_RIGHT_ON: 0x20,
  CTRL_ON: 0x1000,
  META_ON: 0x10000,
  CAPS_LOCK_ON: 0x100000,
} as const

/**
 * Linux evdev scan codes (`KEY_*` in linux/input-event-codes.h) by W3C code.
 * Hardware keyboards report these as `KeyEvent.getScanCode()`, and unlike
 * key codes they identify the physical key regardless of layout.
 */
export const EVDEV_SCAN_CODES: Readonly<Record<number, string>> = {
  1: 'Escape',
  ...Object.fromEntries(
    Array.from('1234567890', (digit, index) => [2 + index, `Digit${digit}`]),
  ),
  12: 'Minus',
  13: 'Equal',
  14: 'Backspace',
  15: 'Tab',
  ...Object.fromEntries(
    Array.from('QWERTYUIOP', (letter, index) => [16 + index, `Key${letter}`]),
  ),
  26: 'BracketLeft',
  27: 'BracketRight',
  28: 'Enter',
  29: 'ControlLeft',
  ...Object.fromEntries(
    Array.from('ASDFGHJKL', (letter, index) => [30 + index, `Key${letter}`]),
  ),
  39: 'Semicolon',
  40: 'Quote',
  41: 'Backquote',
  42: 'ShiftLeft',
  43: 'Backslash',
  ...Object.fromEntries(
    Array.from('ZXCVBNM', (letter, index) => [44 + index, `Key${letter}`]),
  ),
  51: 'Comma',
  52: 'Period',
  53: 'Slash',
  54: 'ShiftRight',
  55: 'NumpadMultiply',
  56: 'AltLeft',
  57: 'Space',
  58: 'CapsLock',
  ...Object.fromEntries(
    Array.from({ length: 10 }, (_, index) => [59 + index, `F${index + 1}`]),
  ),
  69: 'NumLock',
  70: 'ScrollLock',
  71: 'Numpad7',
  72: 'Numpad8',
  73: 'Numpad9',
  74: 'NumpadSubtract',
  75: 'Numpad4',
  76: 'Numpad5',
  77: 'Numpad6',
  78: 'NumpadAdd',
  79: 'Numpad1',
  80: 'Numpad2',
  81: 'Numpad3',
  82: 'Numpad0',
  83: 'NumpadDecimal',
  86: 'IntlBackslash',
  87: 'F11',
  88: 'F12',
  89: 'IntlRo',
  92: 'Convert',
  93: 'KanaMode',
  94: 'NonConvert',
  96: 'NumpadEnter',
  97: 'ControlRight',
  98: 'NumpadDivide',
  99: 'PrintScreen',
  100: 'AltRight',
  102: 'Home',
  103: 'ArrowUp',
  104: 'PageUp',
  105: 'ArrowLeft',
  106: 'ArrowRight',
  107: 'End',
  108: 'ArrowDown',
  109: 'PageDown',
  110: 'Insert',
  111: 'Delete',
  113: 'AudioVolumeMute',
  114: 'AudioVolumeDown',
  115: 'AudioVolumeUp',
  116: 'Power',
  117: 'NumpadEqual',
  119: 'Pause',
  121: 'NumpadComma',
  122: 'Lang1',
  123: 'Lang2',
  124: 'IntlYen',
  125: 'MetaLeft',
  126: 'MetaRight',
  127: 'ContextMenu',
  ...Object.fromEntries(
    Array.from({ length: 12 }, (_, index) => [183 + index, `F${index + 13}`]),
  ),
}

/** `KeyEvent.KEYCODE_*` values by W3C code, for keys without a known scan code. */
export const ANDROID_KEY_CODES: Readonly<Record<number, string>> = {
  ...Object.fromEntries(
    Array.from('0123456789', (digit, index) => [7 + index, `Digit${digit}`]),
  ),
  19: 'ArrowUp',
  20: 'ArrowDown',
  21: 'ArrowLeft',
  22: 'ArrowRight',
  24: 'AudioVolumeUp',
  25: 'AudioVolumeDown',
  26: 'Power',
  ...Object.fromEntries(
    Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ', (letter, index) => [
      29 + index,
      `Key${letter}`,
    ]),
  ),
  55: 'Comma',
  56: 'Period',
  57: 'AltLeft',
  58: 'AltRight',
  59: 'ShiftLeft',
  60: 'ShiftRight',
  61: 'Tab',
  62: 'Space',
  66: 'Enter',
  67: 'Backspace',
  68: 'Backquote',
  69: 'Minus',
  70: 'Equal',
  71: 'BracketLeft',
  72: 'BracketRight',
  73: 'Backslash',
  74: 'Semicolon',
  75: 'Quote',
  76: 'Slash',
  82: 'ContextMenu',
  85: 'MediaPlayPause',
  86: 'MediaStop',
  87: 'MediaTrackNext',
  88: 'MediaTrackPrevious',
  92: 'PageUp',
  93: 'PageDown',
  111: 'Escape',
  112: 'Delete',
  113: 'ControlLeft',
  114: 'ControlRight',
  115: 'CapsLock',
  116: 'ScrollLock',
  117: 'MetaLeft',
  118: 'MetaRight',
  119: 'Fn',
  120: 'PrintScreen',
  121: 'Pause',
  122: 'Home',
  123: 'End',
  124: 'Insert',
  ...Object.fromEntries(
    Array.from({ length: 12 }, (_, index) => [131 + index, `F${index + 1}`]),
  ),
  143: 'NumLock',
  ...Object.fromEntries(
    Array.from('0123456789', (digit, index) => [
      144 + index,
      `Numpad${digit}`,
    ]),
  ),
  154: 'NumpadDivide',
  155: 'NumpadMultiply',
  156: 'NumpadSubtract',
  157: 'NumpadAdd',
  158: 'NumpadDecimal',
  159: 'NumpadComma',
  160: 'NumpadEnter',
  161: 'NumpadEqual',
  164: 'AudioVolumeMute',
  204: 'Lang1',
  212: 'Lang2',
  213: 'NonConvert',
  214: 'Convert',
  216: 'IntlYen',
  217: 'IntlRo',
  218: 'KanaMode',
}

export const EVDEV_SCAN_CODES_BY_CODE = invert(EVDEV_SCAN_CODES)
export const ANDROID_KEY_CODES_BY_CODE = invert(ANDROID_KEY_CODES)

/** A `KeyEvent` as the Android module reports it. */
export interface AndroidKeyPayload {
  type: 'keydown' | 'keyup'
  keyCode: number
  scanCode: number
  metaState: number
  /** `getUnicodeChar` with only Shift and Caps Lock applied; 0 when none. */
  unicodeChar: number
  /** `getUnicodeChar` with Shift, Caps Lock, and right Alt (AltGr) applied. */
  altGraphUnicodeChar: number
  /** The key is a dead key that starts a composed character. */
  deadKey: boolean
  repeatCount: number
  textInputFocused: boolean
}

function character(unicode: number): string | undefined {
  if (unicode <= 0) return undefined
  const value = String.fromCodePoint(unicode)
  return isTypedCharacter(value) ? value : undefined
}

/** Normalizes an Android hardware key event. */
export function normalizeAndroidKey(payload: AndroidKeyPayload): NormalizedKey {
  const meta = payload.metaState
  const code =
    EVDEV_SCAN_CODES[payload.scanCode] ??
    ANDROID_KEY_CODES[payload.keyCode] ??
    ''
  const shiftKey = (meta & ANDROID_META.SHIFT_ON) !== 0
  let altKey = (meta & ANDROID_META.ALT_ON) !== 0
  let altGraph = false
  let key = NAMED_KEYS[code]
  if (key === undefined) {
    const plain = character(payload.unicodeChar)
    const withAltGraph = character(payload.altGraphUnicodeChar)
    if (payload.deadKey) {
      key = 'Dead'
    } else if (
      (meta & ANDROID_META.ALT_RIGHT_ON) !== 0 &&
      withAltGraph !== undefined &&
      withAltGraph !== plain
    ) {
      // Right Alt typed a different character: it is AltGr, not a shortcut modifier
      key = withAltGraph
      altGraph = true
      altKey = false
    } else {
      key = plain ?? usLayoutKey(code, shiftKey) ?? 'Unidentified'
    }
  }
  return {
    type: payload.type,
    key,
    code,
    ctrlKey: (meta & ANDROID_META.CTRL_ON) !== 0,
    shiftKey,
    altKey,
    metaKey: (meta & ANDROID_META.META_ON) !== 0,
    altGraph,
    capsLock: (meta & ANDROID_META.CAPS_LOCK_ON) !== 0,
    repeat: payload.type === 'keydown' && payload.repeatCount > 0,
    location: locationOf(code),
    textInputFocused: payload.textInputFocused,
    // Android input methods consume composing keys before the activity sees them
    isComposing: false,
  }
}
