import { describe, expect, it, vi } from 'vitest'
;(globalThis as { __RN_OS__?: string }).__RN_OS__ = 'android'

const { useHotkey } = await import('@tanstack/react-hotkeys')
const { nativeModule } = await import('./react-native')
const { installNativeHotkeys } = await import('../src')
const { KEY_EVENT } = await import('../src/native')
const { ANDROID_META } = await import('../src/keys/android')
const { act, renderHook } = await import('./helpers')

function key(
  type: 'keydown' | 'keyup',
  keyCode: number,
  scanCode: number,
  char: string,
  metaState = 0,
) {
  act(() => {
    nativeModule.emit(KEY_EVENT, {
      type,
      keyCode,
      scanCode,
      metaState,
      unicodeChar: char ? char.codePointAt(0) : 0,
      altGraphUnicodeChar: char ? char.codePointAt(0) : 0,
      deadKey: false,
      repeatCount: 0,
      textInputFocused: false,
    })
  })
}

describe('React Native environment on Android', () => {
  it('uses Control as Mod', () => {
    expect(installNativeHotkeys().source).toBe('native-module')
    const callback = vi.fn()
    const hook = renderHook(() => useHotkey('Mod+S', callback))
    key('keydown', 47, 31, 's', ANDROID_META.META_ON)
    expect(callback).not.toHaveBeenCalled()
    key('keydown', 47, 31, 's', ANDROID_META.CTRL_ON | 0x2000)
    expect(callback).toHaveBeenCalledTimes(1)
    hook.unmount()
  })

  it('matches physical hotkeys by scan code on other layouts', () => {
    const callback = vi.fn()
    const hook = renderHook(() => useHotkey('Mod+[KeyA]', callback))
    // AZERTY: the QWERTY A position types q and reports KEYCODE_Q
    key('keydown', 45, 30, 'q', ANDROID_META.CTRL_ON)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(nativeModule.consumeRules).toEqual([
      expect.objectContaining({ keyCodes: [29], scanCodes: [30], modifiers: 1 }),
    ])
    hook.unmount()
  })

  it('consumes Escape by key and scan code, so Android does not go back', () => {
    const hook = renderHook(() => useHotkey('Escape', () => {}))
    expect(nativeModule.consumeRules).toEqual([
      expect.objectContaining({ keyCodes: [111], scanCodes: [1], skipInText: false }),
    ])
    hook.unmount()
  })
})
