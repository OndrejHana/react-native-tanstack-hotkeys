/**
 * W3C `KeyboardEvent.code` and `KeyboardEvent.key` values shared by every
 * platform's normalizer. See https://www.w3.org/TR/uievents-code/ and
 * https://www.w3.org/TR/uievents-key/.
 */
/** `key` values that don't depend on the keyboard layout, by `code`. */
export const NAMED_KEYS = {
    Escape: 'Escape',
    Enter: 'Enter',
    NumpadEnter: 'Enter',
    Tab: 'Tab',
    Space: ' ',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Insert: 'Insert',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    ArrowUp: 'ArrowUp',
    ArrowDown: 'ArrowDown',
    ArrowLeft: 'ArrowLeft',
    ArrowRight: 'ArrowRight',
    CapsLock: 'CapsLock',
    NumLock: 'NumLock',
    ScrollLock: 'ScrollLock',
    PrintScreen: 'PrintScreen',
    Pause: 'Pause',
    ContextMenu: 'ContextMenu',
    Help: 'Help',
    ShiftLeft: 'Shift',
    ShiftRight: 'Shift',
    ControlLeft: 'Control',
    ControlRight: 'Control',
    AltLeft: 'Alt',
    AltRight: 'Alt',
    MetaLeft: 'Meta',
    MetaRight: 'Meta',
    Fn: 'Fn',
    F1: 'F1',
    F2: 'F2',
    F3: 'F3',
    F4: 'F4',
    F5: 'F5',
    F6: 'F6',
    F7: 'F7',
    F8: 'F8',
    F9: 'F9',
    F10: 'F10',
    F11: 'F11',
    F12: 'F12',
    F13: 'F13',
    F14: 'F14',
    F15: 'F15',
    F16: 'F16',
    F17: 'F17',
    F18: 'F18',
    F19: 'F19',
    F20: 'F20',
    F21: 'F21',
    F22: 'F22',
    F23: 'F23',
    F24: 'F24',
    AudioVolumeUp: 'AudioVolumeUp',
    AudioVolumeDown: 'AudioVolumeDown',
    AudioVolumeMute: 'AudioVolumeMute',
    MediaPlayPause: 'MediaPlayPause',
    MediaStop: 'MediaStop',
    MediaTrackNext: 'MediaTrackNext',
    MediaTrackPrevious: 'MediaTrackPrevious',
    BrowserBack: 'BrowserBack',
    Power: 'Power',
    Convert: 'Convert',
    NonConvert: 'NonConvert',
    KanaMode: 'KanaMode',
    Lang1: 'HangulMode',
    Lang2: 'HanjaMode',
};
/** What each printable key types on a US layout, unshifted and shifted. */
export const US_LAYOUT = {
    ...Object.fromEntries(Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ', (letter) => [
        `Key${letter}`,
        [letter.toLowerCase(), letter],
    ])),
    Digit1: ['1', '!'],
    Digit2: ['2', '@'],
    Digit3: ['3', '#'],
    Digit4: ['4', '$'],
    Digit5: ['5', '%'],
    Digit6: ['6', '^'],
    Digit7: ['7', '&'],
    Digit8: ['8', '*'],
    Digit9: ['9', '('],
    Digit0: ['0', ')'],
    Minus: ['-', '_'],
    Equal: ['=', '+'],
    BracketLeft: ['[', '{'],
    BracketRight: [']', '}'],
    Backslash: ['\\', '|'],
    IntlBackslash: ['\\', '|'],
    Semicolon: [';', ':'],
    Quote: ["'", '"'],
    Backquote: ['`', '~'],
    Comma: [',', '<'],
    Period: ['.', '>'],
    Slash: ['/', '?'],
    IntlRo: ['\\', '_'],
    IntlYen: ['¥', '|'],
    ...Object.fromEntries(Array.from('0123456789', (digit) => [
        `Numpad${digit}`,
        [digit, digit],
    ])),
    NumpadDecimal: ['.', '.'],
    NumpadAdd: ['+', '+'],
    NumpadSubtract: ['-', '-'],
    NumpadMultiply: ['*', '*'],
    NumpadDivide: ['/', '/'],
    NumpadEqual: ['=', '='],
    NumpadComma: [',', ','],
};
/**
 * The `location` of a key: 1 and 2 for left and right modifiers, 3 for the
 * numeric keypad, and 0 otherwise.
 */
export function locationOf(code) {
    if (/^(Shift|Control|Alt|Meta)Left$/.test(code))
        return 1;
    if (/^(Shift|Control|Alt|Meta)Right$/.test(code))
        return 2;
    if (code.startsWith('Numpad'))
        return 3;
    return 0;
}
/**
 * Whether `value` is a single typed character: one code point that is not a
 * control character or one of Apple's private-use function key characters.
 */
export function isTypedCharacter(value) {
    if (!value)
        return false;
    const points = Array.from(value);
    if (points.length !== 1)
        return false;
    const point = points[0].codePointAt(0);
    return point >= 0x20 && point !== 0x7f && !(point >= 0xf700 && point <= 0xf8ff);
}
/** The `key` a US layout produces for `code`, for events that report no usable character. */
export function usLayoutKey(code, shift) {
    const pair = US_LAYOUT[code];
    return pair ? pair[shift ? 1 : 0] : undefined;
}
/** Inverts a raw key code → W3C code table into W3C code → raw key codes. */
export function invert(table) {
    const result = new Map();
    for (const [raw, code] of Object.entries(table)) {
        const list = result.get(code) ?? [];
        list.push(Number(raw));
        result.set(code, list);
    }
    return result;
}
