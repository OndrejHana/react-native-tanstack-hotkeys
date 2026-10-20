import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
export interface HotkeysRootProps {
    children?: React.ReactNode;
    /** Windows only: style of the root view, which fills its parent by default. */
    style?: StyleProp<ViewStyle>;
    /** Windows only: focus the root view on mount so keys arrive before anything else has focus. Default: true. */
    autoFocus?: boolean;
}
/**
 * Wrap your app in `<HotkeysRoot>`. On Windows, React Native delivers keys
 * only to the focused view and its ancestors, so this focusable root view
 * listens to every key in the app. Elsewhere, native modules listen
 * app-wide and this renders its children unchanged.
 */
export declare function HotkeysRoot(props: HotkeysRootProps): React.ReactElement;
