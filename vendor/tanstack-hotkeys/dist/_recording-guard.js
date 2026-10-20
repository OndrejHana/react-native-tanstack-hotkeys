import { MODIFIER_KEYS, normalizeKeyName } from "./constants.js";
import { getHotkeysEnvironment } from "./environment.js";

//#region src/_recording-guard.ts
const sessions = /* @__PURE__ */ new Set();
const captured = /* @__PURE__ */ new WeakSet();
const pending = /* @__PURE__ */ new Map();
/** Removes the shared release and blur listeners while they are attached. */
let stopListening = null;
const identity = (event) => event.code || `key:${event.key}`;
/** Consumes recorded key releases and removes guards for completed chords. */
function release(event) {
	if (pending.delete(identity(event))) captured.add(event);
	if (MODIFIER_KEYS.has(normalizeKeyName(event.key))) {
		for (const [id, key] of pending) if (!MODIFIER_KEYS.has(key)) pending.delete(id);
	}
	cleanup();
}
/** Clears pending releases when focus loss prevents the browser from delivering them. */
function blur() {
	pending.clear();
	cleanup();
}
/** Detaches shared listeners once neither active sessions nor pending releases need them. */
function cleanup() {
	if (stopListening && sessions.size === 0 && pending.size === 0) {
		stopListening();
		stopListening = null;
	}
}
/** Pauses application shortcut dispatch and starts tracking releases for this recorder. */
function beginRecording(owner) {
	sessions.add(owner);
	const environment = getHotkeysEnvironment();
	const target = environment.defaultTarget();
	if (!stopListening && target !== void 0) {
		const removeRelease = environment.listen(target, "keyup", release, true);
		const globalTarget = environment.globalTarget();
		const removeBlur = globalTarget ? environment.listen(globalTarget, "blur", blur, false) : () => {};
		stopListening = () => {
			removeRelease();
			removeBlur();
		};
	}
}
/** Ends a session while retaining guards for keys still held after commit or cancellation. */
function endRecording(owner) {
	sessions.delete(owner);
	cleanup();
}
/** Marks a consumed keydown and guards subsequent repeats and its release. */
function captureRecordingEvent(event) {
	captured.add(event);
	pending.set(identity(event), normalizeKeyName(event.key));
}
/** Whether managers should suppress callbacks for this recording session or captured chord. */
function isRecordingEvent(event) {
	return sessions.size > 0 || captured.has(event) || pending.has(identity(event));
}

//#endregion
export { beginRecording, captureRecordingEvent, endRecording, isRecordingEvent };