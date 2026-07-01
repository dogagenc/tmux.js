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

describe("TmuxClient.nextLayout", () => {
	it.effect("returns stdout", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.nextLayout()).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("nextLayout() emits the bare subcommand", () =>
		Effect.gen(function* () {
			expect(yield* captureArgs((tmux) => tmux.nextLayout())).toEqual([
				"next-layout",
			]);
		}),
	);

	it.effect("nextLayout({ targetWindow }) emits -t", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.nextLayout({ targetWindow: "work:1" }),
				),
			).toEqual(["next-layout", "-t", "work:1"]);
		}),
	);
});

describe("argument validation (nextLayout)", () => {
	it.effect("rejects an empty target window before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.nextLayout({ targetWindow: "" as never }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
