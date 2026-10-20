// A stand-in for react-native in the Hermes smoke test: a fake iOS app with
// the TanStackHotkeys native module.
const listeners = {}
export const Platform = { OS: 'ios' }
export const nativeModule = {
  rules: [],
  setConsumeRules(rules) {
    nativeModule.rules = rules
  },
  addListener() {},
  removeListeners() {},
  emit(name, payload) {
    for (const listener of listeners[name] || []) listener(payload)
  },
}
export const NativeModules = { TanStackHotkeys: nativeModule }
export class NativeEventEmitter {
  addListener(name, listener) {
    ;(listeners[name] = listeners[name] || []).push(listener)
    return { remove() {} }
  }
}
let focused = null
export const setFocused = (input) => {
  focused = input
}
export const TextInput = { State: { currentlyFocusedInput: () => focused } }
export const AppState = { addEventListener: () => ({ remove() {} }) }
export const View = 'View'
export const StyleSheet = { create: (styles) => styles }
