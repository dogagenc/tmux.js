import { Effect } from "effect";
import type { TmuxParseError } from "../Errors.js";
import { decodeLine, formatString, splitRecords } from "./Format.js";
import {
	type DecodedVariables,
	type TmuxVariable,
	variableStruct,
} from "./Variables.js";

/** What resolving an output yields: the `-F` argv it injects and the stdout decode. */
export interface ResolvedOutput<A, E = never> {
	readonly formatArgs: ReadonlyArray<string>;
	readonly decode: (stdout: string) => Effect.Effect<A, E>;
}

/**
 * Self-describing output: `resolve` gives its argv + decode, and its types declare
 * the value `A` / decode error `E` — so `OutputResult`/`OutputError` are lookups and
 * the bound is `Output<unknown, unknown>`. A new output is one {@link makeOutput} call.
 */
export interface Output<A, E = never> {
	readonly type: string;
	readonly resolve: (
		include: ReadonlyArray<TmuxVariable>,
	) => ResolvedOutput<A, E>;
}

/**
 * Formatted `-F` list output, one record per line. The format and decoder are both
 * derived from the variable list, so they can't desync and callers never pass `-F`.
 * Needs a named type so `Command.make` recovers `K` from the
 * `FormattedLinesOutput<infer K>` reference (K rides in the `extends` clause).
 */
export interface FormattedLinesOutput<K extends TmuxVariable>
	extends Output<ReadonlyArray<DecodedVariables<K>>, TmuxParseError> {
	readonly type: "formatted-lines";
}

/** Any output configuration — anything implementing {@link Output}. */
export type TmuxOutputAny = Output<unknown, unknown>;

/** The success value a command with output config `O` resolves to (defaults only). */
export type OutputResult<O> = O extends Output<infer A, infer _E> ? A : never;

/** The error a command's output decoding contributes. */
export type OutputError<O> = O extends Output<infer _A, infer E> ? E : never;

/**
 * Build an output from its resolver; `A`/`E` are inferred from `resolve`. A new
 * simple output type is one factory below — no interface or union to touch.
 */
const makeOutput = <A, E = never, const Tag extends string = string>(
	type: Tag,
	resolve: (include: ReadonlyArray<TmuxVariable>) => ResolvedOutput<A, E>,
): Output<A, E> & { readonly type: Tag } => ({ type, resolve });

const buildFormatted = (
	variables: ReadonlyArray<TmuxVariable>,
): ResolvedOutput<
	ReadonlyArray<DecodedVariables<TmuxVariable>>,
	TmuxParseError
> => {
	const schema = variableStruct(variables);
	const format = formatString(schema);
	const decodeRecord = decodeLine(schema);
	return {
		formatArgs: ["-F", format],
		decode: (stdout) => Effect.forEach(splitRecords(stdout), decodeRecord),
	};
};

export const TmuxOutput = {
	/**
	 * Decode `-F` list output for `variables` (extras via `includeVariables`); the
	 * format is derived from the list, so callers never pass `-F`.
	 */
	formattedLines: <const K extends TmuxVariable>(
		variables: ReadonlyArray<K>,
	): FormattedLinesOutput<K> =>
		makeOutput("formatted-lines", (include) =>
			buildFormatted([...new Set<TmuxVariable>([...variables, ...include])]),
		),

	/** Raw stdout, optionally with the trailing newline stripped. */
	string: (options: { readonly stripTrailingNewline?: boolean } = {}) =>
		makeOutput("string", () => ({
			formatArgs: [],
			decode: (stdout) =>
				Effect.succeed(
					options.stripTrailingNewline && stdout.endsWith("\n")
						? stdout.slice(0, -1)
						: stdout,
				),
		})),

	/**
	 * Boolean from the tmux exit status (0 → `true`, target-not-found → `false`). Read
	 * via `TmuxProcess.runBool`, so this resolution is inert — it only declares the type.
	 */
	boolFromExitCode: () =>
		makeOutput("exit-code", () => ({
			formatArgs: [],
			decode: () => Effect.succeed(true),
		})),
};
