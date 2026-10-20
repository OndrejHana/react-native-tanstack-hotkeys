import { AppState, NativeEventEmitter, NativeModules, Platform, TextInput, } from 'react-native';
import { KeyboardDispatcher, createNativeEnvironment, } from './environment';
import { NativeKeyboardEvent } from './event';
import { normalizeIOSKey, normalizeMacOSKey } from './keys/apple';
import { normalizeAndroidKey } from './keys/android';
import { normalizeWindowsKey } from './keys/windows';
import { toNativeConsumeRules, toWindowsHandledKeys, watchConsumeRules, } from './consume';
import { getHotkeyManager, setHotkeysEnvironment } from './tanstack';
/** Event the native modules send for each key press and release. */
export const KEY_EVENT = 'TanStackHotkeysKey';
/** Event the native modules send when the app's window loses focus. */
export const BLUR_EVENT = 'TanStackHotkeysBlur';
let installed = null;
let dispatcher = null;
let mountedRoots = 0;
let warnedNoRoot = false;
let windowsHandledKeys = [];
const windowsListeners = new Set();
function platformName() {
    switch (Platform.OS) {
        case 'ios':
        case 'macos':
            return 'mac';
        case 'windows':
            return 'windows';
        default:
            return 'linux';
    }
}
function normalize(payload) {
    switch (Platform.OS) {
        case 'ios':
            return normalizeIOSKey(payload);
        case 'macos':
            return normalizeMacOSKey(payload);
        case 'android':
            return normalizeAndroidKey(payload);
        default:
            return null;
    }
}
/**
 * Installs the React Native environment into TanStack Hotkeys and starts
 * listening to the native keyboard. Importing this package does it, so
 * calling this is only needed to read the result. Safe to call repeatedly.
 */
export function installNativeHotkeys() {
    if (installed)
        return installed;
    if (Platform.OS === 'web') {
        installed = { root: null, source: 'dom', dispatch: () => { } };
        return installed;
    }
    const keyboard = new KeyboardDispatcher({
        focusedTextInput: () => TextInput.State.currentlyFocusedInput() ??
            null,
    });
    dispatcher = keyboard;
    setHotkeysEnvironment(createNativeEnvironment(keyboard, platformName()));
    const dispatch = (key) => keyboard.dispatch(NativeKeyboardEvent.fromNative(key));
    const blur = () => keyboard.blur();
    AppState.addEventListener('change', (state) => {
        if (state !== 'active')
            blur();
    });
    let source;
    if (Platform.OS === 'windows') {
        source = 'hotkeys-root';
        const manager = getHotkeyManager();
        watchConsumeRules(manager, keyboard.root, (rules) => {
            windowsHandledKeys = toWindowsHandledKeys(rules);
            for (const listener of windowsListeners)
                listener();
        });
        // Hotkeys register in effects, before an enclosing root's effect runs
        const subscription = manager.registrations.subscribe(() => {
            setTimeout(() => {
                if (mountedRoots > 0 || warnedNoRoot)
                    return;
                warnedNoRoot = true;
                console.warn('react-native-tanstack-hotkeys: on Windows, hotkeys receive key ' +
                    'presses through <HotkeysRoot>. Wrap your app in it.');
            }, 1000);
            subscription.unsubscribe();
        });
    }
    else {
        const module = NativeModules.TanStackHotkeys;
        if (module) {
            source = 'native-module';
            const emitter = new NativeEventEmitter(module);
            emitter.addListener(KEY_EVENT, (payload) => {
                const key = normalize(payload);
                if (key)
                    dispatch(key);
            });
            emitter.addListener(BLUR_EVENT, blur);
            const os = Platform.OS;
            watchConsumeRules(getHotkeyManager(), keyboard.root, (rules) => {
                module.setConsumeRules(toNativeConsumeRules(rules, os));
            });
        }
        else {
            source = 'unavailable';
            console.warn('react-native-tanstack-hotkeys: the TanStackHotkeys native module is ' +
                'not linked, so hotkeys will not receive key presses. Rebuild the ' +
                'app (run `pod install` for iOS and macOS).');
        }
    }
    installed = { root: keyboard.root, source, dispatch };
    return installed;
}
/** @internal Dispatches a react-native-windows key event from `<HotkeysRoot>`. */
export function dispatchWindowsKey(type, payload) {
    dispatcher?.dispatch(NativeKeyboardEvent.fromNative(normalizeWindowsKey(type, payload, false)));
}
/** @internal Counts mounted `<HotkeysRoot>` views on Windows. */
export function trackHotkeysRoot() {
    mountedRoots++;
    return () => {
        mountedRoots--;
    };
}
/** @internal The keys `<HotkeysRoot>` marks as handled on Windows. */
export function getWindowsHandledKeys() {
    return windowsHandledKeys;
}
/** @internal Subscribes to changes of `getWindowsHandledKeys()`. */
export function subscribeWindowsHandledKeys(listener) {
    windowsListeners.add(listener);
    return () => windowsListeners.delete(listener);
}
