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

describe("TmuxClient.nextWindow", () => {
	it.effect("returns stdout", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.nextWindow()).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("nextWindow() emits the bare subcommand", () =>
		Effect.gen(function* () {
			expect(yield* captureArgs((tmux) => tmux.nextWindow())).toEqual([
				"next-window",
			]);
		}),
	);

	it.effect("nextWindow({ alert }) emits -a", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) => tmux.nextWindow({ alert: true })),
			).toEqual(["next-window", "-a"]);
		}),
	);

	it.effect("nextWindow({ targetSession }) emits -t", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.nextWindow({ targetSession: "work" }),
				),
			).toEqual(["next-window", "-t", "work"]);
		}),
	);
});

describe("argument validation (nextWindow)", () => {
	it.effect("rejects an empty target session before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.nextWindow({ targetSession: "" as never }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
