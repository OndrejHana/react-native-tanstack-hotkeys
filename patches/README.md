# tanstack-hotkeys-environment.patch

A `git format-patch` against TanStack Hotkeys `@tanstack/hotkeys@0.17.0`
(commit 2172bfc), written so it can be proposed upstream. It adds
`packages/hotkeys/src/environment.ts`:

- `HotkeysEnvironment`: what hotkeys need from the host. Default and global
  targets (document and window), `listen()`, platform detection, whether an
  event is for or reaches a target, text-input checks, target overlap, and
  synthetic event creation.
- `domEnvironment`: the browser implementation, built from the existing
  `_event-target.ts` helpers, so browser behavior is unchanged.
- `getHotkeysEnvironment()` / `setHotkeysEnvironment()`.
- `HotkeyTargets`: an interface hosts extend through declaration merging;
  `Target` is now `HotkeyTargets[keyof HotkeyTargets]`.

Every direct use of `document`, `window`, `navigator`, `addEventListener`, and
`new KeyboardEvent` in the manager, recorder, recording guard, key state
tracker, conflicts, adapter, and platform detection now goes through the
environment. `@tanstack/react-hotkeys`' `UseHotkeyTarget` uses `Target`.

TanStack's suites pass unchanged (1024 core tests, plus 10 new ones in
`tests/environment.test.ts`, and the React adapter's tests).
