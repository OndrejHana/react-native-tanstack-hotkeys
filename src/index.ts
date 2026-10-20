import * as resolved from '@tanstack/hotkeys'
import { installNativeHotkeys } from './native'
import { getHotkeyManager } from './tanstack'

declare module '@tanstack/hotkeys' {
  interface HotkeyTargets {
    /**
     * React Native: the keyboard root, or a host instance, such as the ref of
     * a `TextInput` or of a view containing one.
     */
    reactNative: object
  }
}

installNativeHotkeys()

if ((resolved.getHotkeyManager as unknown) !== getHotkeyManager) {
  console.error(
    'react-native-tanstack-hotkeys: `@tanstack/hotkeys` resolves to the ' +
      'unpatched package, so hotkeys will not receive key presses. Wrap your ' +
      "Metro config with `withTanStackHotkeys` from 'react-native-tanstack-hotkeys/metro' " +
      'and restart Metro with --reset-cache.',
  )
}

export { HotkeysRoot } from './HotkeysRoot'
export type { HotkeysRootProps } from './HotkeysRoot'
export { installNativeHotkeys } from './native'
export type { KeySource, NativeHotkeys } from './native'
export { NativeKeyboardEvent } from './event'
export type { NativeKeyboardEventInit } from './event'
export { NativeKeyboardRoot } from './environment'
export { normalizeIOSKey, normalizeMacOSKey } from './keys/apple'
export type { IOSKeyPayload, MacOSKeyPayload } from './keys/apple'
export { normalizeAndroidKey } from './keys/android'
export type { AndroidKeyPayload } from './keys/android'
export { normalizeWindowsKey } from './keys/windows'
export type { WindowsKeyPayload } from './keys/windows'
export type { NormalizedKey } from './keys/types'
