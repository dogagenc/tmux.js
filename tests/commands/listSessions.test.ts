import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { TmuxParseError } from "../../src/Errors";
import { TmuxClient } from "../../src/exports/effect";
import { capturingTmux, flagArgs, lines, row, tmuxFrom } from "../utils";

describe("TmuxClient.listSessions", () => {
	it.effect("decodes sessions from US/RS-separated output", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			const sessions = yield* tmux.listSessions();

			expect(sessions).toEqual([
				{
					session_id: "$0",
					session_name: "main",
					session_windows: 3,
					session_attached: 2,
					session_created: new Date(1_700_000_000 * 1000),
				},
				{
					session_id: "$1",
					session_name: "work",
					session_windows: 1,
					session_attached: 0,
					session_created: new Date(1_700_000_500 * 1000),
				},
			]);
		}).pipe(
			Effect.provide(
				tmuxFrom({
					stdout: lines(
						row("$0", "main", "3", "2", "1700000000"),
						row("$1", "work", "1", "0", "1700000500"),
					),
					stderr: "",
					exitCode: 0,
				}),
			),
		),
	);

	it.effect("returns an empty array for empty output", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.listSessions()).toEqual([]);
		}).pipe(Effect.provide(tmuxFrom({ stdout: "", stderr: "", exitCode: 0 }))),
	);

	it.effect("fails with TmuxParseError when a field fails to decode", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			const error = yield* Effect.flip(tmux.listSessions());
			expect(error).toBeInstanceOf(TmuxParseError);
		}).pipe(
			Effect.provide(
				tmuxFrom({
					// bad session_created: NumberFromString rejects non-numeric timestamps
					stdout: lines(row("$0", "main", "3", "2", "notanumber")),
					stderr: "",
					exitCode: 0,
				}),
			),
		),
	);

	it.effect("fails with TmuxParseError on a wrong field count", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			const error = yield* Effect.flip(tmux.listSessions());
			expect(error).toBeInstanceOf(TmuxParseError);
		}).pipe(
			Effect.provide(
				tmuxFrom({
					stdout: lines(row("$0", "main", "3")),
					stderr: "",
					exitCode: 0,
				}),
			),
		),
	);
});

describe("argv flag mapping (listSessions)", () => {
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

	it.effect("listSessions() emits no flags", () =>
		Effect.gen(function* () {
			expect(yield* captureFlags((tmux) => tmux.listSessions())).toEqual([
				"list-sessions",
			]);
		}),
	);

	it.effect("listSessions({ filter }) emits -f", () =>
		Effect.gen(function* () {
			expect(
				yield* captureFlags((tmux) => tmux.listSessions({ filter: "x" })),
			).toEqual(["list-sessions", "-f", "x"]);
		}),
	);
});
