import { UseHotkeyCommonOptions } from "./useHotkey.js";
import { AppHotkeys, AppHotkeysStore, CustomHotkeys, HotkeyChordRecorderOptions, HotkeySequenceRecorderOptions } from "@tanstack/hotkeys";
import React, { ReactNode } from "react";
import { HotkeysProviderScopeProps } from "@tanstack/hotkeys/adapter";
//#region src/HotkeysProvider.d.ts
export interface HotkeysProviderOptions {
  /**
   * Defaults for every hotkey registered by `useHotkey` and `useHotkeys`.
   * `requireReset` applies to chords and `timeout` applies to sequences.
   */
  hotkey?: UseHotkeyCommonOptions;
  /** Defaults for every `useHotkeyRecorder`. */
  hotkeyRecorder?: Partial<Omit<HotkeyChordRecorderOptions & HotkeySequenceRecorderOptions, 'maxSteps' | 'onRecord' | 'validate'>>;
}
interface HotkeysContextValue {
  appHotkeysStore: AppHotkeysStore | null;
  /** Merged with every ancestor provider's defaults, including `hotkey.scope`. */
  defaultOptions: HotkeysProviderOptions;
  /** Whether this provider and every ancestor are enabled. */
  enabled: boolean;
}
export interface HotkeysProviderProps<T extends AppHotkeys = AppHotkeys> extends HotkeysProviderScopeProps {
  children: ReactNode;
  /**
   * Every app hotkey, from `defineAppHotkeys`. Listed by `useAppHotkeyList`
   * whether or not their components have mounted.
   */
  appHotkeys?: T;
  /**
   * Starting custom hotkeys, such as saved data. Read once; the provider owns
   * the state afterwards. Invalid entries are ignored with a warning.
   */
  customHotkeys?: CustomHotkeys<T> | null;
  /** Called with the custom hotkeys after every change, ready to save. */
  onCustomHotkeysChange?: (customHotkeys: CustomHotkeys<T>) => void;
  /** Merged with the parent provider's defaults. */
  defaultOptions?: HotkeysProviderOptions;
}
/**
 * Provides default options, app hotkeys, and the user's custom hotkeys.
 *
 * Nest providers to create hotkey scopes. A nested provider inherits app
 * hotkeys and merges default options. With `scope`, its hotkeys fire only
 * while it is mounted and enabled; with `exclusive`, only its hotkeys fire.
 *
 * @example
 * ```tsx
 * <HotkeysProvider
 *   appHotkeys={appHotkeys}
 *   customHotkeys={JSON.parse(localStorage.getItem('hotkeys') ?? '{}')}
 *   onCustomHotkeysChange={(custom) =>
 *     localStorage.setItem('hotkeys', JSON.stringify(custom))
 *   }
 * >
 *   <App />
 * </HotkeysProvider>
 * ```
 *
 * @example
 * ```tsx
 * function EditDialog() {
 *   return (
 *     <HotkeysProvider scope="edit-dialog" exclusive={{ allow: ['global'] }}>
 *       <DialogBody />
 *     </HotkeysProvider>
 *   )
 * }
 * ```
 */
export declare function HotkeysProvider<T extends AppHotkeys = AppHotkeys>({ children, appHotkeys, customHotkeys, onCustomHotkeysChange, defaultOptions, scope, exclusive, enabled }: HotkeysProviderProps<T>): React.JSX.Element;
export declare function useHotkeysContext(): HotkeysContextValue | null;
export declare function useDefaultHotkeysOptions(): HotkeysProviderOptions;
//#endregion