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

describe("TmuxClient.killSession", () => {
	it.effect("returns stdout", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.killSession()).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("killSession() emits the bare subcommand", () =>
		Effect.gen(function* () {
			expect(yield* captureArgs((tmux) => tmux.killSession())).toEqual([
				"kill-session",
			]);
		}),
	);

	it.effect("killSession({ targetSession }) emits -t", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.killSession({ targetSession: "work" }),
				),
			).toEqual(["kill-session", "-t", "work"]);
		}),
	);

	it.effect("killSession emits -a and -C switches", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.killSession({
						killOthers: true,
						clearAlerts: true,
						targetSession: "work",
					}),
				),
			).toEqual(["kill-session", "-a", "-C", "-t", "work"]);
		}),
	);
});

describe("argument validation (killSession)", () => {
	it.effect("rejects an empty target session before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.killSession({ targetSession: "" as never }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
