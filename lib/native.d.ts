import { NativeKeyboardRoot } from './environment';
import type { WindowsHandledKey } from './consume';
import type { WindowsKeyPayload } from './keys/windows';
import type { NormalizedKey } from './keys/types';
/** Event the native modules send for each key press and release. */
export declare const KEY_EVENT = "TanStackHotkeysKey";
/** Event the native modules send when the app's window loses focus. */
export declare const BLUR_EVENT = "TanStackHotkeysBlur";
/** Where key events come from on the current platform. */
export type KeySource = 
/** iOS, iPadOS, Mac Catalyst, macOS, and Android: an app-wide native hook. */
'native-module'
/** Windows: key events of the focused view inside `<HotkeysRoot>`. */
 | 'hotkeys-root'
/** Web: TanStack Hotkeys' own DOM environment. */
 | 'dom'
/** The native module is missing; rebuild the app. */
 | 'unavailable';
export interface NativeHotkeys {
    /** The default hotkey target, which every key press reaches. Null on web. */
    root: NativeKeyboardRoot | null;
    source: KeySource;
    /** Sends a key to hotkeys as if it came from the keyboard, as in tests. */
    dispatch: (key: NormalizedKey) => void;
}
/**
 * Installs the React Native environment into TanStack Hotkeys and starts
 * listening to the native keyboard. Importing this package does it, so
 * calling this is only needed to read the result. Safe to call repeatedly.
 */
export declare function installNativeHotkeys(): NativeHotkeys;
/** @internal Dispatches a react-native-windows key event from `<HotkeysRoot>`. */
export declare function dispatchWindowsKey(type: 'keydown' | 'keyup', payload: WindowsKeyPayload): void;
/** @internal Counts mounted `<HotkeysRoot>` views on Windows. */
export declare function trackHotkeysRoot(): () => void;
/** @internal The keys `<HotkeysRoot>` marks as handled on Windows. */
export declare function getWindowsHandledKeys(): Array<WindowsHandledKey>;
/** @internal Subscribes to changes of `getWindowsHandledKeys()`. */
export declare function subscribeWindowsHandledKeys(listener: () => void): () => void;
