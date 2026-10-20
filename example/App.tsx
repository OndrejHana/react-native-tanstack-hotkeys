import React, { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import {
  formatForDisplay,
  useHeldKeys,
  useHotkey,
  useHotkeyRecorder,
} from '@tanstack/react-hotkeys'
import { HotkeysRoot } from 'react-native-tanstack-hotkeys'
import type { Hotkey } from '@tanstack/react-hotkeys'

function Demo() {
  const [log, setLog] = useState<Array<string>>([])
  const [shortcut, setShortcut] = useState<Hotkey>('Mod+K')
  const [note, setNote] = useState('')
  const noteRef = useRef<React.ComponentRef<typeof TextInput>>(null)
  const add = (line: string) => setLog((lines) => [line, ...lines].slice(0, 8))

  // The same hooks as on the web
  useHotkey(shortcut, () => add(`${formatForDisplay(shortcut)}: command palette`))
  useHotkey('Mod+S', () => add('Mod+S: save'))
  useHotkey(['G', 'G'], () => add('G G: go to top'))
  useHotkey('Escape', () => noteRef.current?.blur())
  // Fires only while the note field has focus
  useHotkey(
    'Mod+Enter',
    () => {
      add(`Mod+Enter in note: ${note}`)
      setNote('')
    },
    { target: noteRef },
  )

  const held = useHeldKeys()
  const recorder = useHotkeyRecorder({ onRecord: setShortcut })

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TanStack Hotkeys on React Native</Text>
      <Text>Try {formatForDisplay(shortcut)}, Mod+S, G G, or Mod+Enter in the note.</Text>
      <TextInput
        ref={noteRef}
        value={note}
        onChangeText={setNote}
        placeholder="Note (single-key hotkeys pause while typing)"
        style={styles.input}
      />
      <Pressable
        onPress={recorder.isRecording ? recorder.cancelRecording : recorder.startRecording}
        style={styles.button}
      >
        <Text>
          {recorder.isRecording
            ? 'Press a shortcut… (Escape cancels)'
            : `Rebind palette (${formatForDisplay(shortcut)})`}
        </Text>
      </Pressable>
      <Text>Held: {held.join(' + ') || 'nothing'}</Text>
      {log.map((line, index) => (
        <Text key={index}>{line}</Text>
      ))}
    </View>
  )
}

export default function App() {
  return (
    <HotkeysRoot>
      <Demo />
    </HotkeysRoot>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 6, padding: 8 },
  button: { padding: 8, borderRadius: 6, backgroundColor: '#ddd', alignSelf: 'flex-start' },
})
