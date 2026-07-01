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

describe("TmuxClient.previousWindow", () => {
	it.effect("returns stdout", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.previousWindow()).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("previousWindow() emits the bare subcommand", () =>
		Effect.gen(function* () {
			expect(yield* captureArgs((tmux) => tmux.previousWindow())).toEqual([
				"previous-window",
			]);
		}),
	);

	it.effect("previousWindow({ alert }) emits -a", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) => tmux.previousWindow({ alert: true })),
			).toEqual(["previous-window", "-a"]);
		}),
	);

	it.effect("previousWindow({ targetSession }) emits -t", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.previousWindow({ targetSession: "work" }),
				),
			).toEqual(["previous-window", "-t", "work"]);
		}),
	);
});

describe("argument validation (previousWindow)", () => {
	it.effect("rejects an empty target session before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.previousWindow({ targetSession: "" as never }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
