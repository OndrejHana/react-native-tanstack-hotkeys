import { describe, expect, it, vi } from 'vitest'
;(globalThis as { __RN_OS__?: string }).__RN_OS__ = 'macos'

const { useHeldKeys, useHotkey } = await import('@tanstack/react-hotkeys')
const { nativeModule } = await import('./react-native')
const { KEY_EVENT } = await import('../src/native')
const { APPLE_FLAG } = await import('../src/keys/apple')
const { act, renderHook } = await import('./helpers')

const emit = (payload: object) =>
  act(() =>
    nativeModule.emit(KEY_EVENT, {
      characters: '',
      charactersIgnoringModifiers: '',
      repeat: false,
      textInputFocused: false,
      ...payload,
    }),
  )

describe('React Native environment on macOS', () => {
  it('turns modifier flag changes into held keys', () => {
    const hook = renderHook(() => useHeldKeys())
    emit({ type: 'flagsChanged', keyCode: 0x37, modifierFlags: APPLE_FLAG.COMMAND | 0x08 })
    expect(hook.result.current).toEqual(['Meta'])
    emit({ type: 'flagsChanged', keyCode: 0x37, modifierFlags: 0 })
    expect(hook.result.current).toEqual([])
    hook.unmount()
  })

  it('fires on Command shortcuts and sends virtual key codes for named keys', () => {
    const callback = vi.fn()
    const hook = renderHook(() => {
      useHotkey('Mod+K', callback)
      useHotkey('Mod+ArrowUp', () => {})
    })
    emit({
      type: 'keydown',
      keyCode: 0x28,
      characters: 'k',
      charactersIgnoringModifiers: 'k',
      modifierFlags: APPLE_FLAG.COMMAND,
    })
    expect(callback).toHaveBeenCalledTimes(1)
    expect(nativeModule.consumeRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyCodes: [0x7e], modifiers: 8 }),
      ]),
    )
    hook.unmount()
  })
})
