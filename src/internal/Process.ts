import { Context, Effect, Fiber, Layer, type Scope, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import {
	TmuxCommandError,
	TmuxExecutableNotFound,
	TmuxProcessError,
	TmuxServerNotRunning,
	TmuxTargetNotFound,
} from "../Errors.js";
import type { TmuxClientConfig } from "./Config.js";

const NO_SERVER =
	/no server running|error connecting to .*\(No such file or directory\)/i;
const TARGET_NOT_FOUND = /can't find (session|window|pane|client):/i;

export type TmuxProcessRunError =
	| TmuxExecutableNotFound
	| TmuxProcessError
	| TmuxServerNotRunning
	| TmuxTargetNotFound
	| TmuxCommandError;

/**
 * Classify a nonzero tmux exit from its stderr. Order matters: the no-server
 * rule must precede the target-not-found rule, because one no-server form
 * (`error connecting … (No such file or directory)`) also contains "No such".
 *
 * These patterns match tmux's English stderr (validated on tmux 3.6b). A
 * different tmux version or a non-English locale may word these differently, in
 * which case the line falls through to `TmuxCommandError` — the most likely
 * source of a "wrong error tag" report. Adjust the patterns, don't add silent
 * fallbacks.
 */
const classify = (
	stderr: string,
	exitCode: ChildProcessSpawner.ExitCode,
): TmuxServerNotRunning | TmuxTargetNotFound | TmuxCommandError => {
	if (NO_SERVER.test(stderr)) return new TmuxServerNotRunning({ stderr });
	if (TARGET_NOT_FOUND.test(stderr)) return new TmuxTargetNotFound({ stderr });
	return new TmuxCommandError({ stderr, exitCode });
};

/** Decode a byte stream to text and collect it into a single string. */
const collect = <E, R>(stream: Stream.Stream<Uint8Array, E, R>) =>
	stream.pipe(Stream.decodeText(), Stream.mkString);

export class TmuxProcess extends Context.Service<
	TmuxProcess,
	{
		readonly run: (
			args: ReadonlyArray<string>,
		) => Effect.Effect<string, TmuxProcessRunError>;
	}
>()("tmux-js/TmuxProcess") {
	static readonly layer = (options: TmuxClientConfig = {}) =>
		Layer.effect(
			TmuxProcess,
			Effect.gen(function* () {
				const executable = options.executable ?? "tmux";
				const globalArgs = [
					...(options.socketName ? ["-L", options.socketName] : []),
					...(options.socketPath ? ["-S", options.socketPath] : []),
				];
				const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;

				/**
				 * Spawn `tmux <args>`, draining stdout and stderr concurrently (forking
				 * both avoids a pipe-buffer deadlock), then classify the result by exit
				 * code.
				 *
				 * Returns the raw stdout string on a clean exit (record/field splitting is
				 * the caller's job, since a field value may contain newlines), otherwise
				 * fails with a tagged error.
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
						return yield* classify(stderr, exitCode);
					}
					return stdout;
				}, Effect.scoped);

				return TmuxProcess.of({ run });
			}),
		);
}
