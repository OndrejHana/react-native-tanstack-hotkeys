import {
  AppState,
  NativeEventEmitter,
  NativeModules,
  Platform,
  TextInput,
} from 'react-native'
import {
  KeyboardDispatcher,
  NativeKeyboardRoot,
  createNativeEnvironment,
} from './environment'
import { NativeKeyboardEvent } from './event'
import { normalizeIOSKey, normalizeMacOSKey } from './keys/apple'
import { normalizeAndroidKey } from './keys/android'
import { normalizeWindowsKey } from './keys/windows'
import {
  toNativeConsumeRules,
  toWindowsHandledKeys,
  watchConsumeRules,
} from './consume'
import { getHotkeyManager, setHotkeysEnvironment } from './tanstack'
import type { NativeConsumeRule, WindowsHandledKey } from './consume'
import type { IOSKeyPayload, MacOSKeyPayload } from './keys/apple'
import type { AndroidKeyPayload } from './keys/android'
import type { WindowsKeyPayload } from './keys/windows'
import type { NormalizedKey } from './keys/types'

/** Event the native modules send for each key press and release. */
export const KEY_EVENT = 'TanStackHotkeysKey'
/** Event the native modules send when the app's window loses focus. */
export const BLUR_EVENT = 'TanStackHotkeysBlur'

interface HotkeysNativeModule {
  setConsumeRules: (rules: Array<NativeConsumeRule>) => void
  addListener: (eventName: string) => void
  removeListeners: (count: number) => void
}

/** Where key events come from on the current platform. */
export type KeySource =
  /** iOS, iPadOS, Mac Catalyst, macOS, and Android: an app-wide native hook. */
  | 'native-module'
  /** Windows: key events of the focused view inside `<HotkeysRoot>`. */
  | 'hotkeys-root'
  /** Web: TanStack Hotkeys' own DOM environment. */
  | 'dom'
  /** The native module is missing; rebuild the app. */
  | 'unavailable'

export interface NativeHotkeys {
  /** The default hotkey target, which every key press reaches. Null on web. */
  root: NativeKeyboardRoot | null
  source: KeySource
  /** Sends a key to hotkeys as if it came from the keyboard, as in tests. */
  dispatch: (key: NormalizedKey) => void
}

let installed: NativeHotkeys | null = null
let dispatcher: KeyboardDispatcher | null = null
let mountedRoots = 0
let warnedNoRoot = false
let windowsHandledKeys: Array<WindowsHandledKey> = []
const windowsListeners = new Set<() => void>()

function platformName(): 'mac' | 'windows' | 'linux' {
  switch (Platform.OS) {
    case 'ios':
    case 'macos':
      return 'mac'
    case 'windows':
      return 'windows'
    default:
      return 'linux'
  }
}

function normalize(payload: unknown): NormalizedKey | null {
  switch (Platform.OS) {
    case 'ios':
      return normalizeIOSKey(payload as IOSKeyPayload)
    case 'macos':
      return normalizeMacOSKey(payload as MacOSKeyPayload)
    case 'android':
      return normalizeAndroidKey(payload as AndroidKeyPayload)
    default:
      return null
  }
}

/**
 * Installs the React Native environment into TanStack Hotkeys and starts
 * listening to the native keyboard. Importing this package does it, so
 * calling this is only needed to read the result. Safe to call repeatedly.
 */
export function installNativeHotkeys(): NativeHotkeys {
  if (installed) return installed
  if (Platform.OS === 'web') {
    installed = { root: null, source: 'dom', dispatch: () => {} }
    return installed
  }

  const keyboard = new KeyboardDispatcher({
    focusedTextInput: () =>
      (TextInput.State.currentlyFocusedInput() as object | null | undefined) ??
      null,
  })
  dispatcher = keyboard
  setHotkeysEnvironment(createNativeEnvironment(keyboard, platformName()))

  const dispatch = (key: NormalizedKey) =>
    keyboard.dispatch(NativeKeyboardEvent.fromNative(key))
  const blur = () => keyboard.blur()
  AppState.addEventListener('change', (state) => {
    if (state !== 'active') blur()
  })

  let source: KeySource
  if (Platform.OS === 'windows') {
    source = 'hotkeys-root'
    const manager = getHotkeyManager()
    watchConsumeRules(manager, keyboard.root, (rules) => {
      windowsHandledKeys = toWindowsHandledKeys(rules)
      for (const listener of windowsListeners) listener()
    })
    // Hotkeys register in effects, before an enclosing root's effect runs
    const subscription = manager.registrations.subscribe(() => {
      setTimeout(() => {
        if (mountedRoots > 0 || warnedNoRoot) return
        warnedNoRoot = true
        console.warn(
          'react-native-tanstack-hotkeys: on Windows, hotkeys receive key ' +
            'presses through <HotkeysRoot>. Wrap your app in it.',
        )
      }, 1000)
      subscription.unsubscribe()
    })
  } else {
    const module = NativeModules.TanStackHotkeys as
      HotkeysNativeModule | undefined
    if (module) {
      source = 'native-module'
      const emitter = new NativeEventEmitter(module as never)
      emitter.addListener(KEY_EVENT, (payload: unknown) => {
        const key = normalize(payload)
        if (key) dispatch(key)
      })
      emitter.addListener(BLUR_EVENT, blur)
      const os = Platform.OS as 'ios' | 'macos' | 'android'
      watchConsumeRules(getHotkeyManager(), keyboard.root, (rules) => {
        module.setConsumeRules(toNativeConsumeRules(rules, os))
      })
    } else {
      source = 'unavailable'
      console.warn(
        'react-native-tanstack-hotkeys: the TanStackHotkeys native module is ' +
          'not linked, so hotkeys will not receive key presses. Rebuild the ' +
          'app (run `pod install` for iOS and macOS).',
      )
    }
  }

  installed = { root: keyboard.root, source, dispatch }
  return installed
}

/** @internal Dispatches a react-native-windows key event from `<HotkeysRoot>`. */
export function dispatchWindowsKey(
  type: 'keydown' | 'keyup',
  payload: WindowsKeyPayload,
): void {
  dispatcher?.dispatch(
    NativeKeyboardEvent.fromNative(normalizeWindowsKey(type, payload, false)),
  )
}

/** @internal Counts mounted `<HotkeysRoot>` views on Windows. */
export function trackHotkeysRoot(): () => void {
  mountedRoots++
  return () => {
    mountedRoots--
  }
}

/** @internal The keys `<HotkeysRoot>` marks as handled on Windows. */
export function getWindowsHandledKeys(): Array<WindowsHandledKey> {
  return windowsHandledKeys
}

/** @internal Subscribes to changes of `getWindowsHandledKeys()`. */
export function subscribeWindowsHandledKeys(listener: () => void): () => void {
  windowsListeners.add(listener)
  return () => windowsListeners.delete(listener)
}
