import { Effect, Schema } from "effect";
import type { TmuxParseError } from "../Errors.js";
import { decodeLine, formatString, splitRecords } from "./Format.js";

/**
 * A formatted-lines output: tmux `-F` list output, one record per line, decoded
 * against `schema`. The `-F` format string is derived from the same schema, so
 * the decoder can never desync from the format and callers never pass `-F`.
 */
export interface FormattedLinesOutput<Fields extends Schema.Struct.Fields> {
	readonly type: "formatted-lines";
	readonly schema: Schema.Struct<Fields>;
}

export interface StringOutput {
	readonly type: "string";
	readonly stripTrailingNewline?: boolean;
}

/** Any output configuration. */
export type TmuxOutputAny =
	| FormattedLinesOutput<Schema.Struct.Fields>
	| StringOutput;

/** The success type a command with output config `O` resolves to. */
export type OutputResult<O> =
	O extends FormattedLinesOutput<infer F>
		? ReadonlyArray<Schema.Struct.Type<F>>
		: O extends StringOutput
			? string
			: never;

/** The error type contributed by decoding output config `O`. */
export type OutputError<O> =
	O extends FormattedLinesOutput<Schema.Struct.Fields> ? TmuxParseError : never;

export const TmuxOutput = {
	/**
	 * Decode tmux `-F` list output (one record per line) against `fields`. The
	 * `-F` format string is derived from the same fields, so callers never pass a
	 * format and the decoder cannot desync from it.
	 */
	formattedLines: <Fields extends Schema.Struct.Fields>(
		fields: Fields,
	): FormattedLinesOutput<Fields> => ({
		type: "formatted-lines",
		schema: Schema.Struct(fields),
	}),
	string: (
		options: { readonly stripTrailingNewline?: boolean } = {},
	): StringOutput => ({
		type: "string",
		...options,
	}),
};

/**
 * Resolve an output config into the argv it injects (`-F <format>`) and the
 * decode step applied to tmux stdout.
 */
export const resolveOutput = (output: TmuxOutputAny) => {
	if (output.type === "formatted-lines") {
		const format = formatString(output.schema);
		const decodeRecord = decodeLine(output.schema);
		return {
			formatArgs: ["-F", format] as ReadonlyArray<string>,
			decode: (stdout: string) =>
				Effect.forEach(splitRecords(stdout), decodeRecord),
		};
	}

	return {
		formatArgs: [] as ReadonlyArray<string>,
		decode: (stdout: string) =>
			Effect.succeed(
				output.stripTrailingNewline && stdout.endsWith("\n")
					? stdout.slice(0, -1)
					: stdout,
			),
	};
};
