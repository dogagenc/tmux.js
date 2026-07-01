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

describe("TmuxClient.lastPane", () => {
	it.effect("returns stdout", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.lastPane()).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("lastPane() emits the bare subcommand", () =>
		Effect.gen(function* () {
			expect(yield* captureArgs((tmux) => tmux.lastPane())).toEqual([
				"last-pane",
			]);
		}),
	);

	it.effect("lastPane({ targetWindow }) emits -t", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) => tmux.lastPane({ targetWindow: "work:1" })),
			).toEqual(["last-pane", "-t", "work:1"]);
		}),
	);

	it.effect("lastPane emits the -d, -e and -Z switches", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.lastPane({
						disableInput: true,
						enableInput: true,
						keepZoomed: true,
						targetWindow: "work:1",
					}),
				),
			).toEqual(["last-pane", "-d", "-e", "-Z", "-t", "work:1"]);
		}),
	);
});

describe("argument validation (lastPane)", () => {
	it.effect("rejects an empty target window before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.lastPane({ targetWindow: "" as never }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
