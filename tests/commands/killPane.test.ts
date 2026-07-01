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

describe("TmuxClient.killPane", () => {
	it.effect("returns stdout", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.killPane()).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("killPane() emits the bare subcommand", () =>
		Effect.gen(function* () {
			expect(yield* captureArgs((tmux) => tmux.killPane())).toEqual([
				"kill-pane",
			]);
		}),
	);

	it.effect("killPane({ targetPane }) emits -t", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) => tmux.killPane({ targetPane: "work:1.0" })),
			).toEqual(["kill-pane", "-t", "work:1.0"]);
		}),
	);

	it.effect("killPane emits the -a switch", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.killPane({ killOthers: true, targetPane: "work:1.0" }),
				),
			).toEqual(["kill-pane", "-a", "-t", "work:1.0"]);
		}),
	);
});

describe("argument validation (killPane)", () => {
	it.effect("rejects an empty target pane before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.killPane({ targetPane: "" as never }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
