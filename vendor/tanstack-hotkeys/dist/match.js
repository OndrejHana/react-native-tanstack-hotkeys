import { normalizeKeyName } from "./constants.js";
import { detectPlatform } from "./platform.js";
import { normalizeKeyboardEvent } from "./_keyboard-event.js";
import { isHotkeySequence, isModifierKey, parseHotkey } from "./parse.js";
import { formatHotkey } from "./format.js";
import { matchKeyboardEvent, parsedChordsEqual } from "./_match.js";

//#region src/match.ts
/**
* Checks if a KeyboardEvent matches a hotkey.
*
* Physical bindings such as `Mod+[KeyS]` match `event.code` exactly.
* Logical bindings use `event.key`, with a fallback to `code`
* for letter keys, digit keys (0-9), and punctuation keys when `key` produces special
* characters (e.g., macOS Option+letter, Shift+number, or Option+punctuation).
* Letter keys are matched case-insensitively.
*
* Also handles "dead key" events where `event.key` is `'Dead'` instead of the expected
* character. This commonly occurs on macOS with Option+letter combinations (e.g., Option+E,
* Option+I, Option+U, Option+N) and on Windows/Linux with international keyboard layouts.
* In these cases, `event.code` is used to determine the physical key.
*
* @param event - The KeyboardEvent to check
* @param chord - The chord string or parsed chord to match against
* @param platform - The target platform for resolving 'Mod' (defaults to auto-detection)
* @returns True if the event matches the chord
*
* @example
* ```ts
* document.addEventListener('keydown', (event) => {
*   if (matchesKeyboardEvent(event, 'Mod+S')) {
*     event.preventDefault()
*     handleSave()
*   }
* })
* ```
*/
function matchesKeyboardEvent(event, chord, platform = detectPlatform()) {
	return matchKeyboardEvent(event, chord, platform).matched;
}
/**
* Creates a keyboard event handler that calls the callback when the chord
* matches. For sequences, use `createSequenceMatcher`.
*
* @param chord - The chord string or parsed chord to match
* @param callback - The function to call when the hotkey matches
* @param options - Options for matching and handling
* @returns A function that can be used as an event handler
*
* @example
* ```ts
* const handler = createHotkeyChordHandler('Mod+S', (event, { hotkey, parsedChord }) => {
*   console.log(`${hotkey} was pressed`)
*   handleSave()
* })
*
* document.addEventListener('keydown', handler)
* ```
*/
function createHotkeyChordHandler(chord, callback, options = {}) {
	const { preventDefault = true, stopPropagation = true, platform } = options;
	const resolvedPlatform = platform ?? detectPlatform();
	const hotkeyString = typeof chord === "string" ? chord : formatHotkey(chord);
	const parsed = typeof chord === "string" ? parseHotkey(chord, resolvedPlatform) : chord;
	const context = {
		kind: "chord",
		hotkey: hotkeyString,
		parsedChord: parsed
	};
	return (event) => {
		if (matchesKeyboardEvent(event, parsed, resolvedPlatform)) {
			if (preventDefault) event.preventDefault();
			if (stopPropagation) event.stopPropagation();
			callback(event, context);
		}
	};
}
/**
* Creates a handler that matches several chords.
*
* @param handlers - A map of chord strings to their handlers
* @param options - Options for matching and handling
* @returns A function that can be used as an event handler
*
* @example
* ```ts
* const handler = createMultiHotkeyChordHandler({
*   'Mod+S': (event, { hotkey }) => handleSave(),
*   'Mod+Z': (event, { hotkey }) => handleUndo(),
*   'Mod+Shift+Z': (event, { hotkey }) => handleRedo(),
* })
*
* document.addEventListener('keydown', handler)
* ```
*/
function createMultiHotkeyChordHandler(handlers, options = {}) {
	const { preventDefault = true, stopPropagation = true, platform } = options;
	const resolvedPlatform = platform ?? detectPlatform();
	const parsedHandlers = Object.entries(handlers).filter((entry) => Boolean(entry[1])).map(([hotkey, handler]) => {
		const parsed = parseHotkey(hotkey, resolvedPlatform);
		return {
			parsed,
			handler,
			context: {
				kind: "chord",
				hotkey,
				parsedChord: parsed
			}
		};
	});
	return (event) => {
		for (const { parsed, handler, context } of parsedHandlers) if (matchesKeyboardEvent(event, parsed, resolvedPlatform)) {
			if (preventDefault) event.preventDefault();
			if (stopPropagation) event.stopPropagation();
			handler(event, context);
			return;
		}
	};
}
/**
* Compares normalized hotkey identity, including all four modifiers.
* Sequences are equal when every step is equal; a one-step sequence equals its chord.
* Aliases resolve on the supplied platform. A physical code and a logical key
* remain distinct even when one keyboard event could match both.
*/
function areHotkeysEqual(left, right, platform = detectPlatform()) {
	const a = isHotkeySequence(left) ? left : [left];
	const b = isHotkeySequence(right) ? right : [right];
	return a.length === b.length && a.every((step, index) => parsedChordsEqual(parseHotkey(step, platform), parseHotkey(b[index], platform)));
}
/** Default timeout between sequence steps (in milliseconds). */
const DEFAULT_SEQUENCE_TIMEOUT = 1e3;
/**
* Creates a simple sequence matcher for one-off use.
*
* This is a low-level helper that does not support ignoreInputs, target,
* or other HotkeyOptions. Callers must handle input filtering themselves
* if attaching to document.
*
* @param sequence - The sequence of hotkeys to match
* @param options - Options including timeout
* @returns An object with match() and reset() methods
*
* @example
* ```ts
* const matcher = createSequenceMatcher(['G', 'G'], { timeout: 500 })
*
* document.addEventListener('keydown', (event) => {
*   if (matcher.match(event)) {
*     console.log('Sequence matched!')
*   }
* })
* ```
*/
function createSequenceMatcher(sequence, options = {}) {
	const platform = options.platform ?? detectPlatform();
	const timeout = options.timeout ?? 1e3;
	const parsedSequence = parseHotkey(sequence, platform);
	let currentIndex = 0;
	let lastKeyTime = 0;
	return {
		match(event) {
			if (event.type === "keydown" && event.repeat || normalizeKeyboardEvent(event, platform).isComposing || isModifierKey(normalizeKeyName(event.key))) return false;
			const now = Date.now();
			if (currentIndex > 0 && now - lastKeyTime > timeout) currentIndex = 0;
			const expected = parsedSequence[currentIndex];
			if (!expected) return false;
			if (matchesKeyboardEvent(event, expected, platform)) {
				lastKeyTime = now;
				currentIndex++;
				if (currentIndex >= parsedSequence.length) {
					currentIndex = 0;
					return true;
				}
			} else if (currentIndex > 0) {
				if (matchesKeyboardEvent(event, parsedSequence[0], platform)) {
					currentIndex = 1;
					lastKeyTime = now;
				} else currentIndex = 0;
			}
			return false;
		},
		reset() {
			currentIndex = 0;
			lastKeyTime = 0;
		},
		getProgress() {
			return currentIndex;
		}
	};
}

//#endregion
export { DEFAULT_SEQUENCE_TIMEOUT, areHotkeysEqual, createHotkeyChordHandler, createMultiHotkeyChordHandler, createSequenceMatcher, matchesKeyboardEvent };