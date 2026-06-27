import {
	Array as Arr,
	Effect,
	pipe,
	Record,
	Schema,
	String as Str,
	Struct,
} from "effect";
import { TmuxParseError } from "../Errors.js";

/**
 * Field and record separators for tmux `-F` output. Instead of joining on tab
 * and splitting records on newline — both of which a session/window name (or a
 * pane title) can legitimately contain, silently corrupting the parse — fields
 * are joined with US (0x1f) and each record is terminated with RS (0x1e). This
 * assumes these control bytes do not occur in a field value — true for tmux
 * names and paths, but a pane title or option value is application-controlled
 * and could contain them, in which case that record splits wrong. A known
 * limitation, not a guarantee; there is no fully safe in-band delimiter.
 *
 * The raw bytes are embedded in the format string and pass through tmux
 * literally (verified on tmux 3.6b). Backslash-octal escapes (`\037`) are NOT
 * unescaped for a directly-spawned argv — only inside tmux's own command parser
 * — so the literal bytes must be used here, not the escape sequences.
 */
const UNIT_SEPARATOR = "\x1f";
const RECORD_SEPARATOR = "\x1e";

/**
 * Build a tmux `-F` format string from a struct schema. The field order is the
 * schema's key insertion order (`Struct.keys`), so the emitted `#{...}` tokens
 * line up positionally with the US-separated values tmux returns. The format
 * ends with RS so each record is self-terminating.
 */
export const formatString = <Fields extends Schema.Struct.Fields>(
	schema: Schema.Struct<Fields>,
): string =>
	pipe(
		Struct.keys(schema.fields),
		Arr.map((key) => `#{${key}}`),
		Arr.join(UNIT_SEPARATOR),
		Str.concat(RECORD_SEPARATOR),
	);

/**
 * Split raw tmux stdout into records on the RS terminator. tmux appends its own
 * `\n` after each item, so records are separated by `RS \n`; splitting on RS
 * alone leaves that newline leading each record after the first (stripped here)
 * and avoids a dangling RS when the final record has no trailing `\n`.
 */
export const splitRecords = (stdout: string): ReadonlyArray<string> =>
	pipe(
		stdout,
		Str.split(RECORD_SEPARATOR),
		Arr.map((record, index) =>
			index > 0 && record.startsWith("\n") ? record.slice(1) : record,
		),
		Arr.filter(Str.isNonEmpty),
	);

/**
 * Decode a single US-separated tmux output record against a struct schema.
 * Fails with `TmuxParseError` on a field-count mismatch or a schema-decode
 * rejection (e.g. a non-numeric value where a number is expected).
 */
export const decodeLine = <Fields extends Schema.Struct.Fields>(
	schema: Schema.Struct<Fields>,
): ((
	line: string,
) => Effect.Effect<Schema.Struct<Fields>["Type"], TmuxParseError, never>) => {
	const keys = Struct.keys(schema.fields);
	const fieldCount = Arr.length(keys);
	const decode = Schema.decodeUnknownEffect(schema) as (
		input: unknown,
	) => Effect.Effect<Schema.Struct<Fields>["Type"], unknown, never>;

	return Effect.fnUntraced(function* (line: string) {
		const values = pipe(line, Str.split(UNIT_SEPARATOR));

		if (Arr.length(values) !== fieldCount) {
			return yield* new TmuxParseError({
				line,
				message: `Expected ${fieldCount} fields, got ${Arr.length(values)}`,
				expected: fieldCount,
				got: Arr.length(values),
			});
		}

		const raw = Record.fromEntries(Arr.zip(keys, values));

		return yield* decode(raw).pipe(
			Effect.mapError(
				(cause) =>
					new TmuxParseError({
						line,
						message: "Failed to decode tmux output",
						cause,
					}),
			),
		);
	}) as (
		line: string,
	) => Effect.Effect<Schema.Struct<Fields>["Type"], TmuxParseError, never>;
};
