import { RegisterableHotkey } from "./hotkey.types.js";
import { Target } from "./environment.js";
import { HotkeyRegistrationView } from "./hotkey-manager.js";
//#region src/conflicts.d.ts
/** A live registration that overlaps a candidate hotkey. */
export interface HotkeyConflict {
  registration: HotkeyRegistrationView;
}
export interface HotkeyConflictOptions {
  /** Intended registration target. Defaults to document; disjoint targets are excluded. */
  target?: Target;
  /** Check all targets instead of overlapping targets. Default: overlapping. */
  scope?: 'overlapping' | 'all';
  /** Intended event type. Default: keydown. */
  eventType?: 'keydown' | 'keyup';
  /** Include disabled registrations. Default: false. */
  includeDisabled?: boolean;
  /** IDs of registrations being edited. */
  excludeIds?: ReadonlyArray<string>;
  /** Additional app-specific exclusions, such as all instances of one action. */
  exclude?: (registration: HotkeyRegistrationView) => boolean;
  /** Platform used to resolve Mod in the candidate. Registrations retain their own platform. */
  platform?: 'mac' | 'windows' | 'linux';
  /** Source events allow detecting physical/logical overlap on the recorded layout. */
  events?: ReadonlyArray<KeyboardEvent>;
}
/**
 * Find equivalent bindings and sequence-prefix conflicts in the live registry.
 * With source events, also checks observed logical/physical overlap. Does not
 * discover unmounted handlers, external listeners, or other keyboard layouts.
 */
export declare function findHotkeyConflicts(candidate: RegisterableHotkey, options?: HotkeyConflictOptions): Array<HotkeyConflict>;
//#endregion