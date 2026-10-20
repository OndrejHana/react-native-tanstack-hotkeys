/** A key press or release in W3C terms, ready to dispatch as a keyboard event. */
export interface NormalizedKey {
    type: 'keydown' | 'keyup';
    /** The W3C `key` value, such as `'s'`, `'S'`, `'Enter'`, or `'Shift'`. */
    key: string;
    /** The W3C `code` value of the physical key, such as `'KeyS'`. Empty when unknown. */
    code: string;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    /** AltGr is held to type a character. */
    altGraph: boolean;
    capsLock: boolean;
    repeat: boolean;
    location: number;
    /** A native text field had focus when the key was pressed. */
    textInputFocused: boolean;
    /** An input method is composing text, so the key belongs to it. */
    isComposing: boolean;
}
/** Modifier bits shared by every native module. */
export declare const MODIFIER: {
    readonly CONTROL: 1;
    readonly ALT: 2;
    readonly SHIFT: 4;
    readonly META: 8;
};
