import { Schema, SchemaTransformation } from "effect";

/**
 * tmux format field catalog. Each entry maps a tmux format variable name to the
 * codec that decodes its raw string value. Commands compose these records by
 * spread (e.g. `{ ...SessionFields, ...WindowFields }`) so cross-entity field
 * sets are built without duplicating definitions.
 */

const DateFromSecondsString = Schema.FiniteFromString.pipe(
	Schema.decodeTo(
		Schema.DateValid,
		SchemaTransformation.transform({
			decode: (seconds) => new Date(seconds * 1000),
			encode: (date) => Math.floor(date.getTime() / 1000),
		}),
	),
);

const BooleanFromBitString = Schema.FiniteFromString.pipe(
	Schema.decodeTo(Schema.BooleanFromBit),
);

/** Session-entity tmux format fields. */
export const SessionFields = {
	session_id: Schema.String,
	session_name: Schema.String,
	session_windows: Schema.FiniteFromString,
	// COUNT of attached clients (0 when detached, can be >1) — NOT a 0/1 flag.
	session_attached: Schema.FiniteFromString,
	session_created: DateFromSecondsString,
} as const;

/** Window-entity tmux format fields. */
export const WindowFields = {
	window_id: Schema.String,
	window_index: Schema.FiniteFromString,
	window_name: Schema.String,
	window_active: BooleanFromBitString,
} as const;
