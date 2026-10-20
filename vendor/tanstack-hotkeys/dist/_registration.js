//#region src/_registration.ts
/** The scope of hotkeys that do not name one. It is always active unless an exclusive scope is active. */
const GLOBAL_SCOPE = "global";
/**
* Default options for hotkey/sequence registration.
* Omitted: platform, target (resolved at registration), requireReset (HotkeyManager only).
*/
const defaultHotkeyOptions = {
	capture: false,
	preventDefault: true,
	stopPropagation: true,
	eventType: "keydown",
	enabled: true,
	ignoreInputs: "auto",
	conflictBehavior: "warn",
	scope: GLOBAL_SCOPE
};
/**
* Resolves `ignoreInputs: 'auto'` from the hotkey (the first step of a sequence).
* Ctrl/Meta shortcuts and Escape fire in inputs; single keys and Shift/Alt combos are ignored.
*/
function getDefaultIgnoreInputs(parsedChord) {
	if (parsedChord.ctrl || parsedChord.meta) return false;
	if (parsedChord.key === "Escape" || parsedChord.code === "Escape") return false;
	return true;
}
/**
* Handles conflicts between registrations based on conflict behavior.
*
* @param conflictingId - The ID of the conflicting registration
* @param keyDisplay - Display string for the conflicting key/sequence (for error messages)
* @param conflictBehavior - How to handle the conflict
* @param unregister - Function to unregister by ID
*/
function handleConflict(conflictingId, keyDisplay, conflictBehavior, unregister) {
	if (conflictBehavior === "allow") return;
	if (conflictBehavior === "warn") {
		console.warn(`'${keyDisplay}' is already registered. Multiple handlers may be triggered. Use conflictBehavior: 'replace' to replace the existing handler, or conflictBehavior: 'allow' to suppress this warning.`);
		return;
	}
	if (conflictBehavior === "error") throw new Error(`'${keyDisplay}' is already registered. Use conflictBehavior: 'replace' to replace the existing handler, or conflictBehavior: 'allow' to allow multiple registrations.`);
	unregister(conflictingId);
}
/** Compare updates without publishing unchanged options, including fresh metadata objects. */
function optionsEqual(left, right) {
	const a = left;
	const b = right;
	const keys = Object.keys(a);
	return keys.length === Object.keys(b).length && keys.every((key) => key === "meta" && a[key] && b[key] ? optionsEqual(a[key], b[key]) : Object.is(a[key], b[key]));
}

//#endregion
export { GLOBAL_SCOPE, defaultHotkeyOptions, getDefaultIgnoreInputs, handleConflict, optionsEqual };