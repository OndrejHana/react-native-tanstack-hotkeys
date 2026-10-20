# Contributing

```sh
npm install
npm test            # unit and end-to-end tests (vitest, simulated native events)
npm run typecheck
npm run build       # src/ → lib/ (committed, so GitHub installs need no build step)
```

`lib/` and `vendor/` are committed on purpose: installing from a Git URL
should not need a build. Rebuild `lib/` before committing changes to `src/`.

## Bundle and Hermes check

```sh
npm run build && npm pack && mv react-native-tanstack-hotkeys-*.tgz react-native-tanstack-hotkeys.tgz
cd example && npm install && npm install --no-save ../react-native-tanstack-hotkeys.tgz && cd ..
HERMES=/path/to/hermes node scripts/verify-bundle.mjs
```

This bundles `example/` with Metro for iOS and Android as a release build
would, compiles the bundles with `hermesc`, and, given a Hermes VM, runs
`example/smoke/entry.js` with a fake iOS native module. To build the VM,
check out the Hermes tag in `node_modules/react-native/sdks/.hermesv1version`
and run `cmake -S . -B build -G Ninja && ninja -C build hermes`.

## Objective-C check

`scripts/check-objc.sh` type-checks `ios/TanStackHotkeys.m` for iOS, Mac
Catalyst, and macOS with clang, without Xcode (see the script for the
headers it needs). On a Mac, building an app in Xcode is the better check.

## Android compile check

The module compiles in any React Native app. Standalone, include `android/`
as a Gradle library project with `ext.reactNativeVersion` set and run
`:react-native-tanstack-hotkeys:compileReleaseKotlin`.

## Layout

- `patches/tanstack-hotkeys-environment.patch`: the `HotkeysEnvironment`
  change to TanStack Hotkeys, as a `git format-patch` against the release tag.
- `vendor/`: TanStack Hotkeys built with the patch (`npm run vendor`).
- `src/environment.ts`, `src/event.ts`: the React Native environment and event.
- `src/keys/`: native key codes → W3C `key`/`code`, per platform.
- `src/consume.ts`: which keys native code swallows, from live registrations.
- `src/native.ts`, `src/HotkeysRoot.ts`: wiring to the native modules and Windows.
- `ios/`, `android/`: the native modules.
- `metro.js`: the resolver alias.
