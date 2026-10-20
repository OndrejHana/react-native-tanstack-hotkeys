import { describe, expect, it } from 'vitest'
import {
  APPLE_FLAG,
  HID_USAGE_CODES,
  MAC_KEY_CODES,
  normalizeIOSKey,
  normalizeMacOSKey,
} from '../src/keys/apple'
import {
  ANDROID_KEY_CODES,
  ANDROID_META,
  EVDEV_SCAN_CODES,
  normalizeAndroidKey,
} from '../src/keys/android'
import { normalizeWindowsKey } from '../src/keys/windows'
import { NAMED_KEYS, US_LAYOUT } from '../src/keys/codes'

const ios = (overrides: Partial<Parameters<typeof normalizeIOSKey>[0]>) =>
  normalizeIOSKey({
    type: 'keydown',
    keyCode: 0x16,
    characters: 's',
    charactersIgnoringModifiers: 's',
    modifierFlags: 0,
    textInputFocused: false,
    ...overrides,
  })

const mac = (overrides: Partial<Parameters<typeof normalizeMacOSKey>[0]>) =>
  normalizeMacOSKey({
    type: 'keydown',
    keyCode: 0x01,
    characters: 's',
    charactersIgnoringModifiers: 's',
    modifierFlags: 0,
    repeat: false,
    textInputFocused: false,
    ...overrides,
  })!

const android = (
  overrides: Partial<Parameters<typeof normalizeAndroidKey>[0]>,
) =>
  normalizeAndroidKey({
    type: 'keydown',
    keyCode: 47, // KEYCODE_S
    scanCode: 31, // KEY_S
    metaState: 0,
    unicodeChar: 's'.codePointAt(0)!,
    altGraphUnicodeChar: 's'.codePointAt(0)!,
    deadKey: false,
    repeatCount: 0,
    textInputFocused: false,
    ...overrides,
  })

describe('code tables', () => {
  const known = new Set([...Object.keys(NAMED_KEYS), ...Object.keys(US_LAYOUT)])
  it.each([
    ['HID usages', HID_USAGE_CODES],
    ['macOS key codes', MAC_KEY_CODES],
    ['evdev scan codes', EVDEV_SCAN_CODES],
    ['Android key codes', ANDROID_KEY_CODES],
  ])('%s map to W3C codes with a key', (_, table) => {
    for (const code of Object.values(table)) expect(known).toContain(code)
  })

  it('covers every letter and digit on every platform', () => {
    for (const table of [
      HID_USAGE_CODES,
      MAC_KEY_CODES,
      EVDEV_SCAN_CODES,
      ANDROID_KEY_CODES,
    ]) {
      const codes = new Set(Object.values(table))
      for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        expect(codes).toContain(`Key${letter}`)
      }
      for (const digit of '0123456789') expect(codes).toContain(`Digit${digit}`)
    }
  })

  it('spot-checks positions against the platform headers', () => {
    expect(HID_USAGE_CODES[0x04]).toBe('KeyA')
    expect(HID_USAGE_CODES[0x1d]).toBe('KeyZ')
    expect(HID_USAGE_CODES[0x1e]).toBe('Digit1')
    expect(HID_USAGE_CODES[0x27]).toBe('Digit0')
    expect(HID_USAGE_CODES[0x45]).toBe('F12')
    expect(HID_USAGE_CODES[0x73]).toBe('F24')
    expect(MAC_KEY_CODES[0x7e]).toBe('ArrowUp')
    expect(MAC_KEY_CODES[0x37]).toBe('MetaLeft')
    expect(EVDEV_SCAN_CODES[16]).toBe('KeyQ')
    expect(EVDEV_SCAN_CODES[44]).toBe('KeyZ')
    expect(EVDEV_SCAN_CODES[88]).toBe('F12')
    expect(EVDEV_SCAN_CODES[194]).toBe('F24')
    expect(ANDROID_KEY_CODES[54]).toBe('KeyZ')
    expect(ANDROID_KEY_CODES[142]).toBe('F12')
  })
})

describe('normalizeIOSKey', () => {
  it('reports the typed character and physical code', () => {
    expect(ios({})).toMatchObject({
      type: 'keydown',
      key: 's',
      code: 'KeyS',
      metaKey: false,
      location: 0,
    })
  })

  it('ignores Command and Control in the key, as Safari does', () => {
    const event = ios({
      characters: '\u0013',
      charactersIgnoringModifiers: 's',
      modifierFlags: APPLE_FLAG.COMMAND | APPLE_FLAG.CONTROL,
    })
    expect(event).toMatchObject({ key: 's', metaKey: true, ctrlKey: true })
  })

  it('keeps the Option character, which hotkeys match by code', () => {
    expect(
      ios({ characters: 'ß', modifierFlags: APPLE_FLAG.OPTION }),
    ).toMatchObject({ key: 'ß', altKey: true, code: 'KeyS' })
  })

  it('names special keys instead of using UIKit input strings', () => {
    expect(
      ios({ keyCode: 0x52, characters: 'UIKeyInputUpArrow' }),
    ).toMatchObject({ key: 'ArrowUp', code: 'ArrowUp' })
    expect(ios({ keyCode: 0x29, characters: 'UIKeyInputEscape' }).key).toBe(
      'Escape',
    )
    expect(ios({ keyCode: 0x2c, characters: ' ' }).key).toBe(' ')
  })

  it('reports modifier keys with their side', () => {
    expect(
      ios({
        keyCode: 0xe7,
        characters: '',
        charactersIgnoringModifiers: '',
        modifierFlags: APPLE_FLAG.COMMAND,
      }),
    ).toMatchObject({ key: 'Meta', code: 'MetaRight', location: 2, metaKey: true })
  })

  it('falls back to the US layout when the key types nothing', () => {
    expect(
      ios({
        keyCode: 0x1e,
        characters: '',
        charactersIgnoringModifiers: '',
        modifierFlags: APPLE_FLAG.COMMAND | APPLE_FLAG.SHIFT,
      }).key,
    ).toBe('!')
  })

  it('passes on whether a text field has focus', () => {
    expect(ios({ textInputFocused: true }).textInputFocused).toBe(true)
  })
})

describe('normalizeMacOSKey', () => {
  it('maps virtual key codes', () => {
    expect(mac({})).toMatchObject({ key: 's', code: 'KeyS' })
    expect(mac({ keyCode: 0x24, characters: '\r' })).toMatchObject({
      key: 'Enter',
      code: 'Enter',
    })
    expect(
      mac({ keyCode: 0x7b, characters: '' }),
    ).toMatchObject({ key: 'ArrowLeft' })
  })

  it('reports key repeat', () => {
    expect(mac({ repeat: true }).repeat).toBe(true)
  })

  it('turns flagsChanged into keydown and keyup per side', () => {
    const down = mac({
      type: 'flagsChanged',
      keyCode: 0x36, // right Command
      characters: '',
      charactersIgnoringModifiers: '',
      modifierFlags: APPLE_FLAG.COMMAND | 0x10,
    })
    expect(down).toMatchObject({
      type: 'keydown',
      key: 'Meta',
      code: 'MetaRight',
      metaKey: true,
    })
    // Left Command still held: the right one was released
    const up = mac({
      type: 'flagsChanged',
      keyCode: 0x36,
      characters: '',
      charactersIgnoringModifiers: '',
      modifierFlags: APPLE_FLAG.COMMAND | 0x08,
    })
    expect(up).toMatchObject({ type: 'keyup', code: 'MetaRight' })
  })

  it('reports Caps Lock by its state', () => {
    expect(
      mac({
        type: 'flagsChanged',
        keyCode: 0x39,
        characters: '',
        charactersIgnoringModifiers: '',
        modifierFlags: APPLE_FLAG.CAPS_LOCK,
      }),
    ).toMatchObject({ type: 'keydown', key: 'CapsLock', capsLock: true })
  })

  it('ignores Fn', () => {
    expect(
      mac({ type: 'flagsChanged', keyCode: 0x3f, modifierFlags: 1 << 23 }),
    ).toBeNull()
  })

  it('reports dead keys', () => {
    expect(
      mac({
        keyCode: 0x0e,
        characters: '',
        charactersIgnoringModifiers: '´',
        modifierFlags: APPLE_FLAG.OPTION,
      }).key,
    ).toBe('Dead')
  })
})

describe('normalizeAndroidKey', () => {
  it('takes the code from the scan code, which follows the physical key', () => {
    // AZERTY: the key in QWERTY's A position types q
    expect(
      android({
        keyCode: 45, // KEYCODE_Q
        scanCode: 30, // KEY_A
        unicodeChar: 'q'.codePointAt(0)!,
        altGraphUnicodeChar: 'q'.codePointAt(0)!,
      }),
    ).toMatchObject({ key: 'q', code: 'KeyA' })
  })

  it('falls back to the key code without a scan code', () => {
    expect(android({ scanCode: 0 })).toMatchObject({ key: 's', code: 'KeyS' })
  })

  it('maps meta state to modifiers', () => {
    expect(
      android({
        metaState: ANDROID_META.CTRL_ON | ANDROID_META.SHIFT_ON,
        unicodeChar: 'S'.codePointAt(0)!,
      }),
    ).toMatchObject({ key: 'S', ctrlKey: true, shiftKey: true })
    expect(android({ metaState: ANDROID_META.META_ON }).metaKey).toBe(true)
  })

  it('names special keys', () => {
    expect(
      android({ keyCode: 111, scanCode: 1, unicodeChar: 0 }),
    ).toMatchObject({ key: 'Escape', code: 'Escape' })
    expect(
      android({ keyCode: 19, scanCode: 103, unicodeChar: 0 }),
    ).toMatchObject({ key: 'ArrowUp' })
  })

  it('treats right Alt that types a character as AltGr', () => {
    expect(
      android({
        keyCode: 45,
        scanCode: 16,
        metaState: ANDROID_META.ALT_ON | ANDROID_META.ALT_RIGHT_ON,
        unicodeChar: 'q'.codePointAt(0)!,
        altGraphUnicodeChar: '@'.codePointAt(0)!,
      }),
    ).toMatchObject({ key: '@', altGraph: true, altKey: false })
  })

  it('keeps Alt as a modifier when it types nothing new', () => {
    expect(
      android({ metaState: ANDROID_META.ALT_ON | 0x10 }),
    ).toMatchObject({ key: 's', altKey: true, altGraph: false })
  })

  it('reports repeat and dead keys', () => {
    expect(android({ repeatCount: 2 }).repeat).toBe(true)
    expect(android({ type: 'keyup', repeatCount: 2 }).repeat).toBe(false)
    expect(android({ deadKey: true }).key).toBe('Dead')
  })
})

describe('normalizeWindowsKey', () => {
  const windows = (payload: Partial<Parameters<typeof normalizeWindowsKey>[1]>) =>
    normalizeWindowsKey(
      'keydown',
      {
        key: 's',
        code: 'KeyS',
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        ...payload,
      },
      false,
    )

  it('passes W3C fields through', () => {
    expect(windows({ ctrlKey: true })).toMatchObject({
      type: 'keydown',
      key: 's',
      code: 'KeyS',
      ctrlKey: true,
    })
    expect(windows({ key: 'Space', code: 'Space' }).key).toBe(' ')
  })

  it('reports AltGr characters, typed with Control+Alt', () => {
    expect(
      windows({ key: '@', code: 'KeyQ', ctrlKey: true, altKey: true }).altGraph,
    ).toBe(true)
    expect(
      windows({ key: 's', ctrlKey: true, altKey: true }).altGraph,
    ).toBe(false)
  })
})
