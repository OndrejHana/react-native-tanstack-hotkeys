import { normalizeKeyName } from "./constants.js";
import { isCodeName, normalizeKeyboardEvent } from "./_keyboard-event.js";
import { isModifierKey, normalizeHotkey, parseKeyboardEvent } from "./parse.js";

//#region src/_recorder-chord.ts
/**
* Converts a keydown to a replayable chord, preserving physical codes by default.
* Returns null for composition, modifier-only input, or unusable physical input.
* Key mode retains the produced character; neither mode guesses layout letters.
*/
function hotkeyChordFromKeydown(event, platform, recordBy = "code") {
	const normalized = normalizeKeyboardEvent(event, platform);
	if (normalized.isComposing || isModifierKey(normalizeKeyName(event.key)) || event.key === "AltGraph") return null;
	if (recordBy === "code" && (!hasUsableCode(event) || normalized.altGraph)) return null;
	const parsed = parseKeyboardEvent(event, platform);
	if (recordBy === "code") {
		const { key: _key, code: _code, ...modifiers } = parsed;
		return normalizeHotkey({
			...modifiers,
			code: event.code
		}, platform);
	}
	return parsed.key ? normalizeHotkey(parsed, platform) : null;
}
/**
* Explains why a physical chord cannot be recorded before syntax/policy checks.
* Logical mode deliberately accepts produced characters instead of requiring a code.
*/
function chordRejection(event, options) {
	if (options.recordBy === "key") return void 0;
	if (normalizeKeyboardEvent(event, options.platform).altGraph) return {
		reason: "alt-graph",
		message: "AltGraph character entry cannot be recorded as a physical shortcut. Use key mode for characters."
	};
	if (!hasUsableCode(event)) return {
		reason: "missing-code",
		message: "This event has no usable physical key code."
	};
}
/** Whether the event reports a real physical key code to record. */
function hasUsableCode(event) {
	return isCodeName(event.code) && event.code !== "Unidentified";
}

//#endregion
export { chordRejection, hotkeyChordFromKeydown };