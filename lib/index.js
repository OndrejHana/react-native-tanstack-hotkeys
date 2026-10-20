import * as resolved from '@tanstack/hotkeys';
import { installNativeHotkeys } from './native';
import { getHotkeyManager } from './tanstack';
installNativeHotkeys();
if (resolved.getHotkeyManager !== getHotkeyManager) {
    console.error('react-native-tanstack-hotkeys: `@tanstack/hotkeys` resolves to the ' +
        'unpatched package, so hotkeys will not receive key presses. Wrap your ' +
        "Metro config with `withTanStackHotkeys` from 'react-native-tanstack-hotkeys/metro' " +
        'and restart Metro with --reset-cache.');
}
export { HotkeysRoot } from './HotkeysRoot';
export { installNativeHotkeys } from './native';
export { NativeKeyboardEvent } from './event';
export { NativeKeyboardRoot } from './environment';
export { normalizeIOSKey, normalizeMacOSKey } from './keys/apple';
export { normalizeAndroidKey } from './keys/android';
export { normalizeWindowsKey } from './keys/windows';
