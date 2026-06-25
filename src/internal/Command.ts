import { Effect, Schema } from "effect";
import { TmuxCommandOptionsError } from "../Errors.js";
import {
	type OutputError,
	type OutputResult,
	resolveOutput,
	type TmuxOutputAny,
} from "./Output.js";
import { TmuxProcess, type TmuxProcessRunError } from "./Process.js";

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
 * The method shape a built command exposes. With no positional args, callers get
 * the existing `(options?)` shape; with positional args, options come last.
 */
type CommandFn<
	Options,
	Args extends ReadonlyArray<unknown>,
	A,
	E,
> = Args extends [] ? OptionsFn<Options, A, E> : ArgsFn<Options, Args, A, E>;

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
		OutputResult<O>,
		TmuxProcessRunError | OutputError<O> | TmuxCommandOptionsError
	> => {
		const flags = spec.flags ?? (EmptyFlags as unknown as Flags);
		const encodeFlags = Schema.encodeUnknownEffect(flags, {
			onExcessProperty: "error",
		});
		const { formatArgs, decode } = resolveOutput(spec.output);
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
			const options = input[commandArgs.count] as object | undefined;

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

			const tmux = yield* TmuxProcess;
			const args = [
				spec.cmd,
				...flattenFlagArgs(encodedFlags as object),
				...formatArgs,
				...commandArgs.encode(...positionals),
			];
			const stdout = yield* tmux.run(args);
			return yield* decode(stdout);
		});

		// Single boundary cast. Runtime validation is schema-backed; call sites
		// stay typed through CommandFn's inferred Options/A/E.
		return run as unknown as CommandFn<
			Flags["Type"],
			Args,
			OutputResult<O>,
			TmuxProcessRunError | OutputError<O> | TmuxCommandOptionsError
		>;
	},
};
