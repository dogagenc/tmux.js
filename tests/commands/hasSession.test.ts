import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { TmuxCommandOptionsError } from "../../src/Errors";
import { TmuxClient } from "../../src/exports/effect";
import { capturingTmux, tmuxFrom } from "../utils";

const empty = { stdout: "", stderr: "", exitCode: 0 };

const captureArgs = (
	run: (tmux: TmuxClient["Service"]) => Effect.Effect<unknown, unknown>,
) => {
	const harness = capturingTmux(empty);
	return Effect.gen(function* () {
		const tmux = yield* TmuxClient;
		yield* run(tmux);
		return harness.captured.args;
	}).pipe(Effect.provide(harness.layer));
};

describe("TmuxClient.hasSession", () => {
	it.effect("resolves true on a clean exit", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.hasSession()).toBe(true);
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("resolves false when the session does not exist", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.hasSession({ targetSession: "missing" })).toBe(false);
		}).pipe(
			Effect.provide(
				tmuxFrom({
					stdout: "",
					stderr: "can't find session: missing",
					exitCode: 1,
				}),
			),
		),
	);

	it.effect("propagates a dead server instead of returning false", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			const error = yield* Effect.flip(
				tmux.hasSession({ targetSession: "probe" }),
			);
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

	it.effect("hasSession() emits the bare subcommand", () =>
		Effect.gen(function* () {
			expect(yield* captureArgs((tmux) => tmux.hasSession())).toEqual([
				"has-session",
			]);
		}),
	);

	it.effect("hasSession({ targetSession }) emits -t", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.hasSession({ targetSession: "work" }),
				),
			).toEqual(["has-session", "-t", "work"]);
		}),
	);
});

describe("argument validation (hasSession)", () => {
	it.effect("rejects an empty target session before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.hasSession({ targetSession: "" as never }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
