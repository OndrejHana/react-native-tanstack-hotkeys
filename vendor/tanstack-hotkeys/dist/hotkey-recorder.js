import { getHotkeysEnvironment } from "./environment.js";
import { detectPlatform } from "./platform.js";
import { normalizeKeyboardEvent } from "./_keyboard-event.js";
import { isModifierKey, parseHotkey, simplifyHotkey } from "./parse.js";
import { validateHotkey } from "./validate.js";
import { beginRecording, captureRecordingEvent, endRecording } from "./_recording-guard.js";
import { findHotkeyConflicts } from "./conflicts.js";
import { chordRejection, hotkeyChordFromKeydown } from "./_recorder-chord.js";
import { Store } from "@tanstack/store";

//#region src/hotkey-recorder.ts
const initialState = {
	isRecording: false,
	steps: [],
	recordedHotkey: null
};
/**
* Framework-agnostic class for recording keyboard shortcuts.
*
* With the default `maxSteps: 1`, the first valid chord commits. With a larger
* `maxSteps`, each chord adds a step; the recording commits on Enter (unless
* `commitKeys: 'none'`), after `idleTimeoutMs`, or when it reaches `maxSteps`.
* Backspace/Delete removes the last step, and on an empty recording calls
* `onClear`. Escape cancels. A one-step result is a chord string.
*
* State Management:
* - Uses TanStack Store for reactive state management
* - State can be accessed via `recorder.store.state` when using the class directly
* - When using framework adapters, use the `useHotkeyRecorder` hook for reactive state
*
* @example
* ```ts
* const recorder = new HotkeyRecorder({
*   onRecord: (hotkey) => {
*     console.log('Recorded:', hotkey) // 'Mod+S'
*   },
* })
*
* const sequenceRecorder = new HotkeyRecorder({
*   maxSteps: Infinity,
*   onRecord: (hotkey) => {
*     console.log('Recorded:', hotkey) // 'Mod+S' or ['G', 'H']
*   },
* })
*
* recorder.start()
* // ... later
* recorder.destroy()
* ```
*/
/** Whether an event comes from a text field in the default target. */
function isTyping(event) {
	const environment = getHotkeysEnvironment();
	const target = environment.defaultTarget();
	return target !== void 0 && environment.isTypingEvent(event, target);
}
var HotkeyRecorder = class {
	store = new Store(initialState);
	#keydownHandler = null;
	#removeKeydownListener = null;
	#optionsSource;
	#optionOverrides = {};
	#platform;
	#events = [];
	#idleTimer = null;
	get #options() {
		return {
			...typeof this.#optionsSource === "function" ? this.#optionsSource() : this.#optionsSource,
			...this.#optionOverrides
		};
	}
	get #maxSteps() {
		return Math.max(1, this.#options.maxSteps ?? 1);
	}
	constructor(options) {
		this.#optionsSource = options;
		this.#platform = detectPlatform();
	}
	/**
	* Updates the recorder options, including callbacks.
	* This allows framework adapters to sync callback changes without recreating the recorder.
	*/
	setOptions(options) {
		this.#optionOverrides = {
			...this.#optionOverrides,
			...options
		};
	}
	#clearIdleTimer() {
		if (this.#idleTimer !== null) {
			clearTimeout(this.#idleTimer);
			this.#idleTimer = null;
		}
	}
	#scheduleIdleTimer() {
		this.#clearIdleTimer();
		const ms = this.#maxSteps > 1 ? this.#options.idleTimeoutMs : void 0;
		if (ms === void 0 || ms <= 0 || this.store.state.steps.length === 0) return;
		this.#idleTimer = setTimeout(() => {
			this.#idleTimer = null;
			if (this.#keydownHandler && this.store.state.steps.length >= 1) this.commit();
		}, ms);
	}
	/**
	* Start recording a new hotkey.
	*
	* Sets up a keydown event listener that captures keyboard events
	* and records chords according to `maxSteps`.
	*/
	start() {
		if (this.#keydownHandler) return;
		this.#clearIdleTimer();
		this.#events = [];
		beginRecording(this);
		this.store.setState(() => ({
			...initialState,
			isRecording: true
		}));
		const handler = (event) => {
			if (!this.#keydownHandler) return;
			if (this.#options.ignoreInputs !== false && event.key !== "Escape" && isTyping(event)) return;
			const platform = this.#options.platform ?? this.#platform;
			const normalized = normalizeKeyboardEvent(event, platform);
			if (normalized.isComposing) return;
			captureRecordingEvent(event);
			event.preventDefault();
			event.stopPropagation();
			if (event.repeat) return;
			if (event.key === "Escape") {
				this.cancel();
				return;
			}
			const unmodified = !normalized.ctrl && !normalized.shift && !normalized.alt && !normalized.meta && !normalized.altGraph;
			const multiStep = this.#maxSteps > 1;
			if ((event.key === "Backspace" || event.key === "Delete") && unmodified) {
				if (this.store.state.steps.length === 0) {
					this.stop();
					this.#options.onClear?.();
					return;
				}
				this.#events.pop();
				this.store.setState((s) => ({
					...s,
					steps: s.steps.slice(0, -1)
				}));
				if (this.store.state.steps.length === 0) this.#clearIdleTimer();
				else this.#scheduleIdleTimer();
				return;
			}
			const options = this.#options;
			if (multiStep && options.commitKeys !== "none" && event.key === "Enter" && unmodified) {
				if (this.store.state.steps.length >= 1) this.commit();
				return;
			}
			if (isModifierKey(event.key) || event.key === "AltGraph") return;
			const rejection = chordRejection(event, {
				...options,
				platform
			});
			if (rejection) {
				options.onReject?.(rejection);
				return;
			}
			const chord = hotkeyChordFromKeydown(event, platform, options.recordBy);
			if (chord === null) return;
			const validation = validateHotkey(chord);
			if (!validation.valid) {
				options.onReject?.({
					reason: "invalid",
					message: validation.errors.join("; "),
					hotkey: chord
				});
				return;
			}
			this.#events.push(event);
			this.store.setState((s) => ({
				...s,
				steps: [...s.steps, chord]
			}));
			if (this.store.state.steps.length >= this.#maxSteps) this.commit();
			else this.#scheduleIdleTimer();
		};
		this.#keydownHandler = handler;
		this.#addListener(handler);
	}
	/**
	* Commits the recorded steps after validation and conflict checks.
	* Called automatically at `maxSteps`, on Enter, or after `idleTimeoutMs`.
	* A rejected commit leaves recording active with its steps intact.
	*/
	commit() {
		const steps = this.store.state.steps;
		if (steps.length < 1) return;
		const options = this.#options;
		const platform = options.platform ?? this.#platform;
		const hotkey = simplifyHotkey(steps);
		const single = this.#maxSteps === 1;
		this.#clearIdleTimer();
		const rejectAndKeepRecording = (rejection) => {
			if (single) {
				this.#events = [];
				this.store.setState((s) => ({
					...s,
					steps: []
				}));
			}
			options.onReject?.(rejection);
		};
		const parsedSequence = parseHotkey(steps, platform);
		const context = steps.length === 1 ? {
			kind: "chord",
			event: this.#events[this.#events.length - 1],
			parsedChord: parsedSequence[0]
		} : {
			kind: "sequence",
			events: [...this.#events],
			parsedSequence
		};
		const accepted = options.validate?.(hotkey, context);
		if (accepted !== void 0 && accepted !== true) {
			rejectAndKeepRecording({
				reason: "validation",
				message: typeof accepted === "string" ? accepted : `This ${single ? "shortcut" : "sequence"} is not allowed.`,
				hotkey
			});
			return;
		}
		if (options.detectConflicts) {
			const conflicts = findHotkeyConflicts(hotkey, {
				...typeof options.detectConflicts === "object" ? options.detectConflicts : {},
				platform,
				events: this.#events
			});
			if (conflicts.length) {
				rejectAndKeepRecording({
					reason: "conflict",
					message: `This ${single ? "shortcut" : "sequence"} conflicts with a registered hotkey.`,
					hotkey,
					conflicts
				});
				return;
			}
		}
		this.#finish(hotkey);
		options.onRecord(hotkey);
	}
	/** Stops listening and stores the final state. */
	#finish(recordedHotkey) {
		endRecording(this);
		this.#events = [];
		this.#clearIdleTimer();
		if (this.#keydownHandler) {
			this.#removeListener();
			this.#keydownHandler = null;
		}
		this.store.setState(() => ({
			...initialState,
			recordedHotkey
		}));
	}
	/**
	* Stop recording (same as cancel, but doesn't call onCancel).
	*
	* Removes the event listener and resets the recording state.
	*/
	stop() {
		this.#finish(null);
	}
	/**
	* Cancel recording without saving.
	*
	* Removes the event listener, resets the recording state, and calls
	* the onCancel callback if provided.
	*/
	cancel() {
		this.#finish(null);
		this.#options.onCancel?.();
	}
	#addListener(handler) {
		const environment = getHotkeysEnvironment();
		const target = environment.defaultTarget();
		if (target === void 0) return;
		this.#removeKeydownListener = environment.listen(target, "keydown", handler, true);
	}
	#removeListener() {
		this.#removeKeydownListener?.();
		this.#removeKeydownListener = null;
	}
	/**
	* Clean up event listeners and reset state.
	*
	* Call this when you're done with the recorder to ensure
	* all event listeners are properly removed.
	*/
	destroy() {
		this.#finish(null);
	}
};

//#endregion
export { HotkeyRecorder };