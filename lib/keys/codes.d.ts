/**
 * W3C `KeyboardEvent.code` and `KeyboardEvent.key` values shared by every
 * platform's normalizer. See https://www.w3.org/TR/uievents-code/ and
 * https://www.w3.org/TR/uievents-key/.
 */
/** `key` values that don't depend on the keyboard layout, by `code`. */
export declare const NAMED_KEYS: Readonly<Record<string, string>>;
/** What each printable key types on a US layout, unshifted and shifted. */
export declare const US_LAYOUT: Readonly<Record<string, readonly [string, string]>>;
/**
 * The `location` of a key: 1 and 2 for left and right modifiers, 3 for the
 * numeric keypad, and 0 otherwise.
 */
export declare function locationOf(code: string): number;
/**
 * Whether `value` is a single typed character: one code point that is not a
 * control character or one of Apple's private-use function key characters.
 */
export declare function isTypedCharacter(value: string | undefined): value is string;
/** The `key` a US layout produces for `code`, for events that report no usable character. */
export declare function usLayoutKey(code: string, shift: boolean): string | undefined;
/** Inverts a raw key code → W3C code table into W3C code → raw key codes. */
export declare function invert(table: Readonly<Record<number, string>>): ReadonlyMap<string, ReadonlyArray<number>>;
