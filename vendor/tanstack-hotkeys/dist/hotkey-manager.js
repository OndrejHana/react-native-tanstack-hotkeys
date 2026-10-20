import { normalizeKeyName } from "./constants.js";
import { getHotkeysEnvironment } from "./environment.js";
import { detectPlatform } from "./platform.js";
import { keysEqual, normalizeKeyboardEvent } from "./_keyboard-event.js";
import { isHotkeySequence, isModifierKey, parseHotkey, simplifyHotkey } from "./parse.js";
import { formatHotkey } from "./format.js";
import { matchKeyboardEvent, parsedChordsEqual } from "./_match.js";
import { DEFAULT_SEQUENCE_TIMEOUT, areHotkeysEqual } from "./match.js";
import { TargetListeners } from "./_target-listeners.js";
import { managerRef } from "./_manager-ref.js";
import { isRecordingEvent } from "./_recording-guard.js";
import { GLOBAL_SCOPE, defaultHotkeyOptions, getDefaultIgnoreInputs, handleConflict, optionsEqual } from "./_registration.js";
import { Store } from "@tanstack/store";

//#region src/hotkey-manager.ts
/** Creates a public view from an internal registration, stripping the callback. */
function toHotkeyRegistrationView(reg) {
	const base = {
		id: reg.id,
		target: reg.target,
		triggerCount: reg.triggerCount,
		hasFired: reg.hasFired
	};
	if (reg.kind === "chord") return {
		...base,
		kind: "chord",
		hotkey: reg.hotkey,
		parsedChord: reg.parsedChord,
		options: reg.options
	};
	const length = reg.parsedSequence.length;
	const inProgress = reg.currentIndex > 0 && reg.currentIndex < length;
	return {
		...base,
		kind: "sequence",
		hotkey: reg.hotkey,
		parsedSequence: reg.parsedSequence,
		options: reg.options,
		matchedStepCount: inProgress ? reg.currentIndex : 0,
		partialMatchLastKeyTime: inProgress ? reg.lastKeyTime : 0
	};
}
let registrationIdCounter = 0;
/** The string a chord registers as: strings as written, objects formatted from their parsed form. */
function chordString(chord, parsed) {
	return typeof chord === "string" ? chord : formatHotkey(parsed);
}
/**
* Generates a unique ID for hotkey registrations.
*/
function generateId() {
	return `hotkey_${++registrationIdCounter}`;
}
/** Drops options that do not apply to a registration's kind. */
function optionsForKind(kind, options) {
	if (kind === "chord") {
		const { timeout: _timeout, ...rest } = options;
		return rest;
	}
	const { requireReset: _requireReset, ...rest } = options;
	return rest;
}
/** Steps with Mod already resolved for the registration's platform. */
function resolvedSteps(registration) {
	return registration.kind === "chord" ? [registration.parsedChord] : registration.parsedSequence;
}
/** Whether a registration skips keys that focused controls use, resolving `'auto'`. */
function ignoresInputs(registration) {
	const { ignoreInputs = "auto" } = registration.options;
	return ignoreInputs === "auto" ? getDefaultIgnoreInputs(resolvedSteps(registration)[0]) : ignoreInputs;
}
function sameResolvedSteps(left, right) {
	return left.length === right.length && left.every((step, index) => parsedChordsEqual(step, right[index]));
}
function formatForMessage(hotkey) {
	return isHotkeySequence(hotkey) ? hotkey.join(" ") : hotkey;
}
/**
* Singleton manager for hotkey registrations, including sequences.
*
* This class provides a centralized way to register and manage keyboard
* hotkeys. It shares one keydown and one keyup listener per target and
* capture phase across registrations.
*
* Sequences (Vim-style hotkeys such as `['G', 'G']`) match when every step is
* pressed within the timeout. Modifier-only events (Shift, Control, Alt, or
* Meta alone) neither advance nor reset a sequence, so chained modifier chords
* such as `['Shift+R', 'Shift+T']` work.
*
* @example
* ```ts
* const manager = HotkeyManager.getInstance()
*
* const save = manager.register('Mod+S', (event, context) => {
*   console.log('Save triggered!')
* })
* const top = manager.register(['G', 'G'], () => scrollToTop(), { timeout: 500 })
*
* // Later, to unregister:
* save.unregister()
* top.unregister()
* ```
*/
var HotkeyManager = class HotkeyManager {
	/**
	* The TanStack Store containing all hotkey registrations, chords and sequences.
	* Use this to subscribe to registration changes or access current registrations.
	*
	* @example
	* ```ts
	* const manager = HotkeyManager.getInstance()
	*
	* // Subscribe to registration changes
	* const unsubscribe = manager.registrations.subscribe(() => {
	*   console.log('Registrations changed:', manager.registrations.state.size)
	* })
	*
	* // Access current registrations
	* for (const [id, reg] of manager.registrations.state) {
	*   console.log(reg.hotkey, reg.options.enabled)
	* }
	* ```
	*/
	registrations = new Store(/* @__PURE__ */ new Map());
	/**
	* The app hotkeys store published by a framework provider, so tools such as
	* devtools can list declared hotkeys that are not registered.
	*/
	appHotkeys = new Store(null);
	/** Active scopes. Subscribe to show which hotkeys are suspended. */
	scopes = new Store({
		active: [],
		exclusive: null,
		allowed: [],
		suspended: []
	});
	#platform;
	#scopeActivations = /* @__PURE__ */ new Set();
	#scopeActivationCount = 0;
	/** Active scopes, lowest precedence first, derived from activations. */
	#scopeOrder = [];
	/** Scopes that can fire while a scope is exclusive, or `null` when none is. */
	#liveScopes = null;
	#listeners = new TargetListeners((...args) => this.#processTargetEvent(...args));
	/** Events that continue a sequence in progress, decided before any listener runs. */
	#sequenceOwned = /* @__PURE__ */ new WeakMap();
	/** Physical keys whose keydown a sequence owned, so their repeats and keyup are owned too. */
	#sequenceOwnedKeys = /* @__PURE__ */ new Set();
	/** Timers that clear a sequence's progress once its timeout passes. */
	#sequenceResetTimers = /* @__PURE__ */ new Map();
	constructor() {
		this.#platform = detectPlatform();
	}
	/**
	* Gets the singleton instance of HotkeyManager.
	*/
	static getInstance() {
		return managerRef.current ??= new HotkeyManager();
	}
	/**
	* Resets the singleton instance. Useful for testing.
	*/
	static resetInstance() {
		managerRef.current?.destroy();
		managerRef.current = null;
	}
	/**
	* Activates a scope until the returned function is called. Activations are
	* counted, so a scope stays active until every activation is released.
	* Framework providers call this while mounted.
	*
	* When active scopes share a hotkey, a nested scope takes precedence over
	* its ancestors, and otherwise the most recently activated scope wins. The
	* same order picks the exclusive scope when several are active, and only
	* that scope's `allow` list applies.
	*
	* @example
	* ```ts
	* const release = manager.activateScope('dialog', { exclusive: true })
	* // Only hotkeys with scope 'dialog', or scopes nested in it, fire now.
	* release()
	*
	* manager.activateScope('dialog', { exclusive: { allow: ['global'] } })
	* // Hotkeys with scope 'global' fire too.
	* ```
	*/
	activateScope(scope, options = {}) {
		if (scope === "global") return () => {};
		const { exclusive } = options;
		const allow = exclusive ? exclusive === true ? [] : exclusive.allow : null;
		if (allow && [...this.#scopeActivations].some((other) => other.allow && other.scope === scope)) console.warn(`Exclusive hotkey scope '${scope}' is already active. Hotkeys from both activations will fire; give each a unique scope.`);
		const activation = {
			scope,
			parent: options.parent ?? "global",
			allow,
			order: ++this.#scopeActivationCount
		};
		this.#scopeActivations.add(activation);
		this.#updateScopes();
		return () => {
			if (this.#scopeActivations.delete(activation)) this.#updateScopes();
		};
	}
	/**
	* Whether hotkeys in a scope can fire: the scope is `'global'` or
	* activated, and either no scope is exclusive or this scope is the
	* exclusive one, nested in it, or allowed by it.
	*/
	isScopeActive(scope = GLOBAL_SCOPE) {
		if (this.#liveScopes) return this.#liveScopes.has(scope);
		return scope === "global" || this.#scopeOrder.includes(scope);
	}
	/** Higher for scopes with higher precedence; `'global'` is 0. */
	#scopeRank(scope = GLOBAL_SCOPE) {
		return this.#scopeOrder.indexOf(scope) + 1;
	}
	/** Recomputes scope precedence and publishes it. */
	#updateScopes() {
		const parents = /* @__PURE__ */ new Map();
		const latest = /* @__PURE__ */ new Map();
		for (const activation of this.#scopeActivations) {
			parents.set(activation.scope, activation.parent);
			latest.set(activation.scope, Math.max(latest.get(activation.scope) ?? 0, activation.order));
		}
		const depth = (scope) => {
			let result = 0;
			const seen = /* @__PURE__ */ new Set();
			for (let current = parents.get(scope); current !== void 0 && !seen.has(current); current = parents.get(current)) {
				seen.add(current);
				result++;
			}
			return result;
		};
		const since = /* @__PURE__ */ new Map();
		for (const [scope, order] of latest) {
			const seen = /* @__PURE__ */ new Set();
			for (let current = scope; current !== void 0 && !seen.has(current); current = parents.get(current)) {
				seen.add(current);
				const own = latest.get(current);
				if (own !== void 0) since.set(current, Math.min(since.get(current) ?? own, order));
			}
		}
		const compare = (a, b) => since.get(a) - since.get(b) || depth(a) - depth(b) || latest.get(a) - latest.get(b);
		this.#scopeOrder = [...latest.keys()].sort(compare);
		const exclusive = [...this.#scopeActivations].filter((activation) => activation.allow).sort((a, b) => compare(a.scope, b.scope) || a.order - b.order).pop();
		const activated = [GLOBAL_SCOPE, ...this.#scopeOrder];
		let allowed = [];
		this.#liveScopes = null;
		if (exclusive?.allow) {
			const { allow } = exclusive;
			const isNested = (scope) => {
				const seen = /* @__PURE__ */ new Set();
				for (let current = scope; current !== void 0 && !seen.has(current); current = parents.get(current)) {
					if (current === exclusive.scope) return true;
					seen.add(current);
				}
				return false;
			};
			allowed = activated.filter((scope) => !isNested(scope) && allow.includes(scope));
			this.#liveScopes = /* @__PURE__ */ new Set([...activated.filter(isNested), ...allowed]);
		}
		const live = this.#liveScopes;
		this.scopes.setState(() => ({
			active: this.#scopeOrder,
			exclusive: exclusive?.scope ?? null,
			allowed,
			suspended: live ? activated.filter((scope) => !live.has(scope)) : []
		}));
		this.#notify();
	}
	/** Whether a registration can fire now: enabled, in an active scope. */
	#isLive(registration) {
		return registration.options.enabled !== false && this.isScopeActive(registration.options.scope);
	}
	/** Notifies subscribers after in-place updates such as counts and sequence progress. */
	#notify() {
		this.registrations.setState((prev) => new Map(prev));
	}
	register(input, callback, options = {}) {
		const hotkey = simplifyHotkey(input);
		if (isHotkeySequence(hotkey) && hotkey.length === 0) throw new Error("Sequence must contain at least one hotkey");
		const defaultTarget = getHotkeysEnvironment().defaultTarget();
		if (defaultTarget === void 0 && !options.target) {
			let currentCallback = callback;
			return {
				id: generateId(),
				unregister: () => {},
				get callback() {
					return currentCallback;
				},
				set callback(newCallback) {
					currentCallback = newCallback;
				},
				setOptions: () => {},
				get isActive() {
					return false;
				}
			};
		}
		const id = generateId();
		const platform = options.platform ?? this.#platform;
		const target = options.target ?? defaultTarget;
		const sequence = isHotkeySequence(hotkey);
		const common = {
			id,
			callback,
			options: {
				...defaultHotkeyOptions,
				...sequence ? { timeout: DEFAULT_SEQUENCE_TIMEOUT } : { requireReset: false },
				...optionsForKind(sequence ? "sequence" : "chord", options),
				platform,
				ignoreInputs: options.ignoreInputs ?? "auto"
			},
			target,
			triggerCount: 0,
			hasFired: false
		};
		let registration;
		if (sequence) {
			const parsedSequence = parseHotkey(hotkey, platform);
			registration = {
				...common,
				kind: "sequence",
				hotkey: hotkey.map((step, index) => chordString(step, parsedSequence[index])),
				parsedSequence,
				currentIndex: 0,
				lastKeyTime: 0
			};
		} else {
			const parsedChord = parseHotkey(hotkey, platform);
			registration = {
				...common,
				kind: "chord",
				hotkey: chordString(hotkey, parsedChord),
				parsedChord
			};
		}
		const conflicting = this.#findConflictingRegistration(registration);
		if (conflicting) handleConflict(conflicting.id, formatForMessage(registration.hotkey), options.conflictBehavior ?? "warn", (conflictId) => this.#unregister(conflictId));
		this.registrations.setState((prev) => new Map(prev).set(id, registration));
		this.#listeners.add(target, !!registration.options.capture, id);
		const manager = this;
		return {
			get id() {
				return id;
			},
			unregister: () => {
				manager.#unregister(id);
			},
			get callback() {
				return manager.registrations.state.get(id)?.callback ?? callback;
			},
			set callback(newCallback) {
				const reg = manager.registrations.state.get(id);
				if (reg) reg.callback = newCallback;
			},
			setOptions: (newOptions) => {
				manager.registrations.setState((prev) => {
					const reg = prev.get(id);
					if (!reg) return prev;
					const options = {
						...reg.options,
						...optionsForKind(reg.kind, newOptions)
					};
					if (optionsEqual(reg.options, options)) return prev;
					const capture = !!reg.options.capture;
					if (capture !== !!options.capture) {
						manager.#listeners.remove(reg.target, capture, id);
						manager.#listeners.add(reg.target, !!options.capture, id);
					}
					return new Map(prev).set(id, {
						...reg,
						options
					});
				});
			},
			get isActive() {
				return manager.registrations.state.has(id);
			}
		};
	}
	/**
	* Unregisters a hotkey by its registration ID.
	*/
	#unregister(id) {
		const registration = this.registrations.state.get(id);
		if (!registration) return;
		const target = registration.target;
		this.registrations.setState((prev) => {
			const next = new Map(prev);
			next.delete(id);
			return next;
		});
		this.#listeners.remove(target, !!registration.options.capture, id);
		this.#clearSequenceReset(id);
	}
	/**
	* Clears a sequence's progress, and notifies subscribers, once its timeout
	* passes without another step. Key presses check the timeout too, so this
	* only keeps views such as `matchedStepCount` current.
	*/
	#scheduleSequenceReset(id, delay) {
		this.#clearSequenceReset(id);
		this.#sequenceResetTimers.set(id, setTimeout(() => {
			this.#sequenceResetTimers.delete(id);
			const registration = this.registrations.state.get(id);
			if (registration?.kind !== "sequence" || registration.currentIndex === 0) return;
			const timeout = registration.options.timeout ?? 1e3;
			const remaining = registration.lastKeyTime + timeout - Date.now();
			if (remaining >= 0) {
				this.#scheduleSequenceReset(id, remaining + 1);
				return;
			}
			registration.currentIndex = 0;
			registration.lastKeyTime = 0;
			this.#notify();
		}, delay));
	}
	#clearSequenceReset(id) {
		const timer = this.#sequenceResetTimers.get(id);
		if (timer === void 0) return;
		clearTimeout(timer);
		this.#sequenceResetTimers.delete(id);
	}
	/** Registrations of one kind in the listener phase, in registration order. */
	#registrationsIn(ids, capture, kind) {
		const result = [];
		for (const id of ids) {
			const registration = this.registrations.state.get(id);
			if (registration?.kind === kind && !!registration.options.capture === capture) result.push(registration);
		}
		return result;
	}
	/** The live registration, unless it was removed or moved to another phase. */
	#currentIn(registration, capture) {
		const current = this.registrations.state.get(registration.id);
		return current && !!current.options.capture === capture ? current : void 0;
	}
	/**
	* Processes keyboard events for a specific target and event type.
	* A key that continues a sequence in progress belongs to that sequence, so
	* chords skip it. Chords and first steps of sequences may both fire.
	*/
	#processTargetEvent(event, target, eventType, capture, ids, first) {
		if (first) this.#sequenceOwned.set(event, this.#isOwnedBySequence(event, eventType));
		this.#processChords(event, target, eventType, capture, this.#registrationsIn(ids, capture, "chord"));
		this.#processSequences(event, target, eventType, capture, this.#registrationsIn(ids, capture, "sequence"));
	}
	#processChords(event, target, eventType, capture, registrations) {
		if (eventType === "keyup") {
			for (const registration of registrations) if (registration.hasFired && this.#shouldResetRegistration(registration, event)) {
				registration.hasFired = false;
				registration.activeMatch = void 0;
			}
		}
		if (isRecordingEvent(event) || this.#sequenceOwned.get(event)) return;
		const environment = getHotkeysEnvironment();
		const matches = /* @__PURE__ */ new Map();
		let bestScore = 0;
		for (const registration of registrations) {
			if (!this.#isLive(registration) || registration.options.eventType !== eventType || !environment.isEventForTarget(event, target) || ignoresInputs(registration) && environment.shouldIgnoreInputEvent(event, target, registration.target)) continue;
			const result = matchKeyboardEvent(event, registration.parsedChord, registration.options.platform);
			if (result.matched) {
				matches.set(registration.id, result);
				bestScore = Math.max(bestScore, result.score);
			}
		}
		let bestRank = -1;
		for (const registration of registrations) if (matches.get(registration.id)?.score === bestScore) bestRank = Math.max(bestRank, this.#scopeRank(registration.options.scope));
		for (const snapshot of registrations) {
			const match = matches.get(snapshot.id);
			if (!match?.matched || match.score !== bestScore || this.#scopeRank(snapshot.options.scope) !== bestRank) continue;
			const registration = this.#currentIn(snapshot, capture);
			if (!registration) continue;
			this.#consume(registration, event);
			if (eventType === "keyup") {
				this.#fire(registration, event);
				continue;
			}
			if (!registration.options.requireReset || !registration.hasFired) {
				if (registration.options.requireReset) {
					registration.hasFired = true;
					registration.activeMatch = match.identity;
				}
				this.#fire(registration, event);
			}
		}
	}
	/**
	* Whether the event continues or completes a sequence in progress whose
	* target the event reaches. The repeats and keyup of a keydown that a
	* sequence owns belong to the sequence too.
	*/
	#isOwnedBySequence(event, eventType) {
		const key = event.code || normalizeKeyName(event.key);
		if (eventType === "keyup") {
			const ownedKeydown = this.#sequenceOwnedKeys.delete(key);
			return this.#continuesSequence(event, eventType) || ownedKeydown;
		}
		if (event.repeat) return this.#sequenceOwnedKeys.has(key);
		const owned = this.#continuesSequence(event, eventType);
		if (owned) this.#sequenceOwnedKeys.add(key);
		else this.#sequenceOwnedKeys.delete(key);
		return owned;
	}
	#continuesSequence(event, eventType) {
		if (isRecordingEvent(event) || normalizeKeyboardEvent(event).isComposing || isModifierKey(normalizeKeyName(event.key))) return false;
		const environment = getHotkeysEnvironment();
		const now = Date.now();
		for (const registration of this.registrations.state.values()) {
			if (registration.kind !== "sequence" || registration.currentIndex === 0 || !this.#isLive(registration) || registration.options.eventType !== eventType || now - registration.lastKeyTime > (registration.options.timeout ?? 1e3)) continue;
			const target = registration.target;
			if (environment.eventReachesTarget(event, target) && !(ignoresInputs(registration) && environment.shouldIgnoreInputEvent(event, target, target)) && matchKeyboardEvent(event, registration.parsedSequence[registration.currentIndex], registration.options.platform).matched) return true;
		}
		return false;
	}
	#processSequences(event, target, eventType, capture, registrations) {
		if (registrations.length === 0) return;
		if (isRecordingEvent(event)) {
			let changed = false;
			for (const registration of registrations) if (registration.currentIndex > 0) {
				registration.currentIndex = 0;
				this.#clearSequenceReset(registration.id);
				changed = true;
			}
			if (changed) this.#notify();
			return;
		}
		if (event.type === "keydown" && event.repeat || normalizeKeyboardEvent(event).isComposing) return;
		if (isModifierKey(normalizeKeyName(event.key))) return;
		const environment = getHotkeysEnvironment();
		const now = Date.now();
		let changed = false;
		const candidates = /* @__PURE__ */ new Map();
		let bestScore = 0;
		for (const registration of registrations) {
			if (!environment.isEventForTarget(event, target) || !this.#isLive(registration) || ignoresInputs(registration) && environment.shouldIgnoreInputEvent(event, target, registration.target) || registration.options.eventType !== eventType) continue;
			const timeout = registration.options.timeout ?? 1e3;
			if (registration.currentIndex > 0 && now - registration.lastKeyTime > timeout) {
				registration.currentIndex = 0;
				changed = true;
			}
			const expected = registration.parsedSequence[registration.currentIndex];
			if (!expected) continue;
			let match = matchKeyboardEvent(event, expected, registration.options.platform);
			let nextIndex = registration.currentIndex + 1;
			if (!match.matched && registration.currentIndex > 0) {
				match = matchKeyboardEvent(event, registration.parsedSequence[0], registration.options.platform);
				nextIndex = 1;
			}
			candidates.set(registration.id, {
				score: match.score,
				nextIndex
			});
			bestScore = Math.max(bestScore, match.score);
		}
		const completed = [];
		for (const registration of registrations) {
			const candidate = candidates.get(registration.id);
			if (!candidate) continue;
			if (candidate.score > 0 && candidate.score === bestScore) {
				registration.lastKeyTime = now;
				registration.currentIndex = candidate.nextIndex;
				changed = true;
				if (registration.currentIndex >= registration.parsedSequence.length) {
					this.#consume(registration, event);
					registration.currentIndex = 0;
					completed.push(registration);
				} else if (registration.options.preventDefault) event.preventDefault();
			} else if (registration.currentIndex > 0) {
				registration.currentIndex = 0;
				changed = true;
			}
		}
		for (const registration of registrations) {
			if (!candidates.has(registration.id)) continue;
			if (registration.currentIndex > 0) {
				const timeout = registration.options.timeout ?? 1e3;
				this.#scheduleSequenceReset(registration.id, timeout + 1);
			} else this.#clearSequenceReset(registration.id);
		}
		if (changed && completed.length === 0) this.#notify();
		for (const snapshot of completed) {
			const registration = this.#currentIn(snapshot, capture);
			if (registration) this.#fire(registration, event);
		}
	}
	/** Applies a matched registration's preventDefault and stopPropagation options. */
	#consume(registration, event) {
		if (registration.options.preventDefault) event.preventDefault();
		if (registration.options.stopPropagation) event.stopPropagation();
	}
	/** Counts a trigger, notifies subscribers (such as devtools), and runs the callback. */
	#fire(registration, event, context = this.#callbackContext(registration)) {
		registration.triggerCount++;
		if (registration.kind === "sequence") registration.hasFired = true;
		this.#notify();
		registration.callback(event, context);
	}
	#callbackContext(registration) {
		return registration.kind === "chord" ? {
			kind: "chord",
			hotkey: registration.hotkey,
			parsedChord: registration.parsedChord
		} : {
			kind: "sequence",
			hotkey: registration.hotkey,
			parsedSequence: registration.parsedSequence
		};
	}
	/**
	* Finds an existing registration on the same target and scope whose steps
	* resolve to the same identity. Each side keeps its own platform, so `Mod+S` on macOS
	* and `Mod+S` on Windows are different bindings.
	*/
	#findConflictingRegistration(candidate) {
		const steps = resolvedSteps(candidate);
		for (const registration of this.registrations.state.values()) if (registration.target === candidate.target && registration.options.scope === candidate.options.scope && sameResolvedSteps(resolvedSteps(registration), steps)) return registration;
		return null;
	}
	/**
	* Determines if a registration should be reset based on the keyup event.
	*/
	#shouldResetRegistration(registration, event) {
		const parsed = registration.parsedChord;
		const releasedKey = normalizeKeyName(event.key);
		if (registration.activeMatch?.code && event.code === registration.activeMatch.code) return true;
		return (parsed.code !== void 0 ? event.code === parsed.code : keysEqual(releasedKey, parsed.key)) || parsed.modifiers.includes(releasedKey);
	}
	/**
	* Resets the progress of every in-progress sequence.
	*/
	resetSequenceProgress() {
		for (const registration of this.registrations.state.values()) if (registration.kind === "sequence") {
			registration.currentIndex = 0;
			registration.lastKeyTime = 0;
		}
		for (const timer of this.#sequenceResetTimers.values()) clearTimeout(timer);
		this.#sequenceResetTimers.clear();
		this.#notify();
	}
	/**
	* Triggers a registration's callback programmatically from devtools.
	* Creates a synthetic KeyboardEvent from the chord (or a sequence's last step)
	* and invokes the callback.
	*
	* @param id - The registration ID to trigger
	* @returns True if the registration was found and triggered
	*/
	triggerRegistration(id) {
		const registration = this.registrations.state.get(id);
		if (!registration) return false;
		const context = this.#callbackContext(registration);
		const parsed = registration.kind === "chord" ? registration.parsedChord : registration.parsedSequence[registration.parsedSequence.length - 1];
		const syntheticEvent = getHotkeysEnvironment().createKeyboardEvent(registration.options.eventType ?? "keydown", {
			...parsed.code !== void 0 ? { code: parsed.code } : { key: parsed.key },
			ctrlKey: parsed.ctrl,
			shiftKey: parsed.shift,
			altKey: parsed.alt,
			metaKey: parsed.meta,
			bubbles: true,
			cancelable: true
		});
		this.#fire(registration, syntheticEvent, context);
		return true;
	}
	/**
	* Gets the number of registered hotkeys, chords and sequences.
	*/
	getRegistrationCount() {
		return this.registrations.state.size;
	}
	/**
	* Checks if a specific hotkey is registered.
	*
	* @param hotkey - The chord or sequence to check
	* @param target - Optional target element to match (if provided, both hotkey and target must match)
	* @returns True if a matching registration exists
	*/
	isRegistered(hotkey, target) {
		for (const registration of this.registrations.state.values()) if (areHotkeysEqual(registration.hotkey, hotkey, registration.options.platform) && (target === void 0 || registration.target === target)) return true;
		return false;
	}
	/**
	* Destroys the manager and removes all listeners.
	*/
	destroy() {
		for (const timer of this.#sequenceResetTimers.values()) clearTimeout(timer);
		this.#sequenceResetTimers.clear();
		this.#listeners.destroy();
		this.registrations.setState(() => /* @__PURE__ */ new Map());
		this.appHotkeys.setState(() => null);
	}
};
/**
* Gets the singleton HotkeyManager instance.
* Convenience function for accessing the manager.
*/
function getHotkeyManager() {
	return HotkeyManager.getInstance();
}

//#endregion
export { HotkeyManager, getHotkeyManager, toHotkeyRegistrationView };