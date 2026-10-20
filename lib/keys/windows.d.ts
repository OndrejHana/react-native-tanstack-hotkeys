import type { NormalizedKey } from './types';
/** `nativeEvent` of react-native-windows `onKeyDown`/`onKeyUp`, which already uses W3C names. */
export interface WindowsKeyPayload {
    key: string;
    code: string;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    repeat?: boolean;
}
/**
 * Normalizes a react-native-windows key event. Windows reports AltGr as
 * Control+Alt; a character other than a plain letter or digit typed with
 * both held is treated as AltGr, as browsers report it.
 */
export declare function normalizeWindowsKey(type: 'keydown' | 'keyup', payload: WindowsKeyPayload, textInputFocused: boolean): NormalizedKey;
