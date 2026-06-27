import { Effect } from "effect";
import type { TmuxParseError } from "../Errors.js";
import { decodeLine, formatString, splitRecords } from "./Format.js";
import {
	type DecodedVariables,
	type TmuxVariable,
	variableStruct,
} from "./Variables.js";

/**
 * A formatted-lines output: tmux `-F` list output, one record per line. The
 * command declares its default `variables`; callers may add more at call time
 * via `includeVariables`. The `-F` format string and the decoder are both
 * derived from the same variable list, so they can never desync and callers
 * never pass `-F`.
 */
export interface FormattedLinesOutput<K extends TmuxVariable> {
	readonly type: "formatted-lines";
	readonly variables: ReadonlyArray<K>;
}

export interface StringOutput {
	readonly type: "string";
	readonly stripTrailingNewline?: boolean;
}

/** Any output configuration. */
export type TmuxOutputAny = FormattedLinesOutput<TmuxVariable> | StringOutput;

/** The success type a command with output config `O` resolves to (defaults only). */
export type OutputResult<O> =
	O extends FormattedLinesOutput<infer K>
		? ReadonlyArray<DecodedVariables<K>>
		: O extends StringOutput
			? string
			: never;

/** The error type contributed by decoding output config `O`. */
export type OutputError<O> =
	O extends FormattedLinesOutput<TmuxVariable> ? TmuxParseError : never;

export const TmuxOutput = {
	/**
	 * Decode tmux `-F` list output (one record per line) for the given default
	 * `variables` (keys of `TmuxVariables`). The `-F` format string is derived
	 * from the same list, so callers never pass a format and the decoder cannot
	 * desync. Callers can pull in extra variables via `includeVariables`.
	 */
	formattedLines: <const K extends TmuxVariable>(
		variables: ReadonlyArray<K>,
	): FormattedLinesOutput<K> => ({
		type: "formatted-lines",
		variables,
	}),
	string: (
		options: { readonly stripTrailingNewline?: boolean } = {},
	): StringOutput => ({
		type: "string",
		...options,
	}),
};

const buildFormatted = (variables: ReadonlyArray<TmuxVariable>) => {
	const schema = variableStruct(variables);
	const format = formatString(schema);
	const decodeRecord = decodeLine(schema);
	return {
		formatArgs: ["-F", format] as ReadonlyArray<string>,
		decode: (stdout: string) =>
			Effect.forEach(splitRecords(stdout), decodeRecord),
	};
};

/**
 * Resolve an output config into the argv it injects (`-F <format>`) and the
 * decode step applied to tmux stdout. For formatted-lines the resolution is a
 * function of the caller's `includeVariables`; the common no-include path is
 * precomputed once.
 */
export const resolveOutput = (output: TmuxOutputAny) => {
	if (output.type === "formatted-lines") {
		const base = buildFormatted(output.variables);
		return {
			resolve: (include: ReadonlyArray<TmuxVariable>) =>
				include.length === 0
					? base
					: buildFormatted([
							...new Set<TmuxVariable>([...output.variables, ...include]),
						]),
		};
	}

	const resolved = {
		formatArgs: [] as ReadonlyArray<string>,
		decode: (stdout: string) =>
			Effect.succeed(
				output.stripTrailingNewline && stdout.endsWith("\n")
					? stdout.slice(0, -1)
					: stdout,
			),
	};
	return {
		resolve: (_include: ReadonlyArray<TmuxVariable>) => resolved,
	};
};
