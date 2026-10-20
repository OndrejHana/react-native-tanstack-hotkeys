import { getTargetDocument, isEventForTarget, isTypingEvent, shouldIgnoreInputEvent } from "./_event-target.js";

//#region src/environment.ts
/** Detects the platform from browser navigator properties, defaulting to 'linux' without a navigator. */
function detectBrowserPlatform() {
	if (typeof navigator === "undefined") return "linux";
	const platform = navigator.platform?.toLowerCase() ?? "";
	const userAgent = navigator.userAgent?.toLowerCase() ?? "";
	if (platform.includes("mac") || userAgent.includes("mac")) return "mac";
	if (platform.includes("win") || userAgent.includes("win")) return "windows";
	return "linux";
}
/** The browser environment: DOM events on elements, the document, and the window. */
const domEnvironment = {
	defaultTarget: () => typeof document === "undefined" ? void 0 : document,
	globalTarget: () => typeof window === "undefined" ? void 0 : window,
	listen(target, type, listener, capture) {
		const domTarget = target;
		domTarget.addEventListener(type, listener, capture);
		return () => domTarget.removeEventListener(type, listener, capture);
	},
	detectPlatform: detectBrowserPlatform,
	isEventForTarget: (event, target) => isEventForTarget(event, target),
	eventReachesTarget(event, target) {
		const domTarget = target;
		return event.composedPath().includes(domTarget.nodeType === 1 ? domTarget : getTargetDocument(domTarget));
	},
	shouldIgnoreInputEvent: (event, listenerTarget, registrationTarget) => shouldIgnoreInputEvent(event, listenerTarget, registrationTarget),
	isTypingEvent: (event, target) => isTypingEvent(event, target),
	targetsOverlap(a, b) {
		if (a === b) return true;
		const domA = a;
		const domB = b;
		if (getTargetDocument(domA) !== getTargetDocument(domB)) return false;
		if (!("contains" in domA) || !("contains" in domB)) return true;
		return domA.contains(domB) || domB.contains(domA);
	},
	createKeyboardEvent: (type, init) => new KeyboardEvent(type, init)
};
let current = domEnvironment;
/** Returns the environment hotkeys use to listen for and interpret keyboard events. */
function getHotkeysEnvironment() {
	return current;
}
/**
* Replaces the environment hotkeys use to listen for and interpret keyboard
* events, or restores the browser environment with `null`. Call it before
* registering hotkeys: existing listeners stay with the previous environment.
*/
function setHotkeysEnvironment(environment) {
	current = environment ?? domEnvironment;
}

//#endregion
export { domEnvironment, getHotkeysEnvironment, setHotkeysEnvironment };