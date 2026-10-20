// What `@tanstack/hotkeys` resolves to once the Metro config is wrapped with
// `withTanStackHotkeys`: the patched core, with the React Native environment
// installed before anything can register a hotkey.
import '../install'

export * from '../tanstack'
