import { detectPlatform } from "./platform.js";
import { altGraphTypedCharacter, codeToLogicalKey, isAsciiLetter, isLatinLetter, isPrintableKey, keysEqual, normalizeKeyboardEvent } from "./_keyboard-event.js";
import { parseHotkey } from "./parse.js";

//#region src/_match.ts
/** Matches an event and reports the winning candidate and release identity. */
function matchKeyboardEvent(event, hotkey, platform = detectPlatform()) {
	const parsed = typeof hotkey === "string" ? parseHotkey(hotkey, platform) : hotkey;
	const normalized = normalizeKeyboardEvent(event, platform);
	const noMatch = {
		matched: false,
		score: 0
	};
	if (normalized.isComposing && (parsed.code !== void 0 || isPrintableKey(parsed.key))) return noMatch;
	if (normalized.altGraph && (parsed.ctrl || parsed.alt)) return noMatch;
	if (normalized.altGraph && !altGraphTypedCharacter(normalized)) return noMatch;
	if (parsed.code !== void 0) {
		if (normalized.altGraph) return noMatch;
		if (!modifiersMatch(normalized, parsed, false)) return noMatch;
		return normalized.code === parsed.code ? matched("code", 3) : noMatch;
	}
	const direct = keysEqual(normalized.key, parsed.key);
	const implicitShift = direct && isPrintableKey(normalized.key) && !/^\p{Letter}$/u.test(normalized.key) && !parsed.shift;
	if (direct && modifiersMatch(normalized, parsed, implicitShift)) return matched("key", implicitShift ? 2 : 3);
	if (isAsciiLetter(normalized.key) || isLatinLetter(normalized.key) && normalized.code.startsWith("Key") && !normalized.alt) return noMatch;
	if (normalized.altGraph) return noMatch;
	if (!modifiersMatch(normalized, parsed, false)) return noMatch;
	const fallbackKey = codeToLogicalKey(normalized.code);
	return fallbackKey !== void 0 && keysEqual(fallbackKey, parsed.key) ? matched("fallback", 1) : noMatch;
	function matched(source, score) {
		return {
			matched: true,
			score,
			source,
			identity: {
				key: normalized.key,
				code: normalized.code
			}
		};
	}
}
/** Compares modifiers, excluding synthetic AltGr flags and optionally allowing Shift used to type a glyph. */
function modifiersMatch(event, parsed, allowImplicitShift) {
	const ctrl = event.altGraph ? false : event.ctrl;
	const alt = event.altGraph ? false : event.alt;
	if (ctrl !== parsed.ctrl || alt !== parsed.alt || event.meta !== parsed.meta) return false;
	return event.shift === parsed.shift || allowImplicitShift && event.shift;
}
/**
* Whether two parsed chords have the same identity: equal modifiers, and the
* same physical code or (case-insensitively) the same logical key. A code and
* a key never match, even when one keyboard event could produce both.
*/
function parsedChordsEqual(a, b) {
	return a.ctrl === b.ctrl && a.alt === b.alt && a.shift === b.shift && a.meta === b.meta && (a.code !== void 0 || b.code !== void 0 ? a.code === b.code : keysEqual(a.key, b.key));
}

//#endregion
export { matchKeyboardEvent, parsedChordsEqual };