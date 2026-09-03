import { Schema, SchemaGetter, SchemaTransformation } from "effect";
import type { Prettify } from "./utils/Types.js";

const DateFromSecondsString = Schema.FiniteFromString.pipe(
	Schema.decodeTo(
		Schema.Date,
		SchemaTransformation.transform({
			decode: (seconds) => new Date(seconds * 1000),
			encode: (date) => Math.floor(date.getTime() / 1000),
		}),
	),
);

const BooleanFromBitString = Schema.FiniteFromString.pipe(
	Schema.decodeTo(Schema.BooleanFromBit),
);

/**
 * Catalog of tmux format variables: each `#{...}` name mapped to the codec that
 * decodes its raw string value. The single source of truth — commands declare
 * their default variables as a list of these keys; callers add others via
 * `includeVariables`. Grow as commands need more.
 */
export const TmuxVariables = {
	// Session
	session_id: Schema.String,
	session_name: Schema.String,
	session_windows: Schema.FiniteFromString,
	// COUNT of attached clients (0 when detached, can be >1) — NOT a 0/1 flag.
	session_attached: Schema.FiniteFromString,
	session_created: DateFromSecondsString,
	// 1 when this session is in a session group, else 0.
	session_grouped: BooleanFromBitString,
	// Name of the session group this session belongs to (empty when ungrouped).
	session_group: Schema.String,
	// Window
	window_id: Schema.String,
	window_index: Schema.FiniteFromString,
	window_name: Schema.String,
	// Window flags as tmux renders them (e.g. "*", "-", "Z"); empty for none.
	window_raw_flags: Schema.String,
	window_panes: Schema.FiniteFromString,
	window_width: Schema.FiniteFromString,
	window_height: Schema.FiniteFromString,
	window_layout: Schema.String,
	window_active: BooleanFromBitString,
	// Pane
	pane_index: Schema.FiniteFromString,
	pane_width: Schema.FiniteFromString,
	pane_height: Schema.FiniteFromString,
	pane_left: Schema.FiniteFromString,
	pane_top: Schema.FiniteFromString,
	history_size: Schema.FiniteFromString,
	history_limit: Schema.FiniteFromString,
	history_bytes: Schema.FiniteFromString,
	pane_id: Schema.String,
	pane_active: BooleanFromBitString,
	pane_dead: BooleanFromBitString,
	pane_pipe: BooleanFromBitString,
} as const;

/** A known tmux format variable name (a key of {@link TmuxVariables}). */
export type TmuxVariable = keyof typeof TmuxVariables;

/** The decoded record type for a set of variable keys. */
export type DecodedVariables<K extends TmuxVariable> = {
	readonly [P in K]: (typeof TmuxVariables)[P]["Type"];
};

/**
 * Phantom payload a formatted command carries on `__formatted`, letting the
 * client facades rebuild its generic signature (plain conditional inference
 * collapses generics, so the type info must be matchable).
 */
export interface FormattedCommandMeta<
	Options,
	Args extends ReadonlyArray<unknown>,
	K extends TmuxVariable,
	E,
> {
	readonly __formatted: {
		readonly options: Options;
		readonly args: Args;
		readonly keys: K;
		readonly error: E;
	};
}

/**
 * Call arguments for a formatted command: the positionals, then an options
 * object that may carry `includeVariables`.
 *
 * Options is always optional here. Formatted output is only ever a
 * `list-*` command, and tmux list commands have no required flags, so this holds
 * today. If a formatted command with a required flag ever appears, branch on
 * `Record<never, never> extends Options` like `OptionsFn`/`ArgsFn` do.
 */
export type FormattedArgs<
	Options,
	Args extends ReadonlyArray<unknown>,
	Inc extends ReadonlyArray<TmuxVariable>,
> = [...Args, options?: Options & { readonly includeVariables?: Inc }];

/**
 * One decoded record: default keys `K` plus any included keys `Inc`. Wrapped in
 * {@link Prettify} so tooltips show the literal `{ … }` shape instead of the
 * `DecodedVariables<…>` alias. Signatures wrap this in `ReadonlyArray` directly
 * (a named array alias would re-hide the element).
 */
export type FormattedRecord<
	K extends TmuxVariable,
	Inc extends ReadonlyArray<TmuxVariable>,
> = Prettify<DecodedVariables<K | Inc[number]>>;

type VariableFields<K extends TmuxVariable> = {
	[P in K]: (typeof TmuxVariables)[P];
};

/** Build a struct schema for the given variables, in order. */
export const variableStruct = <const Keys extends ReadonlyArray<TmuxVariable>>(
	keys: Keys,
): Schema.Struct<VariableFields<Keys[number]>> =>
	Schema.Struct(
		Object.fromEntries(
			keys.map((key) => [key, TmuxVariables[key]]),
		) as VariableFields<Keys[number]>,
	);

/**
 * Flag schema field for `includeVariables`: validates an array of known tmux
 * variable names (a bad name is rejected with a schema error listing the valid
 * ones) and encodes to `[]` so it contributes nothing to argv — it only feeds
 * the `-F` format. Mixed into a formatted command's flags struct by
 * `TmuxCommand.make`, so validation rides the same encode pass as the real
 * flags (including the excess-property check that rejects it on non-formatted
 * commands).
 */
export const IncludeVariablesField = Schema.optional(
	Schema.Array(
		Schema.Literals(
			Object.keys(TmuxVariables) as [TmuxVariable, ...TmuxVariable[]],
		),
	).pipe(
		Schema.encodeTo(Schema.Array(Schema.String), {
			decode: SchemaGetter.transform(() => {
				throw new Error("includeVariables only supports encoding");
			}),
			encode: SchemaGetter.transform(() => [] as ReadonlyArray<string>),
		}),
	),
);
