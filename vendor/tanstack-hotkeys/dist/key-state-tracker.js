import { MODIFIER_KEYS, normalizeKeyName } from "./constants.js";
import { getHotkeysEnvironment } from "./environment.js";
import { Store } from "@tanstack/store";

//#region src/key-state-tracker.ts
/**
* Returns the default state for KeyStateTracker.
*/
function getDefaultKeyStateTrackerState() {
	return {
		heldKeys: [],
		heldCodes: {}
	};
}
/**
* Singleton tracker for currently held keyboard keys.
*
* This class maintains a list of all keys currently being pressed,
* which is useful for:
* - Displaying currently held keys to users
* - Custom shortcut recording for rebinding
* - Complex chord detection
*
* State Management:
* - Uses TanStack Store for reactive state management
* - State can be accessed via `tracker.store.state` when using the class directly
* - When using framework adapters (React), use `useHeldKeys` and `useHeldKeyCodes` hooks for reactive state
*
* @example
* ```ts
* const tracker = KeyStateTracker.getInstance()
*
* // Access state directly
* console.log(tracker.store.state.heldKeys) // ['Control', 'Shift']
*
* // Subscribe to changes with TanStack Store
* const unsubscribe = tracker.store.subscribe(() => {
*   console.log('Currently held:', tracker.store.state.heldKeys)
* })
*
* // Check current state
* console.log(tracker.getHeldKeys()) // ['Control', 'Shift']
* console.log(tracker.isKeyHeld('Control')) // true
*
* // Cleanup
* unsubscribe()
* ```
*/
var KeyStateTracker = class KeyStateTracker {
	static #instance = null;
	/**
	* The TanStack Store instance containing the tracker state.
	* Use this to subscribe to state changes or access current state.
	*/
	store = new Store(getDefaultKeyStateTrackerState());
	#heldEntries = /* @__PURE__ */ new Map();
	/** Removes the window listeners together on destroy. */
	#removers = [];
	constructor() {
		this.#setupListeners();
	}
	/**
	* Gets the singleton instance of KeyStateTracker.
	*/
	static getInstance() {
		if (!KeyStateTracker.#instance) KeyStateTracker.#instance = new KeyStateTracker();
		return KeyStateTracker.#instance;
	}
	/**
	* Resets the singleton instance. Useful for testing.
	*/
	static resetInstance() {
		if (KeyStateTracker.#instance) {
			KeyStateTracker.#instance.destroy();
			KeyStateTracker.#instance = null;
		}
	}
	/**
	* Sets up the keyboard event listeners.
	*/
	#setupListeners() {
		const environment = getHotkeysEnvironment();
		const target = environment.globalTarget();
		if (environment.defaultTarget() === void 0 || target === void 0) return;
		const onKeydown = (event) => {
			let changed = this.#reconcileModifiers(event);
			const key = normalizeKeyName(event.key);
			const identity = event.code || `key:${key}`;
			if (!this.#heldEntries.has(identity)) {
				this.#heldEntries.set(identity, {
					key,
					code: event.code
				});
				changed = true;
			}
			if (changed) this.#syncState();
		};
		const onKeyup = (event) => {
			const key = normalizeKeyName(event.key);
			const identity = event.code || `key:${key}`;
			this.#heldEntries.delete(identity);
			if (!event.code) {
				for (const [entryIdentity, entry] of this.#heldEntries) if (entry.key === key) this.#heldEntries.delete(entryIdentity);
			}
			this.#reconcileModifiers(event);
			if (MODIFIER_KEYS.has(key)) {
				for (const [entryIdentity, entry] of this.#heldEntries) if (!MODIFIER_KEYS.has(entry.key)) this.#heldEntries.delete(entryIdentity);
			}
			this.#syncState();
		};
		const onMouse = (event) => {
			if (this.#reconcileModifiers(event)) this.#syncState();
		};
		const onBlur = () => {
			if (this.#heldEntries.size > 0) {
				this.#heldEntries.clear();
				this.#syncState();
			}
		};
		const listeners = [
			[
				"keydown",
				onKeydown,
				true
			],
			[
				"keyup",
				onKeyup,
				true
			],
			[
				"mousemove",
				onMouse,
				true
			],
			[
				"mousedown",
				onMouse,
				true
			],
			[
				"blur",
				onBlur,
				false
			]
		];
		this.#removers = listeners.map(([type, listener, capture]) => environment.listen(target, type, listener, capture));
	}
	/**
	* Removes modifiers whose release was missed without a window blur.
	* Event modifier state is shared by left/right keys, so a true flag keeps
	* both physical entries until their individual keyup events arrive.
	* Only real user input counts: events dispatched by page code report no
	* modifiers and would clear keys the user is still holding.
	*/
	#reconcileModifiers(event) {
		if (!event.isTrusted) return false;
		let changed = false;
		for (const [identity, entry] of this.#heldEntries) if (entry.key === "Control" && !event.ctrlKey || entry.key === "Alt" && !event.altKey || entry.key === "Shift" && !event.shiftKey || entry.key === "Meta" && !event.metaKey) {
			this.#heldEntries.delete(identity);
			changed = true;
		}
		return changed;
	}
	/**
	* Syncs the internal Set to the Store state.
	*/
	#syncState() {
		const heldKeys = Array.from(new Set(Array.from(this.#heldEntries.values(), (entry) => entry.key)));
		const heldCodes = Object.fromEntries(Array.from(this.#heldEntries.values(), (entry) => [entry.key, entry.code]));
		this.store.setState(() => ({
			heldKeys,
			heldCodes
		}));
	}
	/**
	* Removes the keyboard event listeners.
	*/
	#removeListeners() {
		for (const remove of this.#removers) remove();
		this.#removers = [];
	}
	/**
	* Gets an array of currently held key names.
	*
	* @returns Array of key names currently being pressed
	*/
	getHeldKeys() {
		return this.store.state.heldKeys;
	}
	/**
	* Checks if a specific key is currently being held.
	*
	* @param key - The key name to check (case-insensitive)
	* @returns True if the key is currently held
	*/
	isKeyHeld(key) {
		const normalizedKey = normalizeKeyName(key);
		return Array.from(this.#heldEntries.values()).some((entry) => entry.key === normalizedKey);
	}
	/**
	* Checks if any of the given keys are currently held.
	*
	* @param keys - Array of key names to check
	* @returns True if any of the keys are currently held
	*/
	isAnyKeyHeld(keys) {
		return keys.some((key) => this.isKeyHeld(key));
	}
	/**
	* Checks if all of the given keys are currently held.
	*
	* @param keys - Array of key names to check
	* @returns True if all of the keys are currently held
	*/
	areAllKeysHeld(keys) {
		return keys.every((key) => this.isKeyHeld(key));
	}
	/**
	* Destroys the tracker and removes all listeners.
	*/
	destroy() {
		this.#removeListeners();
		this.#heldEntries.clear();
		this.store.setState(() => getDefaultKeyStateTrackerState());
	}
};
/**
* Gets the singleton KeyStateTracker instance.
* Convenience function for accessing the tracker.
*/
function getKeyStateTracker() {
	return KeyStateTracker.getInstance();
}

//#endregion
export { KeyStateTracker, getKeyStateTracker };