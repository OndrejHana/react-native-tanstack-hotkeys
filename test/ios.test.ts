// End to end on iOS: @tanstack/react-hotkeys from npm, unmodified, receiving
// key presses from the (fake) native module through the Metro-style alias.
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  useHeldKeys,
  useHotkey,
  useHotkeyRecorder,
} from '@tanstack/react-hotkeys'
import { getHotkeyManager } from '@tanstack/hotkeys'
import { AppState, nativeModule, setFocusedInput } from './react-native'
import { NativeKeyboardEvent, installNativeHotkeys } from '../src'
import { APPLE_FLAG, HID_USAGES_BY_CODE } from '../src/keys/apple'
import { BLUR_EVENT, KEY_EVENT } from '../src/native'
import { act, renderHook } from './helpers'

interface Press {
  key?: string
  meta?: boolean
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  textInputFocused?: boolean
  isComposing?: boolean
}

function send(type: 'keydown' | 'keyup', code: string, press: Press = {}) {
  const flags =
    (press.meta ? APPLE_FLAG.COMMAND : 0) |
    (press.ctrl ? APPLE_FLAG.CONTROL : 0) |
    (press.shift ? APPLE_FLAG.SHIFT : 0) |
    (press.alt ? APPLE_FLAG.OPTION : 0)
  const key = press.key ?? code.replace(/^Key/, '').toLowerCase()
  act(() => {
    nativeModule.emit(KEY_EVENT, {
      type,
      keyCode: HID_USAGES_BY_CODE.get(code)![0],
      characters: press.meta || press.ctrl ? '' : key,
      charactersIgnoringModifiers: key,
      modifierFlags: flags,
      textInputFocused: press.textInputFocused ?? false,
      isComposing: press.isComposing ?? false,
    })
  })
}

function press(code: string, options?: Press) {
  send('keydown', code, options)
  send('keyup', code, options)
}

afterEach(() => {
  setFocusedInput(null)
})

describe('React Native environment on iOS', () => {
  it('installs with the native module as the key source', () => {
    const installed = installNativeHotkeys()
    expect(installed.source).toBe('native-module')
    expect(installed.root).not.toBeNull()
  })

  it('fires useHotkey with Command as Mod', () => {
    const callback = vi.fn()
    const hook = renderHook(() => useHotkey('Mod+S', callback))

    press('KeyS', { ctrl: true })
    expect(callback).not.toHaveBeenCalled()

    press('KeyS', { meta: true })
    expect(callback).toHaveBeenCalledTimes(1)
    const [event, context] = callback.mock.calls[0]!
    expect(event).toBeInstanceOf(NativeKeyboardEvent)
    expect(event).toMatchObject({ key: 's', code: 'KeyS', metaKey: true })
    expect(event.defaultPrevented).toBe(true)
    expect(context).toMatchObject({ kind: 'chord', hotkey: 'Mod+S' })
    hook.unmount()

    press('KeyS', { meta: true })
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('skips single-key hotkeys while a text field has focus', () => {
    const single = vi.fn()
    const save = vi.fn()
    const hook = renderHook(() => {
      useHotkey('K', single)
      useHotkey('Mod+S', save)
    })

    setFocusedInput({ name: 'input' })
    press('KeyK')
    press('KeyS', { meta: true })
    expect(single).not.toHaveBeenCalled()
    expect(save).toHaveBeenCalledTimes(1)

    // A text field the native side reports, such as one in a web view
    setFocusedInput(null)
    press('KeyK', { textInputFocused: true })
    expect(single).not.toHaveBeenCalled()

    press('KeyK')
    expect(single).toHaveBeenCalledTimes(1)
    hook.unmount()
  })

  it('leaves keys to an input method that is composing text', () => {
    const callback = vi.fn()
    const hook = renderHook(() => useHotkey('K', callback))
    press('KeyK', { isComposing: true })
    expect(callback).not.toHaveBeenCalled()
    press('KeyK')
    expect(callback).toHaveBeenCalledTimes(1)
    hook.unmount()
  })

  it('scopes hotkeys to a TextInput ref', () => {
    const input = { name: 'input' }
    const other = { name: 'other' }
    const submit = vi.fn()
    const hook = renderHook(() =>
      useHotkey('Enter', submit, { target: { current: input } as never }),
    )

    press('Enter')
    setFocusedInput(other)
    press('Enter')
    expect(submit).not.toHaveBeenCalled()

    setFocusedInput(input)
    press('Enter')
    expect(submit).toHaveBeenCalledTimes(1)
    hook.unmount()
  })

  it('scopes hotkeys to a view containing the focused TextInput', () => {
    const input = { name: 'input' }
    const form = { contains: (node: unknown) => node === input }
    const inForm = vi.fn()
    const global = vi.fn()
    const hook = renderHook(() => {
      useHotkey('Mod+Enter', inForm, { target: { current: form } as never })
      useHotkey('Mod+Enter', global, { conflictBehavior: 'allow' })
    })

    setFocusedInput(input)
    press('Enter', { meta: true })
    // The form's hotkey stops propagation before the root's
    expect(inForm).toHaveBeenCalledTimes(1)
    expect(global).not.toHaveBeenCalled()

    setFocusedInput(null)
    press('Enter', { meta: true })
    expect(inForm).toHaveBeenCalledTimes(1)
    expect(global).toHaveBeenCalledTimes(1)
    hook.unmount()
  })

  it('runs sequences', () => {
    const callback = vi.fn()
    const hook = renderHook(() => useHotkey(['G', 'G'], callback))
    press('KeyG')
    expect(callback).not.toHaveBeenCalled()
    press('KeyG')
    expect(callback).toHaveBeenCalledTimes(1)
    hook.unmount()
  })

  it('tracks held keys and releases them when the app goes inactive', () => {
    const hook = renderHook(() => useHeldKeys())
    send('keydown', 'MetaLeft', { meta: true, key: '' })
    send('keydown', 'ShiftLeft', { meta: true, shift: true, key: '' })
    expect(hook.result.current).toEqual(['Meta', 'Shift'])

    act(() => AppState.emit('inactive'))
    expect(hook.result.current).toEqual([])

    send('keydown', 'ShiftLeft', { shift: true, key: '' })
    act(() => nativeModule.emit(BLUR_EVENT))
    expect(hook.result.current).toEqual([])
    hook.unmount()
  })

  it('records shortcuts by physical key and pauses hotkeys meanwhile', () => {
    const onRecord = vi.fn()
    const callback = vi.fn()
    const hook = renderHook(() => {
      useHotkey('Mod+K', callback)
      return useHotkeyRecorder({ onRecord })
    })

    act(() => hook.result.current.startRecording())
    expect(hook.result.current.isRecording).toBe(true)
    press('KeyK', { meta: true, shift: true })
    expect(onRecord).toHaveBeenCalledWith('Mod+Shift+[KeyK]')
    expect(hook.result.current.isRecording).toBe(false)
    expect(callback).not.toHaveBeenCalled()

    press('KeyK', { meta: true })
    expect(callback).toHaveBeenCalledTimes(1)
    hook.unmount()
  })

  it('triggers registrations programmatically with a native event', () => {
    const callback = vi.fn()
    const hook = renderHook(() => useHotkey('Mod+S', callback))
    const [registration] = getHotkeyManager().registrations.state.values()
    getHotkeyManager().triggerRegistration(registration!.id)
    expect(callback.mock.calls[0]![0]).toBeInstanceOf(NativeKeyboardEvent)
    expect(callback.mock.calls[0]![0].isTrusted).toBe(false)
    hook.unmount()
  })
})

describe('consume rules on iOS', () => {
  it('sends rules for live hotkeys that prevent default', () => {
    let enabled = true
    const hook = renderHook(() => {
      useHotkey('Mod+S', () => {})
      useHotkey('Escape', () => {})
      useHotkey('K', () => {})
      useHotkey('?', () => {})
      useHotkey('Mod+P', () => {}, { preventDefault: false })
      useHotkey('Mod+E', () => {}, { enabled })
    })

    expect(nativeModule.consumeRules).toEqual(
      expect.arrayContaining([
        {
          keyCodes: [],
          scanCodes: [],
          chars: ['s'],
          modifiers: 8,
          shiftOptional: false,
          skipInText: false,
        },
        {
          keyCodes: [0x29],
          scanCodes: [],
          chars: [],
          modifiers: 0,
          shiftOptional: false,
          skipInText: false,
        },
        expect.objectContaining({ chars: ['k'], skipInText: true }),
        expect.objectContaining({ chars: ['?'], shiftOptional: true }),
        expect.objectContaining({ chars: ['e'] }),
      ]),
    )
    expect(nativeModule.consumeRules).toHaveLength(5)

    enabled = false
    hook.rerender()
    expect(nativeModule.consumeRules).toHaveLength(4)

    hook.unmount()
    expect(nativeModule.consumeRules).toEqual([])
  })

  it('sends no rules for keyup hotkeys, whose default cannot be prevented', () => {
    const hook = renderHook(() =>
      useHotkey('Escape', () => {}, { eventType: 'keyup' }),
    )
    expect(nativeModule.consumeRules).toEqual([])
    hook.unmount()
  })

  it('consumes physical keys by HID usage', () => {
    const hook = renderHook(() => useHotkey('Mod+[KeyK]', () => {}))
    expect(nativeModule.consumeRules).toEqual([
      expect.objectContaining({ keyCodes: [0x0e], chars: [], modifiers: 8 }),
    ])
    hook.unmount()
  })
})
