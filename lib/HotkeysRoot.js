import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { dispatchWindowsKey, getWindowsHandledKeys, installNativeHotkeys, subscribeWindowsHandledKeys, trackHotkeysRoot, } from './native';
function WindowsHotkeysRoot({ children, style, autoFocus = true, }) {
    const ref = useRef(null);
    const handledKeys = useSyncExternalStore(subscribeWindowsHandledKeys, getWindowsHandledKeys);
    useEffect(trackHotkeysRoot, []);
    useEffect(() => {
        if (autoFocus)
            ref.current?.focus();
    }, [autoFocus]);
    // react-native-windows props, which React Native's types don't include
    const props = {
        ref,
        focusable: true,
        style: [styles.root, style],
        onKeyDownCapture: (event) => dispatchWindowsKey('keydown', event.nativeEvent),
        onKeyUpCapture: (event) => dispatchWindowsKey('keyup', event.nativeEvent),
        keyDownEvents: handledKeys,
    };
    return React.createElement(View, props, children);
}
/**
 * Wrap your app in `<HotkeysRoot>`. On Windows, React Native delivers keys
 * only to the focused view and its ancestors, so this focusable root view
 * listens to every key in the app. Elsewhere, native modules listen
 * app-wide and this renders its children unchanged.
 */
export function HotkeysRoot(props) {
    installNativeHotkeys();
    if (Platform.OS !== 'windows') {
        return React.createElement(React.Fragment, null, props.children);
    }
    return React.createElement(WindowsHotkeysRoot, props);
}
const styles = StyleSheet.create({
    root: { flex: 1 },
});
