import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { TmuxCommandOptionsError } from "../../src/Errors";
import { TmuxClient } from "../../src/exports/effect";
import { capturingTmux, flagArgs, lines, row, tmuxFrom } from "../utils";

describe("TmuxClient.listWindows", () => {
	it.effect("decodes windows from composed session + window output", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			const windows = yield* tmux.listWindows();

			expect(windows).toEqual([
				{
					session_id: "$0",
					session_name: "main",
					session_windows: 2,
					session_attached: 1,
					session_created: new Date(1_700_000_000 * 1000),
					window_id: "@0",
					window_index: 0,
					window_name: "editor",
					window_active: true,
				},
				{
					session_id: "$0",
					session_name: "main",
					session_windows: 2,
					session_attached: 1,
					session_created: new Date(1_700_000_000 * 1000),
					window_id: "@1",
					window_index: 1,
					window_name: "shell",
					window_active: false,
				},
			]);
		}).pipe(
			Effect.provide(
				tmuxFrom({
					stdout: lines(
						row("$0", "main", "2", "1", "1700000000", "@0", "0", "editor", "1"),
						row("$0", "main", "2", "1", "1700000000", "@1", "1", "shell", "0"),
					),
					stderr: "",
					exitCode: 0,
				}),
			),
		),
	);

	// Unlike listSessions, listWindows does NOT swallow a no-server exit (A6).
	it.effect("surfaces TmuxServerNotRunning instead of returning []", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			const error = yield* Effect.flip(tmux.listWindows());
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
});

describe("argv flag mapping (listWindows)", () => {
	const empty = { stdout: "", stderr: "", exitCode: 0 };

	// Run a command against a capturing spawner and return the emitted flags
	// (everything before the schema-owned `-F`).
	const captureFlags = (
		run: (tmux: TmuxClient["Service"]) => Effect.Effect<unknown, unknown>,
	) => {
		const harness = capturingTmux(empty);
		return Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			yield* run(tmux);
			return flagArgs(harness.captured.args);
		}).pipe(Effect.provide(harness.layer));
	};

	it.effect("listWindows() emits no flags", () =>
		Effect.gen(function* () {
			expect(yield* captureFlags((tmux) => tmux.listWindows())).toEqual([
				"list-windows",
			]);
		}),
	);

	it.effect("listWindows({ targetSession }) emits -t", () =>
		Effect.gen(function* () {
			expect(
				yield* captureFlags((tmux) =>
					tmux.listWindows({ targetSession: "main" }),
				),
			).toEqual(["list-windows", "-t", "main"]);
		}),
	);

	it.effect("listWindows({ all }) emits -a", () =>
		Effect.gen(function* () {
			expect(
				yield* captureFlags((tmux) => tmux.listWindows({ all: true })),
			).toEqual(["list-windows", "-a"]);
		}),
	);

	it.effect("listWindows emits -a, -f, -t in flag-declaration order", () =>
		Effect.gen(function* () {
			expect(
				yield* captureFlags((tmux) =>
					tmux.listWindows({ all: true, filter: "x", targetSession: "main" }),
				),
			).toEqual(["list-windows", "-a", "-f", "x", "-t", "main"]);
		}),
	);
});

describe("options validation (listWindows)", () => {
	const empty = { stdout: "", stderr: "", exitCode: 0 };

	it.effect("rejects an unknown option key with TmuxCommandOptionsError", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			const error = yield* Effect.flip(
				// Typo'd key: an untyped JS caller's mistake must not be silently ignored.
				tmux.listWindows({ targetSesson: "main" } as never),
			);
			expect(error).toBeInstanceOf(TmuxCommandOptionsError);
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect(
		"rejects a wrong-typed option value with TmuxCommandOptionsError",
		() =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.listWindows({ all: "yes" } as never),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
			}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect(
		"rejects an empty string option value with TmuxCommandOptionsError",
		() =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.listWindows({ targetSession: "" } as never),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
			}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("does not spawn tmux when options are invalid", () =>
		Effect.gen(function* () {
			// The capturing spawner records argv; an invalid-options failure must
			// occur before any spawn, so nothing is captured.
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* Effect.flip(tmux.listWindows({ nope: 1 } as never));
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
