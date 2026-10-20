import { Hotkey, HotkeyChord, HotkeyChordRecorderOptions, HotkeySequence, HotkeySequenceRecorderOptions } from "@tanstack/hotkeys";
//#region src/useHotkeyRecorder.d.ts
export interface ReactHotkeyRecorder<THotkey extends Hotkey = Hotkey> {
  /** Whether recording is currently active */
  isRecording: boolean;
  /** Chords recorded so far in a multi-step recording (for live preview) */
  steps: HotkeySequence;
  /** The last committed hotkey */
  recordedHotkey: THotkey | null;
  /** Start recording a new hotkey */
  startRecording: () => void;
  /** Stop recording without calling onCancel */
  stopRecording: () => void;
  /** Cancel recording and call onCancel */
  cancelRecording: () => void;
  /** Commit the recorded steps now (multi-step recordings) */
  commitRecording: () => void;
}
/**
 * React hook for recording keyboard shortcuts.
 *
 * With the default `maxSteps: 1`, the first valid chord is recorded and
 * `onRecord` receives a chord such as `'Mod+S'`. With a larger `maxSteps`, each
 * chord adds a step; the recording commits on Enter (unless
 * `commitKeys: 'none'`), after `idleTimeoutMs`, or when it reaches `maxSteps`,
 * and `onRecord` receives a chord (one step) or a sequence.
 *
 * Escape cancels. Backspace/Delete removes the last step, or calls `onClear`
 * when nothing is recorded.
 *
 * @param options - Configuration options for the recorder
 * @returns The recorder state and controls
 *
 * @example
 * ```tsx
 * function ShortcutInput() {
 *   const [shortcut, setShortcut] = useState<Hotkey>('Mod+S')
 *   const recorder = useHotkeyRecorder({ onRecord: setShortcut })
 *
 *   return (
 *     <button onClick={recorder.startRecording}>
 *       {recorder.isRecording ? 'Press keys…' : formatForDisplay(shortcut)}
 *     </button>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * const recorder = useHotkeyRecorder({
 *   maxSteps: Infinity,
 *   onRecord: (hotkey) => setShortcut(hotkey), // 'Mod+S' or ['G', 'H']
 * })
 * ```
 */
export declare function useHotkeyRecorder(options: HotkeyChordRecorderOptions): ReactHotkeyRecorder<HotkeyChord>;
export declare function useHotkeyRecorder(options: HotkeySequenceRecorderOptions): ReactHotkeyRecorder;
//#endregion