import { NativeKeyboardEvent } from './event';
import type { HotkeysEnvironment } from './tanstack';
/**
 * The default hotkey target on React Native, in place of the browser's
 * `document` and `window`: it receives every key press.
 */
export declare class NativeKeyboardRoot {
    toString(): string;
}
/** What the environment needs to know about the app's focus. */
export interface NativeFocus {
    /**
     * The focused text field, such as the host instance of a focused
     * `TextInput`, or null. Hotkeys targeted at it, or at a view that contains
     * it, receive its key presses.
     */
    focusedTextInput: () => object | null;
}
type Listener = (event: never) => void;
/**
 * Routes key events from the native modules to hotkey listeners. Events go
 * through the root and any targets around the focused text field, in DOM
 * order: capture listeners outermost first, then bubble listeners innermost
 * first.
 */
export declare class KeyboardDispatcher {
    private readonly focus;
    readonly root: NativeKeyboardRoot;
    private readonly listeners;
    constructor(focus: NativeFocus);
    /** Adds a listener and returns a function that removes it. */
    listen(target: object, type: string, listener: Listener, capture: boolean): () => void;
    /** Whether any listener for `type` is attached. */
    hasListeners(type: string): boolean;
    /** Dispatches a key event through the root and the targets around the focused text field. */
    dispatch(event: NativeKeyboardEvent): void;
    /** Tells root listeners that the app lost focus, so held keys are released. */
    blur(): void;
    /** Runs one target's listeners for a phase. Returns false once propagation stops. */
    private invoke;
}
/**
 * Creates the `HotkeysEnvironment` for React Native. Element targets are
 * host instances, such as a `TextInput` ref: their hotkeys fire while that
 * text field, or one inside them, has focus.
 */
export declare function createNativeEnvironment(dispatcher: KeyboardDispatcher, platform: 'mac' | 'windows' | 'linux'): HotkeysEnvironment;
export {};
