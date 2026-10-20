import { NAMED_KEYS, US_LAYOUT } from './keys/codes'
import { HID_USAGES_BY_CODE, MAC_KEY_CODES_BY_CODE } from './keys/apple'
import {
  ANDROID_KEY_CODES_BY_CODE,
  EVDEV_SCAN_CODES_BY_CODE,
} from './keys/android'
import { MODIFIER } from './keys/types'
import type {
  HotkeyManager,
  HotkeyRegistration,
  ParsedHotkeyChord,
} from './tanstack'

/**
 * A key the native modules swallow before the app's native views see it,
 * because a registered hotkey with `preventDefault` handles it. Events reach
 * JavaScript asynchronously, so this decision is made natively from rules
 * that JavaScript keeps up to date. A swallowed keydown's keyup is swallowed
 * too.
 */
export interface ConsumeRule {
  /** W3C codes of the physical keys. */
  codes: ReadonlyArray<string>
  /** Lowercase characters the key types. */
  chars: ReadonlyArray<string>
  /** `MODIFIER` bits that must be held, and no others. */
  modifiers: number
  /** Shift may also be held, as when it types the glyph (`?` is Shift+/). */
  shiftOptional: boolean
  /** Let the key through while a text field has focus. */
  skipInText: boolean
}

/** A `ConsumeRule` in a native module's own key codes. */
export interface NativeConsumeRule {
  /** iOS: HID usages. macOS: virtual key codes. Android: `KEYCODE_*`. */
  keyCodes: Array<number>
  /** Android: evdev scan codes, which take precedence when the event has one. */
  scanCodes: Array<number>
  chars: Array<string>
  modifiers: number
  shiftOptional: boolean
  skipInText: boolean
}

/** react-native-windows `keyDownEvents` entry. */
export interface WindowsHandledKey {
  code: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
  /** 1: capturing, so the focused view does not receive the key. */
  handledEventPhase: 1
}

const CODES_BY_NAMED_KEY = new Map<string, Array<string>>()
for (const [code, key] of Object.entries(NAMED_KEYS)) {
  const name = key === ' ' ? 'Space' : key
  CODES_BY_NAMED_KEY.set(name, [...(CODES_BY_NAMED_KEY.get(name) ?? []), code])
}

/** Resolves `ignoreInputs: 'auto'` the way HotkeyManager does. */
function ignoresInputs(
  option: boolean | 'auto' | undefined,
  first: ParsedHotkeyChord,
): boolean {
  if (option !== undefined && option !== 'auto') return option
  if (first.ctrl || first.meta) return false
  return first.key !== 'Escape' && first.code !== 'Escape'
}

function ruleFor(chord: ParsedHotkeyChord, skipInText: boolean): ConsumeRule {
  const modifiers =
    (chord.ctrl ? MODIFIER.CONTROL : 0) |
    (chord.alt ? MODIFIER.ALT : 0) |
    (chord.shift ? MODIFIER.SHIFT : 0) |
    (chord.meta ? MODIFIER.META : 0)
  const base = { modifiers, skipInText }
  if (chord.code !== undefined) {
    return { ...base, codes: [chord.code], chars: [], shiftOptional: false }
  }
  const named = CODES_BY_NAMED_KEY.get(chord.key)
  if (named) {
    return {
      ...base,
      codes: named,
      chars: chord.key === 'Space' ? [' '] : [],
      shiftOptional: false,
    }
  }
  return {
    ...base,
    codes: [],
    chars: [chord.key.toLowerCase()],
    // A punctuation key may need Shift to type its glyph
    shiftOptional: !chord.shift && !/^\p{Letter}$/u.test(chord.key),
  }
}

/**
 * Rules for the live keydown hotkeys on `root` that prevent default:
 * enabled, in an active scope, and not targeted at a single text field.
 */
export function computeConsumeRules(
  manager: HotkeyManager,
  root: object,
): Array<ConsumeRule> {
  const rules = new Map<string, ConsumeRule>()
  for (const registration of manager.registrations.state.values()) {
    const { options } = registration as HotkeyRegistration
    if (
      (registration.target as unknown) !== root ||
      options.enabled === false ||
      options.preventDefault === false ||
      // As on the web, preventing a keyup's default does not stop the key
      options.eventType === 'keyup' ||
      !manager.isScopeActive(options.scope)
    ) {
      continue
    }
    const chords =
      registration.kind === 'chord'
        ? [registration.parsedChord]
        : registration.parsedSequence
    const skipInText = ignoresInputs(options.ignoreInputs, chords[0]!)
    for (const chord of chords) {
      const rule = ruleFor(chord, skipInText)
      rules.set(JSON.stringify(rule), rule)
    }
  }
  return [...rules.values()]
}

function lookup(
  table: ReadonlyMap<string, ReadonlyArray<number>>,
  codes: ReadonlyArray<string>,
): Array<number> {
  return codes.flatMap((code) => table.get(code) ?? [])
}

/** Translates rules into a native module's key codes. */
export function toNativeConsumeRules(
  rules: ReadonlyArray<ConsumeRule>,
  os: 'ios' | 'macos' | 'android',
): Array<NativeConsumeRule> {
  return rules.map((rule) => ({
    keyCodes: lookup(
      os === 'ios'
        ? HID_USAGES_BY_CODE
        : os === 'macos'
          ? MAC_KEY_CODES_BY_CODE
          : ANDROID_KEY_CODES_BY_CODE,
      rule.codes,
    ),
    scanCodes: os === 'android' ? lookup(EVDEV_SCAN_CODES_BY_CODE, rule.codes) : [],
    chars: [...rule.chars],
    modifiers: rule.modifiers,
    shiftOptional: rule.shiftOptional,
    skipInText: rule.skipInText,
  }))
}

/**
 * Translates keydown rules into react-native-windows `keyDownEvents`, which
 * match codes only: characters map to their US layout keys. Rules that let
 * keys through to text fields are left out, since the root cannot tell.
 */
export function toWindowsHandledKeys(
  rules: ReadonlyArray<ConsumeRule>,
): Array<WindowsHandledKey> {
  const handled = new Map<string, WindowsHandledKey>()
  const add = (code: string, modifiers: number) => {
    const key: WindowsHandledKey = {
      code,
      ctrlKey: (modifiers & MODIFIER.CONTROL) !== 0,
      altKey: (modifiers & MODIFIER.ALT) !== 0,
      shiftKey: (modifiers & MODIFIER.SHIFT) !== 0,
      metaKey: (modifiers & MODIFIER.META) !== 0,
      handledEventPhase: 1,
    }
    handled.set(JSON.stringify(key), key)
  }
  for (const rule of rules) {
    if (rule.skipInText) continue
    for (const code of rule.codes) {
      add(code, rule.modifiers)
      if (rule.shiftOptional) add(code, rule.modifiers | MODIFIER.SHIFT)
    }
    for (const char of rule.chars) {
      for (const [code, [plain, shifted]] of Object.entries(US_LAYOUT)) {
        if (plain.toLowerCase() === char) {
          add(code, rule.modifiers)
          if (rule.shiftOptional) add(code, rule.modifiers | MODIFIER.SHIFT)
        }
        if (shifted.toLowerCase() === char && shifted !== plain) {
          if (rule.shiftOptional || (rule.modifiers & MODIFIER.SHIFT) !== 0) {
            add(code, rule.modifiers | MODIFIER.SHIFT)
          }
        }
      }
    }
  }
  return [...handled.values()]
}

/**
 * Calls `onChange` with the rules now and whenever registrations or scopes
 * change them. Returns a function that stops watching.
 */
export function watchConsumeRules(
  manager: HotkeyManager,
  root: object,
  onChange: (rules: Array<ConsumeRule>) => void,
): () => void {
  let last = ''
  const update = () => {
    const rules = computeConsumeRules(manager, root)
    const serialized = JSON.stringify(rules)
    if (serialized === last) return
    last = serialized
    onChange(rules)
  }
  update()
  const registrations = manager.registrations.subscribe(update)
  const scopes = manager.scopes.subscribe(update)
  return () => {
    registrations.unsubscribe()
    scopes.unsubscribe()
  }
}
