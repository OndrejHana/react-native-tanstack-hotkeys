import type { NormalizedKey } from './keys/types'

/** Fields for a `NativeKeyboardEvent`, as in the DOM's `KeyboardEventInit`. */
export interface NativeKeyboardEventInit {
  key?: string
  code?: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  repeat?: boolean
  location?: number
  isComposing?: boolean
  bubbles?: boolean
  cancelable?: boolean
  /** AltGr is held to type a character. */
  altGraph?: boolean
  capsLock?: boolean
  /** A native text field had focus when the key was pressed. */
  textInputFocused?: boolean
  /** Whether the event came from the keyboard rather than from code. Default: false. */
  isTrusted?: boolean
}

/**
 * The keyboard event hotkey callbacks receive on React Native. It has the
 * fields and methods of a DOM `KeyboardEvent` that hotkeys use, so callbacks
 * can be shared with the web.
 *
 * `preventDefault()` cannot stop the native action after the fact, because
 * events reach JavaScript asynchronously. Instead, the native modules
 * suppress keys of registered hotkeys before they reach the app; see the
 * README.
 */
export class NativeKeyboardEvent {
  static readonly NONE = 0
  static readonly CAPTURING_PHASE = 1
  static readonly AT_TARGET = 2
  static readonly BUBBLING_PHASE = 3
  static readonly DOM_KEY_LOCATION_STANDARD = 0
  static readonly DOM_KEY_LOCATION_LEFT = 1
  static readonly DOM_KEY_LOCATION_RIGHT = 2
  static readonly DOM_KEY_LOCATION_NUMPAD = 3

  readonly type: string
  readonly key: string
  readonly code: string
  readonly ctrlKey: boolean
  readonly shiftKey: boolean
  readonly altKey: boolean
  readonly metaKey: boolean
  readonly repeat: boolean
  readonly location: number
  readonly isComposing: boolean
  readonly isTrusted: boolean
  readonly bubbles: boolean
  readonly cancelable: boolean
  readonly composed = true
  readonly timeStamp: number
  /** A native text field had focus when the key was pressed. */
  readonly textInputFocused: boolean

  defaultPrevented = false
  /** The focused text field the event is for, or the keyboard root. */
  target: object | null = null
  /** The target whose listeners are running. */
  currentTarget: object | null = null
  eventPhase = NativeKeyboardEvent.NONE

  /** @internal Targets the event travels through, innermost first. */
  _path: Array<object> = []
  /** @internal */
  _propagationStopped = false
  /** @internal */
  _immediatePropagationStopped = false

  private readonly altGraph: boolean
  private readonly capsLock: boolean

  constructor(type: string, init: NativeKeyboardEventInit = {}) {
    this.type = type
    this.key = init.key ?? ''
    this.code = init.code ?? ''
    this.ctrlKey = init.ctrlKey ?? false
    this.shiftKey = init.shiftKey ?? false
    this.altKey = init.altKey ?? false
    this.metaKey = init.metaKey ?? false
    this.repeat = init.repeat ?? false
    this.location = init.location ?? 0
    this.isComposing = init.isComposing ?? false
    this.bubbles = init.bubbles ?? true
    this.cancelable = init.cancelable ?? true
    this.altGraph = init.altGraph ?? false
    this.capsLock = init.capsLock ?? false
    this.textInputFocused = init.textInputFocused ?? false
    this.isTrusted = init.isTrusted ?? false
    this.timeStamp = Date.now()
  }

  /** Creates the event for a key from a native module. */
  static fromNative(key: NormalizedKey): NativeKeyboardEvent {
    return new NativeKeyboardEvent(key.type, { ...key, isTrusted: true })
  }

  getModifierState(keyArg: string): boolean {
    switch (keyArg) {
      case 'Control':
        return this.ctrlKey
      case 'Shift':
        return this.shiftKey
      case 'Alt':
        return this.altKey
      case 'Meta':
        return this.metaKey
      case 'AltGraph':
        return this.altGraph
      case 'CapsLock':
        return this.capsLock
      default:
        return false
    }
  }

  preventDefault(): void {
    if (this.cancelable) this.defaultPrevented = true
  }

  stopPropagation(): void {
    this._propagationStopped = true
  }

  stopImmediatePropagation(): void {
    this._propagationStopped = true
    this._immediatePropagationStopped = true
  }

  composedPath(): Array<object> {
    return this._path.slice()
  }
}
