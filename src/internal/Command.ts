import { Effect, Schema } from "effect";
import { TmuxCommandOptionsError, type TmuxTargetNotFound } from "../Errors.js";
import type {
	FormattedLinesOutput,
	OutputError,
	OutputResult,
	TmuxOutputAny,
} from "./Output.js";
import { TmuxProcess, type TmuxProcessRunError } from "./Process.js";
import {
	type FormattedArgs,
	type FormattedCommandMeta,
	type FormattedRecord,
	IncludeVariablesField,
	type TmuxVariable,
} from "./Variables.js";

const EmptyFlags = Schema.Struct({});

export interface CommandArgs<Args extends ReadonlyArray<unknown>> {
	readonly count: number;
	readonly decode: (
		input: ReadonlyArray<unknown>,
	) => Effect.Effect<Args, unknown>;
	readonly encode: (...args: Args) => ReadonlyArray<string>;
}

/** A declarative tmux command definition: subcommand, flags, args, and output shape. */
export interface CommandSpec<
	Flags extends Schema.Top,
	O extends TmuxOutputAny,
	Args extends ReadonlyArray<unknown>,
> {
	readonly cmd: string;
	readonly flags?: Flags;
	readonly args?: CommandArgs<Args>;
	readonly output: O;
}

type OptionsFn<Options, A, E> =
	Record<never, never> extends Options
		? (options?: Options) => Effect.Effect<A, E, TmuxProcess>
		: (options: Options) => Effect.Effect<A, E, TmuxProcess>;

type ArgsFn<Options, Args extends ReadonlyArray<unknown>, A, E> =
	Record<never, never> extends Options
		? (
				...args: [...Args, options?: Options]
			) => Effect.Effect<A, E, TmuxProcess>
		: (
				...args: [...Args, options: Options]
			) => Effect.Effect<A, E, TmuxProcess>;

/**
 * Method shape for a formatted-lines command: generic over the caller's
 * `includeVariables` array, so the record type widens and a typo is a compile
 * error. Extends {@link FormattedCommandMeta} so the facades can rebuild it.
 */
export interface FormattedFn<
	Options,
	Args extends ReadonlyArray<unknown>,
	K extends TmuxVariable,
	E,
> extends FormattedCommandMeta<Options, Args, K, E> {
	<const Inc extends ReadonlyArray<TmuxVariable> = []>(
		...args: FormattedArgs<Options, Args, Inc>
	): Effect.Effect<ReadonlyArray<FormattedRecord<K, Inc>>, E, TmuxProcess>;
}

/**
 * The method shape a built command exposes. Formatted-lines commands get the
 * variable-aware generic shape; otherwise, with no positional args callers get
 * the `(options?)` shape and with positional args options come last.
 */
type CommandFn<Options, Args extends ReadonlyArray<unknown>, O, E> =
	O extends FormattedLinesOutput<infer K>
		? FormattedFn<Options, Args, K, E>
		: Args extends []
			? OptionsFn<Options, OutputResult<O>, E>
			: ArgsFn<Options, Args, OutputResult<O>, E>;

/**
 * The process error a command with output `O` surfaces. Exit-code outputs run via
 * `runBool`, which absorbs target-not-found into `false`, so it's excluded here.
 */
type CommandRunError<O> = O extends { readonly type: "exit-code" }
	? Exclude<TmuxProcessRunError, TmuxTargetNotFound>
	: TmuxProcessRunError;

const flattenFlagArgs = (encoded: object): ReadonlyArray<string> =>
	Object.values(encoded).flatMap((value) =>
		Array.isArray(value) ? value : [],
	);

export const TmuxCommand = {
	args: <
		S extends Schema.Top,
		Args extends ReadonlyArray<unknown> = S["Type"] & ReadonlyArray<unknown>,
	>(
		count: number,
		schema: S,
		encode: (...args: Args) => ReadonlyArray<string>,
	): CommandArgs<Args> => ({
		count,
		decode: Schema.decodeUnknownEffect(schema) as (
			input: ReadonlyArray<unknown>,
		) => Effect.Effect<Args, unknown>,
		encode,
	}),

	/**
	 * Build a tmux command method from a declarative spec. The returned function
	 * validates caller flags / args before spawning tmux, builds argv, runs tmux,
	 * and decodes stdout.
	 */
	make: <
		Flags extends Schema.Top = typeof EmptyFlags,
		O extends TmuxOutputAny = TmuxOutputAny,
		Args extends ReadonlyArray<unknown> = [],
	>(
		name: string,
		spec: CommandSpec<Flags, O, Args>,
	): CommandFn<
		Flags["Type"],
		Args,
		O,
		CommandRunError<O> | OutputError<O> | TmuxCommandOptionsError
	> => {
		const flags = spec.flags ?? (EmptyFlags as unknown as Flags);
		// Formatted commands accept `includeVariables`; mixing it into the flags
		// struct lets the same encode pass validate variable names AND reject it as
		// an excess property on non-formatted commands — no manual checks.
		const encodeSchema =
			spec.output.type === "formatted-lines"
				? Schema.Struct({
						...(flags as unknown as { fields: Schema.Struct.Fields }).fields,
						includeVariables: IncludeVariablesField,
					})
				: flags;
		const encodeFlags = Schema.encodeUnknownEffect(encodeSchema, {
			onExcessProperty: "error",
		});
		const commandArgs =
			spec.args ??
			(TmuxCommand.args(
				0,
				Schema.Tuple([]),
				() => [],
			) as unknown as CommandArgs<Args>);

		const run = Effect.fn(`TmuxClient.${name}`)(function* (
			...input: Array<unknown>
		) {
			const rawPositionals = input.slice(0, commandArgs.count);
			while (rawPositionals.length > 0 && rawPositionals.at(-1) === undefined) {
				rawPositionals.pop();
			}
			const options = input[commandArgs.count] as
				| Record<string, unknown>
				| undefined;
			const positionals = yield* commandArgs.decode(rawPositionals).pipe(
				Effect.mapError(
					(cause) =>
						new TmuxCommandOptionsError({
							command: spec.cmd,
							message: `Invalid arguments for \`${spec.cmd}\``,
							cause,
						}),
				),
			);

			const encodedFlags = yield* encodeFlags(options ?? {}).pipe(
				Effect.mapError(
					(cause) =>
						new TmuxCommandOptionsError({
							command: spec.cmd,
							message: `Invalid options for \`${spec.cmd}\``,
							cause,
						}),
				),
			);

			// Validated by the encode pass above; read the raw value to build `-F`.
			const { formatArgs, decode } = spec.output.resolve(
				(options?.includeVariables as
					| ReadonlyArray<TmuxVariable>
					| undefined) ?? [],
			);
			const tmux = yield* TmuxProcess;
			const args = [
				spec.cmd,
				...flattenFlagArgs(encodedFlags as object),
				...formatArgs,
				...commandArgs.encode(...positionals),
			];
			if (spec.output.type === "exit-code") {
				return yield* tmux.runBool(args);
			}
			const stdout = yield* tmux.run(args);
			return yield* decode(stdout);
		});

		// Single boundary cast. Runtime validation is schema-backed; call sites
		// stay typed through CommandFn's inferred Options/A/E.
		return run as unknown as CommandFn<
			Flags["Type"],
			Args,
			O,
			CommandRunError<O> | OutputError<O> | TmuxCommandOptionsError
		>;
	},
};
