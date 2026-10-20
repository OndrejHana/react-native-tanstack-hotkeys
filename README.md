# react-native-tanstack-hotkeys

[TanStack Hotkeys](https://tanstack.com/hotkeys) for React Native: hardware
keyboard shortcuts on **iPadOS, Android tablets, macOS, and Windows** with the
same `@tanstack/react-hotkeys` API you use on the web.

```tsx
import { useHotkey } from '@tanstack/react-hotkeys'

function Editor() {
  useHotkey('Mod+S', () => save()) // ⌘S on iPad and Mac, Ctrl+S on Android and Windows
  useHotkey(['G', 'G'], () => scrollToTop())
  // ...
}
```

Everything in `@tanstack/react-hotkeys` works: `useHotkey`, `useHotkeys`,
sequences, scopes and `HotkeysProvider`, `useHotkeyRecorder`, `useHeldKeys`,
`useKeyHold`, app hotkeys, `formatForDisplay`, and so on.

## How it works

TanStack Hotkeys talks to the browser in a handful of places: attaching
`keydown`/`keyup` listeners, asking whether a text field has focus, tracking
held keys, detecting the platform, and creating synthetic events. This
package:

1. **Patches TanStack Hotkeys** to route those places through a
   `HotkeysEnvironment` (dependency injection), with the DOM as the default
   ([`patches/tanstack-hotkeys-environment.patch`](patches/tanstack-hotkeys-environment.patch)).
   The patched core passes all of TanStack's own tests. A build of it lives in
   [`vendor/`](vendor), and a Metro resolver alias makes `@tanstack/hotkeys`
   (also inside `@tanstack/react-hotkeys`) resolve to it, so your
   `node_modules` stay untouched.
2. **Provides a React Native environment**: key events become
   DOM-compatible `NativeKeyboardEvent`s, dispatched through capture and bubble
   phases to the app root and to hotkeys targeted at a `TextInput` (or a view
   around one).
3. **Reads the hardware keyboard natively**, app-wide, without changes to your
   `AppDelegate` or `MainActivity`:

| Platform | Key source | Physical `code` from |
| --- | --- | --- |
| iOS, iPadOS, Mac Catalyst, visionOS | `UIApplication.sendEvent` presses (`UIKey`) | USB HID usage |
| macOS ([react-native-macos](https://github.com/microsoft/react-native-macos)) | Local `NSEvent` monitor | Virtual key code |
| Android | The activity window's `Window.Callback` | Linux scan code, else key code |
| Windows ([react-native-windows](https://github.com/microsoft/react-native-windows)) | `<HotkeysRoot>` view key events (no native code) | W3C code from React Native Windows |
| Web (react-native-web, Expo web) | TanStack Hotkeys' own DOM environment | the browser |

Because JavaScript receives key events asynchronously, `preventDefault()`
cannot stop a key after the fact. Instead, the package keeps the native
modules updated with the keys of registered hotkeys that prevent default
(the default), so native code swallows them before text fields, Android's
"Escape means Back", or the macOS "no handler" beep see them. Disabled
hotkeys, hotkeys in inactive scopes, and `preventDefault: false` hotkeys let
keys through, and `ignoreInputs` is respected (`K` still types in a text field;
`Mod+S` is handled there).

## Install

Requirements: React Native 0.74 or newer, `@tanstack/react-hotkeys` 0.16.x.
Expo works with a development build (`npx expo prebuild` / `expo run:*`), not
Expo Go.

```sh
npm install @tanstack/react-hotkeys@0.16 github:OndrejHana/react-native-tanstack-hotkeys
cd ios && pod install          # iOS / iPadOS
cd macos && pod install        # react-native-macos
```

Rebuild the native app afterwards. Android and Windows need nothing beyond the
rebuild. npm also installs `react-dom`, a peer dependency of
`@tanstack/react-hotkeys` that is never imported at runtime.

### 1. Metro

```js
// metro.config.js
const { getDefaultConfig } = require('@react-native/metro-config') // or expo/metro-config
const { withTanStackHotkeys } = require('react-native-tanstack-hotkeys/metro')

module.exports = withTanStackHotkeys(getDefaultConfig(__dirname))
```

Restart Metro with `--reset-cache` after adding it. If `@tanstack/hotkeys`
still resolves to the unpatched package, the app logs an error saying so.

### 2. Wrap the app

```tsx
import { HotkeysRoot } from 'react-native-tanstack-hotkeys'

export default function App() {
  return <HotkeysRoot>{/* your app */}</HotkeysRoot>
}
```

On Windows, React Native delivers keys only to the focused view and its
ancestors, so `<HotkeysRoot>` is a focusable view that listens for the whole
app. Elsewhere it renders its children as they are, but importing it is what
starts the native listeners, so use it on every platform.

### 3. TypeScript (recommended)

The published `@tanstack/react-hotkeys` types only accept DOM elements as
hotkey targets. Point TypeScript at the patched types:

```json
{
  "extends": [
    "@react-native/typescript-config",
    "react-native-tanstack-hotkeys/tsconfig.react-native.json"
  ]
}
```

If your `tsconfig.json` defines its own `compilerOptions.paths`, copy the three
entries from
[`tsconfig.react-native.json`](tsconfig.react-native.json) into it instead
(prefixed with `./node_modules/react-native-tanstack-hotkeys/`), since `paths`
are replaced, not merged.

## Usage

Use [TanStack Hotkeys' docs](https://tanstack.com/hotkeys/latest/docs) as
they are. What differs on React Native:

- **`Mod`** is ⌘ on iOS, iPadOS, and macOS, and Ctrl on Android and Windows.
  `formatForDisplay` follows suit.
- **Targets.** By default hotkeys listen app-wide. Pass a `TextInput` ref as
  `target` to fire only while that field has focus:

  ```tsx
  const input = useRef<React.ComponentRef<typeof TextInput>>(null)
  useHotkey('Mod+Enter', send, { target: input })
  return <TextInput ref={input} />
  ```

  Where host instances implement the DOM `contains()` method (the New
  Architecture in recent React Native versions; 0.88 does), a ref to a view
  targets every text field inside it. Otherwise only the text field's own ref
  works as a target.
- **`ignoreInputs`** works as on the web: while a text field has focus,
  single keys and Shift/Alt combinations are left to the field, while
  Ctrl/⌘ shortcuts and Escape still fire.
- **Callbacks receive a `NativeKeyboardEvent`**, with the `KeyboardEvent`
  fields hotkeys use: `key`, `code`, `ctrlKey`, `shiftKey`, `altKey`,
  `metaKey`, `repeat`, `location`, `getModifierState()`, `preventDefault()`,
  `stopPropagation()`, plus `textInputFocused`.
- **Recording** (`useHotkeyRecorder`) records physical keys by default, as on
  the web, e.g. `Mod+Shift+[KeyK]`, which match the same key on any layout.

```ts
import { installNativeHotkeys } from 'react-native-tanstack-hotkeys'

installNativeHotkeys().source // 'native-module' | 'hotkeys-root' | 'dom' | 'unavailable'
```

## Platform notes and limitations

- **Android `<Modal>`**: React Native's `Modal` opens a separate Android
  window that the module does not hook, so hotkeys don't fire while one is
  open. Prefer in-tree modals (for example a positioned `View`, or a
  navigation library's modal screens).
- **iOS key repeat**: UIKit reports a held key once, so `repeat` is always
  false and hotkeys fire once per press.
- **Windows** delivers keys only while a view inside `<HotkeysRoot>` has
  focus. The root focuses itself on mount; if something outside React Native
  takes focus, keys arrive again once focus returns. On Windows, native
  suppression covers hotkeys that also fire in text fields (`Mod+S`,
  `Escape`), and suppresses by physical key, using the US layout for
  characters.
- **Native suppression is a best-effort mirror** of TanStack's matching (by
  key code, typed character, and modifiers). A key can occasionally be
  swallowed natively when its callback does not run, or the reverse. Only
  keydown hotkeys suppress keys; as on the web, `preventDefault` on a keyup
  hotkey doesn't stop the key.
- **Input methods**: while an input method composes text (CJK input, dead
  keys), keys belong to it: nothing is swallowed, and events report
  `isComposing`, which TanStack Hotkeys skips. On Android, input methods
  consume composing keys before the app sees them at all.
- **macOS**: only keys for the main window are handled, so alerts, open and
  save panels, and sheets keep their own Enter and Escape.
- **iOS/iPadOS** also sees keys from hardware keyboards only; the on-screen
  keyboard types into text fields as usual.

## Verification status

What has been verified, and what hasn't:

- The `HotkeysEnvironment` patch passes TanStack Hotkeys' full test suite
  (1034 core tests, including 10 new ones) and the `@tanstack/react-hotkeys`
  tests.
- This package's tests (`npm test`) run the unmodified npm
  `@tanstack/react-hotkeys` hooks against simulated native events for iOS,
  Android, macOS, and Windows.
- The example app bundles with Metro for iOS and Android and compiles to
  Hermes bytecode, and a smoke test runs the bundled package in the Hermes VM
  (`scripts/verify-bundle.mjs`).
- The Android module compiles against `react-android` 0.88.0, with no
  warnings.
- The Objective-C module type-checks with clang (`-Wall -Wextra -Werror`)
  against the iOS 16.5 SDK and React Native 0.88 headers, for Mac Catalyst,
  and against the macOS 11.3 SDK and react-native-macos 0.83 headers
  (`scripts/check-objc.sh`). It has not been built in Xcode.
- **Not yet run on devices or simulators.** No platform has been tested on
  hardware; the Windows path has only been tested in JavaScript. Please open
  issues with what you find.

## Updating TanStack Hotkeys

The vendored core matches `@tanstack/react-hotkeys` 0.16.x (core 0.17.0).
`withTanStackHotkeys` warns when the installed version expects another core.
To move to a new release:

```sh
npm run vendor 0.18.0   # clones the release, applies the patch, runs TanStack's tests, builds
```

then update `tanstackHotkeys.version` and the `@tanstack/react-hotkeys` peer
range in `package.json`. If the patch no longer applies, rebase it in a
TanStack Hotkeys checkout and regenerate it with `git format-patch`. The
patch is written to be upstreamed; once TanStack ships it, the vendored core
and the Metro alias can go away.

## License

MIT. The vendored TanStack Hotkeys is MIT-licensed by Tanner Linsley
([`vendor/tanstack-hotkeys/LICENSE`](vendor/tanstack-hotkeys/LICENSE)).
