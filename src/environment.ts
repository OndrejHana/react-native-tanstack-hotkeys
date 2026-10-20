import { NativeKeyboardEvent } from './event'
import type { HotkeysEnvironment, Target } from './tanstack'

/**
 * The default hotkey target on React Native, in place of the browser's
 * `document` and `window`: it receives every key press.
 */
export class NativeKeyboardRoot {
  toString(): string {
    return '[NativeKeyboardRoot]'
  }
}

/** What the environment needs to know about the app's focus. */
export interface NativeFocus {
  /**
   * The focused text field, such as the host instance of a focused
   * `TextInput`, or null. Hotkeys targeted at it, or at a view that contains
   * it, receive its key presses.
   */
  focusedTextInput: () => object | null
}

type Listener = (event: never) => void
interface Entry {
  type: string
  listener: Listener
  capture: boolean
  removed: boolean
}

/** Whether `ancestor` is `node` or contains it, for host instances with the DOM traversal API. */
function contains(ancestor: object, node: object): boolean {
  if (ancestor === node) return true
  const candidate = ancestor as { contains?: (other: unknown) => boolean }
  if (typeof candidate.contains !== 'function') return false
  try {
    return candidate.contains(node)
  } catch {
    // An unmounted host instance
    return false
  }
}

/** Reports a listener error without interrupting dispatch, as the DOM does. */
function report(error: unknown): void {
  setTimeout(() => {
    throw error
  }, 0)
}

/**
 * Routes key events from the native modules to hotkey listeners. Events go
 * through the root and any targets around the focused text field, in DOM
 * order: capture listeners outermost first, then bubble listeners innermost
 * first.
 */
export class KeyboardDispatcher {
  readonly root = new NativeKeyboardRoot()
  private readonly listeners = new Map<object, Array<Entry>>()

  constructor(private readonly focus: NativeFocus) {}

  /** Adds a listener and returns a function that removes it. */
  listen(
    target: object,
    type: string,
    listener: Listener,
    capture: boolean,
  ): () => void {
    let entries = this.listeners.get(target)
    if (!entries) {
      entries = []
      this.listeners.set(target, entries)
    }
    const entry: Entry = { type, listener, capture, removed: false }
    entries.push(entry)
    return () => {
      if (entry.removed) return
      entry.removed = true
      const list = this.listeners.get(target)
      if (!list) return
      list.splice(list.indexOf(entry), 1)
      if (list.length === 0) this.listeners.delete(target)
    }
  }

  /** Whether any listener for `type` is attached. */
  hasListeners(type: string): boolean {
    for (const entries of this.listeners.values()) {
      if (entries.some((entry) => entry.type === type)) return true
    }
    return false
  }

  /** Dispatches a key event through the root and the targets around the focused text field. */
  dispatch(event: NativeKeyboardEvent): void {
    const focused = this.focus.focusedTextInput()
    const around: Array<object> = []
    if (focused) {
      for (const target of this.listeners.keys()) {
        if (target !== this.root && contains(target, focused)) {
          around.push(target)
        }
      }
      // Innermost first
      around.sort((a, b) => (contains(a, b) ? 1 : contains(b, a) ? -1 : 0))
    }
    const path =
      focused && around[0] !== focused
        ? [focused, ...around, this.root]
        : [...around, this.root]

    event.target = focused ?? this.root
    event._path = path
    for (let index = path.length - 1; index >= 0; index--) {
      if (!this.invoke(event, path[index]!, true)) break
    }
    if (!event._propagationStopped) {
      for (const target of path) {
        if (!event.bubbles && target !== event.target) break
        if (!this.invoke(event, target, false)) break
      }
    }
    event.currentTarget = null
    event.eventPhase = NativeKeyboardEvent.NONE
  }

  /** Tells root listeners that the app lost focus, so held keys are released. */
  blur(): void {
    const event = { type: 'blur', target: this.root, currentTarget: this.root }
    for (const entry of this.listeners.get(this.root)?.slice() ?? []) {
      if (entry.type !== 'blur' || entry.removed) continue
      try {
        ;(entry.listener as (event: unknown) => void)(event)
      } catch (error) {
        report(error)
      }
    }
  }

  /** Runs one target's listeners for a phase. Returns false once propagation stops. */
  private invoke(
    event: NativeKeyboardEvent,
    target: object,
    capture: boolean,
  ): boolean {
    const entries = this.listeners.get(target)
    if (entries) {
      event.currentTarget = target
      event.eventPhase =
        target === event.target
          ? NativeKeyboardEvent.AT_TARGET
          : capture
            ? NativeKeyboardEvent.CAPTURING_PHASE
            : NativeKeyboardEvent.BUBBLING_PHASE
      // Listeners added during dispatch wait for the next event
      for (const entry of entries.slice()) {
        if (
          entry.removed ||
          entry.type !== event.type ||
          entry.capture !== capture
        ) {
          continue
        }
        try {
          ;(entry.listener as (event: NativeKeyboardEvent) => void)(event)
        } catch (error) {
          report(error)
        }
        if (event._immediatePropagationStopped) return false
      }
    }
    return !event._propagationStopped
  }
}

/** Whether a text field had focus for this event, by the native report or the focused `TextInput`. */
function isTextEntry(event: KeyboardEvent, root: NativeKeyboardRoot): boolean {
  const native = event as unknown as NativeKeyboardEvent
  return (
    native.textInputFocused ||
    (native.target !== null && native.target !== root)
  )
}

/**
 * Creates the `HotkeysEnvironment` for React Native. Element targets are
 * host instances, such as a `TextInput` ref: their hotkeys fire while that
 * text field, or one inside them, has focus.
 */
export function createNativeEnvironment(
  dispatcher: KeyboardDispatcher,
  platform: 'mac' | 'windows' | 'linux',
): HotkeysEnvironment {
  const root = dispatcher.root as unknown as Target
  const shouldIgnore = (
    event: KeyboardEvent,
    registrationTarget: Target,
  ): boolean => {
    if (!isTextEntry(event, dispatcher.root)) return false
    if (registrationTarget === root) return true
    const focused = (event as unknown as NativeKeyboardEvent).target
    // A hotkey targeted at the text field itself receives its keys
    if (!focused || focused === dispatcher.root) return false
    if (focused === registrationTarget) return false
    return contains(registrationTarget, focused)
  }

  return {
    defaultTarget: () => root,
    globalTarget: () => root,
    listen: (target, type, listener, capture) =>
      dispatcher.listen(target, type, listener as Listener, capture),
    detectPlatform: () => platform,
    isEventForTarget: (event, target) => event.currentTarget === target,
    eventReachesTarget: (event, target) =>
      target === root ||
      (event as unknown as NativeKeyboardEvent)._path.includes(target),
    shouldIgnoreInputEvent: (event, _listenerTarget, registrationTarget) =>
      shouldIgnore(event, registrationTarget),
    isTypingEvent: (event, target) => shouldIgnore(event, target),
    targetsOverlap: (a, b) =>
      a === root || b === root || contains(a, b) || contains(b, a),
    createKeyboardEvent: (type, init) =>
      new NativeKeyboardEvent(type, init) as unknown as KeyboardEvent,
  }
}
