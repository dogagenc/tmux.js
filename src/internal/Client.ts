import { Context, Effect, Layer } from "effect";
import * as commands from "../commands/index.js";
import { decodeConfig, type TmuxClientConfig } from "./Config.js";
import { TmuxProcess } from "./Process.js";
import type { Prettify } from "./utils/Types.js";
import type {
	FormattedArgs,
	FormattedCommandMeta,
	FormattedRecord,
	TmuxVariable,
} from "./Variables.js";

// Rebuild each command's signature with TmuxProcess removed, widening formatted
// commands via their FormattedCommandMeta phantom.
type ProvidedCommands<T> = {
	readonly [K in keyof T]: T[K] extends FormattedCommandMeta<
		infer O,
		infer A,
		infer Keys,
		infer E
	>
		? <const Inc extends ReadonlyArray<TmuxVariable> = []>(
				...args: FormattedArgs<O, A, Inc>
			) => Effect.Effect<ReadonlyArray<FormattedRecord<Keys, Inc>>, E>
		: T[K] extends (
					...args: infer Args
				) => Effect.Effect<infer A, infer E, TmuxProcess>
			? (...args: Args) => Effect.Effect<A, E>
			: never;
};

type ProcessCommand = (
	...args: ReadonlyArray<never>
) => Effect.Effect<unknown, unknown, TmuxProcess>;

const provideProcessToCommands = <T extends Record<string, ProcessCommand>>(
	registry: T,
	process: TmuxProcess["Service"],
): ProvidedCommands<T> =>
	Object.fromEntries(
		Object.entries(registry).map(([key, command]) => [
			key,
			(...args: ReadonlyArray<never>) =>
				command(...args).pipe(Effect.provideService(TmuxProcess, process)),
		]),
	) as ProvidedCommands<T>;

/**
 * Effect-native tmux service. `yield* TmuxClient` to get an object of command
 * methods, each an `Effect` with the command's tagged errors in its error
 * channel and no `ChildProcessSpawner` left in its requirements — the process
 * dependency is closed over by the layer.
 *
 * Provide it with {@link TmuxClient.layer}. For a Promise-based API, use
 * `new TmuxClient(config)` from `@dogagenc/tmux.js` or `@dogagenc/tmux.js/bun`.
 */
export class TmuxClient extends Context.Service<
	TmuxClient,
	Prettify<ProvidedCommands<typeof commands>>
>()("tmux.js/TmuxClient") {
	/**
	 * Build the `TmuxClient` layer, the Effect-native entry point. Provide it to a
	 * program, then `yield* TmuxClient` to get an object of command methods — each
	 * an `Effect` whose error channel carries the command's tagged failures and
	 * whose process dependency is already closed over (callers never see
	 * `ChildProcessSpawner` in `R`).
	 *
	 * `config` is decoded when the layer is built; invalid config fails the layer
	 * with `TmuxClientConfigError`. A platform layer (e.g. `NodeServices.layer`)
	 * must still be provided for the underlying `ChildProcessSpawner`.
	 *
	 * For a Promise-based API, use `new TmuxClient(config)` from `@dogagenc/tmux.js`
	 * or `@dogagenc/tmux.js/bun` instead.
	 *
	 * @example
	 * ```ts
	 * import { Effect } from "effect";
	 * import { NodeServices } from "@effect/platform-node";
	 * // or
	 * // import { BunServices } from "@effect/platform-bun";
	 * import { TmuxClient } from "@dogagenc/tmux.js/effect";
	 *
	 * const program = Effect.gen(function* () {
	 *   const tmux = yield* TmuxClient;
	 *   return yield* tmux.listSessions();
	 * });
	 *
	 * program.pipe(
	 *   Effect.provide(TmuxClient.layer()),
	 *   Effect.provide(NodeServices.layer),
	 *   // or
	 *   // Effect.provide(BunServices.layer),
	 * );
	 * ```
	 */
	static readonly layer = (config: TmuxClientConfig = {}) =>
		Layer.unwrap(
			decodeConfig(config).pipe(
				Effect.map((decodedConfig) =>
					Layer.effect(
						TmuxClient,
						Effect.gen(function* () {
							const process = yield* TmuxProcess;
							return TmuxClient.of(provideProcessToCommands(commands, process));
						}),
					).pipe(Layer.provide(TmuxProcess.layer(decodedConfig))),
				),
			),
		);
}
