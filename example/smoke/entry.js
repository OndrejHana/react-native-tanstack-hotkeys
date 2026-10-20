// Runs under the Hermes VM: TanStack Hotkeys with the React Native
// environment, receiving key presses from a fake iOS native module.
import {
  HotkeyRecorder,
  formatForDisplay,
  getHotkeyManager,
  getKeyStateTracker,
} from '@tanstack/hotkeys'
import { nativeModule, setFocused } from 'react-native'

const log = typeof print === 'function' ? print : console.log
let failures = 0
function check(name, ok) {
  log(`${ok ? 'ok  ' : 'FAIL'} ${name}`)
  if (!ok) failures++
}

// HID usages and Apple modifier flags, as the iOS module reports them
const HID = { KeyS: 0x16, KeyG: 0x0a, KeyK: 0x0e, MetaLeft: 0xe3, Slash: 0x38, Quote: 0x34 }
const COMMAND = 1 << 20
const SHIFT = 1 << 17
function key(type, code, characters, flags = 0, textInputFocused = false) {
  nativeModule.emit('TanStackHotkeysKey', {
    type,
    keyCode: HID[code],
    characters: flags & COMMAND ? '' : characters,
    charactersIgnoringModifiers: characters,
    modifierFlags: flags,
    textInputFocused,
  })
}
function press(code, characters, flags, textInputFocused) {
  key('keydown', code, characters, flags, textInputFocused)
  key('keyup', code, characters, flags, textInputFocused)
}

const manager = getHotkeyManager()
const calls = {}
const count = (name) => () => {
  calls[name] = (calls[name] || 0) + 1
}
manager.register('Mod+S', count('save'))
manager.register(['G', 'G'], count('sequence'))
manager.register('?', count('help'))
manager.register('é', count('accent'))

press('KeyS', 's', COMMAND)
check('Mod+S fires with Command on iOS', calls.save === 1)
check('Mod+S formats as ⌘S', formatForDisplay('Mod+S').includes('⌘'))
press('KeyG', 'g')
press('KeyG', 'g')
check('G G sequence fires', calls.sequence === 1)
press('Slash', '?', SHIFT)
check('? fires with implicit Shift', calls.help === 1)
press('Quote', 'é')
check('non-ASCII é matches (Unicode regex, normalize, localeCompare)', calls.accent === 1)

setFocused({})
press('KeyG', 'g')
press('KeyG', 'g')
check('single keys pause while a TextInput has focus', calls.sequence === 1)
press('KeyS', 's', COMMAND)
check('Mod+S still fires in a TextInput', calls.save === 2)
setFocused(null)

// The tracker listens from its creation, as useHeldKeys creates it on mount
const tracker = getKeyStateTracker()
key('keydown', 'MetaLeft', '', COMMAND)
check('held keys track Meta', tracker.getHeldKeys().join() === 'Meta')
key('keyup', 'MetaLeft', '', 0)
check('held keys release Meta', tracker.getHeldKeys().length === 0)

let recorded = null
const recorder = new HotkeyRecorder({ onRecord: (hotkey) => (recorded = hotkey) })
recorder.start()
press('KeyK', 'k', COMMAND | SHIFT)
check('recorder records Mod+Shift+[KeyK]', recorded === 'Mod+Shift+[KeyK]')
recorder.destroy()

check(
  'consume rules reach the native module',
  nativeModule.rules.some((rule) => rule.chars.includes('s') && rule.modifiers === 8),
)

if (failures > 0) throw new Error(`${failures} smoke check(s) failed`)
log('hermes smoke test passed')
