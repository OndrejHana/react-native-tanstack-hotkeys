// The vendored, patched TanStack Hotkeys. Code in this package imports it
// directly: `@tanstack/hotkeys` is aliased to ./core/hotkeys, which imports
// this package's setup, and importing it here would be circular.
export * from '../vendor/tanstack-hotkeys/dist/index.js';
