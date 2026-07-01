import { describe, expect, it } from "@effect/vitest";
import { Effect, PlatformError } from "effect";
import {
	TmuxCommandError,
	TmuxExecutableNotFound,
	TmuxProcessError,
	TmuxTargetNotFound,
} from "../../src/Errors";
import { TmuxClient } from "../../src/exports/effect";
import {
	encoder,
	fakeHandleChunked,
	fakeHandleFailingExit,
	fakeHandleFailingStream,
	lines,
	row,
	spawnerFailing,
	spawnerWith,
	tmuxFrom,
	tmuxLayer,
} from "../utils";

describe("TmuxProcess exit classification", () => {
	it.effect("fails with TmuxServerNotRunning on a no-server exit", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			const error = yield* Effect.flip(tmux.listSessions());
			expect(error._tag).toBe("TmuxServerNotRunning");
		}).pipe(
			Effect.provide(
				tmuxFrom({
					stdout: "",
					stderr: "no server running on /tmp/tmux-501/default",
					exitCode: 1,
				}),
			),
		),
	);

	it.effect("fails with TmuxServerNotRunning on the other no-server form", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			const error = yield* Effect.flip(tmux.listSessions());
			expect(error._tag).toBe("TmuxServerNotRunning");
		}).pipe(
			Effect.provide(
				tmuxFrom({
					stdout: "",
					stderr:
						"error connecting to /tmp/tmux-501/default (No such file or directory)",
					exitCode: 1,
				}),
			),
		),
	);

	it.effect("fails with TmuxTargetNotFound on a can't-find exit", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			const error = yield* Effect.flip(tmux.listSessions());
			expect(error).toBeInstanceOf(TmuxTargetNotFound);
		}).pipe(
			Effect.provide(
				tmuxFrom({
					stdout: "",
					stderr: "can't find session: missing_xyz",
					exitCode: 1,
				}),
			),
		),
	);

	it.effect(
		"fails with TmuxCommandError for an unclassified nonzero exit",
		() =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(tmux.listSessions());
				expect(error).toBeInstanceOf(TmuxCommandError);
			}).pipe(
				Effect.provide(
					tmuxFrom({
						stdout: "",
						stderr: "unknown command: bogus",
						exitCode: 1,
					}),
				),
			),
	);
});

describe("TmuxProcess spawn and stream failures", () => {
	const platformError = (method: string) =>
		PlatformError.systemError({
			_tag: "Unknown",
			module: "ChildProcessSpawner",
			method,
			description: `${method} failed`,
		});

	it.effect("fails with TmuxExecutableNotFound when tmux is missing", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			const error = yield* Effect.flip(tmux.listSessions());
			expect(error).toBeInstanceOf(TmuxExecutableNotFound);
		}).pipe(
			Effect.provide(
				tmuxLayer(
					spawnerFailing(
						PlatformError.systemError({
							_tag: "NotFound",
							module: "ChildProcessSpawner",
							method: "spawn",
							description: "spawn tmux ENOENT",
						}),
					),
				),
			),
		),
	);

	it.effect("maps a non-NotFound spawn failure to TmuxProcessError", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			const error = yield* Effect.flip(tmux.listSessions());
			expect(error).toBeInstanceOf(TmuxProcessError);
		}).pipe(Effect.provide(tmuxLayer(spawnerFailing(platformError("spawn"))))),
	);

	it.effect("fails with TmuxProcessError when exitCode await fails", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			const error = yield* Effect.flip(tmux.listSessions());
			expect(error).toBeInstanceOf(TmuxProcessError);
		}).pipe(
			Effect.provide(
				tmuxLayer(
					spawnerWith(
						fakeHandleFailingExit(
							PlatformError.systemError({
								_tag: "Unknown",
								module: "ChildProcessSpawner",
								method: "exitCode",
								description: "exit code unavailable",
							}),
						),
					),
				),
			),
		),
	);

	it.effect("maps a stdout-stream read failure to TmuxProcessError", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			const error = yield* Effect.flip(tmux.listSessions());
			expect(error).toBeInstanceOf(TmuxProcessError);
		}).pipe(
			Effect.provide(
				tmuxLayer(
					spawnerWith(
						fakeHandleFailingStream("stdout", platformError("stdout")),
					),
				),
			),
		),
	);

	it.effect("maps a stderr-stream read failure to TmuxProcessError", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			const error = yield* Effect.flip(tmux.listSessions());
			expect(error).toBeInstanceOf(TmuxProcessError);
		}).pipe(
			Effect.provide(
				tmuxLayer(
					spawnerWith(
						fakeHandleFailingStream("stderr", platformError("stderr")),
					),
				),
			),
		),
	);

	it.effect(
		"reassembles stdout split across byte chunks (incl. mid-glyph)",
		() =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const sessions = yield* tmux.listSessions();
				expect(sessions.map((s) => s.session_name)).toEqual(["🚀main", "work"]);
			}).pipe(
				Effect.provide(
					(() => {
						const wire = lines(
							row("$0", "🚀main", "3", "1700000000", "0", "", "2"),
							row("$1", "work", "1", "1700000500", "0", "", "0"),
						);
						const bytes = encoder.encode(wire);
						const chunks = [bytes.slice(0, 4), bytes.slice(4)];
						return tmuxLayer(spawnerWith(fakeHandleChunked(chunks)));
					})(),
				),
			),
	);
});
