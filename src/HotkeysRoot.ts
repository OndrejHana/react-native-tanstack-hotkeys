import React, { useEffect, useRef, useSyncExternalStore } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import {
  dispatchWindowsKey,
  getWindowsHandledKeys,
  installNativeHotkeys,
  subscribeWindowsHandledKeys,
  trackHotkeysRoot,
} from './native'
import type { StyleProp, ViewStyle } from 'react-native'
import type { WindowsKeyPayload } from './keys/windows'

export interface HotkeysRootProps {
  children?: React.ReactNode
  /** Windows only: style of the root view, which fills its parent by default. */
  style?: StyleProp<ViewStyle>
  /** Windows only: focus the root view on mount so keys arrive before anything else has focus. Default: true. */
  autoFocus?: boolean
}

type KeyEvent = { nativeEvent: WindowsKeyPayload }

function WindowsHotkeysRoot({
  children,
  style,
  autoFocus = true,
}: HotkeysRootProps) {
  const ref = useRef<{ focus: () => void } | null>(null)
  const handledKeys = useSyncExternalStore(
    subscribeWindowsHandledKeys,
    getWindowsHandledKeys,
  )
  useEffect(trackHotkeysRoot, [])
  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  // react-native-windows props, which React Native's types don't include
  const props = {
    ref,
    focusable: true,
    style: [styles.root, style],
    onKeyDownCapture: (event: KeyEvent) =>
      dispatchWindowsKey('keydown', event.nativeEvent),
    onKeyUpCapture: (event: KeyEvent) =>
      dispatchWindowsKey('keyup', event.nativeEvent),
    keyDownEvents: handledKeys,
  }
  return React.createElement(View, props as never, children)
}

/**
 * Wrap your app in `<HotkeysRoot>`. On Windows, React Native delivers keys
 * only to the focused view and its ancestors, so this focusable root view
 * listens to every key in the app. Elsewhere, native modules listen
 * app-wide and this renders its children unchanged.
 */
export function HotkeysRoot(props: HotkeysRootProps): React.ReactElement {
  installNativeHotkeys()
  if (Platform.OS !== 'windows') {
    return React.createElement(React.Fragment, null, props.children)
  }
  return React.createElement(WindowsHotkeysRoot, props)
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
