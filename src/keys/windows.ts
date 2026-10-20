import { isTypedCharacter, locationOf } from './codes'
import type { NormalizedKey } from './types'

/** `nativeEvent` of react-native-windows `onKeyDown`/`onKeyUp`, which already uses W3C names. */
export interface WindowsKeyPayload {
  key: string
  code: string
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
  repeat?: boolean
}

/**
 * Normalizes a react-native-windows key event. Windows reports AltGr as
 * Control+Alt; a character other than a plain letter or digit typed with
 * both held is treated as AltGr, as browsers report it.
 */
export function normalizeWindowsKey(
  type: 'keydown' | 'keyup',
  payload: WindowsKeyPayload,
  textInputFocused: boolean,
): NormalizedKey {
  const key = payload.key === 'Space' ? ' ' : payload.key
  const altGraph =
    payload.ctrlKey &&
    payload.altKey &&
    isTypedCharacter(key) &&
    !/^[A-Za-z0-9]$/.test(key)
  return {
    type,
    key,
    code: payload.code,
    ctrlKey: payload.ctrlKey,
    shiftKey: payload.shiftKey,
    altKey: payload.altKey,
    metaKey: payload.metaKey,
    altGraph,
    capsLock: false,
    repeat: payload.repeat ?? false,
    location: locationOf(payload.code),
    textInputFocused,
    isComposing: false,
  }
}
