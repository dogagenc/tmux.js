import { Effect, Layer, type PlatformError, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { TmuxClient, type TmuxClientConfig } from "../../src/exports/effect";

export const encoder = new TextEncoder();

export const byteStream = (
	text: string,
): Stream.Stream<Uint8Array, PlatformError.PlatformError> =>
	Stream.fromIterable(text === "" ? [] : [encoder.encode(text)]);

// Build a fake ChildProcessHandle from controlled stdout/stderr/exit code.
// Fields the run path does not touch are stubbed; they throw if exercised.
export const fakeHandle = (opts: {
	stdout: string;
	stderr: string;
	exitCode: number;
}): ChildProcessSpawner.ChildProcessHandle => {
	const notUsed = (method: string) =>
		Effect.die(new Error(`fake handle: ${method} should not be called`));
	return ChildProcessSpawner.makeHandle({
		pid: ChildProcessSpawner.ProcessId(1),
		exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(opts.exitCode)),
		isRunning: Effect.succeed(false),
		kill: () => Effect.void,
		stdin: notUsed("stdin") as never,
		stdout: byteStream(opts.stdout),
		stderr: byteStream(opts.stderr),
		all: byteStream(opts.stdout + opts.stderr),
		getInputFd: () => notUsed("getInputFd") as never,
		getOutputFd: () => Stream.empty,
		unref: notUsed("unref") as never,
	});
};

// Handle whose exitCode await fails with a platform error — exercises the
// post-spawn TmuxProcessError path (exitCode is awaited before the stream joins).
export const fakeHandleFailingExit = (
	error: PlatformError.PlatformError,
): ChildProcessSpawner.ChildProcessHandle => {
	const notUsed = (method: string) =>
		Effect.die(new Error(`fake handle: ${method} should not be called`));
	return ChildProcessSpawner.makeHandle({
		pid: ChildProcessSpawner.ProcessId(1),
		exitCode: Effect.fail(error),
		isRunning: Effect.succeed(false),
		kill: () => Effect.void,
		stdin: notUsed("stdin") as never,
		stdout: byteStream(""),
		stderr: byteStream(""),
		all: byteStream(""),
		getInputFd: () => notUsed("getInputFd") as never,
		getOutputFd: () => Stream.empty,
		unref: notUsed("unref") as never,
	});
};

export const fakeHandleFailingStream = (
	which: "stdout" | "stderr",
	error: PlatformError.PlatformError,
): ChildProcessSpawner.ChildProcessHandle => {
	const notUsed = (method: string) =>
		Effect.die(new Error(`fake handle: ${method} should not be called`));
	return ChildProcessSpawner.makeHandle({
		pid: ChildProcessSpawner.ProcessId(1),
		exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(0)),
		isRunning: Effect.succeed(false),
		kill: () => Effect.void,
		stdin: notUsed("stdin") as never,
		stdout: which === "stdout" ? Stream.fail(error) : byteStream(""),
		stderr: which === "stderr" ? Stream.fail(error) : byteStream(""),
		all: byteStream(""),
		getInputFd: () => notUsed("getInputFd") as never,
		getOutputFd: () => Stream.empty,
		unref: notUsed("unref") as never,
	});
};

export const fakeHandleChunked = (
	chunks: ReadonlyArray<Uint8Array>,
): ChildProcessSpawner.ChildProcessHandle => {
	const notUsed = (method: string) =>
		Effect.die(new Error(`fake handle: ${method} should not be called`));
	return ChildProcessSpawner.makeHandle({
		pid: ChildProcessSpawner.ProcessId(1),
		exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(0)),
		isRunning: Effect.succeed(false),
		kill: () => Effect.void,
		stdin: notUsed("stdin") as never,
		stdout: Stream.fromIterable(chunks),
		stderr: byteStream(""),
		all: byteStream(""),
		getInputFd: () => notUsed("getInputFd") as never,
		getOutputFd: () => Stream.empty,
		unref: notUsed("unref") as never,
	});
};

// Spawner that yields the given handle for every spawn.
export const spawnerWith = (handle: ChildProcessSpawner.ChildProcessHandle) =>
	Layer.succeed(
		ChildProcessSpawner.ChildProcessSpawner,
		ChildProcessSpawner.make(() => Effect.succeed(handle)),
	);

// Spawner whose spawn fails with a platform error (e.g. binary missing).
export const spawnerFailing = (error: PlatformError.PlatformError) =>
	Layer.succeed(
		ChildProcessSpawner.ChildProcessSpawner,
		ChildProcessSpawner.make(() => Effect.fail(error)),
	);

// TmuxClient.layer builds commands through TmuxProcess, so the fake spawner is
// provided into the layer dependency rather than exposed by each method.
export const tmuxLayer = (
	spawner: Layer.Layer<ChildProcessSpawner.ChildProcessSpawner>,
	options: TmuxClientConfig = {},
) => TmuxClient.layer(options).pipe(Layer.provide(spawner));

export const tmuxFrom = (opts: {
	stdout: string;
	stderr: string;
	exitCode: number;
}) => tmuxLayer(spawnerWith(fakeHandle(opts)));

// Spawner that records the argv tmux is invoked with, so flag mapping can be
// asserted without running a real tmux process.
export const capturingTmux = (
	opts: {
		stdout: string;
		stderr: string;
		exitCode: number;
	},
	options: TmuxClientConfig = {},
) => {
	const captured: { command: string; args: ReadonlyArray<string> } = {
		command: "",
		args: [],
	};
	const spawner = Layer.succeed(
		ChildProcessSpawner.ChildProcessSpawner,
		ChildProcessSpawner.make((command) => {
			if (ChildProcess.isStandardCommand(command)) {
				captured.command = command.command;
				captured.args = command.args;
			}
			return Effect.succeed(fakeHandle(opts));
		}),
	);
	return { layer: tmuxLayer(spawner, options), captured };
};

// Drop the schema-owned `-F <format>` tail so assertions focus on the flags.
export const flagArgs = (args: ReadonlyArray<string>) =>
	args.slice(0, args.indexOf("-F"));

// Fields are US-separated; tmux terminates each record with RS + its own
// newline. Mirror that wire shape so the fakes feed TmuxProcess.run real tmux output.
export const US = "\x1f";
export const RS = "\x1e";

export const row = (...fields: ReadonlyArray<string>) => fields.join(US);

export const lines = (...rows: ReadonlyArray<string>) =>
	rows.map((r) => `${r}${RS}\n`).join("");
