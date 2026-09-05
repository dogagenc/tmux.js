import {
	Context,
	Effect,
	Fiber,
	Layer,
	Match,
	type Scope,
	Stream,
} from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import {
	TmuxCommandError,
	TmuxExecutableNotFound,
	TmuxProcessError,
	TmuxServerNotRunning,
	TmuxTargetNotFound,
} from "../Errors.js";
import type { TmuxClientConfig } from "./Config.js";

export type TmuxProcessRunError =
	| TmuxExecutableNotFound
	| TmuxProcessError
	| TmuxServerNotRunning
	| TmuxTargetNotFound
	| TmuxCommandError;

/**
 * Map a nonzero tmux exit to a tagged error from its English stderr (tmux 3.6b).
 * Order matters: no-server before target-not-found (a no-server form also contains
 * "No such"). Unmatched stderr falls through to `TmuxCommandError`.
 */
const errorFromStderr = (
	stderr: string,
	exitCode: ChildProcessSpawner.ExitCode,
): TmuxServerNotRunning | TmuxTargetNotFound | TmuxCommandError =>
	Match.value(stderr).pipe(
		Match.when(
			(s) =>
				/no server running|error connecting to .*\(No such file or directory\)/i.test(
					s,
				),
			() => new TmuxServerNotRunning({ stderr }),
		),
		Match.when(
			(s) => /can't find (session|window|pane|client):/i.test(s),
			() => new TmuxTargetNotFound({ stderr }),
		),
		Match.orElse(() => new TmuxCommandError({ stderr, exitCode })),
	);

/** Decode a byte stream to text and collect it into a single string. */
const collect = <E, R>(stream: Stream.Stream<Uint8Array, E, R>) =>
	stream.pipe(Stream.decodeText(), Stream.mkString);

export class TmuxProcess extends Context.Service<
	TmuxProcess,
	{
		readonly run: (
			args: ReadonlyArray<string>,
		) => Effect.Effect<string, TmuxProcessRunError>;
		readonly runBool: (
			args: ReadonlyArray<string>,
		) => Effect.Effect<
			boolean,
			Exclude<TmuxProcessRunError, TmuxTargetNotFound>
		>;
	}
>()("tmux.ts/TmuxProcess") {
	static readonly layer = (options: TmuxClientConfig = {}) =>
		Layer.effect(
			TmuxProcess,
			Effect.gen(function* () {
				const executable = options.executable ?? "tmux";
				const globalArgs = [
					...(options.socketName ? ["-L", options.socketName] : []),
					...(options.socketPath ? ["-S", options.socketPath] : []),
					...(options.configFile ? ["-f", options.configFile] : []),
				];
				const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;

				/**
				 * Spawn `tmux <args>`, draining stdout/stderr concurrently (forking both
				 * avoids a pipe-buffer deadlock). Returns raw stdout on a clean exit; a
				 * nonzero exit becomes a tagged error via `errorFromStderr`.
				 */
				const run = Effect.fn("TmuxProcess.run")(function* (
					args: ReadonlyArray<string>,
				): Effect.fn.Return<string, TmuxProcessRunError, Scope.Scope> {
					const tmuxCommand = ChildProcess.make(executable, [
						...globalArgs,
						...args,
					]);

					const handle = yield* spawner
						.spawn(tmuxCommand)
						.pipe(
							Effect.mapError((cause) =>
								cause.reason._tag === "NotFound"
									? new TmuxExecutableNotFound({ executable, cause })
									: new TmuxProcessError({ cause }),
							),
						);

					const outFiber = yield* collect(handle.stdout).pipe(
						Effect.forkScoped,
					);
					const errFiber = yield* collect(handle.stderr).pipe(
						Effect.forkScoped,
					);

					const exitCode = yield* handle.exitCode.pipe(
						Effect.mapError((cause) => new TmuxProcessError({ cause })),
					);

					const stdout = yield* Fiber.join(outFiber).pipe(
						Effect.mapError((cause) => new TmuxProcessError({ cause })),
					);

					const stderr = yield* Fiber.join(errFiber).pipe(
						Effect.mapError((cause) => new TmuxProcessError({ cause })),
					);

					if (exitCode !== ChildProcessSpawner.ExitCode(0)) {
						return yield* errorFromStderr(stderr, exitCode);
					}
					return stdout;
				}, Effect.scoped);

				/**
				 * Boolean predicate (e.g. `has-session`) from `run`: exit 0 → `true`,
				 * target-not-found → `false`, any other error propagates (never a false).
				 */
				const runBool = (args: ReadonlyArray<string>) =>
					run(args).pipe(
						Effect.as(true),
						Effect.catchTag("TmuxTargetNotFound", () => Effect.succeed(false)),
					);

				return TmuxProcess.of({ run, runBool });
			}),
		);
}
