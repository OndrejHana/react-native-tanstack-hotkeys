// A stand-in for `react-native` with a fake TanStackHotkeys native module.
// Set `globalThis.__RN_OS__` before the first import to pick the platform.
import React from 'react'

type Listener = (payload: unknown) => void

const os =
  (globalThis as { __RN_OS__?: string }).__RN_OS__ ?? 'ios'

export const Platform = { OS: os, select: (spec: Record<string, unknown>) => spec[os] }

const listeners = new Map<string, Set<Listener>>()

/** What the fake native module received. */
export const nativeModule = {
  consumeRules: [] as Array<unknown>,
  setConsumeRules(rules: Array<unknown>) {
    nativeModule.consumeRules = rules
  },
  addListener() {},
  removeListeners() {},
  /** Sends an event as the native module would. */
  emit(name: string, payload?: unknown) {
    for (const listener of listeners.get(name) ?? []) listener(payload)
  },
}

export const NativeModules: Record<string, unknown> = {
  TanStackHotkeys: (globalThis as { __RN_NO_MODULE__?: boolean })
    .__RN_NO_MODULE__
    ? undefined
    : nativeModule,
}

export class NativeEventEmitter {
  addListener(name: string, listener: Listener) {
    const set = listeners.get(name) ?? new Set()
    set.add(listener)
    listeners.set(name, set)
    return { remove: () => set.delete(listener) }
  }
}

let focusedInput: object | null = null
/** Focuses a fake text field, or nothing. */
export function setFocusedInput(input: object | null) {
  focusedInput = input
}

export const TextInput = {
  State: { currentlyFocusedInput: () => focusedInput },
}

const appStateListeners = new Set<(state: string) => void>()
export const AppState = {
  addEventListener(_type: string, listener: (state: string) => void) {
    appStateListeners.add(listener)
    return { remove: () => appStateListeners.delete(listener) }
  },
  /** Moves the fake app to another state. */
  emit(state: string) {
    for (const listener of appStateListeners) listener(state)
  },
}

/** Host component that records its props, for HotkeysRoot tests. */
export const View = React.forwardRef(function View(
  props: Record<string, unknown> & { children?: React.ReactNode },
  ref: React.ForwardedRef<{ focus: () => void }>,
) {
  React.useImperativeHandle(ref, () => ({
    focus: () => {
      viewFocusCount.current++
    },
  }))
  return React.createElement('View', props, props.children)
})
export const viewFocusCount = { current: 0 }

export const StyleSheet = {
  create: <T,>(styles: T) => styles,
}
