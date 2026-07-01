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

describe("TmuxClient.selectLayout", () => {
	it.effect("returns stdout", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.selectLayout(undefined)).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("selectLayout(undefined) emits the bare subcommand", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) => tmux.selectLayout(undefined)),
			).toEqual(["select-layout"]);
		}),
	);

	it.effect("selectLayout(layoutName) emits the positional", () =>
		Effect.gen(function* () {
			expect(yield* captureArgs((tmux) => tmux.selectLayout("tiled"))).toEqual([
				"select-layout",
				"tiled",
			]);
		}),
	);

	it.effect("emits boolean and valued flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.selectLayout(undefined, {
						spreadEvenly: true,
						next: true,
						undo: true,
						previous: true,
						targetPane: "work:1",
					}),
				),
			).toEqual(["select-layout", "-E", "-n", "-o", "-p", "-t", "work:1"]);
		}),
	);
});

describe("argument validation (selectLayout)", () => {
	it.effect("rejects an empty target pane before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.selectLayout(undefined, { targetPane: "" as never }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);

	it.effect("rejects an empty layout name before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(tmux.selectLayout("" as never));
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
